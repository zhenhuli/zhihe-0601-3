import { createRouter, createWebHashHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    component: () => import('../layouts/MainLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: '/home'
      },
      {
        path: 'home',
        name: 'Home',
        component: () => import('../views/Home.vue')
      },
      {
        path: 'files',
        name: 'Files',
        component: () => import('../views/Files.vue')
      },
      {
        path: 'images',
        name: 'Images',
        component: () => import('../views/Category.vue'),
        meta: { category: 'image' }
      },
      {
        path: 'documents',
        name: 'Documents',
        component: () => import('../views/Category.vue'),
        meta: { category: 'document' }
      },
      {
        path: 'videos',
        name: 'Videos',
        component: () => import('../views/Category.vue'),
        meta: { category: 'video' }
      },
      {
        path: 'archives',
        name: 'Archives',
        component: () => import('../views/Category.vue'),
        meta: { category: 'archive' }
      },
      {
        path: 'recycle',
        name: 'Recycle',
        component: () => import('../views/Recycle.vue')
      },
      {
        path: 'shares',
        name: 'Shares',
        component: () => import('../views/Shares.vue')
      },
      {
        path: 'upload-console',
        name: 'UploadConsole',
        component: () => import('../views/UploadConsole.vue')
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('../views/Admin.vue'),
        meta: { requiresAdmin: true }
      }
    ]
  },
  {
    path: '/share/:shareId',
    name: 'SharePreview',
    component: () => import('../views/SharePreview.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } })
  } else if (to.meta.requiresAdmin && !authStore.isAdmin) {
    next({ path: '/home' })
  } else {
    next()
  }
})

export default router
