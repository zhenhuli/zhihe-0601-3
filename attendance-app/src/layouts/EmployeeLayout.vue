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
    <van-nav-bar :title="authStore.currentUser.name + ' - 考勤系统'">
      <template #right>
        <van-icon name="revoke" size="20" @click="onLogout" />
      </template>
    </van-nav-bar>
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar :model-value="route.name" @update:model-value="onTabChange" route>
      <van-tabbar-item name="EmpHome" icon="home-o">首页</van-tabbar-item>
      <van-tabbar-item name="EmpLeave" icon="description">请假</van-tabbar-item>
      <van-tabbar-item name="EmpOvertime" icon="clock-o">加班</van-tabbar-item>
      <van-tabbar-item name="EmpMonthly" icon="bar-chart-o">明细</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<style scoped>
.van-nav-bar {
  flex-shrink: 0;
}
</style>
