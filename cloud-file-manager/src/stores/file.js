import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { generateMockFiles, generateId, formatFileSize, getFileType } from '../utils'

export const useFileStore = defineStore('file', () => {
  const files = ref([])
  const recycleBin = ref([])
  const shares = ref([])
  const currentPath = ref('/')
  const selectedFiles = ref([])
  const viewMode = ref(localStorage.getItem('viewMode') || 'list')
  const searchQuery = ref('')
  const filters = ref({
    type: 'all',
    size: 'all',
    date: 'all'
  })
  const sortBy = ref(localStorage.getItem('sortBy') || 'name')
  const sortOrder = ref(localStorage.getItem('sortOrder') || 'asc')

  const currentFiles = computed(() => {
    let result = files.value.filter(f => f.path === currentPath.value && !f.deleted)
    
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      result = result.filter(f => f.name.toLowerCase().includes(query))
    }
    
    if (filters.value.type !== 'all') {
      result = result.filter(f => f.type === filters.value.type)
    }
    
    if (filters.value.size !== 'all') {
      result = result.filter(f => {
        const size = f.size
        switch (filters.value.size) {
          case 'tiny': return size < 1 * 1024 * 1024
          case 'small': return size >= 1 * 1024 * 1024 && size < 10 * 1024 * 1024
          case 'medium': return size >= 10 * 1024 * 1024 && size < 100 * 1024 * 1024
          case 'large': return size >= 100 * 1024 * 1024 && size < 1 * 1024 * 1024 * 1024
          case 'huge': return size >= 1 * 1024 * 1024 * 1024
          default: return true
        }
      })
    }
    
    if (filters.value.date !== 'all') {
      const now = Date.now()
      result = result.filter(f => {
        const age = now - f.updatedAt
        switch (filters.value.date) {
          case 'today': return age < 24 * 60 * 60 * 1000
          case 'week': return age < 7 * 24 * 60 * 60 * 1000
          case 'month': return age < 30 * 24 * 60 * 60 * 1000
          case 'year': return age < 365 * 24 * 60 * 60 * 1000
          default: return true
        }
      })
    }
    
    result.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1
      if (!a.isFolder && b.isFolder) return 1
      
      let comparison = 0
      switch (sortBy.value) {
        case 'name': comparison = a.name.localeCompare(b.name); break
        case 'size': comparison = a.size - b.size; break
        case 'date': comparison = a.updatedAt - b.updatedAt; break
        case 'type': comparison = a.type.localeCompare(b.type); break
        default: comparison = 0
      }
      return sortOrder.value === 'asc' ? comparison : -comparison
    })
    
    return result
  })

  const storageStats = computed(() => {
    const used = files.value.reduce((sum, f) => sum + f.size, 0)
    const total = 10 * 1024 * 1024 * 1024
    return {
      used,
      total,
      free: total - used,
      percentage: Math.round((used / total) * 100)
    }
  })

  const categoryStats = computed(() => {
    const stats = { image: 0, document: 0, video: 0, audio: 0, archive: 0, code: 0, other: 0 }
    files.value.forEach(f => {
      if (!f.isFolder && !f.deleted && stats[f.type] !== undefined) {
        stats[f.type]++
      }
    })
    return stats
  })

  const recentFiles = computed(() => {
    return [...files.value]
      .filter(f => !f.isFolder && !f.deleted)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 10)
  })

  function loadFiles() {
    const savedFiles = localStorage.getItem('files')
    const savedRecycle = localStorage.getItem('recycleBin')
    const savedShares = localStorage.getItem('shares')
    
    if (savedFiles) {
      files.value = JSON.parse(savedFiles)
    } else {
      files.value = generateMockFiles()
      saveFiles()
    }
    
    if (savedRecycle) {
      recycleBin.value = JSON.parse(savedRecycle)
    }
    
    if (savedShares) {
      shares.value = JSON.parse(savedShares)
    }
    
    cleanupOldRecycleItems()
  }

  function saveFiles() {
    localStorage.setItem('files', JSON.stringify(files.value))
  }

  function saveRecycle() {
    localStorage.setItem('recycleBin', JSON.stringify(recycleBin.value))
  }

  function saveShares() {
    localStorage.setItem('shares', JSON.stringify(shares.value))
  }

  function createFolder(name, path = currentPath.value) {
    const folder = {
      id: generateId(),
      name,
      isFolder: true,
      type: 'folder',
      path,
      size: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false
    }
    files.value.push(folder)
    saveFiles()
    return folder
  }

  function addFile(fileData) {
    const file = {
      id: generateId(),
      ...fileData,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false
    }
    files.value.push(file)
    saveFiles()
    return file
  }

  function renameFile(id, newName) {
    const file = files.value.find(f => f.id === id)
    if (file) {
      file.name = newName
      file.updatedAt = Date.now()
      saveFiles()
    }
  }

  function moveFiles(ids, targetPath) {
    ids.forEach(id => {
      const file = files.value.find(f => f.id === id)
      if (file) {
        file.path = targetPath
        file.updatedAt = Date.now()
        
        if (file.isFolder) {
          const oldPath = file.path + '/' + file.name
          const newPath = targetPath + '/' + file.name
          files.value.forEach(f => {
            if (f.path.startsWith(oldPath + '/')) {
              f.path = f.path.replace(oldPath, newPath)
            }
          })
        }
      }
    })
    saveFiles()
  }

  function copyFiles(ids, targetPath) {
    const copies = []
    ids.forEach(id => {
      const file = files.value.find(f => f.id === id)
      if (file) {
        const newFile = {
          ...file,
          id: generateId(),
          name: generateCopyName(file.name, targetPath),
          path: targetPath,
          createdAt: Date.now(),
          updatedAt: Date.now()
        }
        copies.push(newFile)
        
        if (file.isFolder) {
          const oldPath = file.path + '/' + file.name
          const newPath = targetPath + '/' + newFile.name
          files.value.forEach(f => {
            if (f.path.startsWith(oldPath + '/')) {
              const childCopy = {
                ...f,
                id: generateId(),
                path: f.path.replace(oldPath, newPath)
              }
              copies.push(childCopy)
            }
          })
        }
      }
    })
    files.value.push(...copies)
    saveFiles()
  }

  function generateCopyName(name, path) {
    const ext = name.includes('.') ? name.slice(name.lastIndexOf('.')) : ''
    const baseName = name.includes('.') ? name.slice(0, name.lastIndexOf('.')) : name
    let counter = 1
    let newName = `${baseName} 副本${ext}`
    while (files.value.some(f => f.path === path && f.name === newName)) {
      counter++
      newName = `${baseName} 副本${counter}${ext}`
    }
    return newName
  }

  function deleteFiles(ids, permanent = false) {
    if (permanent) {
      files.value = files.value.filter(f => !ids.includes(f.id))
      recycleBin.value = recycleBin.value.filter(f => !ids.includes(f.id))
    } else {
      ids.forEach(id => {
        const file = files.value.find(f => f.id === id)
        if (file) {
          file.deleted = true
          file.deletedAt = Date.now()
          recycleBin.value.push({ ...file })
        }
      })
    }
    saveFiles()
    saveRecycle()
  }

  function restoreFiles(ids) {
    ids.forEach(id => {
      const file = files.value.find(f => f.id === id)
      if (file) {
        file.deleted = false
        file.deletedAt = null
        file.updatedAt = Date.now()
      }
    })
    recycleBin.value = recycleBin.value.filter(f => !ids.includes(f.id))
    saveFiles()
    saveRecycle()
  }

  function cleanupOldRecycleItems() {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000
    const expiredIds = recycleBin.value
      .filter(f => f.deletedAt < thirtyDaysAgo)
      .map(f => f.id)
    
    if (expiredIds.length > 0) {
      files.value = files.value.filter(f => !expiredIds.includes(f.id))
      recycleBin.value = recycleBin.value.filter(f => !expiredIds.includes(f.id))
      saveFiles()
      saveRecycle()
    }
  }

  function createShare(fileIds, options) {
    const share = {
      id: generateId(),
      shareId: `share_${Math.random().toString(36).slice(2, 10)}`,
      fileIds,
      ...options,
      createdAt: Date.now(),
      views: 0,
      downloads: 0,
      status: 'active'
    }
    shares.value.push(share)
    saveShares()
    return share
  }

  function cancelShare(shareId) {
    const share = shares.value.find(s => s.shareId === shareId)
    if (share) {
      share.status = 'cancelled'
      saveShares()
    }
  }

  function setViewMode(mode) {
    viewMode.value = mode
    localStorage.setItem('viewMode', mode)
  }

  function setSortBy(field) {
    if (sortBy.value === field) {
      sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    } else {
      sortBy.value = field
      sortOrder.value = 'asc'
    }
    localStorage.setItem('sortBy', sortBy.value)
    localStorage.setItem('sortOrder', sortOrder.value)
  }

  function navigateTo(path) {
    currentPath.value = path
    selectedFiles.value = []
  }

  function toggleSelect(id) {
    const index = selectedFiles.value.indexOf(id)
    if (index > -1) {
      selectedFiles.value.splice(index, 1)
    } else {
      selectedFiles.value.push(id)
    }
  }

  function selectAll() {
    if (selectedFiles.value.length === currentFiles.value.length) {
      selectedFiles.value = []
    } else {
      selectedFiles.value = currentFiles.value.map(f => f.id)
    }
  }

  function clearSelection() {
    selectedFiles.value = []
  }

  function getFilesByType(type) {
    return files.value.filter(f => !f.deleted && !f.isFolder && f.type === type)
  }

  function getFileById(id) {
    return files.value.find(f => f.id === id)
  }

  function compressFiles(fileIds, archiveName) {
    const filesToCompress = fileIds.map(id => getFileById(id)).filter(Boolean)
    const archive = {
      id: generateId(),
      name: archiveName.endsWith('.zip') ? archiveName : `${archiveName}.zip`,
      isFolder: false,
      type: 'archive',
      path: currentPath.value,
      size: filesToCompress.reduce((sum, f) => sum + f.size, 0) * 0.7,
      compressedIds: fileIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      deleted: false
    }
    files.value.push(archive)
    saveFiles()
    return archive
  }

  function extractArchive(fileId, targetPath) {
    const archive = getFileById(fileId)
    if (!archive || archive.type !== 'archive') return
    
    const extractedFiles = [
      {
        id: generateId(),
        name: '提取的文件',
        isFolder: true,
        type: 'folder',
        path: targetPath,
        size: 0,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        deleted: false
      }
    ]
    files.value.push(...extractedFiles)
    saveFiles()
  }

  return {
    files,
    recycleBin,
    shares,
    currentPath,
    selectedFiles,
    viewMode,
    searchQuery,
    filters,
    sortBy,
    sortOrder,
    currentFiles,
    storageStats,
    categoryStats,
    recentFiles,
    loadFiles,
    createFolder,
    addFile,
    renameFile,
    moveFiles,
    copyFiles,
    deleteFiles,
    restoreFiles,
    createShare,
    cancelShare,
    setViewMode,
    setSortBy,
    navigateTo,
    toggleSelect,
    selectAll,
    clearSelection,
    getFilesByType,
    getFileById,
    compressFiles,
    extractArchive
  }
})
