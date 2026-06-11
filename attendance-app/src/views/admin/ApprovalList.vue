<script setup>
import { ref, computed } from 'vue'
import { useAttendanceStore } from '../../stores/attendance'
import { USERS } from '../../stores/auth'
import { showToast, showDialog } from 'vant'

const store = useAttendanceStore()

const activeTab = ref(0)
const filterStatus = ref('all')
const showRejectDialog = ref(false)
const rejectReason = ref('')
const currentItemId = ref(null)
const currentItemCategory = ref('')

const allItems = computed(() => {
  let leaves = store.getAllLeaves()
  let overtimes = store.getAllOvertimes()
  let items = [...leaves, ...overtimes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  if (filterStatus.value !== 'all') {
    items = items.filter(i => i.status === filterStatus.value)
  }
  return items
})

const pendingItems = computed(() => {
  return store.getAllPending()
})

const pendingCount = computed(() => pendingItems.value.length)

function getUserName(userId) {
  return USERS.find(u => u.id === userId)?.name || '未知'
}

function getUserDept(userId) {
  return USERS.find(u => u.id === userId)?.dept || ''
}

function statusText(status) {
  const map = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

function statusClass(status) {
  const map = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }
  return map[status] || ''
}

function onApprove(item) {
  showDialog({
    title: '确认通过',
    message: `确认通过${item.category === 'leave' ? '请假' : '加班'}申请？`,
  }).then(() => {
    store.approveItem(item.category, item.id, '')
    showToast('已通过')
  }).catch(() => {})
}

function onReject(item) {
  currentItemId.value = item.id
  currentItemCategory.value = item.category
  rejectReason.value = ''
  showRejectDialog.value = true
}

function confirmReject() {
  if (!rejectReason.value.trim()) {
    showToast('请填写驳回理由')
    return
  }
  store.approveItem(currentItemCategory.value, currentItemId.value, rejectReason.value)
  showRejectDialog.value = false
  showToast('已驳回')
}
</script>

<template>
  <div class="approval-page">
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab :title="'待审批' + (pendingCount > 0 ? `(${pendingCount})` : '')">
        <div class="filter-bar">
          <van-dropdown-menu active-color="#1989fa">
            <van-dropdown-item v-model="filterStatus" :options="[
              { text: '全部', value: 'all' },
              { text: '待审批', value: 'pending' },
              { text: '已通过', value: 'approved' },
              { text: '已驳回', value: 'rejected' }
            ]" />
          </van-dropdown-menu>
        </div>

        <div class="records-section">
          <div v-if="allItems.filter(i => i.status === 'pending').length === 0" class="empty-tip">
            暂无待审批单据
          </div>
          <div v-for="item in allItems.filter(i => i.status === 'pending')" :key="item.category + item.id" class="record-card">
            <div class="record-header">
              <span class="record-type">
                {{ item.category === 'leave' ? '📋 请假申请' : '⏰ 加班填报' }}
              </span>
              <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
            </div>
            <div class="record-body">
              <div class="record-row"><span>申请人</span><span>{{ getUserName(item.userId) }}（{{ getUserDept(item.userId) }}）</span></div>
              <template v-if="item.category === 'leave'">
                <div class="record-row"><span>请假类型</span><span>{{ item.type }}</span></div>
                <div class="record-row"><span>起止日期</span><span>{{ item.startDate }} ~ {{ item.endDate }}</span></div>
                <div class="record-row"><span>请假天数</span><span>{{ item.days }}天</span></div>
                <div class="record-row"><span>请假事由</span><span>{{ item.reason }}</span></div>
              </template>
              <template v-else>
                <div class="record-row"><span>加班日期</span><span>{{ item.date }}</span></div>
                <div class="record-row"><span>加班时段</span><span>{{ item.startTime }} - {{ item.endTime }}</span></div>
                <div class="record-row"><span>加班时长</span><span>{{ item.hours }}小时</span></div>
                <div class="record-row"><span>加班事由</span><span>{{ item.reason }}</span></div>
              </template>
            </div>
            <div class="record-actions">
              <van-button type="primary" size="small" round @click="onApprove(item)">通过</van-button>
              <van-button type="danger" size="small" round plain @click="onReject(item)">驳回</van-button>
            </div>
          </div>
        </div>
      </van-tab>

      <van-tab title="全部单据">
        <div class="filter-bar">
          <van-dropdown-menu active-color="#1989fa">
            <van-dropdown-item v-model="filterStatus" :options="[
              { text: '全部', value: 'all' },
              { text: '待审批', value: 'pending' },
              { text: '已通过', value: 'approved' },
              { text: '已驳回', value: 'rejected' }
            ]" />
          </van-dropdown-menu>
        </div>

        <div class="records-section">
          <div v-if="allItems.length === 0" class="empty-tip">暂无单据</div>
          <div v-for="item in allItems" :key="item.category + item.id" class="record-card">
            <div class="record-header">
              <span class="record-type">
                {{ item.category === 'leave' ? '📋 请假申请' : '⏰ 加班填报' }}
              </span>
              <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
            </div>
            <div class="record-body">
              <div class="record-row"><span>申请人</span><span>{{ getUserName(item.userId) }}（{{ getUserDept(item.userId) }}）</span></div>
              <template v-if="item.category === 'leave'">
                <div class="record-row"><span>请假类型</span><span>{{ item.type }}</span></div>
                <div class="record-row"><span>起止日期</span><span>{{ item.startDate }} ~ {{ item.endDate }}</span></div>
                <div class="record-row"><span>请假天数</span><span>{{ item.days }}天</span></div>
                <div class="record-row"><span>请假事由</span><span>{{ item.reason }}</span></div>
              </template>
              <template v-else>
                <div class="record-row"><span>加班日期</span><span>{{ item.date }}</span></div>
                <div class="record-row"><span>加班时段</span><span>{{ item.startTime }} - {{ item.endTime }}</span></div>
                <div class="record-row"><span>加班时长</span><span>{{ item.hours }}小时</span></div>
                <div class="record-row"><span>加班事由</span><span>{{ item.reason }}</span></div>
              </template>
              <div v-if="item.status === 'rejected' && item.rejectReason" class="record-row reject-row">
                <span>驳回理由</span><span style="color: #ee0a24">{{ item.rejectReason }}</span>
              </div>
            </div>
            <div v-if="item.status === 'pending'" class="record-actions">
              <van-button type="primary" size="small" round @click="onApprove(item)">通过</van-button>
              <van-button type="danger" size="small" round plain @click="onReject(item)">驳回</van-button>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <van-dialog
      v-model:show="showRejectDialog"
      title="驳回理由"
      show-cancel-button
      @confirm="confirmReject"
    >
      <div style="padding: 16px;">
        <van-field
          v-model="rejectReason"
          type="textarea"
          placeholder="请输入驳回理由"
          rows="3"
          maxlength="200"
          show-word-limit
        />
      </div>
    </van-dialog>
  </div>
</template>

<style scoped>
.approval-page {
  min-height: 100%;
  background: #f7f8fa;
}

.filter-bar :deep(.van-dropdown-menu) {
  background: #fff;
  box-shadow: none;
  border-bottom: 1px solid #f0f0f0;
}

.records-section {
  padding: 12px;
}

.record-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f5f5f5;
}

.record-type {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.record-body {
  font-size: 13px;
}

.record-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  color: #646566;
}

.record-row span:first-child {
  color: #969799;
}

.reject-row {
  background: #fff1f0;
  margin: 4px -8px;
  padding: 6px 8px;
  border-radius: 4px;
}

.record-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #f5f5f5;
}
</style>
