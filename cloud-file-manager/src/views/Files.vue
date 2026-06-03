<template>
  <div class="files-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">全部文件</h1>
        <p class="page-subtitle">管理您的所有文件和文件夹</p>
      </div>
    </div>
    <FileList />
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useFileStore } from '../stores/file'
import FileList from '../components/FileList.vue'

const fileStore = useFileStore()

onMounted(() => {
  fileStore.filters.type = 'all'
  fileStore.searchQuery = ''
})
</script>

<style lang="scss" scoped>
.files-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 20px;

  .page-title {
    font-size: 24px;
    font-weight: 700;
    color: $text-primary;
    margin-bottom: 4px;
  }

  .page-subtitle {
    font-size: 14px;
    color: $text-secondary;
  }
}
</style>
