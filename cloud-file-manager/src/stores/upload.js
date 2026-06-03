import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateId, formatFileSize, getFileType } from '../utils'

const CHUNK_SIZE = 5 * 1024 * 1024
const MAX_RETRIES = 3

export const useUploadStore = defineStore('upload', () => {
  const tasks = ref([])
  const concurrentUploads = ref(3)
  const showConsole = ref(false)

  const activeTasks = computed(() => tasks.value.filter(t => t && (t.status === 'uploading' || t.status === 'paused')))
  const completedTasks = computed(() => tasks.value.filter(t => t && t.status === 'completed'))
  const failedTasks = computed(() => tasks.value.filter(t => t && t.status === 'failed'))
  const pendingTasks = computed(() => tasks.value.filter(t => t && t.status === 'pending'))

  const totalProgress = computed(() => {
    if (tasks.value.length === 0) return 0
    const validTasks = tasks.value.filter(t => t && t.totalSize != null)
    if (validTasks.length === 0) return 0
    const totalSize = validTasks.reduce((sum, t) => sum + (t.totalSize || 0), 0)
    const uploadedSize = validTasks.reduce((sum, t) => sum + (t.uploadedSize || 0), 0)
    return totalSize > 0 ? Math.round((uploadedSize / totalSize) * 100) : 0
  })

  function createTask(file, targetPath = '/') {
    const previewUrl = file && ['image', 'video', 'audio'].includes(getFileType(file.name)) 
      ? URL.createObjectURL(file) 
      : null
    
    const task = {
      id: generateId(),
      file,
      name: file.name,
      totalSize: file.size,
      type: getFileType(file.name),
      targetPath,
      status: 'pending',
      progress: 0,
      uploadedSize: 0,
      speed: 0,
      remainingTime: 0,
      chunks: [],
      uploadedChunks: [],
      retries: 0,
      error: null,
      createdAt: Date.now(),
      startTime: null,
      speedHistory: [],
      previewUrl
    }
    
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE)
    for (let i = 0; i < totalChunks; i++) {
      task.chunks.push({
        index: i,
        start: i * CHUNK_SIZE,
        end: Math.min((i + 1) * CHUNK_SIZE, file.size),
        uploaded: false,
        progress: 0
      })
    }
    
    tasks.value.unshift(task)
    saveTasks()
    return task
  }

  async function addFiles(files, targetPath = '/') {
    for (const file of files) {
      if (file.webkitRelativePath) {
        const pathParts = file.webkitRelativePath.split('/')
        pathParts.pop()
        const folderPath = targetPath + '/' + pathParts.join('/')
        createTask(file, folderPath)
      } else {
        createTask(file, targetPath)
      }
    }
    processQueue()
  }

  async function processQueue() {
    const uploading = activeTasks.value.filter(t => t.status === 'uploading').length
    const toStart = concurrentUploads.value - uploading
    
    for (let i = 0; i < toStart; i++) {
      const pending = pendingTasks.value[i]
      if (pending) {
        startTask(pending.id)
      }
    }
  }

  async function startTask(taskId) {
    const task = tasks.value.find(t => t && t.id === taskId)
    if (!task || task.status !== 'pending') return

    task.status = 'uploading'
    task.startTime = Date.now()
    
    try {
      await uploadChunks(task)
    } catch (error) {
      handleTaskError(task, error)
    }
  }

  async function uploadChunks(task) {
    const pendingChunks = task.chunks.filter(c => !c.uploaded)
    
    for (const chunk of pendingChunks) {
      if (task.status === 'paused' || task.status === 'cancelled') {
        return
      }
      
      try {
        await uploadChunk(task, chunk)
        chunk.uploaded = true
        updateTaskProgress(task)
      } catch (error) {
        if (task.retries < MAX_RETRIES) {
          task.retries++
          await uploadChunk(task, chunk)
          chunk.uploaded = true
          updateTaskProgress(task)
        } else {
          throw error
        }
      }
    }
    
    task.status = 'completed'
    task.progress = 100
    task.uploadedSize = task.totalSize
    
    const { useFileStore } = await import('./file')
    const fileStore = useFileStore()
    fileStore.addFile({
      name: task.name,
      isFolder: false,
      type: task.type,
      path: task.targetPath,
      size: task.totalSize,
      previewUrl: task.previewUrl
    })
    
    saveTasks()
    processQueue()
  }

  async function uploadChunk(task, chunk) {
    return new Promise((resolve, reject) => {
      if (!task.file) {
        chunk.uploaded = true
        task.uploadedSize += (chunk.end - chunk.start)
        resolve()
        return
      }

      const blob = task.file.slice(chunk.start, chunk.end)
      
      const reader = new FileReader()
      reader.onload = () => {
        chunk.progress = 100
        
        const delay = 50 + Math.random() * 200
        setTimeout(() => {
          if (Math.random() < 0.05) {
            reject(new Error('网络错误'))
          } else {
            task.uploadedSize += blob.size
            resolve()
          }
        }, delay)
      }
      reader.onerror = () => reject(new Error('读取文件失败'))
      reader.readAsArrayBuffer(blob)
    })
  }

  function updateTaskProgress(task) {
    const uploadedChunks = task.chunks.filter(c => c.uploaded).length
    task.progress = Math.round((uploadedChunks / task.chunks.length) * 100)
    
    const elapsed = (Date.now() - task.startTime) / 1000
    if (elapsed > 0) {
      task.speed = task.uploadedSize / elapsed
      const remaining = (task.totalSize - task.uploadedSize) / task.speed
      task.remainingTime = Math.max(0, remaining)
    }
    
    saveTasks()
  }

  function handleTaskError(task, error) {
    task.status = 'failed'
    task.error = error.message
    saveTasks()
    processQueue()
  }

  function pauseTask(taskId) {
    const task = tasks.value.find(t => t && t.id === taskId)
    if (task && task.status === 'uploading') {
      task.status = 'paused'
      saveTasks()
      processQueue()
    }
  }

  function resumeTask(taskId) {
    const task = tasks.value.find(t => t && t.id === taskId)
    if (task && task.status === 'paused') {
      task.status = 'pending'
      task.retries = 0
      saveTasks()
      processQueue()
    }
  }

  function cancelTask(taskId) {
    const task = tasks.value.find(t => t && t.id === taskId)
    if (task) {
      task.status = 'cancelled'
      saveTasks()
      processQueue()
    }
  }

  function retryTask(taskId) {
    const task = tasks.value.find(t => t && t.id === taskId)
    if (task) {
      task.status = 'pending'
      task.retries = 0
      task.error = null
      task.progress = 0
      task.uploadedSize = 0
      task.chunks.forEach(c => {
        c.uploaded = false
        c.progress = 0
      })
      saveTasks()
      processQueue()
    }
  }

  function pauseAll() {
    tasks.value.forEach(t => {
      if (t && t.status === 'uploading') {
        t.status = 'paused'
      }
    })
    saveTasks()
  }

  function resumeAll() {
    tasks.value.forEach(t => {
      if (t && t.status === 'paused') {
        t.status = 'pending'
        t.retries = 0
      }
    })
    processQueue()
  }

  function cancelAll() {
    tasks.value.forEach(t => {
      if (t && (t.status === 'uploading' || t.status === 'pending' || t.status === 'paused')) {
        t.status = 'cancelled'
      }
    })
    saveTasks()
  }

  function removeTask(taskId) {
    const index = tasks.value.findIndex(t => t && t.id === taskId)
    if (index > -1) {
      tasks.value.splice(index, 1)
      saveTasks()
    }
  }

  function clearCompleted() {
    tasks.value = tasks.value.filter(t => t && t.status !== 'completed' && t.status !== 'cancelled')
    saveTasks()
  }

  function saveTasks() {
    const validTasks = tasks.value.filter(t => t && t.id)
    localStorage.setItem('uploadTasks', JSON.stringify(validTasks.map(t => ({
      ...t,
      file: null
    }))))
  }

  function restoreTasks() {
    try {
      const saved = localStorage.getItem('uploadTasks')
      if (saved) {
        const savedTasks = JSON.parse(saved)
        if (!Array.isArray(savedTasks)) {
          localStorage.removeItem('uploadTasks')
          return
        }
        tasks.value = savedTasks
          .filter(t => t && t.id && t.status)
          .map(t => ({
            ...t,
            file: null,
            uploadedSize: t.uploadedSize || 0,
            progress: t.progress || 0,
            speed: t.speed || 0,
            remainingTime: t.remainingTime || 0,
            retries: t.retries || 0,
            chunks: Array.isArray(t.chunks) ? t.chunks : [],
            status: t.status === 'uploading' ? 'paused' : t.status
          }))
      }
    } catch (e) {
      localStorage.removeItem('uploadTasks')
      tasks.value = []
    }
  }

  function toggleConsole() {
    showConsole.value = !showConsole.value
  }

  return {
    tasks,
    showConsole,
    activeTasks,
    completedTasks,
    failedTasks,
    pendingTasks,
    totalProgress,
    addFiles,
    startTask,
    pauseTask,
    resumeTask,
    cancelTask,
    retryTask,
    pauseAll,
    resumeAll,
    cancelAll,
    removeTask,
    clearCompleted,
    restoreTasks,
    toggleConsole
  }
})
