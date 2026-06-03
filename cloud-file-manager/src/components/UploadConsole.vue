<template>
  <div class="upload-console" :class="{ expanded: isExpanded }">
    <div class="console-header" @click="isExpanded = !isExpanded">
      <div class="header-left">
        <el-icon :size="18"><Bottom /></el-icon>
        <span class="header-title">上传任务</span>
        <el-tag size="small" type="primary" v-if="uploadStore.activeTasks.length > 0">
          {{ uploadStore.activeTasks.length }} 个进行中
        </el-tag>
      </div>
      <div class="header-right">
        <el-button size="small" text @click.stop="uploadStore.pauseAll" v-if="!allPaused">
          <el-icon><VideoPause /></el-icon>
          全部暂停
        </el-button>
        <el-button size="small" text @click.stop="uploadStore.resumeAll" v-else>
          <el-icon><VideoPlay /></el-icon>
          全部继续
        </el-button>
        <el-button size="small" text @click.stop="uploadStore.clearCompleted">
          <el-icon><Delete /></el-icon>
          清除已完成
        </el-button>
        <el-button size="small" text @click.stop="uploadStore.toggleConsole">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>

    <div v-if="isExpanded" class="console-content">
      <div class="console-tabs">
        <el-tabs v-model="activeTab" size="small">
          <el-tab-pane label="上传中" name="active">
            <div v-if="uploadStore.activeTasks.length === 0 && uploadStore.pendingTasks.length === 0" class="empty-state">
              <el-icon class="empty-icon"><Upload /></el-icon>
              <div class="empty-text">暂无上传任务</div>
            </div>
            <div v-else class="task-list">
              <UploadTaskItem
                v-for="task in [...uploadStore.pendingTasks, ...uploadStore.activeTasks]"
                :key="task.id"
                :task="task"
              />
            </div>
          </el-tab-pane>
          <el-tab-pane label="已完成" name="completed">
            <div v-if="uploadStore.completedTasks.length === 0" class="empty-state">
              <el-icon class="empty-icon"><CircleCheck /></el-icon>
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
          <el-tab-pane label="失败" name="failed">
            <div v-if="uploadStore.failedTasks.length === 0" class="empty-state">
              <el-icon class="empty-icon"><CircleClose /></el-icon>
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

    <div v-if="!isExpanded && uploadStore.activeTasks.length > 0" class="console-mini">
      <div class="mini-progress">
        <div class="progress-info">
          <span>总进度</span>
          <span>{{ uploadStore.totalProgress }}%</span>
        </div>
        <el-progress :percentage="uploadStore.totalProgress" :stroke-width="6" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import UploadTaskItem from './UploadTaskItem.vue'
import { useUploadStore } from '../stores/upload'

const uploadStore = useUploadStore()

const isExpanded = ref(true)
const activeTab = ref('active')

const allPaused = computed(() => {
  if (uploadStore.activeTasks.length === 0) return false
  return uploadStore.activeTasks.every(t => t && t.status === 'paused')
})

watch(() => uploadStore.showConsole, (val) => {
  if (val) {
    isExpanded.value = true
  }
})
</script>

<style lang="scss" scoped>
.upload-console {
  position: fixed;
  right: 20px;
  bottom: 20px;
  width: 400px;
  max-height: 80vh;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-lg;
  border: 1px solid $border-color;
  z-index: 1000;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transition: all $transition-normal;

  &.expanded {
    height: 500px;
  }
}

.console-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: $bg-secondary;
  border-bottom: 1px solid $border-color;
  cursor: pointer;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-title {
  font-weight: 600;
  font-size: 14px;
}

.header-right {
  display: flex;
  gap: 4px;
}

.console-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.console-tabs {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: hidden;
  }

  :deep(.el-tab-pane) {
    height: 100%;
    overflow: auto;
  }
}

.task-list {
  padding: 8px;
}

.console-mini {
  padding: 12px 16px;
}

.mini-progress {
  .progress-info {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 8px;
  }
}

@media (max-width: $breakpoint-md) {
  .upload-console {
    right: 12px;
    left: 12px;
    width: auto;
    bottom: 12px;
  }

  .header-right {
    .el-button {
      padding: 4px;
    }
  }
}
</style>
