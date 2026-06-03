<template>
  <div class="main-layout">
    <Sidebar />
    <div class="main-content">
      <Header />
      <div class="page-content">
        <router-view />
      </div>
    </div>
    <UploadConsole v-if="uploadStore.showConsole" />
    <ContextMenu />
    <PreviewDialog />
  </div>
</template>

<script setup>
import { onMounted, onUnmounted } from 'vue'
import { useShortcuts } from '../composables/useShortcuts'
import Sidebar from '../components/Sidebar.vue'
import Header from '../components/Header.vue'
import UploadConsole from '../components/UploadConsole.vue'
import ContextMenu from '../components/ContextMenu.vue'
import PreviewDialog from '../components/PreviewDialog.vue'
import { useUploadStore } from '../stores/upload'

const uploadStore = useUploadStore()

const { initShortcuts, cleanupShortcuts } = useShortcuts()

onMounted(() => {
  initShortcuts()
})

onUnmounted(() => {
  cleanupShortcuts()
})
</script>

<style lang="scss" scoped>
.main-layout {
  display: flex;
  height: 100vh;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.page-content {
  flex: 1;
  overflow: auto;
  padding: 20px;
  background: $bg-secondary;
}

@media (max-width: $breakpoint-md) {
  .page-content {
    padding: 12px;
  }
}
</style>
