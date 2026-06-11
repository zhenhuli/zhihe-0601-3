import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const USERS = [
  { id: 1, name: '张三', dept: '技术部', role: 'employee', password: '123456' },
  { id: 2, name: '李四', dept: '产品部', role: 'employee', password: '123456' },
  { id: 3, name: '王五', dept: '设计部', role: 'employee', password: '123456' },
  { id: 4, name: '赵六', dept: '市场部', role: 'employee', password: '123456' },
  { id: 5, name: '孙七', dept: '技术部', role: 'employee', password: '123456' },
  { id: 6, name: '周八', dept: '产品部', role: 'employee', password: '123456' },
  { id: 7, name: '吴九', dept: '设计部', role: 'employee', password: '123456' },
  { id: 8, name: '郑十', dept: '市场部', role: 'employee', password: '123456' },
  { id: 100, name: '管理员', dept: '管理层', role: 'admin', password: 'admin123' }
]

const DEPARTMENTS = ['技术部', '产品部', '设计部', '市场部']

export { USERS, DEPARTMENTS }

export const useAuthStore = defineStore('auth', () => {
  const currentUser = ref(JSON.parse(localStorage.getItem('attendance_user') || 'null'))

  const isLoggedIn = computed(() => !!currentUser.value)
  const isAdmin = computed(() => currentUser.value?.role === 'admin')

  function login(userId, password) {
    const user = USERS.find(u => u.id === Number(userId))
    if (!user) return { success: false, message: '用户不存在' }
    if (user.password !== password) return { success: false, message: '密码错误' }
    currentUser.value = { id: user.id, name: user.name, dept: user.dept, role: user.role }
    localStorage.setItem('attendance_user', JSON.stringify(currentUser.value))
    return { success: true, user: currentUser.value }
  }

  function logout() {
    currentUser.value = null
    localStorage.removeItem('attendance_user')
  }

  return { currentUser, isLoggedIn, isAdmin, login, logout }
})
