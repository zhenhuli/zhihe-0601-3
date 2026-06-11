<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useAttendanceStore } from '../../stores/attendance'

const authStore = useAuthStore()
const store = useAttendanceStore()

const currentYear = ref(store.currentYear)
const currentMonth = ref(store.currentMonth)
const showMonthPicker = ref(false)

const monthColumns = (() => {
  const years = []
  const now = new Date()
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) {
    years.push({ text: `${y}年`, value: y })
  }
  const months = []
  for (let m = 1; m <= 12; m++) {
    months.push({ text: `${m}月`, value: m })
  }
  return [years, months]
})()

const monthLabel = computed(() => `${currentYear.value}年${currentMonth.value}月`)

const stats = computed(() => {
  return store.getMonthAttendanceStats(authStore.currentUser?.id, currentYear.value, currentMonth.value)
})

const attendanceList = computed(() => {
  return store.getEmployeeAttendances(authStore.currentUser?.id, currentYear.value, currentMonth.value)
    .sort((a, b) => a.date.localeCompare(b.date))
})

const statusMap = {
  present: { text: '出勤', color: '#07c160', bg: '#f0fff4' },
  late: { text: '迟到', color: '#ff976a', bg: '#fff7e6' },
  absent: { text: '缺勤', color: '#ee0a24', bg: '#fff1f0' },
  leave: { text: '请假', color: '#1989fa', bg: '#ecf5ff' }
}

function onMonthConfirm({ selectedValues }) {
  const [year, month] = selectedValues
  currentYear.value = year
  currentMonth.value = month
  showMonthPicker.value = false
}

function getStatusInfo(status) {
  return statusMap[status] || { text: status, color: '#969799', bg: '#f7f8fa' }
}

function getWeekDay(dateStr) {
  const days = ['日', '一', '二', '三', '四', '五', '六']
  const d = new Date(dateStr)
  return '周' + days[d.getDay()]
}
</script>

<template>
  <div class="monthly-page">
    <van-nav-bar :title="monthLabel + ' 考勤明细'">
      <template #left>
        <van-icon name="calendar-o" size="20" @click="showMonthPicker = true" />
      </template>
    </van-nav-bar>

    <div class="card-section">
      <div class="section-title">考勤统计</div>
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
        <div class="stat-item">
          <div class="stat-value" style="color: #1989fa">{{ stats.leave }}</div>
          <div class="stat-label">请假(天)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #323233">{{ stats.total }}</div>
          <div class="stat-label">应出勤(天)</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #07c160">
            {{ stats.total > 0 ? Math.round(stats.present / stats.total * 100) : 0 }}%
          </div>
          <div class="stat-label">出勤率</div>
        </div>
      </div>
    </div>

    <div class="card-section">
      <div class="section-title">每日明细</div>
      <div v-if="attendanceList.length === 0" class="empty-tip">暂无记录</div>
      <div v-for="item in attendanceList" :key="item.id" class="daily-item">
        <div class="daily-date">
          <div class="daily-day">{{ item.date.slice(8) }}</div>
          <div class="daily-week">{{ getWeekDay(item.date) }}</div>
        </div>
        <div class="daily-status">
          <span
            class="status-tag"
            :style="{ color: getStatusInfo(item.status).color, background: getStatusInfo(item.status).bg }"
          >
            {{ getStatusInfo(item.status).text }}
          </span>
        </div>
      </div>
    </div>

    <van-popup v-model:show="showMonthPicker" position="bottom" round>
      <van-picker
        :columns="monthColumns"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.monthly-page {
  background: #f7f8fa;
  padding-bottom: 20px;
}

:deep(.van-nav-bar) {
  background: #fff;
}

.stat-grid {
  grid-template-columns: repeat(3, 1fr);
}

.daily-item {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.daily-item:last-child {
  border-bottom: none;
}

.daily-date {
  width: 50px;
  text-align: center;
  flex-shrink: 0;
}

.daily-day {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.daily-week {
  font-size: 11px;
  color: #969799;
}

.daily-status {
  flex: 1;
  text-align: right;
}

.status-tag {
  display: inline-block;
  padding: 3px 12px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
}
</style>
