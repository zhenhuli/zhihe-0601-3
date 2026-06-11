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

const userOptions = [
  { text: '张三（技术部）', value: '1' },
  { text: '李四（产品部）', value: '2' },
  { text: '王五（设计部）', value: '3' },
  { text: '赵六（市场部）', value: '4' },
  { text: '孙七（技术部）', value: '5' },
  { text: '周八（产品部）', value: '6' },
  { text: '吴九（设计部）', value: '7' },
  { text: '郑十（市场部）', value: '8' },
  { text: '管理员（管理层）', value: '100' }
]

const columns = [
  {
    values: userOptions,
    textKey: 'text'
  }
]

function onUserPickerConfirm({ selectedValues }) {
  const option = selectedValues[0]
  userId.value = option.value
  userName.value = option.text
  showUserPicker.value = false
}

function openUserPicker() {
  showUserPicker.value = true
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
        <van-cell
          :title="userName || '请选择用户账号'"
          is-link
          label="用户"
          :title-class="userName ? 'cell-title' : 'cell-placeholder'"
          @click="openUserPicker"
        />
        <van-field
          v-model="password"
          type="password"
          label="密码"
          placeholder="请输入密码"
        />
      </van-cell-group>

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

    <van-popup v-model:show="showUserPicker" position="bottom" round>
      <van-picker
        :columns="columns"
        title="选择用户"
        @confirm="onUserPickerConfirm"
        @cancel="showUserPicker = false"
      />
    </van-popup>
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

.login-card :deep(.van-cell__label) {
  color: #323233;
  font-size: 14px;
}

.cell-title {
  color: #323233 !important;
  font-size: 14px !important;
}

.cell-placeholder {
  color: #c8c9cc !important;
  font-size: 14px !important;
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
