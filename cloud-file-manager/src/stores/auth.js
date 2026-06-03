import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token') || '')

  const isLoggedIn = computed(() => !!token.value)
  const isAdmin = computed(() => user.value?.role === 'admin')
  const isGuest = computed(() => !isLoggedIn.value)

  const users = [
    { id: 1, username: 'admin', password: 'admin123', role: 'admin', email: 'admin@example.com', avatar: '', storage: 100 * 1024 * 1024 * 1024 },
    { id: 2, username: 'user', password: 'user123', role: 'user', email: 'user@example.com', avatar: '', storage: 10 * 1024 * 1024 * 1024 }
  ]

  function login(username, password) {
    const foundUser = users.find(u => u.username === username && u.password === password)
    if (foundUser) {
      const { password: _, ...userData } = foundUser
      user.value = userData
      token.value = `token_${Date.now()}_${foundUser.id}`
      localStorage.setItem('token', token.value)
      localStorage.setItem('user', JSON.stringify(userData))
      return { success: true, user: userData }
    }
    return { success: false, message: '用户名或密码错误' }
  }

  function logout() {
    user.value = null
    token.value = ''
    localStorage.removeItem('token')
    localStorage.removeItem('user')
  }

  function initAuth() {
    const savedUser = localStorage.getItem('user')
    if (savedUser && token.value) {
      user.value = JSON.parse(savedUser)
    }
  }

  function hasPermission(action) {
    if (isGuest.value) {
      const guestActions = ['view', 'preview']
      return guestActions.includes(action)
    }
    if (isAdmin.value) return true
    const userActions = ['upload', 'download', 'share', 'delete', 'edit', 'create']
    return userActions.includes(action)
  }

  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isGuest,
    login,
    logout,
    initAuth,
    hasPermission
  }
})
