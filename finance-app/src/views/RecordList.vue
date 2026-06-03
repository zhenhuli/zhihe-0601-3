<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import { showDialog, showToast, showNotify } from 'vant'
import { useFinanceStore } from '../stores/finance'
import { CATEGORY_ICONS } from '../db'
import { generateMockData } from '../utils/mock'
import { exportToExcel, exportToCSV } from '../utils/export'
import { parseImportFile, getImportTemplate } from '../utils/import'
import { saveAs } from 'file-saver'
import RecordModal from '../components/RecordModal.vue'
import db from '../db'

const store = useFinanceStore()

const showModal = ref(false)
const editingRecord = ref(null)
const showMonthPicker = ref(false)
const showExportPicker = ref(false)
const initialized = ref(false)
const currentOffset = ref(0)
const loadingMore = ref(false)
const finished = ref(false)
const pageSize = 30
const showRecordAction = ref(false)
const selectedRecord = ref(null)
const fileInput = ref(null)
const showImportPreview = ref(false)
const importRecords = ref([])
const importErrors = ref([])
const showBudgetNotify = ref(false)
const budgetNotified = ref(false)
const overBudgetDialogShown = ref(false)

const showBudgetWarning = computed(() => {
  return store.budgetStatus.level === 'warning' && showBudgetNotify.value
})

const showBudgetOver = computed(() => {
  return store.budgetStatus.level === 'over'
})

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

watch(() => [store.currentYear, store.currentMonth], () => {
  resetList()
  budgetNotified.value = false
  overBudgetDialogShown.value = false
})

watch(() => store.budgetStatus, (newStatus) => {
  if (newStatus.level === 'warning' && !budgetNotified.value) {
    showBudgetNotify.value = true
    budgetNotified.value = true
    showNotify({
      type: 'warning',
      message: `预算已使用 ${newStatus.percent}%，请注意控制支出！`,
      duration: 3000
    })
  } else if (newStatus.level === 'over' && !overBudgetDialogShown.value) {
    overBudgetDialogShown.value = true
    showBudgetNotify.value = true
    const overAmount = (store.monthlyStats.totalExpense - store.budget.amount).toFixed(2)
    showDialog({
      title: '⚠️ 预算超支提醒',
      message: `本月已超支 ¥${overAmount}，建议您：\n\n1. 减少非必要支出\n2. 检查大额消费项目\n3. 考虑调整下月预算`,
      confirmButtonText: '我知道了',
      showCancelButton: false
    }).catch(() => {})
  } else if (newStatus.level === 'normal') {
    showBudgetNotify.value = false
  }
}, { deep: true })

onMounted(async () => {
  const count = await db.records.count()
  if (count === 0) {
    await generateMockData()
  }
  await store.loadMonthlyStats()
  await store.loadBudget()
  await resetList()
  initialized.value = true
})

function resetList() {
  currentOffset.value = 0
  finished.value = false
  store.records = []
  loadMoreRecords()
}

async function loadMoreRecords() {
  if (loadingMore.value || finished.value) return
  loadingMore.value = true
  try {
    const { getRecordsByMonth, getRecordsCountByMonth } = await import('../db')
    const records = await getRecordsByMonth(store.currentYear, store.currentMonth, currentOffset.value, pageSize)
    const total = await getRecordsCountByMonth(store.currentYear, store.currentMonth)
    
    if (currentOffset.value === 0) {
      store.records = records
    } else {
      store.records = [...store.records, ...records]
    }
    
    currentOffset.value += records.length
    
    if (store.records.length >= total || records.length === 0) {
      finished.value = true
    }
  } finally {
    loadingMore.value = false
  }
}

function onAdd() {
  editingRecord.value = null
  showModal.value = true
}

function onEdit(record) {
  editingRecord.value = { ...record }
  showModal.value = true
}

function onRecordClick(record) {
  selectedRecord.value = record
  showRecordAction.value = true
}

function onRecordActionSelect(action) {
  if (!selectedRecord.value) return
  if (action === 'edit') {
    onEdit(selectedRecord.value)
  } else if (action === 'delete') {
    onDelete(selectedRecord.value)
  }
  showRecordAction.value = false
}

function onDelete(record) {
  showDialog({
    title: '确认删除',
    message: `确定删除「${record.category}」¥${record.amount}的记录吗？`,
    confirmButtonColor: '#ee0a24'
  }).then(async () => {
    await store.removeRecord(record.id)
    showToast('已删除')
    resetList()
  }).catch(() => {})
}

async function onSaved(record) {
  await store.saveRecord(record)
  showToast(record.id ? '已更新' : '已添加')
  resetList()
}

function onMonthConfirm({ selectedValues }) {
  const [year, month] = selectedValues
  store.setMonth(year, month)
  showMonthPicker.value = false
}

function onExportSelect({ action }) {
  if (action === 'excel') {
    exportToExcel(store.currentYear, store.currentMonth)
    showToast('Excel导出成功')
  } else if (action === 'csv') {
    exportToCSV(store.currentYear, store.currentMonth)
    showToast('CSV导出成功')
  } else if (action === 'import') {
    fileInput.value?.click()
  } else if (action === 'template') {
    const blob = getImportTemplate()
    saveAs(blob, '记账导入模板.xlsx')
    showToast('模板下载成功')
  }
}

async function onFileChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  
  try {
    showToast('正在解析文件...')
    const { records, errors } = await parseImportFile(file)
    importRecords.value = records
    importErrors.value = errors
    
    if (records.length === 0) {
      showToast('未找到有效记录')
    } else {
      showImportPreview.value = true
    }
    
    if (errors.length > 0) {
      showNotify({
        type: 'warning',
        message: `${errors.length} 条记录解析失败`,
        duration: 2000
      })
    }
  } catch (err) {
    showToast(err.message)
  } finally {
    e.target.value = ''
  }
}

async function confirmImport() {
  if (importRecords.value.length === 0) return
  
  try {
    await store.importRecords(importRecords.value)
    showToast(`成功导入 ${importRecords.value.length} 条记录`)
    showImportPreview.value = false
    importRecords.value = []
    importErrors.value = []
    resetList()
  } catch (err) {
    showToast('导入失败：' + err.message)
  }
}

function cancelImport() {
  showImportPreview.value = false
  importRecords.value = []
  importErrors.value = []
}

function formatAmount(record) {
  return record.type === 'expense' ? `-¥${record.amount.toFixed(2)}` : `+¥${record.amount.toFixed(2)}`
}

function amountClass(record) {
  return record.type === 'expense' ? 'amount-expense' : 'amount-income'
}

function iconClass(record) {
  return record.type === 'expense' ? 'category-icon-expense' : 'category-icon-income'
}

function onScroll(e) {
  const el = e.target
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
    loadMoreRecords()
  }
}
</script>

<template>
  <div class="record-list-page">
    <van-nav-bar :title="store.currentMonthLabel">
      <template #left>
        <van-icon name="calendar-o" size="20" @click="showMonthPicker = true" />
      </template>
      <template #right>
        <van-icon name="ellipsis" size="20" @click="showExportPicker = true" />
      </template>
    </van-nav-bar>

    <div v-if="showBudgetWarning" class="budget-notification">
      <van-icon name="warning-o" />
      <span>预算已使用 {{ store.budgetStatus.percent }}%，请注意控制支出！</span>
      <van-icon name="cross" size="16" @click="showBudgetNotify = false" />
    </div>

    <div v-if="showBudgetOver" class="budget-notification over-budget">
      <van-icon name="info-o" />
      <span>⚠️ 本月已超支 ¥{{ (store.monthlyStats.totalExpense - store.budget.amount).toFixed(2) }}</span>
    </div>

    <div v-if="store.monthlyStats" class="summary-card">
      <div class="summary-inner">
        <div class="summary-item">
          <div class="summary-label">收入</div>
          <div class="summary-value amount-income">¥{{ store.monthlyStats.totalIncome.toFixed(2) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">支出</div>
          <div class="summary-value amount-expense">¥{{ store.monthlyStats.totalExpense.toFixed(2) }}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">结余</div>
          <div class="summary-value" :class="store.monthlyStats.totalIncome - store.monthlyStats.totalExpense >= 0 ? 'amount-income' : 'amount-expense'">
            ¥{{ (store.monthlyStats.totalIncome - store.monthlyStats.totalExpense).toFixed(2) }}
          </div>
        </div>
      </div>
    </div>

    <div class="records-container" @scroll="onScroll">
      <div class="records-list">
        <div
          v-for="record in store.records"
          :key="record.id"
          class="record-item-wrapper"
          @click="onRecordClick(record)"
        >
          <div class="record-item">
            <div class="record-icon" :class="iconClass(record)">
              {{ CATEGORY_ICONS[record.category] || '📝' }}
            </div>
            <div class="record-info">
              <div class="record-category">{{ record.category }}</div>
              <div class="record-note" v-if="record.note">{{ record.note }}</div>
            </div>
            <div class="record-right">
              <div class="record-amount" :class="amountClass(record)">{{ formatAmount(record) }}</div>
              <div class="record-date">{{ record.date }}</div>
            </div>
          </div>
        </div>

        <div v-if="loadingMore" class="loading-more">
          <van-loading size="20" /> 加载中...
        </div>
        <div v-else-if="finished && store.records.length > 0" class="loading-more">
          没有更多了
        </div>

        <van-empty v-if="initialized && store.records.length === 0" description="暂无记录" />
      </div>
    </div>

    <van-floating-bubble
      icon="plus"
      @click="onAdd"
      :style="{ '--van-floating-bubble-background': '#1989fa' }"
    />

    <RecordModal
      v-model:show="showModal"
      :record="editingRecord"
      @saved="onSaved"
    />

    <van-popup :show="showMonthPicker" @update:show="showMonthPicker = $event" position="bottom" round>
      <van-picker
        :columns="monthColumns"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>

    <van-action-sheet
      v-model:show="showExportPicker"
      :actions="[
        { name: '导出 Excel', action: 'excel' },
        { name: '导出 CSV', action: 'csv' },
        { name: '导入记录', action: 'import' },
        { name: '下载导入模板', action: 'template' }
      ]"
      @select="onExportSelect"
      cancel-text="取消"
    />

    <van-action-sheet
      v-model:show="showRecordAction"
      :actions="[
        { name: '编辑记录', action: 'edit' },
        { name: '删除记录', action: 'delete', color: '#ee0a24' }
      ]"
      @select="({ action }) => onRecordActionSelect(action)"
      cancel-text="取消"
    />

    <input
      ref="fileInput"
      type="file"
      accept=".csv,.xlsx,.xls"
      style="display: none"
      @change="onFileChange"
    />

    <van-popup
      v-model:show="showImportPreview"
      position="bottom"
      round
      :style="{ height: '70%' }"
    >
      <div class="import-preview">
        <div class="import-header">
          <div class="import-title">导入预览</div>
          <div class="import-count">共 {{ importRecords.length }} 条记录</div>
        </div>
        
        <div v-if="importErrors.length > 0" class="import-errors">
          <van-icon name="warning-o" />
          <span>{{ importErrors.length }} 条记录解析失败</span>
        </div>

        <div class="import-list">
          <div
            v-for="(record, index) in importRecords.slice(0, 50)"
            :key="index"
            class="import-item"
          >
            <div class="import-icon" :class="record.type === 'expense' ? 'category-icon-expense' : 'category-icon-income'">
              {{ CATEGORY_ICONS[record.category] || '📝' }}
            </div>
            <div class="import-info">
              <div class="import-category">{{ record.category }}</div>
              <div class="import-date">{{ record.date }}</div>
            </div>
            <div class="import-amount" :class="record.type === 'expense' ? 'amount-expense' : 'amount-income'">
              {{ record.type === 'expense' ? '-' : '+' }}¥{{ record.amount.toFixed(2) }}
            </div>
          </div>
          <div v-if="importRecords.length > 50" class="import-more">
            还有 {{ importRecords.length - 50 }} 条记录未显示
          </div>
        </div>

        <div class="import-footer">
          <van-button block @click="cancelImport" plain>取消</van-button>
          <van-button block type="primary" @click="confirmImport">
            确认导入 {{ importRecords.length }} 条
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<style scoped>
.record-list-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #f7f8fa;
}

.budget-notification {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #fff7e6;
  color: #ff976a;
  font-size: 13px;
  border-bottom: 1px solid #ffd591;
}

.budget-notification span {
  flex: 1;
}

.budget-notification .van-icon {
  flex-shrink: 0;
}

.over-budget {
  background: #fff1f0;
  color: #ee0a24;
  border-bottom-color: #ffa39e;
}

.summary-card {
  margin: 0;
  padding: 0;
  flex-shrink: 0;
}

.summary-inner {
  display: flex;
  background: linear-gradient(135deg, #1989fa, #2b6cb0);
  padding: 20px 16px;
  color: #fff;
}

.summary-item {
  flex: 1;
  text-align: center;
}

.summary-label {
  font-size: 12px;
  opacity: 0.85;
  margin-bottom: 6px;
}

.summary-value {
  font-size: 17px;
  font-weight: 700;
  color: #fff !important;
}

.records-container {
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.records-list {
  padding-bottom: 20px;
}

.record-item-wrapper {
  background: #fff;
  margin: 8px 12px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

.record-item-wrapper:active {
  transform: scale(0.98);
  transition: transform 0.1s;
}

.record-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  width: 100%;
}

.record-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  margin-right: 12px;
  flex-shrink: 0;
}

.record-info {
  flex: 1;
  min-width: 0;
}

.record-category {
  font-size: 15px;
  color: #323233;
  font-weight: 500;
}

.record-note {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.record-right {
  text-align: right;
  flex-shrink: 0;
  margin-left: 12px;
}

.record-amount {
  font-size: 16px;
  font-weight: 600;
}

.record-date {
  font-size: 11px;
  color: #969799;
  margin-top: 2px;
}

.category-icon-expense {
  background: #fff1f0;
  color: #ee0a24;
}

.category-icon-income {
  background: #f0fff4;
  color: #07c160;
}

.loading-more {
  text-align: center;
  padding: 20px;
  color: #969799;
  font-size: 13px;
}

.import-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.import-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #f5f5f5;
}

.import-title {
  font-size: 17px;
  font-weight: 600;
  color: #323233;
}

.import-count {
  font-size: 13px;
  color: #969799;
}

.import-errors {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: #fff7e6;
  color: #ff976a;
  font-size: 13px;
}

.import-list {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.import-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
}

.import-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  margin-right: 12px;
  flex-shrink: 0;
}

.import-info {
  flex: 1;
  min-width: 0;
}

.import-category {
  font-size: 15px;
  color: #323233;
  font-weight: 500;
}

.import-date {
  font-size: 12px;
  color: #969799;
  margin-top: 2px;
}

.import-amount {
  font-size: 16px;
  font-weight: 600;
}

.import-more {
  text-align: center;
  padding: 16px;
  color: #969799;
  font-size: 13px;
}

.import-footer {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #f5f5f5;
}

.import-footer .van-button {
  flex: 1;
}
</style>
