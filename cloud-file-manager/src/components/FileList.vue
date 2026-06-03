<template>
  <div class="file-list-container">
    <div class="file-toolbar">
      <div class="toolbar-left">
        <el-button-group>
          <el-button
            size="small"
            :type="fileStore.viewMode === 'list' ? 'primary' : 'default'"
            @click="fileStore.setViewMode('list')"
          >
            <el-icon><List /></el-icon>
            列表
          </el-button>
          <el-button
            size="small"
            :type="fileStore.viewMode === 'grid' ? 'primary' : 'default'"
            @click="fileStore.setViewMode('grid')"
          >
            <el-icon><Grid /></el-icon>
            网格
          </el-button>
        </el-button-group>

        <span class="file-count">共 {{ fileStore.currentFiles.length }} 个文件</span>
      </div>

      <div class="toolbar-right">
        <template v-if="fileStore.selectedFiles.length > 0">
          <span class="selected-count">已选 {{ fileStore.selectedFiles.length }} 项</span>
          <el-button size="small" @click="handleBatchDownload" :disabled="!canDownload">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
          <el-button size="small" @click="handleBatchShare" :disabled="!canShare">
            <el-icon><Share /></el-icon>
            分享
          </el-button>
          <el-button size="small" type="danger" @click="handleBatchDelete" :disabled="!canDelete">
            <el-icon><Delete /></el-icon>
            删除
          </el-button>
          <el-button size="small" @click="fileStore.clearSelection">
            取消选择
          </el-button>
        </template>
        <template v-else>
          <el-button size="small" type="primary" @click="handleNewFolder" :disabled="!canCreate">
            <el-icon><FolderAdd /></el-icon>
            新建文件夹
          </el-button>
          <el-button size="small" @click="handleUpload" :disabled="!canUpload">
            <el-icon><Upload /></el-icon>
            上传文件
          </el-button>
        </template>
      </div>
    </div>

    <div class="file-list-wrapper" @dragover.prevent @drop="handleDrop">
      <div v-if="fileStore.currentFiles.length === 0" class="empty-state">
        <el-icon class="empty-icon"><FolderOpened /></el-icon>
        <div class="empty-text">此文件夹为空</div>
        <el-button
          v-if="canUpload"
          type="primary"
          style="margin-top: 16px"
          @click="handleUpload"
        >
          上传文件
        </el-button>
      </div>

      <div v-else-if="fileStore.viewMode === 'list'" class="file-list list-view">
        <div class="file-list-header">
          <div class="file-checkbox">
            <el-checkbox
              :model-value="isAllSelected"
              :indeterminate="isIndeterminate"
              @change="fileStore.selectAll"
            />
          </div>
          <div class="file-name" @click="fileStore.setSortBy('name')">
            名称
            <el-icon v-if="fileStore.sortBy === 'name'">
              <Sort v-if="fileStore.sortOrder === 'asc'" />
              <Sort v-else style="transform: rotate(180deg)" />
            </el-icon>
          </div>
          <div class="file-size" @click="fileStore.setSortBy('size')">
            大小
            <el-icon v-if="fileStore.sortBy === 'size'">
              <Sort v-if="fileStore.sortOrder === 'asc'" />
              <Sort v-else style="transform: rotate(180deg)" />
            </el-icon>
          </div>
          <div class="file-type" @click="fileStore.setSortBy('type')">
            类型
            <el-icon v-if="fileStore.sortBy === 'type'">
              <Sort v-if="fileStore.sortOrder === 'asc'" />
              <Sort v-else style="transform: rotate(180deg)" />
            </el-icon>
          </div>
          <div class="file-date" @click="fileStore.setSortBy('date')">
            修改时间
            <el-icon v-if="fileStore.sortBy === 'date'">
              <Sort v-if="fileStore.sortOrder === 'asc'" />
              <Sort v-else style="transform: rotate(180deg)" />
            </el-icon>
          </div>
          <div class="file-actions hide-mobile">操作</div>
        </div>

        <div
          v-for="file in fileStore.currentFiles"
          :key="file.id"
          class="file-item"
          :class="{ 
            selected: fileStore.selectedFiles.includes(file.id),
            dragging: dragTargetId === file.id
          }"
          draggable="true"
          @dragstart="handleDragStart($event, file)"
          @dragover.prevent="handleDragOver($event, file)"
          @dragleave="handleDragLeave"
          @drop.stop="handleDropOnFile($event, file)"
          @dragend="handleDragEnd"
          @click="handleFileClick(file)"
          @dblclick="handleFileDoubleClick(file)"
          @contextmenu="handleContextMenu($event, file)"
        >
          <div class="file-checkbox">
            <el-checkbox
              :model-value="fileStore.selectedFiles.includes(file.id)"
              @click.stop
              @change="fileStore.toggleSelect(file.id)"
            />
          </div>
          <div class="file-name">
            <el-icon
              class="file-icon"
              :size="20"
              :color="getFileColor(file.type)"
            >
              <component :is="getFileIcon(file.type)" />
            </el-icon>
            <span class="text-ellipsis">{{ file.name }}</span>
          </div>
          <div class="file-size">{{ file.isFolder ? '-' : formatFileSize(file.size) }}</div>
          <div class="file-type">{{ getTypeLabel(file.type) }}</div>
          <div class="file-date">{{ formatDate(file.updatedAt) }}</div>
          <div class="file-actions hide-mobile">
            <el-tooltip content="预览">
              <el-button size="small" text @click.stop="handlePreview(file)">
                <el-icon><View /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="分享">
              <el-button size="small" text @click.stop="handleShare(file)" :disabled="!canShare">
                <el-icon><Share /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="下载">
              <el-button size="small" text @click.stop="handleDownload(file)" :disabled="!canDownload">
                <el-icon><Download /></el-icon>
              </el-button>
            </el-tooltip>
            <el-tooltip content="更多">
              <el-button size="small" text @click.stop="handleContextMenu($event, file)">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
            </el-tooltip>
          </div>
        </div>
      </div>

      <div v-else class="file-list grid-view">
        <div
          v-for="file in fileStore.currentFiles"
          :key="file.id"
          class="file-card"
          :class="{ selected: fileStore.selectedFiles.includes(file.id) }"
          draggable="true"
          @dragstart="handleDragStart($event, file)"
          @dragover.prevent="handleDragOver($event, file)"
          @dragleave="handleDragLeave"
          @drop.stop="handleDropOnFile($event, file)"
          @dragend="handleDragEnd"
          @click="handleFileClick(file)"
          @dblclick="handleFileDoubleClick(file)"
          @contextmenu="handleContextMenu($event, file)"
        >
          <div class="file-card-checkbox">
            <el-checkbox
              :model-value="fileStore.selectedFiles.includes(file.id)"
              @click.stop
              @change="fileStore.toggleSelect(file.id)"
            />
          </div>
          <div class="file-card-preview">
            <img
              v-if="file.type === 'image' && (file.previewUrl || getPreviewUrl(file))"
              :src="file.previewUrl || getPreviewUrl(file)"
              class="file-card-image"
              @error="handleImagePreviewError"
            />
            <div
              v-else-if="file.type === 'video' || file.type === 'audio'"
              class="file-card-media"
              :style="{ '--media-color': getFileColor(file.type) }"
            >
              <img v-if="getPreviewUrl(file)" :src="getPreviewUrl(file)" class="file-card-thumb" />
              <div class="file-card-media-overlay">
                <el-icon :size="32">
                  <VideoPlay v-if="file.type === 'video'" />
                  <Headset v-else />
                </el-icon>
              </div>
            </div>
            <el-icon
              v-else
              class="file-card-icon"
              :size="48"
              :color="getFileColor(file.type)"
            >
              <component :is="getFileIcon(file.type)" />
            </el-icon>
          </div>
          <div class="file-card-info">
            <div class="file-card-name text-ellipsis" :title="file.name">{{ file.name }}</div>
            <div class="file-card-meta">
              <span>{{ file.isFolder ? '-' : formatFileSize(file.size) }}</span>
              <span class="file-card-date">{{ formatDate(file.updatedAt) }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <MoveDialog v-if="showMoveDialog" :file-ids="moveFileIds" :mode="moveMode" @close="showMoveDialog = false" />
    <ShareDialog v-if="showShareDialog" :file-ids="shareFileIds" @close="showShareDialog = false" />
    <PropertiesDialog v-if="showPropertiesDialog" :file="propertiesFile" @close="showPropertiesDialog = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import MoveDialog from './MoveDialog.vue'
import ShareDialog from './ShareDialog.vue'
import PropertiesDialog from './PropertiesDialog.vue'
import { useAuthStore } from '../stores/auth'
import { useFileStore } from '../stores/file'
import { useUploadStore } from '../stores/upload'
import { formatFileSize, formatDate, getFileIcon, getFileColor, getPreviewUrl } from '../utils'

const props = defineProps({
  showToolbar: {
    type: Boolean,
    default: true
  }
})

const authStore = useAuthStore()
const fileStore = useFileStore()
const uploadStore = useUploadStore()

const canUpload = computed(() => authStore.hasPermission('upload'))
const canDownload = computed(() => authStore.hasPermission('download'))
const canShare = computed(() => authStore.hasPermission('share'))
const canDelete = computed(() => authStore.hasPermission('delete'))
const canCreate = computed(() => authStore.hasPermission('create'))

const isAllSelected = computed(() => {
  return fileStore.currentFiles.length > 0 && 
         fileStore.selectedFiles.length === fileStore.currentFiles.length
})

const isIndeterminate = computed(() => {
  return fileStore.selectedFiles.length > 0 && 
         fileStore.selectedFiles.length < fileStore.currentFiles.length
})

const showMoveDialog = ref(false)
const moveFileIds = ref([])
const moveMode = ref('move')

const showShareDialog = ref(false)
const shareFileIds = ref([])

const showPropertiesDialog = ref(false)
const propertiesFile = ref(null)

const dragTargetId = ref(null)
let dragFile = null

function getTypeLabel(type) {
  const labels = {
    folder: '文件夹',
    image: '图片',
    document: '文档',
    video: '视频',
    audio: '音频',
    archive: '压缩包',
    code: '代码',
    other: '其他'
  }
  return labels[type] || '其他'
}

function handleFileClick(file) {
  fileStore.toggleSelect(file.id)
}

function handleFileDoubleClick(file) {
  if (file.isFolder) {
    const newPath = fileStore.currentPath === '/' 
      ? '/' + file.name 
      : fileStore.currentPath + '/' + file.name
    fileStore.navigateTo(newPath)
  } else {
    handlePreview(file)
  }
}

function handleContextMenu(event, file) {
  window.dispatchEvent(new CustomEvent('show-context-menu', { 
    detail: { file } 
  }))
}

function handlePreview(file) {
  window.dispatchEvent(new CustomEvent('preview-file', { detail: file }))
}

function handleDownload(file) {
  if (!canDownload.value) {
    ElMessage.warning('请先登录后再下载')
    return
  }
  ElMessage.info('下载功能开发中')
}

function handleShare(file) {
  if (!canShare.value) {
    ElMessage.warning('请先登录后再分享')
    return
  }
  shareFileIds.value = [file.id]
  showShareDialog.value = true
}

function handleNewFolder() {
  if (!canCreate.value) {
    ElMessage.warning('请先登录后再创建文件夹')
    return
  }
  ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /^[^\\/:*?"<>|]+$/,
    inputErrorMessage: '文件夹名称不能包含特殊字符'
  }).then(({ value }) => {
    fileStore.createFolder(value)
    ElMessage.success('文件夹创建成功')
  }).catch(() => {})
}

function handleUpload() {
  if (!canUpload.value) {
    ElMessage.warning('请先登录后再上传')
    return
  }
  window.dispatchEvent(new CustomEvent('trigger-upload'))
}

function handleBatchDownload() {
  ElMessage.info('批量下载功能开发中')
}

function handleBatchShare() {
  shareFileIds.value = [...fileStore.selectedFiles]
  showShareDialog.value = true
}

function handleBatchDelete() {
  if (!canDelete.value) {
    ElMessage.warning('请先登录后再删除')
    return
  }
  ElMessageBox.confirm(
    `确定要删除选中的 ${fileStore.selectedFiles.length} 个文件吗？删除后可在回收站找回。`,
    '删除确认',
    {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    fileStore.deleteFiles([...fileStore.selectedFiles])
    ElMessage.success('已删除到回收站')
  }).catch(() => {})
}

function handleDragStart(event, file) {
  dragFile = file
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', file.id)
}

function handleDragOver(event, file) {
  if (file.isFolder && dragFile && dragFile.id !== file.id) {
    dragTargetId.value = file.id
    event.dataTransfer.dropEffect = 'move'
  }
}

function handleDragLeave() {
  dragTargetId.value = null
}

function handleDropOnFile(event, targetFolder) {
  if (targetFolder.isFolder && dragFile && dragFile.id !== targetFolder.id) {
    const targetPath = fileStore.currentPath === '/' 
      ? '/' + targetFolder.name 
      : fileStore.currentPath + '/' + targetFolder.name
    fileStore.moveFiles([dragFile.id], targetPath)
    ElMessage.success('移动成功')
  }
  handleDragEnd()
}

function handleDrop(event) {
  const files = Array.from(event.dataTransfer.files || [])
  if (files.length > 0 && canUpload.value) {
    uploadStore.addFiles(files, fileStore.currentPath)
    ElMessage.success(`已添加 ${files.length} 个文件到上传队列`)
  }
}

function handleDragEnd() {
  dragFile = null
  dragTargetId.value = null
}

function handleImagePreviewError(e) {
  e.target.style.display = 'none'
}

function handleShowMoveDialog(e) {
  moveFileIds.value = e.detail.fileIds
  moveMode.value = e.detail.mode
  showMoveDialog.value = true
}

function handleShowShareDialog(e) {
  shareFileIds.value = e.detail.fileIds
  showShareDialog.value = true
}

function handleShowProperties(e) {
  propertiesFile.value = e.detail.file
  showPropertiesDialog.value = true
}

function handleTriggerUpload() {
  handleUpload()
}

onMounted(() => {
  window.addEventListener('show-move-dialog', handleShowMoveDialog)
  window.addEventListener('show-share-dialog', handleShowShareDialog)
  window.addEventListener('show-properties', handleShowProperties)
  window.addEventListener('trigger-upload', handleTriggerUpload)
})

onUnmounted(() => {
  window.removeEventListener('show-move-dialog', handleShowMoveDialog)
  window.removeEventListener('show-share-dialog', handleShowShareDialog)
  window.removeEventListener('show-properties', handleShowProperties)
  window.removeEventListener('trigger-upload', handleTriggerUpload)
})
</script>

<style lang="scss" scoped>
.file-list-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.file-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  margin-bottom: 16px;
  border-bottom: 1px solid $border-color;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.file-count {
  font-size: 13px;
  color: $text-secondary;
}

.selected-count {
  font-size: 13px;
  color: $primary-color;
  margin-right: 8px;
}

.file-list-wrapper {
  flex: 1;
  overflow: auto;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  border: 1px solid $border-color;
}

.list-view {
  min-width: 600px;
}

.file-list-header {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;
  font-size: 13px;
  font-weight: 500;
  color: $text-secondary;
  position: sticky;
  top: 0;
  z-index: 1;
}

.file-list-header > div {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 4px;
}

.file-checkbox {
  width: 40px;
  flex-shrink: 0;
}

.file-name {
  flex: 2;
  min-width: 200px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.file-size {
  width: 100px;
  flex-shrink: 0;
}

.file-type {
  width: 80px;
  flex-shrink: 0;
}

.file-date {
  width: 180px;
  flex-shrink: 0;
}

.file-actions {
  width: 120px;
  flex-shrink: 0;
  display: flex;
  gap: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid $border-color;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-secondary;
  }

  &.selected {
    background: rgba(37, 99, 235, 0.05);
  }

  &.dragging {
    background: rgba(37, 99, 235, 0.15);
    border: 2px dashed $primary-color;
  }

  &:last-child {
    border-bottom: none;
  }
}

.file-icon {
  flex-shrink: 0;
}

.grid-view {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
  gap: 16px;
  padding: 16px;
}

.file-card {
  background: $bg-secondary;
  border-radius: $border-radius-lg;
  border: 2px solid transparent;
  padding: 16px;
  cursor: pointer;
  transition: all $transition-fast;
  position: relative;

  &:hover {
    background: $bg-tertiary;
    transform: translateY(-2px);
    box-shadow: $shadow-md;
  }

  &.selected {
    border-color: $primary-color;
    background: rgba(37, 99, 235, 0.05);
  }
}

.file-card-checkbox {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 1;
}

.file-card-preview {
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  position: relative;
}

.file-card-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.file-card-media {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--media-color);
  border-radius: 4px;
  overflow: hidden;
}

.file-card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0.8;
}

.file-card-media-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  background: rgba(0, 0, 0, 0.3);
}

.file-card-icon {
  font-size: 48px;
}

.file-card-name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 4px;
  text-align: center;
}

.file-card-meta {
  font-size: 12px;
  color: $text-muted;
  display: flex;
  justify-content: space-between;
}

@media (max-width: $breakpoint-md) {
  .file-toolbar {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toolbar-right {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }

  .list-view {
    min-width: 0;
  }

  .file-size, .file-type, .file-date {
    display: none;
  }

  .grid-view {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 12px;
    padding: 12px;
  }

  .file-card {
    padding: 12px;
  }

  .file-card-preview {
    height: 80px;
  }
}
</style>
