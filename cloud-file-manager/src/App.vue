<template>
  <router-view />
</template>

<script setup>
import { useAuthStore } from './stores/auth'
import { useFileStore } from './stores/file'
import { useUploadStore } from './stores/upload'
import { onMounted } from 'vue'

const authStore = useAuthStore()
const fileStore = useFileStore()
const uploadStore = useUploadStore()

onMounted(() => {
  try {
    const saved = localStorage.getItem('uploadTasks')
    if (saved) {
      const parsed = JSON.parse(saved)
      if (!Array.isArray(parsed)) {
        localStorage.removeItem('uploadTasks')
      }
    }
  } catch (e) {
    localStorage.removeItem('uploadTasks')
  }

  authStore.initAuth()
  fileStore.loadFiles()
  uploadStore.restoreTasks()
})
</script>
