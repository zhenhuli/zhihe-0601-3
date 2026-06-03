<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="context-menu"
      :style="{ left: position.x + 'px', top: position.y + 'px' }"
      @click.stop
    >
      <div v-if="!file" class="menu-group">
        <div class="menu-item" @click="handleAction('upload')">
          <el-icon><Upload /></el-icon>
          <span>上传文件</span>
        </div>
        <div class="menu-item" @click="handleAction('uploadFolder')">
          <el-icon><FolderAdd /></el-icon>
          <span>上传文件夹</span>
        </div>
        <div class="menu-item" @click="handleAction('newFolder')">
          <el-icon><FolderOpened /></el-icon>
          <span>新建文件夹</span>
        </div>
        <div class="menu-item" @click="handleAction('refresh')">
          <el-icon><Refresh /></el-icon>
          <span>刷新</span>
        </div>
      </div>

      <div v-else class="menu-group">
        <div class="menu-item" @click="handleAction('open')">
          <el-icon><View /></el-icon>
          <span>{{ file.isFolder ? '打开' : '预览' }}</span>
        </div>
        <div class="menu-item" @click="handleAction('download')">
          <el-icon><Download /></el-icon>
          <span>下载</span>
        </div>
        <div class="menu-item" @click="handleAction('share')">
          <el-icon><Share /></el-icon>
          <span>分享</span>
        </div>
      </div>

      <div v-if="file" class="menu-group">
        <div class="menu-item" @click="handleAction('rename')">
          <el-icon><Edit /></el-icon>
          <span>重命名</span>
        </div>
        <div class="menu-item" @click="handleAction('copy')">
          <el-icon><DocumentCopy /></el-icon>
          <span>复制</span>
        </div>
        <div class="menu-item" @click="handleAction('move')">
          <el-icon><Promotion /></el-icon>
          <span>移动</span>
        </div>
        <div v-if="file.type === 'archive'" class="menu-item" @click="handleAction('extract')">
          <el-icon><Expand /></el-icon>
          <span>解压到当前文件夹</span>
        </div>
      </div>

      <div v-if="selectedFiles.length > 1" class="menu-group">
        <div class="menu-item" @click="handleAction('compress')">
          <el-icon><Files /></el-icon>
          <span>压缩为zip</span>
        </div>
        <div class="menu-item" @click="handleAction('batchDownload')">
          <el-icon><Download /></el-icon>
          <span>批量下载</span>
        </div>
        <div class="menu-item" @click="handleAction('batchShare')">
          <el-icon><Share /></el-icon>
          <span>批量分享</span>
        </div>
      </div>

      <div v-if="file" class="menu-group danger">
        <div class="menu-item" @click="handleAction('delete')">
          <el-icon><Delete /></el-icon>
          <span>删除</span>
        </div>
      </div>

      <div v-if="file" class="menu-group">
        <div class="menu-item" @click="handleAction('properties')">
          <el-icon><InfoFilled /></el-icon>
          <span>属性</span>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFileStore } from '../stores/file'
import { useAuthStore } from '../stores/auth'

const route = useRoute()
const fileStore = useFileStore()
const authStore = useAuthStore()

const visible = ref(false)
const position = ref({ x: 0, y: 0 })
const file = ref(null)

const selectedFiles = ref([])

function show(event, targetFile = null) {
  event.preventDefault()
  event.stopPropagation()
  
  file.value = targetFile
  selectedFiles.value = fileStore.selectedFiles
  
  position.value = {
    x: event.clientX,
    y: event.clientY
  }
  visible.value = true
}

function hide() {
  visible.value = false
  file.value = null
}

function handleAction(action) {
  if (!authStore.hasPermission(action) && !['open', 'preview', 'refresh', 'properties'].includes(action)) {
    ElMessage.warning('请先登录后再进行此操作')
    hide()
    return
  }

  const targetFiles = selectedFiles.value.length > 1 
    ? selectedFiles.value 
    : (file.value ? [file.value.id] : [])

  switch (action) {
    case 'open':
      if (file.value?.isFolder) {
        const newPath = fileStore.currentPath === '/' 
          ? '/' + file.value.name 
          : fileStore.currentPath + '/' + file.value.name
        fileStore.navigateTo(newPath)
      } else {
        window.dispatchEvent(new CustomEvent('preview-file', { detail: file.value }))
      }
      break
    case 'upload':
      window.dispatchEvent(new CustomEvent('trigger-upload'))
      break
    case 'uploadFolder':
      window.dispatchEvent(new CustomEvent('trigger-upload-folder'))
      break
    case 'newFolder':
      ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
        confirmButtonText: '创建',
        cancelButtonText: '取消',
        inputPattern: /^[^\\/:*?"<>|]+$/,
        inputErrorMessage: '文件夹名称不能包含特殊字符'
      }).then(({ value }) => {
        fileStore.createFolder(value)
        ElMessage.success('文件夹创建成功')
      }).catch(() => {})
      break
    case 'refresh':
      fileStore.loadFiles()
      ElMessage.success('刷新成功')
      break
    case 'rename':
      if (file.value) {
        ElMessageBox.prompt('请输入新名称', '重命名', {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: file.value.name,
          inputPattern: /^[^\\/:*?"<>|]+$/,
          inputErrorMessage: '名称不能包含特殊字符'
        }).then(({ value }) => {
          fileStore.renameFile(file.value.id, value)
          ElMessage.success('重命名成功')
        }).catch(() => {})
      }
      break
    case 'copy':
      window.dispatchEvent(new CustomEvent('show-move-dialog', { 
        detail: { fileIds: targetFiles, mode: 'copy' } 
      }))
      break
    case 'move':
      window.dispatchEvent(new CustomEvent('show-move-dialog', { 
        detail: { fileIds: targetFiles, mode: 'move' } 
      }))
      break
    case 'delete':
      ElMessageBox.confirm('确定要删除选中的文件吗？删除后可在回收站找回。', '删除确认', {
        confirmButtonText: '删除',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        fileStore.deleteFiles(targetFiles)
        ElMessage.success('已删除到回收站')
      }).catch(() => {})
      break
    case 'share':
      window.dispatchEvent(new CustomEvent('show-share-dialog', { 
        detail: { fileIds: targetFiles } 
      }))
      break
    case 'download':
      ElMessage.info('下载功能开发中')
      break
    case 'compress':
      ElMessageBox.prompt('请输入压缩包名称', '压缩文件', {
        confirmButtonText: '压缩',
        cancelButtonText: '取消',
        inputValue: 'archive.zip'
      }).then(({ value }) => {
        fileStore.compressFiles(targetFiles, value)
        ElMessage.success('压缩成功')
      }).catch(() => {})
      break
    case 'extract':
      if (file.value) {
        fileStore.extractArchive(file.value.id, fileStore.currentPath)
        ElMessage.success('解压成功')
      }
      break
    case 'properties':
      window.dispatchEvent(new CustomEvent('show-properties', { 
        detail: { file: file.value } 
      }))
      break
  }
  
  hide()
}

function handleClick() {
  hide()
}

function handleKeydown(e) {
  if (e.key === 'Escape') {
    hide()
  }
}

onMounted(() => {
  document.addEventListener('click', handleClick)
  document.addEventListener('keydown', handleKeydown)
  window.addEventListener('show-context-menu', (e) => {
    show(e, e.detail?.file)
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handleClick)
  document.removeEventListener('keydown', handleKeydown)
  window.removeEventListener('show-context-menu', () => {})
})
</script>

<style lang="scss" scoped>
.context-menu {
  position: fixed;
  z-index: 9999;
  min-width: 180px;
  background: $bg-primary;
  border-radius: $border-radius;
  box-shadow: $shadow-lg;
  border: 1px solid $border-color;
  padding: 4px 0;
  animation: fadeIn 0.15s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: scale(0.95);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.menu-group {
  padding: 4px 0;
  border-bottom: 1px solid $border-color;

  &:last-child {
    border-bottom: none;
  }

  &.danger {
    .menu-item {
      color: $danger-color;

      &:hover {
        background: rgba(239, 68, 68, 0.1);
        color: $danger-color;
      }
    }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  font-size: 13px;
  color: $text-primary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-tertiary;
  }

  .el-icon {
    font-size: 16px;
  }
}
</style>
