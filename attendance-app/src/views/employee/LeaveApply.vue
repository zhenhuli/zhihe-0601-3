<script setup>
import { ref, computed, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { useAttendanceStore } from '../../stores/attendance'
import { showToast, showDialog } from 'vant'

const authStore = useAuthStore()
const store = useAttendanceStore()

const activeTab = ref(0)

const form = ref({
  type: '',
  startDate: '',
  endDate: '',
  reason: '',
  attachments: []
})

const showStartDatePicker = ref(false)
const showEndDatePicker = ref(false)
const showTypePicker = ref(false)
const startDatePickerVal = ref([])
const endDatePickerVal = ref([])

const leaveTypes = [
  { text: '事假', value: '事假' },
  { text: '病假', value: '病假' },
  { text: '年假', value: '年假' }
]

const calcDays = computed(() => {
  if (!form.value.startDate || !form.value.endDate) return 0
  return store.getDaysBetween(form.value.startDate, form.value.endDate)
})

const annualLeave = computed(() => {
  return store.getAnnualLeave(authStore.currentUser?.id)
})

const myLeaves = computed(() => {
  return store.getEmployeeLeaves(authStore.currentUser?.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
})

const compensateHours = computed(() => {
  return store.getEmployeeOvertimes(authStore.currentUser?.id)
    .filter(o => o.status === 'approved')
    .reduce((sum, o) => sum + o.hours, 0)
})

watch(calcDays, (val) => {
  if (form.value.type === '年假' && val > annualLeave.value.remaining) {
    showToast(`年假余额不足，剩余${annualLeave.value.remaining}天`)
  }
})

function initDatePicker(type) {
  const now = new Date()
  const val = [now.getFullYear(), now.getMonth() + 1, now.getDate()]
  if (type === 'start') {
    startDatePickerVal.value = val
  } else {
    endDatePickerVal.value = val
  }
}

function onStartDateConfirm({ selectedValues }) {
  const [y, m, d] = selectedValues
  form.value.startDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  showStartDatePicker.value = false
}

function onEndDateConfirm({ selectedValues }) {
  const [y, m, d] = selectedValues
  form.value.endDate = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  showEndDatePicker.value = false
}

function onTypeConfirm({ selectedOptions }) {
  form.value.type = selectedOptions[0]?.text || ''
  showTypePicker.value = false
}

function onFileChange(e) {
  const files = e.target.files
  if (!files) return
  Array.from(files).forEach(file => {
    if (form.value.attachments.length >= 5) {
      showToast('最多上传5张附件')
      return
    }
    const reader = new FileReader()
    reader.onload = (ev) => {
      form.value.attachments.push({
        name: file.name,
        url: ev.target.result
      })
    }
    reader.readAsDataURL(file)
  })
  e.target.value = ''
}

function removeAttachment(index) {
  form.value.attachments.splice(index, 1)
}

function validateForm() {
  if (!form.value.type) {
    showToast('请选择请假类型')
    return false
  }
  if (!form.value.startDate) {
    showToast('请选择开始日期')
    return false
  }
  if (!form.value.endDate) {
    showToast('请选择结束日期')
    return false
  }
  if (calcDays.value <= 0) {
    showToast('结束日期不能早于开始日期')
    return false
  }
  if (!form.value.reason.trim()) {
    showToast('请填写请假事由')
    return false
  }
  if (form.value.type === '年假' && calcDays.value > annualLeave.value.remaining) {
    showToast(`年假余额不足，剩余${annualLeave.value.remaining}天`)
    return false
  }
  return true
}

function onSubmit() {
  if (!validateForm()) return
  showDialog({
    title: '确认提交',
    message: `确认提交${form.value.type}申请？\n请假天数：${calcDays.value}天`,
  }).then(() => {
    const result = store.addLeave({
      userId: authStore.currentUser.id,
      ...form.value
    })
    if (result.success) {
      showToast('提交成功')
      form.value = { type: '', startDate: '', endDate: '', reason: '', attachments: [] }
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
  <div class="leave-page">
    <van-tabs v-model:active="activeTab" sticky>
      <van-tab title="请假申请">
        <div class="form-section">
          <van-cell-group inset>
            <van-field
              v-model="form.type"
              is-link
              readonly
              label="请假类型"
              placeholder="请选择"
              @click="showTypePicker = true"
              required
            />
            <van-field
              v-model="form.startDate"
              is-link
              readonly
              label="开始日期"
              placeholder="请选择"
              @click="initDatePicker('start'); showStartDatePicker = true"
              required
            />
            <van-field
              v-model="form.endDate"
              is-link
              readonly
              label="结束日期"
              placeholder="请选择"
              @click="initDatePicker('end'); showEndDatePicker = true"
              required
            />
            <van-field
              v-model="form.reason"
              label="请假事由"
              type="textarea"
              placeholder="请输入请假事由"
              rows="3"
              maxlength="200"
              show-word-limit
              required
            />
          </van-cell-group>

          <div v-if="calcDays > 0" class="calc-result">
            <van-icon name="info-o" />
            <span>自动核算工作日：<strong>{{ calcDays }}</strong> 天</span>
          </div>

          <div class="upload-section">
            <div class="upload-title">附件图片（最多5张）</div>
            <div class="upload-list">
              <div v-for="(att, idx) in form.attachments" :key="idx" class="upload-item">
                <img :src="att.url" alt="" />
                <van-icon name="delete" class="upload-del" @click="removeAttachment(idx)" />
              </div>
              <div v-if="form.attachments.length < 5" class="upload-add" @click="$refs.fileInput.click()">
                <van-icon name="photograph" size="24" />
                <span>上传</span>
              </div>
            </div>
          </div>

          <div class="form-actions">
            <van-button type="primary" block round @click="onSubmit">提交申请</van-button>
          </div>
        </div>
      </van-tab>

      <van-tab title="我的单据">
        <div class="records-section">
          <div v-if="myLeaves.length === 0" class="empty-tip">暂无请假记录</div>
          <div v-for="item in myLeaves" :key="item.id" class="record-card">
            <div class="record-header">
              <span class="record-type">{{ item.type }}</span>
              <span :class="statusClass(item.status)">{{ statusText(item.status) }}</span>
            </div>
            <div class="record-body">
              <div class="record-row"><span>起止日期</span><span>{{ item.startDate }} ~ {{ item.endDate }}</span></div>
              <div class="record-row"><span>请假天数</span><span>{{ item.days }}天</span></div>
              <div class="record-row"><span>请假事由</span><span>{{ item.reason }}</span></div>
              <div v-if="item.status === 'rejected'" class="record-row reject-row">
                <span>驳回理由</span><span style="color: #ee0a24">{{ item.rejectReason }}</span>
              </div>
              <div class="record-row"><span>提交时间</span><span>{{ item.createdAt }}</span></div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <van-popup v-model:show="showTypePicker" position="bottom" round>
      <van-picker :columns="leaveTypes" @confirm="onTypeConfirm" @cancel="showTypePicker = false" />
    </van-popup>

    <van-popup v-model:show="showStartDatePicker" position="bottom" round>
      <van-date-picker
        v-model="startDatePickerVal"
        title="选择开始日期"
        :min-date="new Date(2024, 0, 1)"
        @confirm="onStartDateConfirm"
        @cancel="showStartDatePicker = false"
      />
    </van-popup>

    <van-popup v-model:show="showEndDatePicker" position="bottom" round>
      <van-date-picker
        v-model="endDatePickerVal"
        title="选择结束日期"
        :min-date="new Date(2024, 0, 1)"
        @confirm="onEndDateConfirm"
        @cancel="showEndDatePicker = false"
      />
    </van-popup>

    <input ref="fileInput" type="file" accept="image/*" multiple style="display: none" @change="onFileChange" />
  </div>
</template>

<style scoped>
.leave-page {
  min-height: 100%;
  background: #f7f8fa;
}

.form-section {
  padding: 12px 0 20px;
}

.calc-result {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 12px 16px;
  padding: 10px 14px;
  background: #ecf5ff;
  border-radius: 8px;
  font-size: 13px;
  color: #1989fa;
}

.calc-result strong {
  font-size: 18px;
}

.upload-section {
  margin: 12px 16px;
}

.upload-title {
  font-size: 14px;
  color: #323233;
  margin-bottom: 8px;
}

.upload-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.upload-item {
  position: relative;
  width: 72px;
  height: 72px;
  border-radius: 8px;
  overflow: hidden;
}

.upload-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.upload-del {
  position: absolute;
  top: 2px;
  right: 2px;
  color: #fff;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 50%;
  font-size: 14px;
  padding: 2px;
}

.upload-add {
  width: 72px;
  height: 72px;
  border: 1px dashed #dcdee0;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #969799;
  font-size: 12px;
  gap: 4px;
  cursor: pointer;
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
