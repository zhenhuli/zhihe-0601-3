<script setup>
import { ref, computed } from 'vue'
import { useAttendanceStore } from '../../stores/attendance'
import { USERS, DEPARTMENTS } from '../../stores/auth'

const store = useAttendanceStore()

const activeDept = ref('技术部')
const showDeptPicker = ref(false)

const deptOptions = DEPARTMENTS.map(d => ({ text: d, value: d }))

const employees = computed(() => {
  return store.getDeptEmployees(activeDept.value).map(emp => {
    const al = store.getAnnualLeave(emp.id)
    const stats = store.getMonthAttendanceStats(emp.id, store.currentYear, store.currentMonth)
    const leaves = store.getEmployeeLeaves(emp.id)
    const overtimes = store.getEmployeeOvertimes(emp.id)
    const pendingLeaves = leaves.filter(l => l.status === 'pending').length
    const pendingOvertimes = overtimes.filter(o => o.status === 'pending').length
    return {
      ...emp,
      annualLeave: al,
      attendanceStats: stats,
      pendingCount: pendingLeaves + pendingOvertimes,
      attendanceRate: stats.total > 0 ? Math.round(stats.present / stats.total * 100) : 0
    }
  })
})

function onDeptConfirm({ selectedOptions }) {
  activeDept.value = selectedOptions[0]?.value || '技术部'
  showDeptPicker.value = false
}

function rateColor(rate) {
  if (rate >= 95) return '#07c160'
  if (rate >= 80) return '#ff976a'
  return '#ee0a24'
}
</script>

<template>
  <div class="dept-page">
    <van-nav-bar title="部门人员管理">
      <template #right>
        <van-icon name="wap-nav" size="20" @click="showDeptPicker = true" />
      </template>
    </van-nav-bar>

    <div class="dept-tabs">
      <van-tag
        v-for="dept in DEPARTMENTS"
        :key="dept"
        :type="activeDept === dept ? 'primary' : 'default'"
        size="large"
        round
        class="dept-tag"
        @click="activeDept = dept"
      >
        {{ dept }}
      </van-tag>
    </div>

    <div class="dept-summary">
      <span>共 {{ employees.length }} 人</span>
    </div>

    <div class="employee-list">
      <div v-if="employees.length === 0" class="empty-tip">该部门暂无员工</div>
      <div v-for="emp in employees" :key="emp.id" class="emp-card">
        <div class="emp-header">
          <div class="emp-avatar">{{ emp.name.charAt(0) }}</div>
          <div class="emp-info">
            <div class="emp-name">{{ emp.name }}</div>
            <div class="emp-dept">{{ emp.dept }}</div>
          </div>
          <div class="emp-rate" :style="{ color: rateColor(emp.attendanceRate) }">
            {{ emp.attendanceRate }}%
          </div>
        </div>
        <div class="emp-stats">
          <div class="emp-stat">
            <div class="emp-stat-value">{{ emp.attendanceStats.present }}</div>
            <div class="emp-stat-label">出勤</div>
          </div>
          <div class="emp-stat">
            <div class="emp-stat-value" style="color: #ff976a">{{ emp.attendanceStats.late }}</div>
            <div class="emp-stat-label">迟到</div>
          </div>
          <div class="emp-stat">
            <div class="emp-stat-value" style="color: #ee0a24">{{ emp.attendanceStats.absent }}</div>
            <div class="emp-stat-label">缺勤</div>
          </div>
          <div class="emp-stat">
            <div class="emp-stat-value" style="color: #1989fa">{{ emp.annualLeave.remaining }}天</div>
            <div class="emp-stat-label">年假余</div>
          </div>
          <div class="emp-stat">
            <div class="emp-stat-value" style="color: #ff976a">{{ emp.pendingCount }}</div>
            <div class="emp-stat-label">待审批</div>
          </div>
        </div>
      </div>
    </div>

    <van-popup v-model:show="showDeptPicker" position="bottom" round>
      <van-picker
        :columns="deptOptions"
        @confirm="onDeptConfirm"
        @cancel="showDeptPicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.dept-page {
  background: #f7f8fa;
  min-height: 100%;
}

:deep(.van-nav-bar) {
  background: #fff;
}

.dept-tabs {
  display: flex;
  gap: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
}

.dept-tag {
  flex-shrink: 0;
  cursor: pointer;
}

.dept-summary {
  padding: 8px 16px;
  font-size: 13px;
  color: #969799;
}

.employee-list {
  padding: 0 12px 20px;
}

.emp-card {
  background: #fff;
  border-radius: 12px;
  padding: 14px 16px;
  margin-bottom: 10px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.emp-header {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.emp-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: linear-gradient(135deg, #1989fa, #2b6cb0);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  margin-right: 12px;
  flex-shrink: 0;
}

.emp-info {
  flex: 1;
}

.emp-name {
  font-size: 15px;
  font-weight: 600;
  color: #323233;
}

.emp-dept {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}

.emp-rate {
  font-size: 20px;
  font-weight: 700;
}

.emp-stats {
  display: flex;
  background: #f7f8fa;
  border-radius: 8px;
  padding: 8px 0;
}

.emp-stat {
  flex: 1;
  text-align: center;
}

.emp-stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #323233;
}

.emp-stat-label {
  font-size: 11px;
  color: #969799;
  margin-top: 2px;
}
</style>
