<template>
  <div class="category-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <el-icon :size="24" :color="categoryInfo.color">
            <component :is="categoryInfo.icon" />
          </el-icon>
          {{ categoryInfo.name }}
        </h1>
        <p class="page-subtitle">共 {{ files.length }} 个文件</p>
      </div>
    </div>

    <div class="category-content">
      <div v-if="files.length === 0" class="empty-state">
        <el-icon class="empty-icon" :size="64" :color="categoryInfo.color">
          <component :is="categoryInfo.icon" />
        </el-icon>
        <div class="empty-text">暂无{{ categoryInfo.name }}文件</div>
      </div>

      <div v-else class="file-grid">
        <div
          v-for="file in files"
          :key="file.id"
          class="file-card"
          :class="{ selected: fileStore.selectedFiles.includes(file.id) }"
          @click="handleFileClick(file)"
          @dblclick="handleFileDoubleClick(file)"
          @contextmenu.prevent="handleContextMenu($event, file)"
        >
          <div class="file-preview">
            <el-icon
              class="file-icon"
              :size="48"
              :color="getFileColor(file.type)"
            >
              <component :is="getFileIcon(file.type)" />
            </el-icon>
          </div>
          <div class="file-info">
            <div class="file-name text-ellipsis" :title="file.name">{{ file.name }}</div>
            <div class="file-meta">
              <span>{{ formatFileSize(file.size) }}</span>
              <span>{{ formatDate(file.updatedAt) }}</span>
            </div>
          </div>
          <div class="file-actions">
            <el-button text size="small" @click.stop="handlePreview(file)">
              <el-icon><View /></el-icon>
            </el-button>
            <el-button text size="small" @click.stop="handleShare(file)" :disabled="!canShare">
              <el-icon><Share /></el-icon>
            </el-button>
            <el-button text size="small" @click.stop="handleDownload(file)" :disabled="!canDownload">
              <el-icon><Download /></el-icon>
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useFileStore } from '../stores/file'
import { useAuthStore } from '../stores/auth'
import { formatFileSize, formatDate, getFileIcon, getFileColor } from '../utils'

const route = useRoute()
const fileStore = useFileStore()
const authStore = useAuthStore()

const canDownload = computed(() => authStore.hasPermission('download'))
const canShare = computed(() => authStore.hasPermission('share'))

const categoryInfo = computed(() => {
  const category = route.meta.category
  const infoMap = {
    image: { name: '图片', icon: 'Picture', color: '#ec4899' },
    document: { name: '文档', icon: 'Document', color: '#3b82f6' },
    video: { name: '视频', icon: 'VideoCamera', color: '#8b5cf6' },
    audio: { name: '音频', icon: 'Headset', color: '#10b981' },
    archive: { name: '压缩包', icon: 'Files', color: '#f97316' },
    code: { name: '代码', icon: 'Code', color: '#06b6d4' }
  }
  return infoMap[category] || infoMap.image
})

const files = computed(() => {
  const category = route.meta.category
  return fileStore.getFilesByType(category)
})

function handleFileClick(file) {
  fileStore.toggleSelect(file.id)
}

function handleFileDoubleClick(file) {
  window.dispatchEvent(new CustomEvent('preview-file', { detail: file }))
}

function handleContextMenu(event, file) {
  window.dispatchEvent(new CustomEvent('show-context-menu', { detail: { file } }))
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
  window.dispatchEvent(new CustomEvent('show-share-dialog', { detail: { fileIds: [file.id] } }))
}

onMounted(() => {
  fileStore.clearSelection()
})
</script>

<style lang="scss" scoped>
.category-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 20px;

  .page-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 24px;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 4px;
  }

  .page-subtitle {
    font-size: 14px;
    color: $text-secondary;
  }
}

.category-content {
  flex: 1;
  overflow: auto;
}

.file-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 16px;
}

.file-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  border: 2px solid transparent;
  padding: 16px;
  cursor: pointer;
  transition: all $transition-normal;

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

.file-preview {
  height: 120px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-secondary;
  border-radius: $border-radius;
  margin-bottom: 12px;
}

.file-info {
  margin-bottom: 12px;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 4px;
  text-align: center;
}

.file-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: $text-muted;
}

.file-actions {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid $border-color;
}

@media (max-width: $breakpoint-md) {
  .file-grid {
    grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
    gap: 12px;
  }

  .file-preview {
    height: 80px;
  }
}
</style>
