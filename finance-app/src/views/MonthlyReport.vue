<script setup>
import { ref, computed, onMounted, onActivated, watch } from 'vue'
import { useFinanceStore } from '../stores/finance'
import { use } from 'echarts/core'
import { BarChart, PieChart, LineChart } from 'echarts/charts'
import {
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'
import VChart from 'vue-echarts'

use([
  BarChart,
  PieChart,
  LineChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const store = useFinanceStore()
const showMonthPicker = ref(false)
const showYearPicker = ref(false)
const reportMode = ref('monthly')

const yearColumns = (() => {
  const years = []
  const now = new Date()
  for (let y = now.getFullYear(); y >= now.getFullYear() - 10; y--) {
    years.push({ text: `${y}年`, value: y })
  }
  return [years]
})()

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

watch(() => store.currentYear, () => {
  if (reportMode.value === 'yearly') {
    store.loadYearlyStats()
  }
})

function onMonthConfirm({ selectedValues }) {
  const [year, month] = selectedValues
  store.setMonth(year, month)
  showMonthPicker.value = false
}

function onYearConfirm({ selectedValues }) {
  const [year] = selectedValues
  store.setYear(year)
  showYearPicker.value = false
}

function switchMode(mode) {
  reportMode.value = mode
  store.setReportMode(mode)
  if (mode === 'yearly') {
    store.loadYearlyStats()
  } else {
    store.loadMonthlyStats()
  }
}

const barOption = computed(() => {
  if (!store.monthlyStats) return {}
  const daily = store.monthlyStats.dailyStats
  const year = store.currentYear
  const month = store.currentMonth
  const daysInMonth = new Date(year, month, 0).getDate()
  const xData = []
  const incomeData = []
  const expenseData = []

  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    xData.push(`${d}`)
    const dayStat = daily[dateStr] || { income: 0, expense: 0 }
    incomeData.push(dayStat.income)
    expenseData.push(dayStat.expense)
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        let tip = `${month}月${params[0].axisValue}日<br/>`
        params.forEach(p => {
          tip += `${p.marker}${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
        })
        return tip
      }
    },
    legend: {
      data: ['收入', '支出'],
      top: 0,
      textStyle: { fontSize: 12 }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: 36,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: {
        fontSize: 10,
        interval: 0,
        rotate: 45
      }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomeData,
        itemStyle: { color: '#07c160', borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 12
      },
      {
        name: '支出',
        type: 'bar',
        data: expenseData,
        itemStyle: { color: '#ee0a24', borderRadius: [2, 2, 0, 0] },
        barMaxWidth: 12
      }
    ]
  }
})

const pieOption = computed(() => {
  if (!store.monthlyStats) return {}
  const catStats = store.monthlyStats.categoryStats
  const data = Object.entries(catStats).map(([name, value]) => ({
    name,
    value: Math.round(value * 100) / 100
  }))

  if (data.length === 0) return {}

  return {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: ¥{c} ({d}%)'
    },
    legend: {
      orient: 'horizontal',
      bottom: 0,
      textStyle: { fontSize: 11 }
    },
    series: [
      {
        type: 'pie',
        radius: ['35%', '60%'],
        center: ['50%', '45%'],
        avoidLabelOverlap: true,
        itemStyle: {
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: {
          show: true,
          formatter: '{b}\n{d}%',
          fontSize: 11
        },
        data
      }
    ]
  }
})

const yearlyLineOption = computed(() => {
  if (!store.yearlyStats) return {}
  const monthly = store.yearlyStats.monthlyStats
  const xData = []
  const incomeData = []
  const expenseData = []

  for (let m = 1; m <= 12; m++) {
    xData.push(`${m}月`)
    incomeData.push(monthly[m].income)
    expenseData.push(monthly[m].expense)
  }

  return {
    tooltip: {
      trigger: 'axis',
      formatter(params) {
        let tip = `${store.currentYear}年${params[0].axisValue}<br/>`
        params.forEach(p => {
          tip += `${p.marker}${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
        })
        return tip
      }
    },
    legend: {
      data: ['总收入', '总支出'],
      top: 0,
      textStyle: { fontSize: 12 }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: xData,
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '总收入',
        type: 'line',
        smooth: true,
        data: incomeData,
        itemStyle: { color: '#07c160' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(7, 193, 96, 0.3)' },
              { offset: 1, color: 'rgba(7, 193, 96, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 8
      },
      {
        name: '总支出',
        type: 'line',
        smooth: true,
        data: expenseData,
        itemStyle: { color: '#ee0a24' },
        lineStyle: { width: 3 },
        areaStyle: {
          color: {
            type: 'linear',
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(238, 10, 36, 0.3)' },
              { offset: 1, color: 'rgba(238, 10, 36, 0.05)' }
            ]
          }
        },
        symbol: 'circle',
        symbolSize: 8
      }
    ]
  }
})

const yearlyBarOption = computed(() => {
  if (!store.yearlyStats) return {}
  const monthly = store.yearlyStats.monthlyStats
  const xData = []
  const incomeData = []
  const expenseData = []

  for (let m = 1; m <= 12; m++) {
    xData.push(`${m}月`)
    incomeData.push(monthly[m].income)
    expenseData.push(monthly[m].expense)
  }

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter(params) {
        let tip = `${store.currentYear}年${params[0].axisValue}<br/>`
        params.forEach(p => {
          tip += `${p.marker}${p.seriesName}: ¥${p.value.toFixed(2)}<br/>`
        })
        return tip
      }
    },
    legend: {
      data: ['收入', '支出'],
      top: 0,
      textStyle: { fontSize: 12 }
    },
    grid: {
      left: '3%',
      right: '3%',
      bottom: '3%',
      top: 40,
      containLabel: true
    },
    xAxis: {
      type: 'category',
      data: xData,
      axisLabel: { fontSize: 11 }
    },
    yAxis: {
      type: 'value',
      axisLabel: { fontSize: 10 }
    },
    series: [
      {
        name: '收入',
        type: 'bar',
        data: incomeData,
        itemStyle: { color: '#07c160', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24
      },
      {
        name: '支出',
        type: 'bar',
        data: expenseData,
        itemStyle: { color: '#ee0a24', borderRadius: [4, 4, 0, 0] },
        barMaxWidth: 24
      }
    ]
  }
})

onMounted(() => {
  store.loadMonthlyStats()
})

onActivated(() => {
  if (reportMode.value === 'yearly') {
    store.loadYearlyStats()
  } else {
    store.loadMonthlyStats()
  }
})
</script>

<template>
  <div class="report-page">
    <van-nav-bar :title="reportMode === 'monthly' ? store.currentMonthLabel + ' 报表' : store.currentYearLabel + ' 年度报告'">
      <template #left>
        <van-icon 
          name="calendar-o" 
          size="20" 
          @click="reportMode === 'monthly' ? showMonthPicker = true : showYearPicker = true" 
        />
      </template>
    </van-nav-bar>

    <van-tabs v-model:active="reportMode" class="report-tabs" @change="switchMode">
      <van-tab title="月度报表" name="monthly" />
      <van-tab title="年度报告" name="yearly" />
    </van-tabs>

    <div v-if="reportMode === 'monthly' && store.monthlyStats" class="page-content">
      <div class="stats-summary">
        <div class="stat-box income-box">
          <div class="stat-label">本月收入</div>
          <div class="stat-number amount-income">¥{{ store.monthlyStats.totalIncome.toFixed(2) }}</div>
        </div>
        <div class="stat-box expense-box">
          <div class="stat-label">本月支出</div>
          <div class="stat-number amount-expense">¥{{ store.monthlyStats.totalExpense.toFixed(2) }}</div>
        </div>
      </div>

      <div class="chart-container">
        <h3>每日收支对比</h3>
        <v-chart v-if="store.monthlyStats" :option="barOption" autoresize style="height: 260px; width: 100%;" />
      </div>

      <div class="chart-container">
        <h3>支出分类占比</h3>
        <v-chart
          v-if="store.monthlyStats && Object.keys(store.monthlyStats.categoryStats).length > 0"
          :option="pieOption"
          autoresize
          style="height: 300px; width: 100%;"
        />
        <van-empty v-else description="暂无支出数据" :image-size="60" />
      </div>
    </div>

    <div v-if="reportMode === 'yearly' && store.yearlyStats" class="page-content">
      <div class="stats-summary">
        <div class="stat-box income-box">
          <div class="stat-label">年度总收入</div>
          <div class="stat-number amount-income">¥{{ store.yearlyStats.totalIncome.toFixed(2) }}</div>
        </div>
        <div class="stat-box expense-box">
          <div class="stat-label">年度总支出</div>
          <div class="stat-number amount-expense">¥{{ store.yearlyStats.totalExpense.toFixed(2) }}</div>
        </div>
      </div>

      <div class="stats-summary">
        <div class="stat-box balance-box">
          <div class="stat-label">年度结余</div>
          <div class="stat-number" :class="store.yearlyStats.totalIncome - store.yearlyStats.totalExpense >= 0 ? 'amount-income' : 'amount-expense'">
            ¥{{ (store.yearlyStats.totalIncome - store.yearlyStats.totalExpense).toFixed(2) }}
          </div>
        </div>
        <div class="stat-box avg-box">
          <div class="stat-label">月均支出</div>
          <div class="stat-number amount-expense">¥{{ (store.yearlyStats.totalExpense / 12).toFixed(2) }}</div>
        </div>
      </div>

      <div class="chart-container">
        <h3>月度收支对比（折线图）</h3>
        <v-chart 
          v-if="store.yearlyStats" 
          :option="yearlyLineOption" 
          autoresize 
          style="height: 300px; width: 100%;" 
        />
      </div>

      <div class="chart-container">
        <h3>月度收支对比（柱状图）</h3>
        <v-chart 
          v-if="store.yearlyStats" 
          :option="yearlyBarOption" 
          autoresize 
          style="height: 300px; width: 100%;" 
        />
      </div>

      <div class="chart-container">
        <h3>各月明细</h3>
        <van-cell-group inset>
          <van-cell
            v-for="m in 12"
            :key="m"
            :title="`${m}月`"
            :value="`收入: ¥${store.yearlyStats.monthlyStats[m].income.toFixed(2)}`"
            :label="`支出: ¥${store.yearlyStats.monthlyStats[m].expense.toFixed(2)}`"
          >
            <template #right-icon>
              <span 
                class="month-balance"
                :class="store.yearlyStats.monthlyStats[m].income - store.yearlyStats.monthlyStats[m].expense >= 0 ? 'amount-income' : 'amount-expense'"
              >
                {{ store.yearlyStats.monthlyStats[m].income - store.yearlyStats.monthlyStats[m].expense >= 0 ? '+' : '' }}
                ¥{{ (store.yearlyStats.monthlyStats[m].income - store.yearlyStats.monthlyStats[m].expense).toFixed(2) }}
              </span>
            </template>
          </van-cell>
        </van-cell-group>
      </div>
    </div>

    <van-empty 
      v-if="reportMode === 'yearly' && !store.yearlyStats" 
      description="加载中..." 
      :image-size="60" 
    />

    <van-popup :show="showMonthPicker" @update:show="showMonthPicker = $event" position="bottom" round>
      <van-picker
        :columns="monthColumns"
        @confirm="onMonthConfirm"
        @cancel="showMonthPicker = false"
      />
    </van-popup>

    <van-popup :show="showYearPicker" @update:show="showYearPicker = $event" position="bottom" round>
      <van-picker
        :columns="yearColumns"
        @confirm="onYearConfirm"
        @cancel="showYearPicker = false"
      />
    </van-popup>
  </div>
</template>

<style scoped>
.report-page {
  min-height: 100%;
  background: #f7f8fa;
}

.stats-summary {
  display: flex;
  gap: 12px;
  margin: 12px;
}

.stat-box {
  flex: 1;
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.05);
}

.stat-label {
  font-size: 13px;
  color: #969799;
  margin-bottom: 6px;
}

.stat-number {
  font-size: 18px;
  font-weight: 700;
}

.income-box {
  border-top: 3px solid #07c160;
}

.expense-box {
  border-top: 3px solid #ee0a24;
}

.balance-box {
  border-top: 3px solid #1989fa;
}

.avg-box {
  border-top: 3px solid #ff976a;
}

.report-tabs {
  background: #fff;
}

.month-balance {
  font-size: 14px;
  font-weight: 600;
}

.page-content {
  padding-bottom: 20px;
}
</style>
