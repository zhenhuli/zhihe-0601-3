<template>
  <div class="sidebar" :class="{ collapsed: isCollapsed }">
    <div class="logo-section">
      <div class="logo">
        <el-icon :size="28" color="#2563eb"><Cloud /></el-icon>
        <span v-if="!isCollapsed" class="logo-text">智云盘</span>
      </div>
      <button v-if="!isCollapsed" class="collapse-btn" @click="toggleCollapse">
        <el-icon><ArrowLeft /></el-icon>
      </button>
      <button v-else class="expand-btn" @click="toggleCollapse">
        <el-icon><ArrowRight /></el-icon>
      </button>
    </div>

    <nav class="nav-menu">
      <div v-for="item in menuItems" :key="item.path" class="nav-item-wrapper">
        <router-link
          :to="item.path"
          class="nav-item"
          :class="{ active: isActive(item.path) }"
        >
          <el-icon :size="20"><component :is="item.icon" /></el-icon>
          <span v-if="!isCollapsed" class="nav-text">{{ item.name }}</span>
          <el-badge
            v-if="!isCollapsed && item.badge"
            :value="item.badge"
            class="nav-badge"
            :type="item.badgeType || 'info'"
          />
        </router-link>
      </div>
    </nav>

    <div class="sidebar-footer">
      <div v-if="!isCollapsed" class="storage-info">
        <div class="storage-label">存储空间</div>
        <div class="storage-bar">
          <div class="storage-used" :style="{ width: storageStats.percentage + '%' }"></div>
        </div>
        <div class="storage-text">
          {{ formatFileSize(storageStats.used) }} / {{ formatFileSize(storageStats.total) }}
        </div>
      </div>
      <div v-else class="storage-icon">
        <el-tooltip content="存储空间" placement="right">
          <el-icon :size="20"><DataBoard /></el-icon>
        </el-tooltip>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFileStore } from '../stores/file'
import { formatFileSize } from '../utils'

const route = useRoute()
const fileStore = useFileStore()
const isCollapsed = ref(false)

const storageStats = computed(() => fileStore.storageStats)

const menuItems = computed(() => [
  { path: '/home', name: '首页', icon: 'HomeFilled' },
  { path: '/files', name: '全部文件', icon: 'Folder' },
  { path: '/images', name: '图片', icon: 'Picture' },
  { path: '/documents', name: '文档', icon: 'Document' },
  { path: '/videos', name: '视频', icon: 'VideoCamera' },
  { path: '/archives', name: '压缩包', icon: 'Files' },
  { path: '/recycle', name: '回收站', icon: 'Delete', badge: fileStore.recycleBin.length, badgeType: 'danger' },
  { path: '/shares', name: '我的分享', icon: 'Share' },
  { path: '/upload-console', name: '上传控制台', icon: 'Upload' }
])

function toggleCollapse() {
  isCollapsed.value = !isCollapsed.value
}

function isActive(path) {
  return route.path.startsWith(path)
}
</script>

<style lang="scss" scoped>
.sidebar {
  width: $sidebar-width;
  background: $bg-primary;
  border-right: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  transition: width $transition-normal;
  position: relative;

  &.collapsed {
    width: $sidebar-width-collapsed;
  }
}

.logo-section {
  height: $header-height;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid $border-color;
}

.logo {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 18px;
  color: $text-primary;
}

.logo-text {
  font-size: 18px;
  font-weight: 600;
}

.collapse-btn, .expand-btn {
  padding: 4px;
  border-radius: 4px;
  color: $text-secondary;
  
  &:hover {
    background: $bg-tertiary;
    color: $text-primary;
  }
}

.nav-menu {
  flex: 1;
  padding: 12px 8px;
  overflow-y: auto;
}

.nav-item-wrapper {
  margin-bottom: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: $border-radius;
  color: $text-secondary;
  transition: all $transition-fast;
  position: relative;

  &:hover {
    background: $bg-tertiary;
    color: $text-primary;
  }

  &.active {
    background: rgba(37, 99, 235, 0.1);
    color: $primary-color;
    font-weight: 500;
  }
}

.nav-text {
  flex: 1;
  font-size: 14px;
}

.nav-badge {
  margin-left: auto;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid $border-color;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.storage-info {
  width: 100%;
}

.storage-label {
  font-size: 12px;
  color: $text-secondary;
  margin-bottom: 8px;
}

.storage-bar {
  height: 6px;
  background: $bg-tertiary;
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 8px;
}

.storage-used {
  height: 100%;
  background: linear-gradient(90deg, $primary-color, $info-color);
  border-radius: 3px;
  transition: width $transition-normal;
}

.storage-text {
  font-size: 12px;
  color: $text-muted;
}

.storage-icon {
  color: $text-secondary;
}

@media (max-width: $breakpoint-md) {
  .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    bottom: 0;
    z-index: 100;
    transform: translateX(-100%);
    transition: transform $transition-normal;

    &.mobile-open {
      transform: translateX(0);
    }
  }
}
</style>
