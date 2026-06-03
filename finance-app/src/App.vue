<script setup>
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

function onTabChange(name) {
  router.push({ name })
}
</script>

<template>
  <div class="page-container">
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar
      :model-value="route.name"
      @update:model-value="onTabChange"
      route
    >
      <van-tabbar-item name="Records" icon="orders-o">记账</van-tabbar-item>
      <van-tabbar-item name="Report" icon="chart-trending-o">报表</van-tabbar-item>
      <van-tabbar-item name="Budget" icon="balance-o">预算</van-tabbar-item>
    </van-tabbar>
  </div>
</template>
