<template>
  <div class="share-preview-page">
    <div class="preview-container">
      <div class="preview-header">
        <div class="brand">
          <el-icon :size="28" color="#2563eb"><Cloud /></el-icon>
          <span class="brand-name">智云盘</span>
        </div>
      </div>

      <div v-if="!unlocked" class="password-section">
        <div class="password-card">
          <el-icon :size="48" color="#f59e0b"><Lock /></el-icon>
          <h2>私密分享</h2>
          <p>请输入提取密码以访问分享内容</p>
          <el-input
            v-model="password"
            placeholder="请输入提取密码"
            size="large"
            maxlength="6"
            @keyup.enter="verifyPassword"
          >
            <template #append>
              <el-button type="primary" @click="verifyPassword">提取</el-button>
            </template>
          </el-input>
          <p class="password-tip">密码由分享者提供</p>
        </div>
      </div>

      <div v-else-if="expired" class="expired-section">
        <el-icon :size="64" color="#ef4444"><Clock /></el-icon>
        <h2>分享已过期</h2>
        <p>该分享链接已过期或已被取消</p>
        <el-button type="primary" @click="$router.push('/login')">返回首页</el-button>
      </div>

      <div v-else class="share-content">
        <div class="share-info">
          <div class="share-title">
            <h2>{{ shareFiles.length }} 个文件</h2>
            <el-tag :type="share?.type === 'public' ? 'success' : 'warning'" size="small">
              {{ share?.type === 'public' ? '公开分享' : '私密分享' }}
            </el-tag>
          </div>
          <p class="share-meta">
            浏览 {{ share?.views }} 次 · 
            {{ share?.allowDownload ? '允许下载' : '仅预览' }} ·
            {{ share?.expireDays > 0 ? `有效期${share?.expireDays}天` : '永久有效' }}
          </p>
        </div>

        <div class="file-list">
          <div
            v-for="file in shareFiles"
            :key="file.id"
            class="file-item"
            @click="handlePreview(file)"
          >
            <el-icon
              class="file-icon"
              :size="24"
              :color="getFileColor(file.type)"
            >
              <component :is="getFileIcon(file.type)" />
            </el-icon>
            <div class="file-info">
              <div class="file-name">{{ file.name }}</div>
              <div class="file-size">{{ file.isFolder ? '-' : formatFileSize(file.size) }}</div>
            </div>
            <div class="file-actions">
              <el-button size="small" text @click.stop="handlePreview(file)">
                <el-icon><View /></el-icon>
                预览
              </el-button>
              <el-button
                v-if="share?.allowDownload"
                size="small"
                type="primary"
                text
                @click.stop="handleDownload(file)"
              >
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
          </div>
        </div>

        <div class="download-all">
          <el-button type="primary" size="large" :disabled="!share?.allowDownload" @click="handleDownloadAll">
            <el-icon><Download /></el-icon>
            下载全部 ({{ shareFiles.length }} 个文件)
          </el-button>
        </div>
      </div>

      <div class="preview-footer">
        <p>© 2024 智云盘 - 安全可靠的云端存储服务</p>
      </div>
    </div>

    <PreviewDialog ref="previewDialog" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import PreviewDialog from '../components/PreviewDialog.vue'
import { useFileStore } from '../stores/file'
import { formatFileSize, getFileIcon, getFileColor } from '../utils'

const route = useRoute()
const router = useRouter()
const fileStore = useFileStore()

const previewDialog = ref(null)
const password = ref('')
const unlocked = ref(false)

const share = computed(() => {
  const shareId = route.params.shareId
  return fileStore.shares.find(s => s.shareId === shareId)
})

const expired = computed(() => {
  if (!share.value) return true
  if (share.value.status !== 'active') return true
  if (share.value.expireDays > 0) {
    const age = (Date.now() - share.value.createdAt) / (24 * 60 * 60 * 1000)
    if (age > share.value.expireDays) return true
  }
  if (share.value.maxViews && share.value.views >= share.value.maxViews) return true
  return false
})

const shareFiles = computed(() => {
  if (!share.value) return []
  return share.value.fileIds.map(id => fileStore.getFileById(id)).filter(Boolean)
})

function verifyPassword() {
  if (!share.value) {
    ElMessage.error('分享不存在')
    return
  }
  if (password.value === share.value.password) {
    unlocked.value = true
    recordView()
  } else {
    ElMessage.error('密码错误')
  }
}

function recordView() {
  if (share.value) {
    share.value.views++
    localStorage.setItem('shares', JSON.stringify(fileStore.shares))
  }
}

function handlePreview(file) {
  if (file.isFolder) {
    ElMessage.info('文件夹暂不支持预览')
    return
  }
  previewDialog.value?.open(file)
}

function handleDownload(file) {
  if (share.value) {
    share.value.downloads++
    localStorage.setItem('shares', JSON.stringify(fileStore.shares))
  }
  ElMessage.info('下载功能开发中')
}

function handleDownloadAll() {
  if (share.value) {
    share.value.downloads += shareFiles.value.length
    localStorage.setItem('shares', JSON.stringify(fileStore.shares))
  }
  ElMessage.info('批量下载功能开发中')
}

onMounted(() => {
  if (share.value?.type === 'public') {
    unlocked.value = true
    recordView()
  }
})
</script>

<style lang="scss" scoped>
.share-preview-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  display: flex;
  flex-direction: column;
}

.preview-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  max-width: 900px;
  margin: 0 auto;
  width: 100%;
  padding: 20px;
}

.preview-header {
  padding: 16px 0;
  margin-bottom: 24px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-name {
  font-size: 20px;
  font-weight: 700;
  color: $text-primary;
}

.password-section {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.password-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 48px 32px;
  text-align: center;
  box-shadow: $shadow-lg;
  width: 100%;
  max-width: 400px;

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
    margin: 16px 0 8px;
  }

  p {
    font-size: 14px;
    color: $text-secondary;
    margin-bottom: 24px;
  }

  .password-tip {
    font-size: 12px;
    color: $text-muted;
    margin-top: 12px;
    margin-bottom: 0;
  }
}

.expired-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;

  h2 {
    font-size: 24px;
    font-weight: 600;
    color: $text-primary;
    margin: 16px 0 8px;
  }

  p {
    font-size: 14px;
    color: $text-secondary;
    margin-bottom: 24px;
  }
}

.share-content {
  flex: 1;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 24px;
  box-shadow: $shadow-md;
}

.share-info {
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;
}

.share-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;

  h2 {
    font-size: 20px;
    font-weight: 600;
    color: $text-primary;
  }
}

.share-meta {
  font-size: 13px;
  color: $text-secondary;
}

.file-list {
  margin-bottom: 24px;
}

.file-item {
  display: flex;
  align-items: center;
  padding: 12px;
  border-radius: $border-radius;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-secondary;
  }
}

.file-icon {
  flex-shrink: 0;
  margin-right: 12px;
}

.file-info {
  flex: 1;
  min-width: 0;
}

.file-name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 2px;
}

.file-size {
  font-size: 12px;
  color: $text-muted;
}

.file-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.download-all {
  display: flex;
  justify-content: center;
}

.preview-footer {
  text-align: center;
  padding: 20px 0;
  font-size: 12px;
  color: $text-muted;
}

@media (max-width: $breakpoint-md) {
  .preview-container {
    padding: 12px;
  }

  .password-card {
    padding: 32px 20px;
  }

  .share-content {
    padding: 16px;
  }
}
</style>
