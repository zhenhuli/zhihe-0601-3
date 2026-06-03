<template>
  <header class="header">
    <div class="header-left">
      <button class="mobile-menu-btn hide-desktop" @click="toggleMobileMenu">
        <el-icon :size="20"><Menu /></el-icon>
      </button>
      <Breadcrumb />
    </div>

    <div class="header-center">
      <div class="search-box">
        <el-icon class="search-icon"><Search /></el-icon>
        <input
          v-model="searchQuery"
          type="text"
          class="search-input"
          placeholder="搜索文件..."
          @input="handleSearch"
        />
        <el-select
          v-if="showFilters"
          v-model="fileStore.filters.type"
          class="filter-select"
          size="small"
          @change="handleFilterChange"
        >
          <el-option label="全部类型" value="all" />
          <el-option label="图片" value="image" />
          <el-option label="文档" value="document" />
          <el-option label="视频" value="video" />
          <el-option label="音频" value="audio" />
          <el-option label="压缩包" value="archive" />
          <el-option label="代码" value="code" />
        </el-select>
      </div>
    </div>

    <div class="header-right">
      <el-tooltip content="高级筛选">
        <button class="header-btn" @click="showFilters = !showFilters">
          <el-icon :size="18"><Filter /></el-icon>
        </button>
      </el-tooltip>
      
      <el-tooltip content="上传文件">
        <button class="header-btn" @click="triggerUpload" :disabled="!canUpload">
          <el-icon :size="18"><Upload /></el-icon>
        </button>
      </el-tooltip>
      
      <el-tooltip content="上传列表">
        <button class="header-btn upload-btn" @click="uploadStore.toggleConsole">
          <el-icon :size="18"><Bottom /></el-icon>
          <el-badge
            v-if="uploadStore.activeTasks.length > 0"
            :value="uploadStore.activeTasks.length"
            class="upload-badge"
            type="primary"
          />
        </button>
      </el-tooltip>

      <el-dropdown trigger="click" @command="handleUserCommand">
        <div class="user-info">
          <el-avatar :size="32" class="user-avatar">
            {{ authStore.user?.username?.charAt(0).toUpperCase() }}
          </el-avatar>
          <span class="user-name hide-mobile">{{ authStore.user?.username }}</span>
          <el-icon><CaretBottom /></el-icon>
        </div>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">
              <el-icon><User /></el-icon>个人中心
            </el-dropdown-item>
            <el-dropdown-item command="settings">
              <el-icon><Setting /></el-icon>设置
            </el-dropdown-item>
            <el-dropdown-item v-if="authStore.isAdmin" command="admin">
              <el-icon><Crown /></el-icon>管理后台
            </el-dropdown-item>
            <el-dropdown-item divided command="logout">
              <el-icon><SwitchButton /></el-icon>退出登录
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>

    <input
      ref="fileInput"
      type="file"
      multiple
      style="display: none"
      @change="handleFileSelect"
    />
    <input
      ref="folderInput"
      type="file"
      multiple
      webkitdirectory
      style="display: none"
      @change="handleFileSelect"
    />
  </header>

  <AdvancedFilters v-if="showFilters" @close="showFilters = false" />
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import Breadcrumb from './Breadcrumb.vue'
import AdvancedFilters from './AdvancedFilters.vue'
import { useAuthStore } from '../stores/auth'
import { useFileStore } from '../stores/file'
import { useUploadStore } from '../stores/upload'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()
const fileStore = useFileStore()
const uploadStore = useUploadStore()

const fileInput = ref(null)
const folderInput = ref(null)
const searchQuery = ref('')
const showFilters = ref(false)
const mobileMenuOpen = ref(false)

const canUpload = computed(() => authStore.hasPermission('upload'))

watch(() => route.path, () => {
  searchQuery.value = fileStore.searchQuery
})

function handleSearch() {
  fileStore.searchQuery = searchQuery.value
}

function handleFilterChange() {
}

function triggerUpload() {
  if (!canUpload.value) {
    ElMessage.warning('请先登录后再上传文件')
    router.push('/login')
    return
  }
  
  ElMessageBox({
    title: '选择上传方式',
    message: '请选择上传文件或文件夹',
    showCancelButton: true,
    confirmButtonText: '上传文件',
    cancelButtonText: '上传文件夹',
    showInput: false,
    callback: (action) => {
      if (action === 'confirm') {
        fileInput.value?.click()
      } else {
        folderInput.value?.click()
      }
    }
  })
}

function handleFileSelect(e) {
  const files = Array.from(e.target.files)
  if (files.length > 0) {
    uploadStore.addFiles(files, fileStore.currentPath)
    ElMessage.success(`已添加 ${files.length} 个文件到上传队列`)
  }
  e.target.value = ''
}

function handleUserCommand(command) {
  switch (command) {
    case 'profile':
      ElMessage.info('个人中心功能开发中')
      break
    case 'settings':
      ElMessage.info('设置功能开发中')
      break
    case 'admin':
      router.push('/admin')
      break
    case 'logout':
      authStore.logout()
      router.push('/login')
      ElMessage.success('已退出登录')
      break
  }
}

function toggleMobileMenu() {
  const event = new CustomEvent('toggle-mobile-menu')
  window.dispatchEvent(event)
}

function handleTriggerUpload() {
  triggerUpload()
}

function handleTriggerUploadFolder() {
  if (!canUpload.value) {
    ElMessage.warning('请先登录后再上传文件')
    router.push('/login')
    return
  }
  folderInput.value?.click()
}

defineExpose({
  triggerUpload
})

onMounted(() => {
  window.addEventListener('trigger-upload', handleTriggerUpload)
  window.addEventListener('trigger-upload-folder', handleTriggerUploadFolder)
})

onUnmounted(() => {
  window.removeEventListener('trigger-upload', handleTriggerUpload)
  window.removeEventListener('trigger-upload-folder', handleTriggerUploadFolder)
})
</script>

<style lang="scss" scoped>
.header {
  height: $header-height;
  background: $bg-primary;
  border-bottom: 1px solid $border-color;
  display: flex;
  align-items: center;
  padding: 0 20px;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 0 0 auto;
}

.mobile-menu-btn {
  padding: 8px;
  border-radius: $border-radius;
  color: $text-secondary;

  &:hover {
    background: $bg-tertiary;
  }
}

.header-center {
  flex: 1;
  max-width: 600px;
}

.search-box {
  display: flex;
  align-items: center;
  background: $bg-secondary;
  border-radius: $border-radius;
  padding: 6px 12px;
  gap: 8px;
  transition: all $transition-fast;

  &:focus-within {
    box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.2);
    background: $bg-primary;
  }
}

.search-icon {
  color: $text-muted;
}

.search-input {
  flex: 1;
  border: none;
  background: transparent;
  font-size: 14px;
  padding: 4px 0;
  color: $text-primary;

  &::placeholder {
    color: $text-muted;
  }
}

.filter-select {
  width: 120px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-btn {
  position: relative;
  padding: 8px;
  border-radius: $border-radius;
  color: $text-secondary;
  transition: all $transition-fast;

  &:hover:not(:disabled) {
    background: $bg-tertiary;
    color: $text-primary;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}

.upload-btn {
  &.has-uploads {
    color: $primary-color;
  }
}

.upload-badge {
  position: absolute;
  top: 2px;
  right: 2px;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: $border-radius;
  cursor: pointer;
  transition: all $transition-fast;

  &:hover {
    background: $bg-tertiary;
  }
}

.user-avatar {
  background: $primary-color;
}

.user-name {
  font-size: 14px;
  color: $text-primary;
  font-weight: 500;
}

@media (max-width: $breakpoint-md) {
  .header {
    padding: 0 12px;
    gap: 8px;
  }

  .header-center {
    flex: 1;
  }

  .filter-select {
    display: none;
  }

  .user-name {
    display: none;
  }
}
</style>
