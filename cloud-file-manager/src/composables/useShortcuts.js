import { onMounted, onUnmounted } from 'vue'
import { useFileStore } from '../stores/file'
import { useUploadStore } from '../stores/upload'
import { ElMessage, ElMessageBox } from 'element-plus'

export function useShortcuts() {
  const fileStore = useFileStore()
  const uploadStore = useUploadStore()

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
      return
    }

    const { ctrlKey, metaKey, shiftKey, altKey, key } = e
    const isCtrl = ctrlKey || metaKey

    if (isCtrl && key === 'a') {
      e.preventDefault()
      fileStore.selectAll()
      ElMessage.info(`已选择 ${fileStore.selectedFiles.length} 个文件`)
    }

    if (isCtrl && key === 'f') {
      e.preventDefault()
      document.querySelector('.search-input')?.focus()
    }

    if (key === 'Delete' && fileStore.selectedFiles.length > 0) {
      e.preventDefault()
      ElMessageBox.confirm(
        `确定要删除选中的 ${fileStore.selectedFiles.length} 个文件吗？`,
        '删除确认',
        { type: 'warning' }
      ).then(() => {
        fileStore.deleteFiles([...fileStore.selectedFiles])
        ElMessage.success('已删除到回收站')
      }).catch(() => {})
    }

    if (key === 'F2' && fileStore.selectedFiles.length === 1) {
      e.preventDefault()
      const file = fileStore.currentFiles.find(f => f.id === fileStore.selectedFiles[0])
      if (file) {
        ElMessageBox.prompt('请输入新名称', '重命名', {
          inputValue: file.name,
          inputPattern: /^[^\\/:*?"<>|]+$/
        }).then(({ value }) => {
          fileStore.renameFile(file.id, value)
          ElMessage.success('重命名成功')
        }).catch(() => {})
      }
    }

    if (isCtrl && key === 'c' && fileStore.selectedFiles.length > 0) {
      e.preventDefault()
      localStorage.setItem('clipboardFiles', JSON.stringify({
        action: 'copy',
        ids: [...fileStore.selectedFiles]
      }))
      ElMessage.info(`已复制 ${fileStore.selectedFiles.length} 个文件`)
    }

    if (isCtrl && key === 'x' && fileStore.selectedFiles.length > 0) {
      e.preventDefault()
      localStorage.setItem('clipboardFiles', JSON.stringify({
        action: 'cut',
        ids: [...fileStore.selectedFiles]
      }))
      ElMessage.info(`已剪切 ${fileStore.selectedFiles.length} 个文件`)
    }

    if (isCtrl && key === 'v') {
      e.preventDefault()
      const clipboard = localStorage.getItem('clipboardFiles')
      if (clipboard) {
        const { action, ids } = JSON.parse(clipboard)
        if (action === 'copy') {
          fileStore.copyFiles(ids, fileStore.currentPath)
          ElMessage.success('粘贴成功')
        } else if (action === 'cut') {
          fileStore.moveFiles(ids, fileStore.currentPath)
          ElMessage.success('移动成功')
          localStorage.removeItem('clipboardFiles')
        }
      }
    }

    if (isCtrl && shiftKey && key === 'N') {
      e.preventDefault()
      ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
        inputPattern: /^[^\\/:*?"<>|]+$/
      }).then(({ value }) => {
        fileStore.createFolder(value)
        ElMessage.success('文件夹创建成功')
      }).catch(() => {})
    }

    if (key === 'Escape') {
      fileStore.clearSelection()
    }

    if (key === 'Enter' && fileStore.selectedFiles.length === 1) {
      const file = fileStore.currentFiles.find(f => f.id === fileStore.selectedFiles[0])
      if (file?.isFolder) {
        const newPath = fileStore.currentPath === '/' 
          ? '/' + file.name 
          : fileStore.currentPath + '/' + file.name
        fileStore.navigateTo(newPath)
      } else if (file) {
        window.dispatchEvent(new CustomEvent('preview-file', { detail: file }))
      }
    }

    if (altKey && key === 'ArrowLeft') {
      e.preventDefault()
      const parts = fileStore.currentPath.split('/').filter(Boolean)
      if (parts.length > 0) {
        parts.pop()
        fileStore.navigateTo('/' + parts.join('/'))
      } else {
        fileStore.navigateTo('/')
      }
    }

    if (key === 'F5') {
      e.preventDefault()
      fileStore.loadFiles()
      ElMessage.success('刷新成功')
    }

    if (isCtrl && key === 'u') {
      e.preventDefault()
      window.dispatchEvent(new CustomEvent('trigger-upload'))
    }

    if (isCtrl && key === 'j') {
      e.preventDefault()
      uploadStore.toggleConsole()
    }

    if (isCtrl && key === 's') {
      e.preventDefault()
      fileStore.setViewMode(fileStore.viewMode === 'list' ? 'grid' : 'list')
      ElMessage.info(`已切换到${fileStore.viewMode === 'list' ? '网格' : '列表'}视图`)
    }
  }

  function initShortcuts() {
    document.addEventListener('keydown', handleKeydown)
  }

  function cleanupShortcuts() {
    document.removeEventListener('keydown', handleKeydown)
  }

  return {
    initShortcuts,
    cleanupShortcuts
  }
}
