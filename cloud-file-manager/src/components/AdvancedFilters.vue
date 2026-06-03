<template>
  <div class="advanced-filters" @click.stop>
    <div class="filters-header">
      <span class="filters-title">高级筛选</span>
      <button class="close-btn" @click="$emit('close')">
        <el-icon><Close /></el-icon>
      </button>
    </div>

    <div class="filter-group">
      <div class="filter-label">文件大小</div>
      <el-radio-group v-model="fileStore.filters.size" size="small">
        <el-radio-button value="all">全部</el-radio-button>
        <el-radio-button value="tiny">小于1MB</el-radio-button>
        <el-radio-button value="small">1-10MB</el-radio-button>
        <el-radio-button value="medium">10-100MB</el-radio-button>
        <el-radio-button value="large">100MB-1GB</el-radio-button>
        <el-radio-button value="huge">大于1GB</el-radio-button>
      </el-radio-group>
    </div>

    <div class="filter-group">
      <div class="filter-label">上传时间</div>
      <el-radio-group v-model="fileStore.filters.date" size="small">
        <el-radio-button value="all">全部时间</el-radio-button>
        <el-radio-button value="today">今天</el-radio-button>
        <el-radio-button value="week">本周</el-radio-button>
        <el-radio-button value="month">本月</el-radio-button>
        <el-radio-button value="year">今年</el-radio-button>
      </el-radio-group>
    </div>

    <div class="filter-group">
      <div class="filter-label">排序方式</div>
      <div class="sort-options">
        <el-select v-model="sortField" size="small" style="width: 120px">
          <el-option label="名称" value="name" />
          <el-option label="大小" value="size" />
          <el-option label="修改时间" value="date" />
          <el-option label="类型" value="type" />
        </el-select>
        <el-button-group>
          <el-button
            size="small"
            :type="sortOrder === 'asc' ? 'primary' : 'default'"
            @click="setSort('asc')"
          >
            <el-icon><Sort /></el-icon>
            升序
          </el-button>
          <el-button
            size="small"
            :type="sortOrder === 'desc' ? 'primary' : 'default'"
            @click="setSort('desc')"
          >
            <el-icon><Sort /></el-icon>
            降序
          </el-button>
        </el-button-group>
      </div>
    </div>

    <div class="filters-footer">
      <el-button size="small" @click="resetFilters">重置</el-button>
      <el-button type="primary" size="small" @click="applyFilters">应用筛选</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useFileStore } from '../stores/file'

const emit = defineEmits(['close'])

const fileStore = useFileStore()

const sortField = ref(fileStore.sortBy)
const sortOrder = ref(fileStore.sortOrder)

watch([sortField, sortOrder], () => {
  applyFilters()
})

function setSort(order) {
  sortOrder.value = order
  fileStore.setSortBy(sortField.value)
}

function resetFilters() {
  fileStore.filters.type = 'all'
  fileStore.filters.size = 'all'
  fileStore.filters.date = 'all'
  fileStore.searchQuery = ''
  sortField.value = 'name'
  sortOrder.value = 'asc'
  fileStore.setSortBy('name')
}

function applyFilters() {
  fileStore.setSortBy(sortField.value)
}
</script>

<style lang="scss" scoped>
.advanced-filters {
  position: absolute;
  top: calc($header-height - 10px);
  right: 120px;
  width: 480px;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  box-shadow: $shadow-lg;
  border: 1px solid $border-color;
  padding: 16px;
  z-index: 1000;
  animation: slideDown 0.2s ease;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid $border-color;
}

.filters-title {
  font-weight: 600;
  font-size: 16px;
}

.close-btn {
  padding: 4px;
  border-radius: 4px;
  color: $text-secondary;

  &:hover {
    background: $bg-tertiary;
    color: $text-primary;
  }
}

.filter-group {
  margin-bottom: 16px;
}

.filter-label {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 8px;
}

.sort-options {
  display: flex;
  gap: 12px;
  align-items: center;
}

.filters-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 12px;
  border-top: 1px solid $border-color;
}

@media (max-width: $breakpoint-md) {
  .advanced-filters {
    width: calc(100% - 24px);
    right: 12px;
    left: 12px;
  }
}
</style>
