<script setup>
import { ref, computed, onMounted, shallowRef } from 'vue'
import { useAttendanceStore } from '../../stores/attendance'
import { DEPARTMENTS, USERS } from '../../stores/auth'
import { showToast } from 'vant'
import * as echarts from 'echarts'

const store = useAttendanceStore()

const currentYear = ref(store.currentYear)
const currentMonth = ref(store.currentMonth)
const filterDept = ref('all')
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

const summaryData = computed(() => {
  let data = store.getMonthlySummary(currentYear.value, currentMonth.value)
  if (filterDept.value !== 'all') {
    data = data.filter(d => d.dept === filterDept.value)
  }
  return data
})

const deptStats = computed(() => {
  return DEPARTMENTS.map(dept => {
    const rate = store.getDeptAbsentRate(dept, currentYear.value, currentMonth.value)
    return { dept, absentRate: rate }
  })
})

const totalEmployees = computed(() => summaryData.value.length)
const totalAbsent = computed(() => summaryData.value.reduce((s, d) => s + d.absent + d.leave, 0))
const totalLate = computed(() => summaryData.value.reduce((s, d) => s + d.late, 0))
const avgAbsentRate = computed(() => {
  if (summaryData.value.length === 0) return 0
  const totalDays = summaryData.value.reduce((s, d) => s + d.total, 0)
  const absentDays = summaryData.value.reduce((s, d) => s + d.absent + d.leave, 0)
  return totalDays > 0 ? Math.round(absentDays / totalDays * 1000) / 10 : 0
})

const chartRef = ref(null)
let chartInstance = null

function renderChart() {
  if (!chartRef.value) return
  if (!chartInstance) {
    chartInstance = echarts.init(chartRef.value)
  }
  const depts = deptStats.value.map(d => d.dept)
  const rates = deptStats.value.map(d => d.absentRate)
  chartInstance.setOption({
    tooltip: { trigger: 'axis', formatter: '{b}: {c}%' },
    grid: { left: '3%', right: '4%', bottom: '3%', top: '12%', containLabel: true },
    xAxis: {
      type: 'category',
      data: depts,
      axisLabel: { fontSize: 12 }
    },
    yAxis: {
      type: 'value',
      max: (value) => Math.max(Math.ceil(value.max) + 2, 10),
      axisLabel: { formatter: '{value}%' }
    },
    series: [{
      type: 'bar',
      data: rates,
      barWidth: '40%',
      itemStyle: {
        borderRadius: [4, 4, 0, 0],
        color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
          { offset: 0, color: '#ff976a' },
          { offset: 1, color: '#ffb380' }
        ])
      },
      label: {
        show: true,
        position: 'top',
        formatter: '{c}%',
        fontSize: 12
      }
    }]
  })
}

function onMonthConfirm({ selectedValues }) {
  const [year, month] = selectedValues
  currentYear.value = year
  currentMonth.value = month
  showMonthPicker.value = false
  setTimeout(renderChart, 100)
}

function onDeptFilter(val) {
  filterDept.value = val
}

function exportData() {
  const header = ['姓名', '部门', '出勤(天)', '迟到(次)', '缺勤(天)', '请假(天)', '应出勤(天)', '出勤率']
  const rows = summaryData.value.map(d => [
    d.name, d.dept, d.present, d.late, d.absent, d.leave, d.total,
    d.total > 0 ? Math.round(d.present / d.total * 100) + '%' : '0%'
  ])
  const csvContent = [header.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `考勤汇总_${currentYear.value}年${currentMonth.value}月.csv`
  a.click()
  URL.revokeObjectURL(url)
  showToast('导出成功')
}

onMounted(() => {
  setTimeout(renderChart, 300)
})
</script>

<template>
  <div class="summary-page">
    <van-nav-bar :title="monthLabel + ' 考勤汇总'">
      <template #left>
        <van-icon name="calendar-o" size="20" @click="showMonthPicker = true" />
      </template>
      <template #right>
        <van-icon name="down" size="20" @click="exportData" style="margin-right: 12px" />
      </template>
    </van-nav-bar>

    <div class="card-section">
      <div class="section-title">总体概况</div>
      <div class="stat-grid" style="grid-template-columns: repeat(4, 1fr);">
        <div class="stat-item">
          <div class="stat-value" style="color: #323233; font-size: 20px">{{ totalEmployees }}</div>
          <div class="stat-label">总人数</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ff976a; font-size: 20px">{{ totalLate }}</div>
          <div class="stat-label">迟到人次</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ee0a24; font-size: 20px">{{ totalAbsent }}</div>
          <div class="stat-label">缺勤人次</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color: #ff976a; font-size: 20px">{{ avgAbsentRate }}%</div>
          <div class="stat-label">缺勤率</div>
        </div>
      </div>
    </div>

    <div class="card-section">
      <div class="section-title">各部门缺勤率</div>
      <div ref="chartRef" style="width: 100%; height: 250px;"></div>
    </div>

    <div class="card-section">
      <div class="section-title">
        人员明细
        <div class="dept-filter">
          <van-tag
            :type="filterDept === 'all' ? 'primary' : 'default'"
            round
            size="medium"
            class="filter-tag"
            @click="onDeptFilter('all')"
          >全部</van-tag>
          <van-tag
            v-for="dept in DEPARTMENTS"
            :key="dept"
            :type="filterDept === dept ? 'primary' : 'default'"
            round
            size="medium"
            class="filter-tag"
            @click="onDeptFilter(dept)"
          >{{ dept }}</van-tag>
        </div>
      </div>

      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>姓名</th>
              <th>部门</th>
              <th>出勤</th>
              <th>迟到</th>
              <th>缺勤</th>
              <th>请假</th>
              <th>出勤率</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in summaryData" :key="row.userId">
              <td>{{ row.name }}</td>
              <td>{{ row.dept }}</td>
              <td>{{ row.present }}</td>
              <td style="color: #ff976a">{{ row.late }}</td>
              <td style="color: #ee0a24">{{ row.absent }}</td>
              <td style="color: #1989fa">{{ row.leave }}</td>
              <td :style="{ color: row.total > 0 && row.present / row.total >= 0.95 ? '#07c160' : '#ee0a24' }">
                {{ row.total > 0 ? Math.round(row.present / row.total * 100) + '%' : '-' }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="export-bar">
        <van-button type="primary" size="small" round icon="down" @click="exportData">导出CSV</van-button>
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
.summary-page {
  background: #f7f8fa;
  padding-bottom: 20px;
}

:deep(.van-nav-bar) {
  background: #fff;
}

.dept-filter {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.filter-tag {
  cursor: pointer;
}

.table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

.data-table th,
.data-table td {
  padding: 8px 6px;
  text-align: center;
  border-bottom: 1px solid #f0f0f0;
  white-space: nowrap;
}

.data-table th {
  background: #f7f8fa;
  color: #969799;
  font-weight: 500;
  font-size: 12px;
}

.data-table td {
  color: #323233;
}

.export-bar {
  margin-top: 12px;
  text-align: right;
}
</style>
