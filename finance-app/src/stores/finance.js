import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  addRecord,
  updateRecord,
  deleteRecord,
  getRecordsByMonth,
  getRecordsCountByMonth,
  getMonthlyStats,
  setBudget,
  getBudget,
  addRecordsBatch,
  getYearlyStats
} from '../db'

export const useFinanceStore = defineStore('finance', () => {
  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)
  const records = ref([])
  const totalCount = ref(0)
  const pageSize = 30
  const currentPage = ref(0)
  const loading = ref(false)
  const monthlyStats = ref(null)
  const budget = ref(null)
  const yearlyStats = ref(null)
  const reportMode = ref('monthly')

  const currentMonthLabel = computed(() => `${currentYear.value}年${currentMonth.value}月`)
  const currentYearLabel = computed(() => `${currentYear.value}年`)

  const hasMore = computed(() => records.value.length < totalCount.value)

  const budgetStatus = computed(() => {
    if (!budget.value || !monthlyStats.value) return { level: 'normal', percent: 0 }
    const budgetAmount = budget.value.amount
    const totalExpense = monthlyStats.value.totalExpense
    if (budgetAmount <= 0) return { level: 'normal', percent: 0 }
    const percent = (totalExpense / budgetAmount) * 100
    if (percent >= 100) return { level: 'over', percent: Math.round(percent) }
    if (percent >= 80) return { level: 'warning', percent: Math.round(percent) }
    return { level: 'normal', percent: Math.round(percent) }
  })

  async function loadRecords(reset = false) {
    if (loading.value) return
    if (reset) {
      currentPage.value = 0
      records.value = []
    }
    loading.value = true
    try {
      const offset = currentPage.value * pageSize
      const newRecords = await getRecordsByMonth(currentYear.value, currentMonth.value, offset, pageSize)
      if (reset) {
        records.value = newRecords
      } else {
        records.value = [...records.value, ...newRecords]
      }
      totalCount.value = await getRecordsCountByMonth(currentYear.value, currentMonth.value)
      currentPage.value++
    } finally {
      loading.value = false
    }
  }

  async function loadMonthlyStats() {
    monthlyStats.value = await getMonthlyStats(currentYear.value, currentMonth.value)
  }

  async function loadBudget() {
    budget.value = await getBudget(currentYear.value, currentMonth.value)
  }

  async function saveRecord(record) {
    if (record.id) {
      const { id, ...changes } = record
      await updateRecord(id, changes)
    } else {
      await addRecord(record)
    }
    await refreshAll()
  }

  async function removeRecord(id) {
    await deleteRecord(id)
    await refreshAll()
  }

  async function saveBudget(amount) {
    await setBudget(currentYear.value, currentMonth.value, amount)
    budget.value = { year: currentYear.value, month: currentMonth.value, amount }
  }

  async function importRecords(records) {
    await addRecordsBatch(records)
    await refreshAll()
    if (yearlyStats.value) {
      await loadYearlyStats()
    }
  }

  async function loadYearlyStats() {
    yearlyStats.value = await getYearlyStats(currentYear.value)
  }

  function setReportMode(mode) {
    reportMode.value = mode
  }

  async function setMonth(year, month) {
    currentYear.value = year
    currentMonth.value = month
    await refreshAll()
  }

  async function setYear(year) {
    currentYear.value = year
    await loadYearlyStats()
    await loadMonthlyStats()
  }

  async function refreshAll() {
    await Promise.all([
      loadRecords(true),
      loadMonthlyStats(),
      loadBudget()
    ])
  }

  return {
    currentYear,
    currentMonth,
    currentMonthLabel,
    currentYearLabel,
    records,
    totalCount,
    loading,
    monthlyStats,
    budget,
    yearlyStats,
    reportMode,
    budgetStatus,
    hasMore,
    loadRecords,
    loadMonthlyStats,
    loadBudget,
    saveRecord,
    removeRecord,
    saveBudget,
    importRecords,
    loadYearlyStats,
    setReportMode,
    setMonth,
    setYear,
    refreshAll
  }
})
