<script setup>
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

function onTabChange(name) {
  router.push({ name })
}

function onLogout() {
  authStore.logout()
  router.push({ name: 'Login' })
}
</script>

<template>
  <div class="page-container">
    <van-nav-bar :title="authStore.currentUser.name + ' - 管理后台'">
      <template #right>
        <van-icon name="revoke" size="20" @click="onLogout" />
      </template>
    </van-nav-bar>
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar :model-value="route.name" @update:model-value="onTabChange" route>
      <van-tabbar-item name="AdminApproval" icon="todo-list-o">审批</van-tabbar-item>
      <van-tabbar-item name="AdminDept" icon="friends-o">部门</van-tabbar-item>
      <van-tabbar-item name="AdminSummary" icon="chart-trending-o">汇总</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.van-nav-bar {
  flex-shrink: 0;
}
</style>
