<template>
  <div class="recycle-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <el-icon :size="24" color="#ef4444"><Delete /></el-icon>
          回收站
        </h1>
        <p class="page-subtitle">删除的文件将在30天后自动清理</p>
      </div>
      <div class="header-actions" v-if="fileStore.recycleBin.length > 0">
        <el-button @click="handleRestoreAll" :disabled="!canRestore">
          <el-icon><RefreshRight /></el-icon>
          全部恢复
        </el-button>
        <el-button type="danger" @click="handleClearAll" :disabled="!canDelete">
          <el-icon><Delete /></el-icon>
          清空回收站
        </el-button>
      </div>
    </div>

    <div class="recycle-content">
      <div v-if="fileStore.recycleBin.length === 0" class="empty-state">
        <el-icon class="empty-icon" :size="64" color="#ef4444"><Delete /></el-icon>
        <div class="empty-text">回收站为空</div>
      </div>

      <div v-else class="recycle-list">
        <div
          v-for="file in fileStore.recycleBin"
          :key="file.id"
          class="recycle-item"
          :class="{ selected: selectedFiles.includes(file.id) }"
          @click="toggleSelect(file.id)"
        >
          <div class="item-checkbox">
            <el-checkbox :model-value="selectedFiles.includes(file.id)" />
          </div>
          <div class="item-icon">
            <el-icon
              :size="24"
              :color="getFileColor(file.type)"
            >
              <component :is="getFileIcon(file.type)" />
            </el-icon>
          </div>
          <div class="item-info">
            <div class="item-name">{{ file.name }}</div>
            <div class="item-path">{{ file.path || '/' }}</div>
          </div>
          <div class="item-size">{{ file.isFolder ? '-' : formatFileSize(file.size) }}</div>
          <div class="item-deleted">{{ formatDate(file.deletedAt) }} 删除</div>
          <div class="item-actions">
            <el-button size="small" @click.stop="handleRestore(file)">
              <el-icon><RefreshRight /></el-icon>
              恢复
            </el-button>
            <el-button size="small" type="danger" @click.stop="handleDeletePermanent(file)">
              <el-icon><Delete /></el-icon>
              永久删除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="selectedFiles.length > 0" class="batch-actions">
      <span>已选择 {{ selectedFiles.length }} 项</span>
      <el-button size="small" @click="handleBatchRestore" :disabled="!canRestore">
        <el-icon><RefreshRight /></el-icon>
        恢复选中
      </el-button>
      <el-button size="small" type="danger" @click="handleBatchDelete" :disabled="!canDelete">
        <el-icon><Delete /></el-icon>
        永久删除
      </el-button>
      <el-button size="small" @click="selectedFiles = []">
        取消选择
      </el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useFileStore } from '../stores/file'
import { useAuthStore } from '../stores/auth'
import { formatFileSize, formatDate, getFileIcon, getFileColor } from '../utils'

const fileStore = useFileStore()
const authStore = useAuthStore()

const selectedFiles = ref([])

const canRestore = computed(() => authStore.hasPermission('edit'))
const canDelete = computed(() => authStore.hasPermission('delete'))

function toggleSelect(id) {
  const index = selectedFiles.value.indexOf(id)
  if (index > -1) {
    selectedFiles.value.splice(index, 1)
  } else {
    selectedFiles.value.push(id)
  }
}

function handleRestore(file) {
  fileStore.restoreFiles([file.id])
  ElMessage.success('恢复成功')
  selectedFiles.value = selectedFiles.value.filter(id => id !== file.id)
}

function handleDeletePermanent(file) {
  ElMessageBox.confirm(
    '确定要永久删除该文件吗？此操作不可恢复。',
    '永久删除',
    { type: 'warning' }
  ).then(() => {
    fileStore.deleteFiles([file.id], true)
    ElMessage.success('已永久删除')
    selectedFiles.value = selectedFiles.value.filter(id => id !== file.id)
  }).catch(() => {})
}

function handleRestoreAll() {
  const ids = fileStore.recycleBin.map(f => f.id)
  fileStore.restoreFiles(ids)
  ElMessage.success('全部恢复成功')
  selectedFiles.value = []
}

function handleClearAll() {
  ElMessageBox.confirm(
    '确定要清空回收站吗？所有文件将被永久删除，此操作不可恢复。',
    '清空回收站',
    { type: 'warning' }
  ).then(() => {
    const ids = fileStore.recycleBin.map(f => f.id)
    fileStore.deleteFiles(ids, true)
    ElMessage.success('回收站已清空')
    selectedFiles.value = []
  }).catch(() => {})
}

function handleBatchRestore() {
  fileStore.restoreFiles([...selectedFiles.value])
  ElMessage.success('恢复成功')
  selectedFiles.value = []
}

function handleBatchDelete() {
  ElMessageBox.confirm(
    `确定要永久删除选中的 ${selectedFiles.value.length} 个文件吗？此操作不可恢复。`,
    '永久删除',
    { type: 'warning' }
  ).then(() => {
    fileStore.deleteFiles([...selectedFiles.value], true)
    ElMessage.success('已永久删除')
    selectedFiles.value = []
  }).catch(() => {})
}
</script>

<style lang="scss" scoped>
.recycle-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
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

  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.recycle-content {
  flex: 1;
  overflow: auto;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  border: 1px solid $border-color;
}

.recycle-list {
  min-width: 600px;
}

.recycle-item {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid $border-color;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-secondary;
  }

  &.selected {
    background: rgba(37, 99, 235, 0.05);
  }

  &:last-child {
    border-bottom: none;
  }
}

.item-checkbox {
  width: 40px;
  flex-shrink: 0;
}

.item-icon {
  width: 40px;
  flex-shrink: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-name {
  font-size: 14px;
  font-weight: 500;
  color: $text-primary;
  margin-bottom: 2px;
}

.item-path {
  font-size: 12px;
  color: $text-muted;
}

.item-size {
  width: 120px;
  font-size: 13px;
  color: $text-secondary;
  flex-shrink: 0;
}

.item-deleted {
  width: 160px;
  font-size: 13px;
  color: $text-secondary;
  flex-shrink: 0;
}

.item-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  border: 1px solid $border-color;
  margin-top: 16px;
}

@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .item-size, .item-deleted {
    display: none;
  }
}
</style>
