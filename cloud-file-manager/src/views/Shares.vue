<template>
  <div class="shares-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <el-icon :size="24" color="#6366f1"><Share /></el-icon>
          我的分享
        </h1>
        <p class="page-subtitle">管理您创建的所有分享链接</p>
      </div>
    </div>

    <div class="shares-content">
      <div v-if="fileStore.shares.length === 0" class="empty-state">
        <el-icon class="empty-icon" :size="64" color="#6366f1"><Share /></el-icon>
        <div class="empty-text">暂无分享记录</div>
        <el-button type="primary" style="margin-top: 16px" @click="$router.push('/files')">
          去创建分享
        </el-button>
      </div>

      <div v-else class="shares-list">
        <div
          v-for="share in fileStore.shares"
          :key="share.shareId"
          class="share-card"
        >
          <div class="share-header">
            <div class="share-info">
              <el-icon :size="20" :color="share.type === 'public' ? '#10b981' : '#f59e0b'">
                <Link v-if="share.type === 'public'" />
                <Lock v-else />
              </el-icon>
              <span class="share-type">{{ share.type === 'public' ? '公开分享' : '私密分享' }}</span>
              <el-tag :type="share.status === 'active' ? 'success' : 'info'" size="small">
                {{ share.status === 'active' ? '生效中' : '已取消' }}
              </el-tag>
            </div>
            <div class="share-actions">
              <el-button size="small" text @click="copyLink(share)">
                <el-icon><CopyDocument /></el-icon>
                复制链接
              </el-button>
              <el-button size="small" text type="danger" @click="cancelShare(share)" v-if="share.status === 'active'">
                <el-icon><Close /></el-icon>
                取消分享
              </el-button>
            </div>
          </div>

          <div class="share-files">
            <div class="files-title">分享的文件 ({{ share.fileIds.length }})</div>
            <div class="files-preview">
              <div
                v-for="fileId in share.fileIds.slice(0, 5)"
                :key="fileId"
                class="file-chip"
              >
                <el-icon :size="14" :color="getFileColor(getFileById(fileId)?.type)">
                  <component :is="getFileIcon(getFileById(fileId)?.type)" />
                </el-icon>
                <span class="text-ellipsis">{{ getFileById(fileId)?.name || '未知文件' }}</span>
              </div>
              <div v-if="share.fileIds.length > 5" class="file-more">
                +{{ share.fileIds.length - 5 }}
              </div>
            </div>
          </div>

          <div class="share-stats">
            <div class="stat-item">
              <el-icon><View /></el-icon>
              <span>{{ share.views }} 次浏览</span>
            </div>
            <div class="stat-item">
              <el-icon><Download /></el-icon>
              <span>{{ share.downloads }} 次下载</span>
            </div>
            <div class="stat-item">
              <el-icon><Clock /></el-icon>
              <span>{{ formatDate(share.createdAt) }} 创建</span>
            </div>
            <div class="stat-item" v-if="share.expireDays > 0">
              <el-icon><Timer /></el-icon>
              <span>{{ share.expireDays }} 天有效期</span>
            </div>
            <div class="stat-item" v-if="share.maxViews">
              <el-icon><User /></el-icon>
              <span>限{{ share.maxViews }}次访问</span>
            </div>
            <div class="stat-item" v-if="share.password">
              <el-icon><Key /></el-icon>
              <span>提取码: {{ share.password }}</span>
            </div>
          </div>

          <div class="share-link">
            <el-input :model-value="getShareLink(share)" readonly>
              <template #append>
                <el-button @click="copyLink(share)">复制</el-button>
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ElMessage } from 'element-plus'
import { useFileStore } from '../stores/file'

const fileStore = useFileStore()

function getFileById(id) {
  return fileStore.getFileById(id)
}

function getFileIcon(type) {
  const icons = {
    folder: 'Folder',
    image: 'Picture',
    document: 'Document',
    video: 'VideoCamera',
    audio: 'Headset',
    archive: 'Files',
    code: 'Code',
    other: 'QuestionFilled'
  }
  return icons[type] || icons.other
}

function getFileColor(type) {
  const colors = {
    folder: '#f59e0b',
    image: '#ec4899',
    document: '#3b82f6',
    video: '#8b5cf6',
    audio: '#10b981',
    archive: '#f97316',
    code: '#06b6d4',
    other: '#6b7280'
  }
  return colors[type] || colors.other
}

function getShareLink(share) {
  return `${window.location.origin}/#/share/${share.shareId}`
}

function copyLink(share) {
  const link = getShareLink(share)
  navigator.clipboard.writeText(link)
  ElMessage.success('链接已复制')
}

function cancelShare(share) {
  ElMessage.confirm('确定要取消此分享吗？', '取消分享', {
    type: 'warning'
  }).then(() => {
    fileStore.cancelShare(share.shareId)
    ElMessage.success('分享已取消')
  }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.shares-page {
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

.shares-content {
  flex: 1;
  overflow: auto;
}

.shares-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.share-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 20px;
  border: 1px solid $border-color;
  transition: all $transition-fast;

  &:hover {
    box-shadow: $shadow-md;
  }
}

.share-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.share-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.share-type {
  font-weight: 600;
  color: $text-primary;
}

.share-actions {
  display: flex;
  gap: 8px;
}

.share-files {
  margin-bottom: 16px;
  padding: 12px;
  background: $bg-secondary;
  border-radius: $border-radius;
}

.files-title {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 8px;
}

.files-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.file-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  background: $bg-primary;
  border-radius: 16px;
  font-size: 12px;
  color: $text-primary;
  max-width: 200px;
}

.file-more {
  padding: 4px 10px;
  background: $bg-tertiary;
  border-radius: 16px;
  font-size: 12px;
  color: $text-secondary;
}

.share-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: $text-secondary;
}

.share-link {
  :deep(.el-input__wrapper) {
    background: $bg-secondary;
  }
}

@media (max-width: $breakpoint-md) {
  .share-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .share-stats {
    gap: 12px;
  }
}
</style>
