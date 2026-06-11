import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', name: 'Login', component: () => import('../views/Login.vue'), meta: { guest: true } },
  {
    path: '/employee',
    component: () => import('../layouts/EmployeeLayout.vue'),
    meta: { requiresAuth: true, role: 'employee' },
    children: [
      { path: '', redirect: '/employee/home' },
      { path: 'home', name: 'EmpHome', component: () => import('../views/employee/Home.vue') },
      { path: 'leave', name: 'EmpLeave', component: () => import('../views/employee/LeaveApply.vue') },
      { path: 'overtime', name: 'EmpOvertime', component: () => import('../views/employee/OvertimeReport.vue') },
      { path: 'monthly', name: 'EmpMonthly', component: () => import('../views/employee/MonthlyDetail.vue') }
    ]
  },
  {
    path: '/admin',
    component: () => import('../layouts/AdminLayout.vue'),
    meta: { requiresAuth: true, role: 'admin' },
    children: [
      { path: '', redirect: '/admin/approval' },
      { path: 'approval', name: 'AdminApproval', component: () => import('../views/admin/ApprovalList.vue') },
      { path: 'dept', name: 'AdminDept', component: () => import('../views/admin/DeptManage.vue') },
      { path: 'summary', name: 'AdminSummary', component: () => import('../views/admin/MonthlySummary.vue') }
    ]
  },
  { path: '/', redirect: '/login' },
  { path: '/:pathMatch(.*)*', redirect: '/login' }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  if (to.meta.requiresAuth) {
    if (!authStore.isLoggedIn) {
      return next({ name: 'Login' })
    }
    if (to.meta.role === 'admin' && authStore.currentUser.role !== 'admin') {
      return next({ name: 'EmpHome' })
    }
    if (to.meta.role === 'employee' && authStore.currentUser.role === 'admin') {
      return next({ name: 'AdminApproval' })
    }
  }
  if (to.meta.guest && authStore.isLoggedIn) {
    if (authStore.currentUser.role === 'admin') {
      return next({ name: 'AdminApproval' })
    }
    return next({ name: 'EmpHome' })
  }
  next()
})

export default router
