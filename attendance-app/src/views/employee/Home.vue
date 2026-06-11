<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { useAttendanceStore } from '../../stores/attendance'

const router = useRouter()
const authStore = useAuthStore()
const store = useAttendanceStore()

const userId = computed(() => authStore.currentUser?.id)

const stats = computed(() => {
  if (!userId.value) return { present: 0, late: 0, absent: 0, leave: 0, total: 0 }
  return store.getMonthAttendanceStats(userId.value, store.currentYear, store.currentMonth)
})

const annualLeave = computed(() => {
  if (!userId.value) return { total: 10, used: 0, remaining: 10 }
  return store.getAnnualLeave(userId.value)
})

const pendingCount = computed(() => {
  if (!userId.value) return 0
  return store.getPendingCount(userId.value)
})

const myLeaves = computed(() => {
  if (!userId.value) return []
  return store.getEmployeeLeaves(userId.value)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
})

const myOvertimes = computed(() => {
  if (!userId.value) return []
  return store.getEmployeeOvertimes(userId.value)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
})

const monthLabel = computed(() => `${store.currentYear}年${store.currentMonth}月`)

function statusText(status) {
  const map = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

function statusClass(status) {
  const map = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }
  return map[status] || ''
}

function goLeave() {
  router.push({ name: 'EmpLeave' })
}

function goOvertime() {
  router.push({ name: 'EmpOvertime' })
}
</script>

<template>
  <div class="home-page">
    <div class="greeting-card">
      <div class="greeting-text">
        <div class="greeting-name">{{ authStore.currentUser?.name }}，你好</div>
        <div class="greeting-dept">{{ authStore.currentUser?.dept }}</div>
      </div>
      <div class="greeting-month">{{ monthLabel }}</div>
    </div>

    <div class="card-section">
      <div class="section-title">当月出勤概览</div>
      <div class="stat-grid">
        <div class="stat-item">
          <div class="stat-value" style="color: #07c160">{{ stats.present }}</div>
          <div class="stat-label">出勤(天)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ff976a">{{ stats.late }}</div>
          <div class="stat-label">迟到(次)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ee0a24">{{ stats.absent }}</div>
          <div class="stat-label">缺勤(天)</div>
        </div>
      </div>
    </div>

    <div class="card-section">
      <div class="section-title">
        年假余额
        <van-tag type="primary" size="medium">{{ annualLeave.remaining }}天</van-tag>
      </div>
      <div class="annual-bar">
        <div class="annual-progress" :style="{ width: (annualLeave.used / annualLeave.total * 100) + '%' }"></div>
      </div>
      <div class="annual-detail">
        <span>总额 {{ annualLeave.total }}天</span>
        <span>已用 {{ annualLeave.used }}天</span>
        <span>剩余 {{ annualLeave.remaining }}天</span>
      </div>
    </div>

    <div class="card-section">
      <div class="section-title">
        待审批单据
        <van-tag v-if="pendingCount > 0" type="warning" size="medium">{{ pendingCount }}</van-tag>
        <span v-else class="no-pending">暂无</span>
      </div>
      <div v-if="pendingCount === 0" class="empty-tip">暂无待审批单据</div>
    </div>

    <div class="card-section">
      <div class="section-title">
        我的单据
        <span class="section-more" @click="goLeave">查看全部 ›</span>
      </div>
      <div v-if="myLeaves.length === 0 && myOvertimes.length === 0" class="empty-tip">暂无单据</div>
      <div v-for="item in myLeaves" :key="'l'+item.id" class="list-item">
        <div class="item-icon" style="background: #ecf5ff; color: #1989fa">📋</div>
        <div class="item-info">
          <div class="item-title">{{ item.type }} · {{ item.days }}天</div>
          <div class="item-desc">{{ item.startDate }} ~ {{ item.endDate }}</div>
        </div>
        <div class="item-right">
          <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
        </div>
      </div>
      <div v-for="item in myOvertimes" :key="'o'+item.id" class="list-item">
        <div class="item-icon" style="background: #fff7e6; color: #ff976a">⏰</div>
        <div class="item-info">
          <div class="item-title">加班 · {{ item.hours }}h</div>
          <div class="item-desc">{{ item.date }} {{ item.startTime }}-{{ item.endTime }}</div>
        </div>
        <div class="item-right">
          <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
        </div>
      </div>
    </div>

    <div class="quick-actions">
      <van-button type="primary" icon="description" round size="small" @click="goLeave">请假申请</van-button>
      <van-button type="warning" icon="clock-o" round size="small" @click="goOvertime">加班填报</van-button>
    </div>
  </div>
</template>

<style scoped>
.home-page {
  padding-bottom: 20px;
}

.greeting-card {
  margin: 12px;
  padding: 20px 16px;
  background: linear-gradient(135deg, #1989fa, #2b6cb0);
  border-radius: 12px;
  color: #fff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.greeting-name {
  font-size: 20px;
  font-weight: 700;
}

.greeting-dept {
  font-size: 13px;
  opacity: 0.85;
  margin-top: 4px;
}

.greeting-month {
  font-size: 14px;
  opacity: 0.9;
}

.annual-bar {
  height: 8px;
  background: #f0f0f0;
  border-radius: 4px;
  overflow: hidden;
  margin-bottom: 8px;
}

.annual-progress {
  height: 100%;
  background: linear-gradient(90deg, #1989fa, #36d1dc);
  border-radius: 4px;
  transition: width 0.3s;
}

.annual-detail {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #969799;
}

.no-pending {
  font-size: 12px;
  color: #969799;
  font-weight: 400;
}

.section-more {
  font-size: 13px;
  color: #1989fa;
  font-weight: 400;
  cursor: pointer;
}

.quick-actions {
  display: flex;
  gap: 12px;
  padding: 0 12px;
  margin-top: 4px;
}

.quick-actions .van-button {
  flex: 1;
}
</style>
