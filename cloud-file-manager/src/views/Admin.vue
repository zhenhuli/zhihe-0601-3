<template>
  <div class="admin-page">
    <div class="page-header">
      <div>
        <h1 class="page-title">
          <el-icon :size="24" color="#f59e0b"><Crown /></el-icon>
          管理后台
        </h1>
        <p class="page-subtitle">管理员控制台 - 管理所有用户和文件</p>
      </div>
    </div>

    <div class="admin-stats">
      <div class="stat-card">
        <div class="stat-icon users">
          <el-icon :size="24"><User /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalUsers }}</div>
          <div class="stat-label">总用户数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon files">
          <el-icon :size="24"><FolderOpened /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalFiles }}</div>
          <div class="stat-label">总文件数</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon storage">
          <el-icon :size="24"><DataAnalysis /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalStorageUsed }}</div>
          <div class="stat-label">总存储使用</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon shares">
          <el-icon :size="24"><Share /></el-icon>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalShares }}</div>
          <div class="stat-label">总分享数</div>
        </div>
      </div>
    </div>

    <div class="admin-content">
      <el-tabs v-model="activeTab" size="large">
        <el-tab-pane name="users">
          <template #label>
            <span><el-icon><User /></el-icon> 用户管理</span>
          </template>
          <div class="user-list">
            <div class="table-header">
              <div class="col-avatar">头像</div>
              <div class="col-name">用户名</div>
              <div class="col-email">邮箱</div>
              <div class="col-role">角色</div>
              <div class="col-storage">存储使用</div>
              <div class="col-actions">操作</div>
            </div>
            <div
              v-for="user in users"
              :key="user.id"
              class="user-row"
            >
              <div class="col-avatar">
                <el-avatar :size="36">{{ user.username.charAt(0).toUpperCase() }}</el-avatar>
              </div>
              <div class="col-name">{{ user.username }}</div>
              <div class="col-email">{{ user.email }}</div>
              <div class="col-role">
                <el-tag :type="user.role === 'admin' ? 'warning' : 'info'" size="small">
                  {{ user.role === 'admin' ? '管理员' : '普通用户' }}
                </el-tag>
              </div>
              <div class="col-storage">
                {{ formatFileSize(user.usedStorage || 0) }} / {{ formatFileSize(user.storage) }}
              </div>
              <div class="col-actions">
                <el-button size="small" text type="danger" @click="handleViewFiles(user)">
                  <el-icon><Folder /></el-icon>
                  查看文件
                </el-button>
                <el-button size="small" text type="danger" @click="handleCleanup(user)" v-if="user.violations > 0">
                  <el-icon><Delete /></el-icon>
                  清理违规
                </el-button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="violations">
          <template #label>
            <span><el-icon><Warning /></el-icon> 违规文件 ({{ violationFiles.length }})</span>
          </template>
          <div class="violation-list" v-if="violationFiles.length > 0">
            <div
              v-for="file in violationFiles"
              :key="file.id"
              class="violation-item"
            >
              <div class="file-info">
                <el-icon :size="20" :color="getFileColor(file.type)">
                  <component :is="getFileIcon(file.type)" />
                </el-icon>
                <div>
                  <div class="file-name">{{ file.name }}</div>
                  <div class="file-owner">所属用户: {{ file.owner }}</div>
                </div>
              </div>
              <div class="violation-reason">
                <el-tag type="danger" size="small">{{ file.violationReason }}</el-tag>
              </div>
              <div class="file-size">{{ formatFileSize(file.size) }}</div>
              <div class="file-actions">
                <el-button size="small" type="danger" @click="handleDeleteViolation(file)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
                <el-button size="small" @click="handleIgnoreViolation(file)">
                  <el-icon><Check /></el-icon>
                  忽略
                </el-button>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">
            <el-icon class="empty-icon" :size="64" color="#10b981"><CircleCheck /></el-icon>
            <div class="empty-text">暂无违规文件</div>
          </div>
        </el-tab-pane>

        <el-tab-pane name="system">
          <template #label>
            <span><el-icon><Setting /></el-icon> 系统设置</span>
          </template>
          <div class="system-settings">
            <el-form :model="settings" label-width="120px">
              <el-form-item label="用户默认容量">
                <el-select v-model="settings.defaultStorage" style="width: 200px;">
                  <el-option label="5GB" :value="5 * 1024 * 1024 * 1024" />
                  <el-option label="10GB" :value="10 * 1024 * 1024 * 1024" />
                  <el-option label="50GB" :value="50 * 1024 * 1024 * 1024" />
                  <el-option label="100GB" :value="100 * 1024 * 1024 * 1024" />
                </el-select>
              </el-form-item>
              <el-form-item label="回收站保留天数">
                <el-input-number v-model="settings.recycleDays" :min="1" :max="90" />
              </el-form-item>
              <el-form-item label="开启内容审核">
                <el-switch v-model="settings.contentReview" />
              </el-form-item>
              <el-form-item label="最大上传文件">
                <el-input-number v-model="settings.maxFileSize" :min="1" :max="100000" />
                <span style="margin-left: 8px; color: $text-secondary;">MB</span>
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="saveSettings">保存设置</el-button>
              </el-form-item>
            </el-form>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useFileStore } from '../stores/file'
import { formatFileSize, getFileIcon, getFileColor } from '../utils'

const fileStore = useFileStore()

const activeTab = ref('users')

const settings = reactive({
  defaultStorage: 10 * 1024 * 1024 * 1024,
  recycleDays: 30,
  contentReview: true,
  maxFileSize: 1000
})

const users = ref([
  { id: 1, username: 'admin', email: 'admin@example.com', role: 'admin', storage: 100 * 1024 * 1024 * 1024, usedStorage: 2.5 * 1024 * 1024 * 1024, violations: 0 },
  { id: 2, username: 'user', email: 'user@example.com', role: 'user', storage: 10 * 1024 * 1024 * 1024, usedStorage: 1.2 * 1024 * 1024 * 1024, violations: 2 },
  { id: 3, username: 'zhangsan', email: 'zhangsan@example.com', role: 'user', storage: 10 * 1024 * 1024 * 1024, usedStorage: 3.8 * 1024 * 1024 * 1024, violations: 0 },
  { id: 4, username: 'lisi', email: 'lisi@example.com', role: 'user', storage: 5 * 1024 * 1024 * 1024, usedStorage: 800 * 1024 * 1024, violations: 1 }
])

const violationFiles = ref([
  { id: 'v1', name: '违规文件1.exe', type: 'other', size: 50 * 1024 * 1024, owner: 'user', violationReason: '可疑病毒文件' },
  { id: 'v2', name: '敏感内容.pdf', type: 'document', size: 2.5 * 1024 * 1024, owner: 'lisi', violationReason: '内容违规' },
  { id: 'v3', name: '版权视频.mp4', type: 'video', size: 250 * 1024 * 1024, owner: 'user', violationReason: '版权侵权' }
])

const totalUsers = computed(() => users.value.length)
const totalFiles = computed(() => fileStore.files.length)
const totalShares = computed(() => fileStore.shares.length)
const totalStorageUsed = computed(() => {
  const total = users.value.reduce((sum, u) => sum + (u.usedStorage || 0), 0)
  return formatFileSize(total)
})

function handleViewFiles(user) {
  ElMessage.info(`正在查看用户 ${user.username} 的文件...`)
}

function handleCleanup(user) {
  ElMessage.confirm(`确定要清理用户 ${user.username} 的 ${user.violations} 个违规文件吗？`, '清理确认', {
    type: 'warning'
  }).then(() => {
    user.violations = 0
    violationFiles.value = violationFiles.value.filter(f => f.owner !== user.username)
    ElMessage.success('清理完成')
  }).catch(() => {})
}

function handleDeleteViolation(file) {
  ElMessage.confirm('确定要删除此违规文件吗？', '删除确认', {
    type: 'warning'
  }).then(() => {
    violationFiles.value = violationFiles.value.filter(f => f.id !== file.id)
    ElMessage.success('已删除')
  }).catch(() => {})
}

function handleIgnoreViolation(file) {
  violationFiles.value = violationFiles.value.filter(f => f.id !== file.id)
  ElMessage.success('已忽略')
}

function saveSettings() {
  ElMessage.success('设置已保存')
}
</script>

<style lang="scss" scoped>
.admin-page {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-header {
  margin-bottom: 24px;

  .page-title {
    display: flex;
    align-items: center;
    gap: 8px;
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

.admin-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: $bg-primary;
  border-radius: $border-radius-lg;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid $border-color;
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: $border-radius;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;

  &.users { background: $primary-color; }
  &.files { background: $success-color; }
  &.storage { background: $warning-color; }
  &.shares { background: $info-color; }
}

.stat-content {
  .stat-value {
    font-size: 28px;
    font-weight: 700;
    color: $text-primary;
    line-height: 1;
    margin-bottom: 4px;
  }

  .stat-label {
    font-size: 13px;
    color: $text-secondary;
  }
}

.admin-content {
  flex: 1;
  overflow: hidden;
  background: $bg-primary;
  border-radius: $border-radius-lg;
  border: 1px solid $border-color;
  display: flex;
  flex-direction: column;

  :deep(.el-tabs) {
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  :deep(.el-tabs__content) {
    flex: 1;
    overflow: auto;
    padding: 20px;
  }

  :deep(.el-tab-pane) {
    height: 100%;
  }
}

.user-list {
  min-width: 800px;
}

.table-header {
  display: flex;
  padding: 12px 16px;
  background: $bg-secondary;
  border-radius: $border-radius;
  font-weight: 600;
  color: $text-secondary;
  font-size: 13px;
  margin-bottom: 8px;
}

.user-row {
  display: flex;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid $border-color;
  transition: all $transition-fast;

  &:hover {
    background: $bg-secondary;
  }

  &:last-child {
    border-bottom: none;
  }
}

.col-avatar { width: 60px; flex-shrink: 0; }
.col-name { width: 120px; flex-shrink: 0; }
.col-email { flex: 1; min-width: 150px; }
.col-role { width: 100px; flex-shrink: 0; }
.col-storage { width: 200px; flex-shrink: 0; }
.col-actions { width: 180px; flex-shrink: 0; display: flex; gap: 8px; }

.violation-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.violation-item {
  display: flex;
  align-items: center;
  padding: 16px;
  background: rgba(239, 68, 68, 0.05);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: $border-radius;
  gap: 16px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 200px;

  .file-name {
    font-weight: 500;
    color: $text-primary;
    margin-bottom: 2px;
  }

  .file-owner {
    font-size: 12px;
    color: $text-secondary;
  }
}

.violation-reason {
  flex-shrink: 0;
}

.file-size {
  width: 120px;
  flex-shrink: 0;
  color: $text-secondary;
}

.file-actions {
  display: flex;
  gap: 8px;
  flex-shrink: 0;
}

.system-settings {
  max-width: 600px;
}

@media (max-width: $breakpoint-md) {
  .admin-stats {
    grid-template-columns: repeat(2, 1fr);
  }

  .col-email, .col-storage {
    display: none;
  }

  .violation-item {
    flex-wrap: wrap;
  }

  .file-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
