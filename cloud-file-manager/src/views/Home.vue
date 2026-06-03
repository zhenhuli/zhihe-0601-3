<template>
  <div class="home-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">欢迎回来，{{ authStore.user?.username || '用户' }}</h1>
        <p class="page-subtitle">管理您的云端文件，随时访问，安全可靠</p>
      </div>
      <div class="quick-actions">
        <el-button type="primary" size="large" @click="handleUpload" :disabled="!canUpload">
          <el-icon><Upload /></el-icon>
          上传文件
        </el-button>
        <el-button size="large" @click="handleNewFolder" :disabled="!canCreate">
          <el-icon><FolderAdd /></el-icon>
          新建文件夹
        </el-button>
      </div>
    </div>

    <div class="storage-section">
      <div class="storage-card">
        <div class="storage-header">
          <h3><el-icon><DataAnalysis /></el-icon> 存储空间</h3>
          <el-button text type="primary" size="small">升级容量</el-button>
        </div>
        <div class="storage-body">
          <div class="storage-chart" ref="chartRef"></div>
          <div class="storage-info">
            <div class="storage-usage">
              <span class="used">{{ formatFileSize(storageStats.used) }}</span>
              <span class="total">/ {{ formatFileSize(storageStats.total) }}</span>
            </div>
            <div class="storage-bar-large">
              <div class="storage-used-bar" :style="{ width: storageStats.percentage + '%' }"></div>
            </div>
            <div class="storage-stats">
              <div class="stat-item">
                <span class="stat-label">已使用</span>
                <span class="stat-value">{{ storageStats.percentage }}%</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">剩余</span>
                <span class="stat-value">{{ formatFileSize(storageStats.free) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="category-cards">
        <div
          v-for="item in categoryList"
          :key="item.type"
          class="category-card"
          :style="{ '--color': item.color }"
          @click="goToCategory(item.path)"
        >
          <div class="category-icon">
            <el-icon :size="28"><component :is="item.icon" /></el-icon>
          </div>
          <div class="category-info">
            <div class="category-name">{{ item.name }}</div>
            <div class="category-count">{{ item.count }} 个文件</div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-section">
      <div class="recent-files card">
        <div class="section-header">
          <h3><el-icon><Clock /></el-icon> 最近文件</h3>
          <el-button text type="primary" size="small" @click="$router.push('/files')">查看全部</el-button>
        </div>
        <div v-if="fileStore.recentFiles.length === 0" class="empty-state">
          <el-icon class="empty-icon"><FolderOpened /></el-icon>
          <div class="empty-text">暂无文件</div>
        </div>
        <div v-else class="recent-list">
          <div
            v-for="file in fileStore.recentFiles.slice(0, 5)"
            :key="file.id"
            class="recent-item"
            @click="handlePreview(file)"
          >
            <el-icon
              class="recent-icon"
              :size="20"
              :color="getFileColor(file.type)"
            >
              <component :is="getFileIcon(file.type)" />
            </el-icon>
            <div class="recent-info">
              <div class="recent-name text-ellipsis">{{ file.name }}</div>
              <div class="recent-meta">
                <span>{{ formatFileSize(file.size) }}</span>
                <span>{{ formatDate(file.updatedAt) }}</span>
              </div>
            </div>
            <el-button text size="small" @click.stop="handlePreview(file)">
              <el-icon><View /></el-icon>
            </el-button>
          </div>
        </div>
      </div>

      <div class="quick-access card">
        <div class="section-header">
          <h3><el-icon><Star /></el-icon> 快捷操作</h3>
        </div>
        <div class="shortcut-grid">
          <div class="shortcut-item" @click="handleUpload" :disabled="!canUpload">
            <div class="shortcut-icon upload">
              <el-icon :size="24"><Upload /></el-icon>
            </div>
            <span>上传文件</span>
          </div>
          <div class="shortcut-item" @click="handleUploadFolder" :disabled="!canUpload">
            <div class="shortcut-icon folder">
              <el-icon :size="24"><FolderAdd /></el-icon>
            </div>
            <span>上传文件夹</span>
          </div>
          <div class="shortcut-item" @click="handleNewFolder" :disabled="!canCreate">
            <div class="shortcut-icon create">
              <el-icon :size="24"><FolderOpened /></el-icon>
            </div>
            <span>新建文件夹</span>
          </div>
          <div class="shortcut-item" @click="$router.push('/shares')">
            <div class="shortcut-icon share">
              <el-icon :size="24"><Share /></el-icon>
            </div>
            <span>我的分享</span>
          </div>
        </div>

        <div class="shortcuts-help">
          <h4>键盘快捷键</h4>
          <div class="shortcut-list">
            <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>A</kbd><span>全选</span></div>
            <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>F</kbd><span>搜索</span></div>
            <div class="shortcut-row"><kbd>Ctrl</kbd> + <kbd>U</kbd><span>上传</span></div>
            <div class="shortcut-row"><kbd>Delete</kbd><span>删除</span></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import * as echarts from 'echarts'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useFileStore } from '../stores/file'
import { useUploadStore } from '../stores/upload'
import { formatFileSize, formatDate, getFileIcon, getFileColor } from '../utils'

const router = useRouter()
const authStore = useAuthStore()
const fileStore = useFileStore()
const uploadStore = useUploadStore()

const chartRef = ref(null)
let chartInstance = null

const canUpload = computed(() => authStore.hasPermission('upload'))
const canCreate = computed(() => authStore.hasPermission('create'))

const storageStats = computed(() => fileStore.storageStats)
const categoryStats = computed(() => fileStore.categoryStats)

const categoryList = computed(() => [
  { type: 'image', name: '图片', icon: 'Picture', color: '#ec4899', count: categoryStats.value.image, path: '/images' },
  { type: 'document', name: '文档', icon: 'Document', color: '#3b82f6', count: categoryStats.value.document, path: '/documents' },
  { type: 'video', name: '视频', icon: 'VideoCamera', color: '#8b5cf6', count: categoryStats.value.video, path: '/videos' },
  { type: 'archive', name: '压缩包', icon: 'Files', color: '#f97316', count: categoryStats.value.archive, path: '/archives' }
])

function initChart() {
  if (!chartRef.value) return
  
  chartInstance = echarts.init(chartRef.value)
  
  const option = {
    series: [
      {
        type: 'gauge',
        startAngle: 90,
        endAngle: -270,
        pointer: { show: false },
        progress: {
          show: true,
          overlap: false,
          roundCap: true,
          clip: false,
          itemStyle: {
            color: {
              type: 'linear',
              x: 0, y: 0, x2: 1, y2: 1,
              colorStops: [
                { offset: 0, color: '#667eea' },
                { offset: 1, color: '#764ba2' }
              ]
            }
          }
        },
        axisLine: {
          lineStyle: {
            width: 12,
            color: [[1, '#f3f4f6']]
          }
        },
        splitLine: { show: false },
        axisTick: { show: false },
        axisLabel: { show: false },
        data: [{ value: storageStats.value.percentage }],
        detail: {
          fontSize: 24,
          fontWeight: 'bold',
          offsetCenter: [0, 0],
          formatter: '{value}%',
          color: '#1f2937'
        }
      }
    ]
  }
  
  chartInstance.setOption(option)
}

function handleUpload() {
  if (!canUpload.value) {
    ElMessage.warning('请先登录后再上传')
    router.push('/login')
    return
  }
  window.dispatchEvent(new CustomEvent('trigger-upload'))
}

function handleUploadFolder() {
  if (!canUpload.value) {
    ElMessage.warning('请先登录后再上传')
    router.push('/login')
    return
  }
  window.dispatchEvent(new CustomEvent('trigger-upload-folder'))
}

function handleNewFolder() {
  if (!canCreate.value) {
    ElMessage.warning('请先登录后再创建文件夹')
    router.push('/login')
    return
  }
  ElMessageBox.prompt('请输入文件夹名称', '新建文件夹', {
    confirmButtonText: '创建',
    cancelButtonText: '取消',
    inputPattern: /^[^\\/:*?"<>|]+$/,
    inputErrorMessage: '文件夹名称不能包含特殊字符'
  }).then(({ value }) => {
    fileStore.createFolder(value, '/')
    ElMessage.success('文件夹创建成功')
  }).catch(() => {})
}

function handlePreview(file) {
  window.dispatchEvent(new CustomEvent('preview-file', { detail: file }))
}

function goToCategory(path) {
  router.push(path)
}

onMounted(() => {
  initChart()
  window.addEventListener('resize', handleResize)
})

function handleResize() {
  chartInstance?.resize()
}

onUnmounted(() => {
  chartInstance?.dispose()
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.home-page {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;

  .page-title {
    font-size: 28px;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 4px;
  }

  .page-subtitle {
    font-size: 14px;
    color: $text-secondary;
  }

  .quick-actions {
    display: flex;
    gap: 12px;
  }
}

.storage-section {
  display: grid;
  grid-template-columns: 400px 1fr;
  gap: 20px;
  margin-bottom: 24px;
}

.storage-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 24px;
  box-shadow: $shadow-sm;
  border: 1px solid $border-color;

  .storage-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 16px;
      font-weight: 600;
    }
  }

  .storage-body {
    display: flex;
    align-items: center;
    gap: 24px;
  }

  .storage-chart {
    width: 180px;
    height: 180px;
    flex-shrink: 0;
  }

  .storage-info {
    flex: 1;
  }

  .storage-usage {
    margin-bottom: 12px;

    .used {
      font-size: 24px;
      font-weight: 700;
      color: $text-primary;
    }

    .total {
      font-size: 14px;
      color: $text-secondary;
    }
  }

  .storage-bar-large {
    height: 10px;
    background: $bg-tertiary;
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 16px;
  }

  .storage-used-bar {
    height: 100%;
    background: linear-gradient(90deg, $primary-color, $info-color);
    border-radius: 5px;
    transition: width $transition-normal;
  }

  .storage-stats {
    display: flex;
    gap: 24px;
  }

  .stat-item {
    display: flex;
    flex-direction: column;
    gap: 4px;

    .stat-label {
      font-size: 12px;
      color: $text-muted;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
      color: $text-primary;
    }
  }
}

.category-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.category-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 20px;
  cursor: pointer;
  transition: all $transition-normal;
  border: 1px solid $border-color;
  display: flex;
  align-items: center;
  gap: 16px;

  &:hover {
    transform: translateY(-2px);
    box-shadow: $shadow-md;
    border-color: var(--color);
  }

  .category-icon {
    width: 56px;
    height: 56px;
    border-radius: $border-radius;
    background: var(--color);
    opacity: 0.15;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color);
  }

  .category-info {
    .category-name {
      font-size: 15px;
      font-weight: 600;
      color: $text-primary;
      margin-bottom: 4px;
    }

    .category-count {
      font-size: 13px;
      color: $text-secondary;
    }
  }
}

.content-section {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 20px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid $border-color;

  h3 {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 16px;
    font-weight: 600;
  }
}

.recent-files, .quick-access {
  padding: 20px;
}

.recent-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.recent-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: $border-radius;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-secondary;
  }

  .recent-icon {
    flex-shrink: 0;
  }

  .recent-info {
    flex: 1;
    min-width: 0;
  }

  .recent-name {
    font-size: 14px;
    color: $text-primary;
    margin-bottom: 2px;
  }

  .recent-meta {
    display: flex;
    gap: 16px;
    font-size: 12px;
    color: $text-muted;
  }
}

.shortcut-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}

.shortcut-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 20px;
  border-radius: $border-radius;
  background: $bg-secondary;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-tertiary;
    transform: translateY(-1px);
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .shortcut-icon {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: white;

    &.upload { background: $primary-color; }
    &.folder { background: $success-color; }
    &.create { background: $warning-color; }
    &.share { background: $info-color; }
  }

  span {
    font-size: 13px;
    color: $text-secondary;
  }
}

.shortcuts-help {
  h4 {
    font-size: 14px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 12px;
  }

  .shortcut-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: $text-secondary;

    kbd {
      display: inline-block;
      padding: 2px 6px;
      background: $bg-tertiary;
      border-radius: 4px;
      font-family: 'Monaco', 'Menlo', monospace;
      font-size: 11px;
      border: 1px solid $border-color;
    }

    span {
      margin-left: auto;
    }
  }
}

@media (max-width: $breakpoint-lg) {
  .storage-section {
    grid-template-columns: 1fr;
  }

  .content-section {
    grid-template-columns: 1fr;
  }
}

@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .category-cards {
    grid-template-columns: repeat(2, 1fr);
  }

  .storage-card .storage-body {
    flex-direction: column;
    text-align: center;
  }
}
</style>
