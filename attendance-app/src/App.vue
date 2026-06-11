<script setup>
import { useAuthStore } from './stores/auth'

const authStore = useAuthStore()
</script>

<template>
  <router-view />
</template>

<style>
</style>
