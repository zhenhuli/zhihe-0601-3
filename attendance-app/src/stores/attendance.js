import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { USERS, DEPARTMENTS } from './auth'

const STORAGE_KEY = 'attendance_data'

function generateId() {
  return Date.now() + Math.floor(Math.random() * 1000)
}

function getDaysBetween(start, end) {
  const s = new Date(start)
  const e = new Date(end)
  if (e < s) return 0
  const days = Math.round((e - s) / (1000 * 60 * 60 * 24)) + 1
  let workDays = 0
  const cur = new Date(s)
  while (cur <= e) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) workDays++
    cur.setDate(cur.getDate() + 1)
  }
  return workDays
}

function calcOvertimeHours(startTime, endTime) {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  let diff = (eh * 60 + em) - (sh * 60 + sm)
  if (diff <= 0) diff += 24 * 60
  return Math.round(diff / 60 * 10) / 10
}

function formatDate(d) {
  const date = new Date(d)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (raw) return JSON.parse(raw)
  return null
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

function initMockData() {
  const existing = loadData()
  if (existing) return existing

  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth()
  const leaves = []
  const overtimes = []
  const attendances = []

  const employeeUsers = USERS.filter(u => u.role === 'employee')

  employeeUsers.forEach(user => {
    for (let d = 1; d <= now.getDate(); d++) {
      const date = new Date(year, month, d)
      const dow = date.getDay()
      if (dow === 0 || dow === 6) continue
      const rand = Math.random()
      let status = 'present'
      if (rand < 0.05) status = 'absent'
      else if (rand < 0.12) status = 'late'
      else if (rand < 0.18) status = 'leave'
      attendances.push({
        id: generateId() + Math.random() * 1000,
        userId: user.id,
        date: formatDate(date),
        status
      })
    }
  })

  for (let i = 0; i < 6; i++) {
    const user = employeeUsers[Math.floor(Math.random() * employeeUsers.length)]
    const startDay = Math.floor(Math.random() * 20) + 1
    const duration = Math.floor(Math.random() * 3) + 1
    const startDate = formatDate(new Date(year, month, startDay))
    const endDate = formatDate(new Date(year, month, startDay + duration - 1))
    const types = ['事假', '病假', '年假']
    const type = types[Math.floor(Math.random() * types.length)]
    const statuses = ['pending', 'approved', 'approved', 'rejected']
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    leaves.push({
      id: generateId() + i * 100,
      userId: user.id,
      type,
      startDate,
      endDate,
      days: getDaysBetween(startDate, endDate),
      reason: `${type}申请-${user.name}`,
      attachments: [],
      status,
      rejectReason: status === 'rejected' ? '不符合请假规定' : '',
      createdAt: formatDate(new Date(year, month, startDay - 1))
    })
  }

  for (let i = 0; i < 4; i++) {
    const user = employeeUsers[Math.floor(Math.random() * employeeUsers.length)]
    const day = Math.floor(Math.random() * 20) + 1
    const statuses = ['pending', 'approved', 'approved']
    overtimes.push({
      id: generateId() + i * 200,
      userId: user.id,
      date: formatDate(new Date(year, month, day)),
      startTime: '19:00',
      endTime: '21:00',
      hours: 2,
      reason: `项目紧急上线加班-${user.name}`,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      rejectReason: '',
      createdAt: formatDate(new Date(year, month, day))
    })
  }

  const annualLeaves = {}
  employeeUsers.forEach(user => {
    annualLeaves[user.id] = { total: 10, used: Math.floor(Math.random() * 5), remaining: 0 }
    annualLeaves[user.id].remaining = annualLeaves[user.id].total - annualLeaves[user.id].used
  })

  const data = { leaves, overtimes, attendances, annualLeaves }
  saveData(data)
  return data
}

export const useAttendanceStore = defineStore('attendance', () => {
  const data = ref(initMockData())

  const currentYear = ref(new Date().getFullYear())
  const currentMonth = ref(new Date().getMonth() + 1)

  function getEmployeeLeaves(userId) {
    return data.value.leaves.filter(l => l.userId === userId)
  }

  function getEmployeeOvertimes(userId) {
    return data.value.overtimes.filter(o => o.userId === userId)
  }

  function getEmployeeAttendances(userId, year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    return data.value.attendances.filter(a => a.userId === userId && a.date.startsWith(prefix))
  }

  function getAnnualLeave(userId) {
    return data.value.annualLeaves[userId] || { total: 10, used: 0, remaining: 10 }
  }

  function getPendingCount(userId) {
    const leaves = data.value.leaves.filter(l => l.userId === userId && l.status === 'pending').length
    const overtimes = data.value.overtimes.filter(o => o.userId === userId && o.status === 'pending').length
    return leaves + overtimes
  }

  function getMonthAttendanceStats(userId, year, month) {
    const records = getEmployeeAttendances(userId, year, month)
    const present = records.filter(r => r.status === 'present').length
    const late = records.filter(r => r.status === 'late').length
    const absent = records.filter(r => r.status === 'absent').length
    const leave = records.filter(r => r.status === 'leave').length
    const total = records.length
    return { present, late, absent, leave, total }
  }

  function addLeave(leave) {
    const days = getDaysBetween(leave.startDate, leave.endDate)
    if (days <= 0) return { success: false, message: '结束日期不能早于开始日期' }
    const newLeave = {
      id: generateId(),
      userId: leave.userId,
      type: leave.type,
      startDate: leave.startDate,
      endDate: leave.endDate,
      days,
      reason: leave.reason,
      attachments: leave.attachments || [],
      status: 'pending',
      rejectReason: '',
      createdAt: formatDate(new Date())
    }
    data.value.leaves.push(newLeave)
    saveData(data.value)
    return { success: true, leave: newLeave }
  }

  function addOvertime(overtime) {
    const hours = calcOvertimeHours(overtime.startTime, overtime.endTime)
    if (hours <= 0) return { success: false, message: '加班时长不能为零' }
    const newOvertime = {
      id: generateId(),
      userId: overtime.userId,
      date: overtime.date,
      startTime: overtime.startTime,
      endTime: overtime.endTime,
      hours,
      reason: overtime.reason,
      status: 'pending',
      rejectReason: '',
      createdAt: formatDate(new Date())
    }
    data.value.overtimes.push(newOvertime)
    saveData(data.value)
    return { success: true, overtime: newOvertime }
  }

  function getAllPending() {
    const pendingLeaves = data.value.leaves
      .filter(l => l.status === 'pending')
      .map(l => ({ ...l, category: 'leave' }))
    const pendingOvertimes = data.value.overtimes
      .filter(o => o.status === 'pending')
      .map(o => ({ ...o, category: 'overtime' }))
    return [...pendingLeaves, ...pendingOvertimes].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  }

  function getAllLeaves() {
    return data.value.leaves.map(l => ({ ...l, category: 'leave' }))
  }

  function getAllOvertimes() {
    return data.value.overtimes.map(o => ({ ...o, category: 'overtime' }))
  }

  function approveItem(category, id, rejectReason) {
    if (category === 'leave') {
      const item = data.value.leaves.find(l => l.id === id)
      if (!item) return
      item.status = rejectReason ? 'rejected' : 'approved'
      item.rejectReason = rejectReason || ''
      if (item.status === 'approved' && item.type === '年假') {
        const al = data.value.annualLeaves[item.userId]
        if (al) {
          al.used += item.days
          al.remaining = al.total - al.used
        }
      }
    } else {
      const item = data.value.overtimes.find(o => o.id === id)
      if (!item) return
      item.status = rejectReason ? 'rejected' : 'approved'
      item.rejectReason = rejectReason || ''
    }
    saveData(data.value)
  }

  function getDeptEmployees(dept) {
    return USERS.filter(u => u.dept === dept && u.role === 'employee')
  }

  function getDeptAbsentRate(dept, year, month) {
    const employees = getDeptEmployees(dept)
    if (employees.length === 0) return 0
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    let totalDays = 0
    let absentDays = 0
    employees.forEach(emp => {
      const records = data.value.attendances.filter(a => a.userId === emp.id && a.date.startsWith(prefix))
      totalDays += records.length
      absentDays += records.filter(r => r.status === 'absent' || r.status === 'leave').length
    })
    return totalDays > 0 ? Math.round(absentDays / totalDays * 1000) / 10 : 0
  }

  function getMonthlySummary(year, month) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`
    const summary = []
    USERS.filter(u => u.role === 'employee').forEach(user => {
      const records = data.value.attendances.filter(a => a.userId === user.id && a.date.startsWith(prefix))
      const present = records.filter(r => r.status === 'present').length
      const late = records.filter(r => r.status === 'late').length
      const absent = records.filter(r => r.status === 'absent').length
      const leave = records.filter(r => r.status === 'leave').length
      const total = records.length
      summary.push({
        userId: user.id,
        name: user.name,
        dept: user.dept,
        present,
        late,
        absent,
        leave,
        total
      })
    })
    return summary
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY)
    data.value = initMockData()
  }

  return {
    data,
    currentYear,
    currentMonth,
    getEmployeeLeaves,
    getEmployeeOvertimes,
    getEmployeeAttendances,
    getAnnualLeave,
    getPendingCount,
    getMonthAttendanceStats,
    addLeave,
    addOvertime,
    getAllPending,
    getAllLeaves,
    getAllOvertimes,
    approveItem,
    getDeptEmployees,
    getDeptAbsentRate,
    getMonthlySummary,
    resetData,
    getDaysBetween,
    calcOvertimeHours,
    formatDate
  }
})
