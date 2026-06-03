<template>
  <el-dialog
    v-model="visible"
    title="文件属性"
    width="400px"
    append-to-body
    @close="handleClose"
  >
    <div class="properties-dialog" v-if="file">
      <div class="properties-header">
        <el-icon
          :size="48"
          :color="getFileColor(file.type)"
          class="file-icon"
        >
          <component :is="getFileIcon(file.type)" />
        </el-icon>
        <div class="file-basic">
          <div class="file-name text-ellipsis">{{ file.name }}</div>
          <div class="file-type-label">{{ getTypeLabel(file.type) }}</div>
        </div>
      </div>

      <div class="properties-body">
        <div class="property-row">
          <span class="property-label">位置</span>
          <span class="property-value">{{ file.path || '/' }}</span>
        </div>
        <div class="property-row" v-if="!file.isFolder">
          <span class="property-label">大小</span>
          <span class="property-value">{{ formatFileSize(file.size) }}</span>
        </div>
        <div class="property-row">
          <span class="property-label">创建时间</span>
          <span class="property-value">{{ formatFullDate(file.createdAt) }}</span>
        </div>
        <div class="property-row">
          <span class="property-label">修改时间</span>
          <span class="property-value">{{ formatFullDate(file.updatedAt) }}</span>
        </div>
        <div class="property-row" v-if="file.deletedAt">
          <span class="property-label">删除时间</span>
          <span class="property-value">{{ formatFullDate(file.deletedAt) }}</span>
        </div>
        <div class="property-row" v-if="!file.isFolder">
          <span class="property-label">文件类型</span>
          <span class="property-value">{{ getExtension(file.name) }}</span>
        </div>
        <div class="property-row">
          <span class="property-label">文件ID</span>
          <span class="property-value file-id">{{ file.id }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
import { ref, watch } from 'vue'
import { formatFileSize, getFileIcon, getFileColor } from '../utils'

const props = defineProps({
  file: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close'])

const visible = ref(false)

watch(() => props.file, (newVal) => {
  visible.value = !!newVal
})

function getTypeLabel(type) {
  const labels = {
    folder: '文件夹',
    image: '图片文件',
    document: '文档文件',
    video: '视频文件',
    audio: '音频文件',
    archive: '压缩包',
    code: '代码文件',
    other: '其他文件'
  }
  return labels[type] || '文件'
}

function formatFullDate(timestamp) {
  if (!timestamp) return '-'
  return new Date(timestamp).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function getExtension(filename) {
  if (!filename || !filename.includes('.')) return '-'
  return '.' + filename.split('.').pop().toUpperCase()
}

function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style lang="scss" scoped>
.properties-dialog {
  .properties-header {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 20px;
    background: $bg-secondary;
    border-radius: $border-radius;
    margin-bottom: 20px;
  }

  .file-icon {
    flex-shrink: 0;
  }

  .file-basic {
    flex: 1;
    min-width: 0;
  }

  .file-name {
    font-size: 18px;
    font-weight: 600;
    color: $text-primary;
    margin-bottom: 4px;
  }

  .file-type-label {
    font-size: 14px;
    color: $text-secondary;
  }

  .properties-body {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .property-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid $border-color;

    &:last-child {
      border-bottom: none;
    }
  }

  .property-label {
    font-size: 14px;
    color: $text-secondary;
    flex-shrink: 0;
  }

  .property-value {
    font-size: 14px;
    color: $text-primary;
    text-align: right;
    max-width: 200px;
    word-break: break-all;
  }

  .file-id {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    color: $text-muted;
  }
}
</style>
