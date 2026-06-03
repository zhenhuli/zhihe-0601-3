<template>
  <div class="upload-task-item" :class="task.status">
    <div class="task-header">
      <div class="task-info">
        <el-icon
          class="task-icon"
          :size="20"
          :color="getFileColor(task.type)"
        >
          <component :is="getFileIcon(task.type)" />
        </el-icon>
        <div class="task-name text-ellipsis" :title="task.name">
          {{ task.name }}
        </div>
      </div>
      <div class="task-status">
        <el-tag v-if="task.status === 'pending'" size="small" type="info">等待中</el-tag>
        <el-tag v-else-if="task.status === 'uploading'" size="small" type="primary">上传中</el-tag>
        <el-tag v-else-if="task.status === 'paused'" size="small" type="warning">已暂停</el-tag>
        <el-tag v-else-if="task.status === 'completed'" size="small" type="success">已完成</el-tag>
        <el-tag v-else-if="task.status === 'failed'" size="small" type="danger">失败</el-tag>
        <el-tag v-else-if="task.status === 'cancelled'" size="small" type="info">已取消</el-tag>
      </div>
    </div>

    <div class="task-progress" v-if="task.status === 'uploading' || task.status === 'paused'">
      <el-progress
        :percentage="task.progress"
        :stroke-width="4"
        :status="task.status === 'failed' ? 'exception' : undefined"
      />
    </div>

    <div class="task-details">
      <div class="detail-item">
        <span>{{ formatFileSize(task.uploadedSize) }} / {{ formatFileSize(task.totalSize) }}</span>
      </div>
      <div class="detail-item" v-if="task.status === 'uploading'">
        <span class="speed">{{ formatSpeed(task.speed) }}</span>
        <span class="remaining">{{ formatTime(task.remainingTime) }}</span>
      </div>
      <div class="detail-item" v-if="task.status === 'failed'">
        <span class="error-text">
          <el-icon><Warning /></el-icon>
          {{ task.error || '上传失败，已重试3次' }}
        </span>
      </div>
    </div>

    <div class="task-actions">
      <template v-if="task.status === 'uploading'">
        <el-tooltip content="暂停">
          <el-button size="small" text @click="uploadStore.pauseTask(task.id)">
            <el-icon><VideoPause /></el-icon>
          </el-button>
        </el-tooltip>
      </template>

      <template v-else-if="task.status === 'paused'">
        <el-tooltip content="继续">
          <el-button size="small" text @click="uploadStore.resumeTask(task.id)">
            <el-icon><VideoPlay /></el-icon>
          </el-button>
        </el-tooltip>
      </template>

      <template v-else-if="task.status === 'failed'">
        <el-tooltip content="重试">
          <el-button size="small" text type="primary" @click="uploadStore.retryTask(task.id)">
            <el-icon><Refresh /></el-icon>
          </el-button>
        </el-tooltip>
      </template>

      <template v-if="task.status !== 'completed' && task.status !== 'cancelled'">
        <el-tooltip content="取消">
          <el-button size="small" text type="danger" @click="uploadStore.cancelTask(task.id)">
            <el-icon><Close /></el-icon>
          </el-button>
        </el-tooltip>
      </template>

      <el-tooltip content="删除">
        <el-button size="small" text @click="uploadStore.removeTask(task.id)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { useUploadStore } from '../stores/upload'
import { formatFileSize, formatSpeed, formatTime, getFileIcon, getFileColor } from '../utils'

defineProps({
  task: {
    type: Object,
    required: true
  }
})

const uploadStore = useUploadStore()
</script>

<style lang="scss" scoped>
.upload-task-item {
  padding: 12px;
  border-radius: $border-radius;
  background: $bg-secondary;
  margin-bottom: 8px;
  transition: all $transition-fast;

  &:hover {
    background: $bg-tertiary;
  }

  &.completed {
    opacity: 0.7;
  }

  &.failed {
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.task-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.task-name {
  font-size: 13px;
  font-weight: 500;
  color: $text-primary;
}

.task-progress {
  margin-bottom: 8px;
}

.task-details {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 8px;
}

.detail-item {
  display: flex;
  gap: 12px;
  align-items: center;
}

.speed {
  color: $primary-color;
  font-weight: 500;
}

.remaining {
  color: $text-muted;
}

.error-text {
  display: flex;
  align-items: center;
  gap: 4px;
  color: $danger-color;
}

.task-actions {
  display: flex;
  justify-content: flex-end;
  gap: 4px;
  border-top: 1px solid $border-color;
  padding-top: 8px;
}
</style>
