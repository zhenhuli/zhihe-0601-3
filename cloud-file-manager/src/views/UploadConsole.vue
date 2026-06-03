<template>
  <div class="upload-console-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <el-icon :size="24" color="#2563eb"><Upload /></el-icon>
          上传控制台
        </h1>
        <p class="page-subtitle">管理所有上传任务</p>
      </div>
      <div class="header-actions">
        <el-button @click="uploadStore.pauseAll" v-if="!allPaused">
          <el-icon><VideoPause /></el-icon>
          全部暂停
        </el-button>
        <el-button @click="uploadStore.resumeAll" v-else>
          <el-icon><VideoPlay /></el-icon>
          全部继续
        </el-button>
        <el-button type="danger" @click="uploadStore.cancelAll">
          <el-icon><Close /></el-icon>
          全部取消
        </el-button>
        <el-button @click="uploadStore.clearCompleted">
          <el-icon><Delete /></el-icon>
          清除已完成
        </el-button>
      </div>
    </div>

    <div class="console-stats">
      <div class="stat-card">
        <div class="stat-icon pending">
          <el-icon :size="24"><Clock /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ uploadStore.pendingTasks.length }}</div>
          <div class="stat-label">等待中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon uploading">
          <el-icon :size="24"><Upload /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ uploadStore.activeTasks.length }}</div>
          <div class="stat-label">上传中</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon completed">
          <el-icon :size="24"><CircleCheck /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ uploadStore.completedTasks.length }}</div>
          <div class="stat-label">已完成</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon failed">
          <el-icon :size="24"><Warning /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ uploadStore.failedTasks.length }}</div>
          <div class="stat-label">失败</div>
        </div>
      </div>
    </div>

    <div class="console-content">
      <el-tabs v-model="activeTab" size="large">
        <el-tab-pane name="all">
          <template #label>
            <span>全部任务 ({{ uploadStore.tasks.length }})</span>
          </template>
          <div v-if="uploadStore.tasks.length === 0" class="empty-state">
            <el-icon class="empty-icon" :size="48"><Upload /></el-icon>
            <div class="empty-text">暂无上传任务</div>
          </div>
          <div v-else class="task-list">
            <UploadTaskItem
              v-for="task in uploadStore.tasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane name="uploading">
          <template #label>
            <span>上传中 ({{ uploadingTasks.length }})</span>
          </template>
          <div v-if="uploadingTasks.length === 0" class="empty-state">
            <el-icon class="empty-icon" :size="48"><Upload /></el-icon>
            <div class="empty-text">暂无上传中任务</div>
          </div>
          <div v-else class="task-list">
            <UploadTaskItem
              v-for="task in uploadingTasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane name="completed">
          <template #label>
            <span>已完成 ({{ uploadStore.completedTasks.length }})</span>
          </template>
          <div v-if="uploadStore.completedTasks.length === 0" class="empty-state">
            <el-icon class="empty-icon" :size="48"><CircleCheck /></el-icon>
            <div class="empty-text">暂无已完成任务</div>
          </div>
          <div v-else class="task-list">
            <UploadTaskItem
              v-for="task in uploadStore.completedTasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </el-tab-pane>
        <el-tab-pane name="failed">
          <template #label>
            <span>失败 ({{ uploadStore.failedTasks.length }})</span>
          </template>
          <div v-if="uploadStore.failedTasks.length === 0" class="empty-state">
            <el-icon class="empty-icon" :size="48"><Warning /></el-icon>
            <div class="empty-text">暂无失败任务</div>
          </div>
          <div v-else class="task-list">
            <UploadTaskItem
              v-for="task in uploadStore.failedTasks"
              :key="task.id"
              :task="task"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import UploadTaskItem from '../components/UploadTaskItem.vue'
import { useUploadStore } from '../stores/upload'

const uploadStore = useUploadStore()

const activeTab = ref('all')

const uploadingTasks = computed(() => [
  ...uploadStore.pendingTasks,
  ...uploadStore.activeTasks
])

const allPaused = computed(() => {
  if (uploadStore.activeTasks.length === 0) return false
  return uploadStore.activeTasks.every(t => t && t.status === 'paused')
})
</script>

<style lang="scss" scoped>
.upload-console-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;

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
    gap: 8px;
    flex-wrap: wrap;
  }
}

.console-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid $border-color;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.pending { background: $warning-color; }
  &.uploading { background: $primary-color; }
  &.completed { background: $success-color; }
  &.failed { background: $danger-color; }
}

.stat-content {
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: $text-primary;
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 13px;
    color: $text-secondary;
  }
}

.console-content {
  flex: 1;
  overflow: hidden;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  border: 1px solid $border-color;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    padding: 16px;
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: $text-muted;

  .empty-icon {
    margin-bottom: 16px;
    opacity: 0.4;
  }

  .empty-text {
    font-size: 14px;
  }
}

@media (max-width: $breakpoint-md) {
  .page-header {
    flex-direction: column;
    gap: 16px;
  }

  .console-stats {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
