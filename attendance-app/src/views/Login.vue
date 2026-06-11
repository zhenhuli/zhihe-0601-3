<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { showToast } from 'vant'

const router = useRouter()
const authStore = useAuthStore()

const userId = ref('')
const userName = ref('')
const password = ref('')
const loading = ref(false)
const showUserPicker = ref(false)

const userActions = [
  { name: '张三（技术部）', id: '1' },
  { name: '李四（产品部）', id: '2' },
  { name: '王五（设计部）', id: '3' },
  { name: '赵六（市场部）', id: '4' },
  { name: '孙七（技术部）', id: '5' },
  { name: '周八（产品部）', id: '6' },
  { name: '吴九（设计部）', id: '7' },
  { name: '郑十（市场部）', id: '8' },
  { name: '管理员（管理层）', id: '100' }
]

function onUserSelect(action) {
  userId.value = action.id
  userName.value = action.name
}

function onLogin() {
  if (!userId.value) {
    showToast('请选择用户')
    return
  }
  if (!password.value) {
    showToast('请输入密码')
    return
  }
  loading.value = true
  setTimeout(() => {
    const result = authStore.login(userId.value, password.value)
    loading.value = false
    if (result.success) {
      showToast('登录成功')
      if (result.user.role === 'admin') {
        router.push({ name: 'AdminApproval' })
      } else {
        router.push({ name: 'EmpHome' })
      }
    } else {
      showToast(result.message)
    }
  }, 300)
}
</script>

<template>
  <div class="login-page">
    <div class="login-header">
      <div class="login-logo">📋</div>
      <h1 class="login-title">考勤填报系统</h1>
      <p class="login-subtitle">公司内部员工考勤管理平台</p>
    </div>

    <div class="login-card">
      <van-cell-group inset>
        <van-field
          :model-value="userName"
          readonly
          is-link
          label="用户"
          placeholder="选择用户账号"
          @click="showUserPicker = true"
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="请输入密码"
        />
      </van-cell-group>

      <van-action-sheet
        v-model:show="showUserPicker"
        title="选择用户"
        :actions="userActions"
        @select="onUserSelect"
        cancel-text="取消"
      />

      <div class="login-tip">
        员工密码：123456 / 管理员密码：admin123
      </div>

      <van-button
        type="primary"
        block
        round
        class="login-btn"
        :loading="loading"
        loading-text="登录中..."
        @click="onLogin"
      >
        登 录
      </van-button>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-logo {
  font-size: 60px;
  margin-bottom: 12px;
}

.login-title {
  color: #fff;
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-subtitle {
  color: rgba(255, 255, 255, 0.8);
  font-size: 14px;
}

.login-card {
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px;
  padding: 24px 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
}

.login-card :deep(.van-cell-group--inset) {
  margin: 0;
}

.login-tip {
  font-size: 12px;
  color: #969799;
  text-align: center;
  padding: 12px 16px 0;
}

.login-btn {
  margin-top: 24px;
  height: 44px;
  font-size: 16px;
}
</style>
