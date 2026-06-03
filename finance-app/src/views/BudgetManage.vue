<script setup>
import { ref, computed, onMounted, onActivated } from 'vue'
import { showToast } from 'vant'
import { useFinanceStore } from '../stores/finance'
import { exportToExcel, exportToCSV } from '../utils/export'

const store = useFinanceStore()
const showMonthPicker = ref(false)
const budgetInput = ref('')
const showBudgetDialog = ref(false)

const monthColumns = (() => {
  const years = []
  const now = new Date()
  for (let y = now.getFullYear(); y >= now.getFullYear() - 10; y--) {
    years.push({ text: `${y}年`, value: y })
  }
  const months = []
  for (let m = 1; m <= 12; m++) {
    months.push({ text: `${m}月`, value: m })
  }
  return [years, months]
})()

const totalExpense = computed(() => {
  return store.monthlyStats?.totalExpense || 0
})

const budgetAmount = computed(() => {
  return store.budget?.amount || 0
})

const remaining = computed(() => {
  return budgetAmount.value - totalExpense.value
})

const budgetPercent = computed(() => {
  if (budgetAmount.value <= 0) return 0
  return Math.min(Math.round((totalExpense.value / budgetAmount.value) * 100), 100)
})

const isOverBudget = computed(() => {
  return budgetAmount.value > 0 && totalExpense.value > budgetAmount.value
})

const progressColor = computed(() => {
  if (isOverBudget.value) return '#ee0a24'
  if (budgetPercent.value > 80) return '#ff976a'
  return '#07c160'
})

function onMonthConfirm({ selectedValues }) {
  const [year, month] = selectedValues
  store.setMonth(year, month)
  showMonthPicker.value = false
}

function openBudgetDialog() {
  budgetInput.value = budgetAmount.value ? String(budgetAmount.value) : ''
  showBudgetDialog.value = true
}

async function saveBudgetAmount() {
  const amount = Number(budgetInput.value)
  if (!amount || amount <= 0) {
    showToast('请输入有效预算金额')
    return
  }
  await store.saveBudget(amount)
  showBudgetDialog.value = false
  showToast('预算已设置')
}

function exportExcel() {
  exportToExcel(store.currentYear, store.currentMonth)
  showToast('Excel导出成功')
}

function exportCSV() {
  exportToCSV(store.currentYear, store.currentMonth)
  showToast('CSV导出成功')
}

onMounted(() => {
  store.loadMonthlyStats()
  store.loadBudget()
})

onActivated(() => {
  store.loadMonthlyStats()
  store.loadBudget()
})
</script>

<template>
  <div class="budget-page">
    <van-nav-bar :title="store.currentMonthLabel + ' 预算'">
      <template #left>
        <van-icon name="calendar-o" size="20" @click="showMonthPicker = true" />
      </template>
    </van-nav-bar>

    <div class="page-content">
      <div class="budget-card">
        <div class="budget-header">
          <div class="budget-title">当月预算</div>
          <van-button size="small" type="primary" plain @click="openBudgetDialog">
            {{ budgetAmount > 0 ? '修改预算' : '设置预算' }}
          </van-button>
        </div>

        <div v-if="budgetAmount > 0" class="budget-info">
          <div class="budget-row">
            <span class="budget-label">预算总额</span>
            <span class="budget-value">¥{{ budgetAmount.toFixed(2) }}</span>
          </div>
          <div class="budget-row">
            <span class="budget-label">已支出</span>
            <span class="budget-value amount-expense">¥{{ totalExpense.toFixed(2) }}</span>
          </div>
          <div class="budget-row">
            <span class="budget-label">剩余预算</span>
            <span class="budget-value" :class="isOverBudget ? 'budget-warning' : 'amount-income'">
              {{ isOverBudget ? '-' : '' }}¥{{ Math.abs(remaining).toFixed(2) }}
            </span>
          </div>

          <div class="progress-wrapper">
            <van-progress
              :percentage="budgetPercent"
              :color="progressColor"
              :pivot-text="`${budgetPercent}%`"
              stroke-width="8"
            />
          </div>

          <div v-if="isOverBudget" class="over-budget-warning">
            ⚠️ 本月已超支 ¥{{ Math.abs(remaining).toFixed(2) }}，请注意控制支出！
          </div>
        </div>

        <div v-else class="no-budget">
          <div class="no-budget-text">暂未设置本月预算</div>
          <van-button type="primary" round @click="openBudgetDialog" style="margin-top: 12px;">
            立即设置
          </van-button>
        </div>
      </div>

      <div class="export-section">
        <div class="chart-container">
          <h3>数据导出</h3>
          <van-cell-group inset>
            <van-cell title="导出 Excel" icon="description" is-link @click="exportExcel" />
            <van-cell title="导出 CSV" icon="records" is-link @click="exportCSV" />
          </van-cell-group>
        </div>
      </div>
    </div>

    <van-popup :show="showMonthPicker" @update:show="showMonthPicker = $event" position="bottom" round>
      <van-picker
        :columns="monthColumns"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>

    <van-popup
      :show="showBudgetDialog"
      @update:show="showBudgetDialog = $event"
      position="bottom"
      round
      :style="{ padding: '20px' }"
    >
      <div class="budget-dialog">
        <div class="dialog-title">设置月度预算</div>
        <van-field
          v-model="budgetInput"
          type="number"
          label="预算金额"
          placeholder="请输入预算金额"
          prefix="¥"
        />
        <van-button type="primary" block round @click="saveBudgetAmount" style="margin-top: 16px;">
          确认
        </van-button>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.budget-page {
  min-height: 100%;
  background: #f7f8fa;
}

.budget-card {
  margin: 12px;
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.budget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.budget-title {
  font-size: 18px;
  font-weight: 600;
  color: #323233;
}

.budget-info {
  margin-top: 8px;
}

.budget-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #f5f5f5;
}

.budget-row:last-of-type {
  border-bottom: none;
}

.budget-label {
  font-size: 14px;
  color: #646566;
}

.budget-value {
  font-size: 16px;
  font-weight: 600;
}

.progress-wrapper {
  margin-top: 16px;
}

.over-budget-warning {
  margin-top: 12px;
  padding: 12px;
  background: #fff1f0;
  border-radius: 8px;
  color: #ee0a24;
  font-size: 14px;
  text-align: center;
  border: 1px solid #ffa39e;
}

.no-budget {
  text-align: center;
  padding: 24px 0;
}

.no-budget-text {
  font-size: 15px;
  color: #969799;
}

.export-section {
  margin-top: 8px;
}

.budget-dialog {
  padding-bottom: 10px;
}

.dialog-title {
  font-size: 17px;
  font-weight: 600;
  text-align: center;
  margin-bottom: 16px;
  color: #323233;
}
</style>
