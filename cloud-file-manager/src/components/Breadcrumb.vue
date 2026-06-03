<template>
  <div class="breadcrumb">
    <el-breadcrumb separator="/">
      <el-breadcrumb-item @click="navigateTo('/')">
        <el-icon><HomeFilled /></el-icon>
        <span class="hide-mobile">根目录</span>
      </el-breadcrumb-item>
      <el-breadcrumb-item
        v-for="(item, index) in pathItems"
        :key="index"
        @click="navigateTo(item.path)"
      >
        {{ item.name }}
      </el-breadcrumb-item>
    </el-breadcrumb>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useFileStore } from '../stores/file'

const route = useRoute()
const fileStore = useFileStore()

const pathItems = computed(() => {
  if (route.path === '/home' || !fileStore.currentPath) return []
  
  const parts = fileStore.currentPath.split('/').filter(Boolean)
  let currentPath = ''
  return parts.map(part => {
    currentPath += '/' + part
    return {
      name: part,
      path: currentPath
    }
  })
})

function navigateTo(path) {
  fileStore.navigateTo(path === '/' ? '/' : path)
}
</script>

<style lang="scss" scoped>
.breadcrumb {
  :deep(.el-breadcrumb__item) {
    cursor: pointer;

    &:hover {
      color: $primary-color;
    }
  }

  :deep(.el-breadcrumb__inner) {
    display: flex;
    align-items: center;
    gap: 4px;
    font-size: 14px;
  }
}
</style>
