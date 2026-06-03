<template>
  <el-dialog
    v-model="visible"
    :title="mode === 'move' ? '移动文件' : '复制文件'"
    width="500px"
    append-to-body
    @close="handleClose"
  >
    <div class="move-dialog">
      <div class="selected-info">
        <el-icon :size="18"><Files /></el-icon>
        <span>已选择 {{ fileIds.length }} 个文件</span>
      </div>

      <div class="target-path">
        <div class="path-label">目标位置：</div>
        <div class="path-display">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item @click="navigateTo('/')">根目录</el-breadcrumb-item>
            <el-breadcrumb-item
              v-for="(item, index) in pathItems"
              :key="index"
              @click="navigateTo(item.path)"
            >
              {{ item.name }}
            </el-breadcrumb-item>
          </el-breadcrumb>
        </div>
      </div>

      <div class="folder-tree">
        <div v-if="availableFolders.length === 0" class="empty-state" style="padding: 30px 0;">
          <el-icon class="empty-icon" style="font-size: 32px;"><FolderOpened /></el-icon>
          <div class="empty-text">暂无可用文件夹</div>
        </div>
        <div v-else class="folder-list">
          <div
            v-for="folder in availableFolders"
            :key="folder.id"
            class="folder-item"
            :class="{ active: currentPath === (currentPath === '/' ? '/' + folder.name : currentPath + '/' + folder.name) }"
            @click="selectFolder(folder)"
          >
            <el-icon :size="18" color="#f59e0b"><Folder /></el-icon>
            <span class="folder-name">{{ folder.name }}</span>
          </div>
        </div>
      </div>

      <div class="dialog-actions">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="handleConfirm">
          {{ mode === 'move' ? '移动' : '复制' }}
        </el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useFileStore } from '../stores/file'

const props = defineProps({
  fileIds: {
    type: Array,
    default: () => []
  },
  mode: {
    type: String,
    default: 'move'
  }
})

const emit = defineEmits(['close'])

const fileStore = useFileStore()

const visible = ref(false)
const currentPath = ref('/')

watch(() => props.fileIds.length, (len) => {
  if (len > 0) {
    visible.value = true
    currentPath.value = '/'
  }
})

const pathItems = computed(() => {
  if (currentPath.value === '/') return []
  const parts = currentPath.value.split('/').filter(Boolean)
  let path = ''
  return parts.map(part => {
    path += '/' + part
    return { name: part, path }
  })
})

const availableFolders = computed(() => {
  return fileStore.files.filter(f => 
    f.isFolder && 
    !f.deleted && 
    f.path === currentPath.value &&
    !props.fileIds.includes(f.id)
  )
})

function navigateTo(path) {
  currentPath.value = path
}

function selectFolder(folder) {
  currentPath.value = currentPath.value === '/' 
    ? '/' + folder.name 
    : currentPath.value + '/' + folder.name
}

function handleConfirm() {
  if (props.mode === 'move') {
    fileStore.moveFiles(props.fileIds, currentPath.value)
    ElMessage.success('移动成功')
  } else {
    fileStore.copyFiles(props.fileIds, currentPath.value)
    ElMessage.success('复制成功')
  }
  handleClose()
}

function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style lang="scss" scoped>
.move-dialog {
  .selected-info {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px;
    background: $bg-secondary;
    border-radius: $border-radius;
    margin-bottom: 16px;
    font-size: 14px;
    color: $text-secondary;
  }

  .target-path {
    margin-bottom: 16px;
  }

  .path-label {
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 8px;
  }

  .path-display {
    padding: 10px 12px;
    background: $bg-secondary;
    border-radius: $border-radius;

    :deep(.el-breadcrumb__item) {
      cursor: pointer;
    }
  }

  .folder-tree {
    max-height: 300px;
    overflow: auto;
    border: 1px solid $border-color;
    border-radius: $border-radius;
    padding: 8px;
  }

  .folder-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .folder-item {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 12px;
    border-radius: $border-radius;
    cursor: pointer;
    transition: all $transition-fast;

    &:hover {
      background: $bg-tertiary;
    }

    &.active {
      background: rgba(37, 99, 235, 0.1);
      color: $primary-color;
    }
  }

  .folder-name {
    font-size: 14px;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
}
</style>
