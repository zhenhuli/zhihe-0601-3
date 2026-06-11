<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useAttendanceStore } from '../../stores/attendance'
import { showToast, showDialog } from 'vant'

const authStore = useAuthStore()
const store = useAttendanceStore()

const activeTab = ref(0)

const form = ref({
  date: '',
  startTime: '',
  endTime: '',
  reason: ''
})

const showDatePicker = ref(false)
const showStartTimePicker = ref(false)
const showEndTimePicker = ref(false)
const datePickerVal = ref([])
const startTimePickerVal = ref(['19', '00'])
const endTimePickerVal = ref(['21', '00'])

const timeColumns = (() => {
  const hours = []
  for (let h = 0; h <= 23; h++) {
    hours.push({ text: String(h).padStart(2, '0'), value: String(h).padStart(2, '0') })
  }
  const minutes = []
  for (let m = 0; m <= 59; m += 15) {
    minutes.push({ text: String(m).padStart(2, '0'), value: String(m).padStart(2, '0') })
  }
  return [hours, minutes]
})()

const calcHours = computed(() => {
  if (!form.value.startTime || !form.value.endTime) return 0
  return store.calcOvertimeHours(form.value.startTime, form.value.endTime)
})

const compensatoryHours = computed(() => {
  return Math.round(calcHours.value / 8 * 10) / 10
})

const myOvertimes = computed(() => {
  return store.getEmployeeOvertimes(authStore.currentUser?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const totalApprovedHours = computed(() => {
  return myOvertimes.value
    .filter(o => o.status === 'approved')
    .reduce((sum, o) => sum + o.hours, 0)
})

function initDatePicker() {
  const now = new Date()
  datePickerVal.value = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
}

function onDateConfirm({ selectedValues }) {
  const [y, m, d] = selectedValues
  form.value.date = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  showDatePicker.value = false
}

function onStartTimeConfirm({ selectedValues }) {
  form.value.startTime = selectedValues.join(':')
  showStartTimePicker.value = false
}

function onEndTimeConfirm({ selectedValues }) {
  form.value.endTime = selectedValues.join(':')
  showEndTimePicker.value = false
}

function validateForm() {
  if (!form.value.date) {
    showToast('请选择加班日期')
    return false
  }
  if (!form.value.startTime) {
    showToast('请选择开始时间')
    return false
  }
  if (!form.value.endTime) {
    showToast('请选择结束时间')
    return false
  }
  if (calcHours.value <= 0) {
    showToast('加班时长不能为零')
    return false
  }
  if (!form.value.reason.trim()) {
    showToast('请填写加班事由')
    return false
  }
  return true
}

function onSubmit() {
  if (!validateForm()) return
  showDialog({
    title: '确认提交',
    message: `确认提交加班填报？\n加班时长：${calcHours.value}小时\n折算调休：${compensatoryHours.value}天`,
  }).then(() => {
    const result = store.addOvertime({
      userId: authStore.currentUser.id,
      ...form.value
    })
    if (result.success) {
      showToast('提交成功')
      form.value = { date: '', startTime: '', endTime: '', reason: '' }
      activeTab.value = 1
    }
  }).catch(() => {})
}

function statusText(status) {
  const map = { pending: '待审批', approved: '已通过', rejected: '已驳回' }
  return map[status] || status
}

function statusClass(status) {
  const map = { pending: 'status-pending', approved: 'status-approved', rejected: 'status-rejected' }
  return map[status] || ''
}
</script>

<template>
  <div class="overtime-page">
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="加班填报">
        <div class="form-section">
          <van-cell-group inset>
            <van-field
              v-model="form.date"
              is-link
              readonly
              label="加班日期"
              placeholder="请选择"
              @click="initDatePicker(); showDatePicker = true"
              required
            />
            <van-field
              v-model="form.startTime"
              is-link
              readonly
              label="开始时间"
              placeholder="请选择"
              @click="showStartTimePicker = true"
              required
            />
            <van-field
              v-model="form.endTime"
              is-link
              readonly
              label="结束时间"
              placeholder="请选择"
              @click="showEndTimePicker = true"
              required
            />
            <van-field
              v-model="form.reason"
              label="加班事由"
              type="textarea"
              placeholder="请输入加班事由"
              rows="3"
              maxlength="200"
              show-word-limit
              required
            />
          </van-cell-group>

          <div v-if="calcHours > 0" class="calc-result">
            <div class="calc-item">
              <van-icon name="clock-o" />
              <span>加班时长：<strong>{{ calcHours }}</strong> 小时</span>
            </div>
            <div class="calc-item">
              <van-icon name="label-o" />
              <span>折算调休：<strong>{{ compensatoryHours }}</strong> 天</span>
            </div>
          </div>

          <div v-if="totalApprovedHours > 0" class="compensate-info">
            <van-icon name="info-o" />
            <span>已累计可调休：<strong>{{ (totalApprovedHours / 8).toFixed(1) }}</strong> 天</span>
          </div>

          <div class="form-actions">
            <van-button type="primary" block round @click="onSubmit">提交填报</van-button>
          </div>
        </div>
      </van-tab>

      <van-tab title="我的加班">
        <div class="records-section">
          <div v-if="myOvertimes.length === 0" class="empty-tip">暂无加班记录</div>
          <div v-for="item in myOvertimes" :key="item.id" class="record-card">
            <div class="record-header">
              <span class="record-type">加班填报</span>
              <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
            </div>
            <div class="record-body">
              <div class="record-row"><span>加班日期</span><span>{{ item.date }}</span></div>
              <div class="record-row"><span>加班时段</span><span>{{ item.startTime }} - {{ item.endTime }}</span></div>
              <div class="record-row"><span>加班时长</span><span>{{ item.hours }}小时</span></div>
              <div class="record-row"><span>折算调休</span><span>{{ (item.hours / 8).toFixed(1) }}天</span></div>
              <div class="record-row"><span>加班事由</span><span>{{ item.reason }}</span></div>
              <div v-if="item.status === 'rejected'" class="record-row reject-row">
                <span>驳回理由</span><span style="color: #ee0a24">{{ item.rejectReason }}</span>
              </div>
              <div class="record-row"><span>提交时间</span><span>{{ item.createdAt }}</span></div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker
        v-model="datePickerVal"
        title="选择加班日期"
        :min-date="new Date(2024, 0, 1)"
        @confirm="onDateConfirm"
        @cancel="showDatePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showStartTimePicker" position="bottom" round>
      <van-picker
        :columns="timeColumns"
        title="选择开始时间"
        @confirm="onStartTimeConfirm"
        @cancel="showStartTimePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showEndTimePicker" position="bottom" round>
      <van-picker
        :columns="timeColumns"
        title="选择结束时间"
        @confirm="onEndTimeConfirm"
        @cancel="showEndTimePicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.overtime-page {
  min-height: 100%;
  background: #f7f8fa;
}

.form-section {
  padding: 12px 0 20px;
}

.calc-result {
  margin: 12px 16px;
  padding: 12px 14px;
  background: #fff7e6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.calc-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #ff976a;
}

.calc-item strong {
  font-size: 18px;
}

.compensate-info {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 8px 16px;
  padding: 8px 14px;
  background: #f0fff4;
  border-radius: 8px;
  font-size: 13px;
  color: #07c160;
}

.compensate-info strong {
  font-size: 16px;
}

.form-actions {
  padding: 16px;
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
</style>
