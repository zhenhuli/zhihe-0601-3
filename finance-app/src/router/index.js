import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/records' },
  { path: '/records', name: 'Records', component: () => import('../views/RecordList.vue') },
  { path: '/report', name: 'Report', component: () => import('../views/MonthlyReport.vue') },
  { path: '/budget', name: 'Budget', component: () => import('../views/BudgetManage.vue') }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
