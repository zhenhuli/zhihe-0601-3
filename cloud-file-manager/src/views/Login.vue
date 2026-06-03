<template>
  <div class="login-page">
    <div class="login-container">
      <div class="login-left">
        <div class="brand-section">
          <div class="logo">
            <el-icon :size="48" color="#fff"><Cloud /></el-icon>
          </div>
          <h1 class="brand-name">智云盘</h1>
          <p class="brand-slogan">安全、高效、智能的云端文件管理平台</p>
        </div>
        <div class="features">
          <div class="feature-item">
            <el-icon :size="24"><Shield /></el-icon>
            <div>
              <h3>安全可靠</h3>
              <p>端到端加密，多重备份保障</p>
            </div>
          </div>
          <div class="feature-item">
            <el-icon :size="24"><Lightning /></el-icon>
            <div>
              <h3>极速传输</h3>
              <p>断点续传，大文件轻松上传</p>
            </div>
          </div>
          <div class="feature-item">
            <el-icon :size="24"><Share /></el-icon>
            <div>
              <h3>便捷分享</h3>
              <p>一键分享，灵活权限控制</p>
            </div>
          </div>
        </div>
      </div>

      <div class="login-right">
        <div class="login-form-wrapper">
          <h2 class="login-title">欢迎回来</h2>
          <p class="login-subtitle">登录您的账户，开始使用智云盘</p>

          <el-form ref="formRef" :model="loginForm" :rules="loginRules" class="login-form">
            <el-form-item prop="username">
              <el-input
                v-model="loginForm.username"
                placeholder="用户名"
                size="large"
                prefix-icon="User"
              />
            </el-form-item>
            <el-form-item prop="password">
              <el-input
                v-model="loginForm.password"
                type="password"
                placeholder="密码"
                size="large"
                prefix-icon="Lock"
                show-password
                @keyup.enter="handleLogin"
              />
            </el-form-item>
            <el-form-item>
              <div class="form-options">
                <el-checkbox v-model="loginForm.remember">记住我</el-checkbox>
                <a href="#" class="forgot-password">忘记密码？</a>
              </div>
            </el-form-item>
            <el-form-item>
              <el-button
                type="primary"
                size="large"
                class="login-btn"
                :loading="loading"
                @click="handleLogin"
              >
                登录
              </el-button>
            </el-form-item>
          </el-form>

          <div class="demo-accounts">
            <h4>演示账号</h4>
            <div class="account-item">
              <span class="account-label">管理员：</span>
              <span class="account-value">admin / admin123</span>
            </div>
            <div class="account-item">
              <span class="account-label">普通用户：</span>
              <span class="account-value">user / user123</span>
            </div>
          </div>

          <div class="register-link">
            还没有账户？<a href="#">立即注册</a>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const formRef = ref(null)
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
  remember: true
})

const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码长度至少6位', trigger: 'blur' }
  ]
}

async function handleLogin() {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    loading.value = true
    
    const result = authStore.login(loginForm.username, loginForm.password)
    
    if (result.success) {
      ElMessage.success(`欢迎回来，${result.user.username}！`)
      const redirect = route.query.redirect || '/home'
      router.push(redirect)
    } else {
      ElMessage.error(result.message)
    }
  } catch (error) {
    console.error('Login error:', error)
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-container {
  display: flex;
  width: 100%;
  max-width: 1000px;
  min-height: 600px;
  background: $bg-primary;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.login-left {
  flex: 1;
  background: linear-gradient(135deg, $primary-color 0%, $info-color 100%);
  padding: 60px 50px;
  color: white;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.brand-section {
  .logo {
    width: 80px;
    height: 80px;
    background: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 24px;
  }

  .brand-name {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  .brand-slogan {
    font-size: 16px;
    opacity: 0.9;
  }
}

.features {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.feature-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;

  h3 {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 4px;
  }

  p {
    font-size: 14px;
    opacity: 0.85;
  }
}

.login-right {
  flex: 1;
  padding: 60px 50px;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.login-title {
  font-size: 28px;
  font-weight: 700;
  color: $text-primary;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 14px;
  color: $text-secondary;
  margin-bottom: 32px;
}

.login-form {
  margin-bottom: 24px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.forgot-password {
  color: $primary-color;
  font-size: 14px;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.login-btn {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
}

.demo-accounts {
  padding: 16px;
  background: $bg-secondary;
  border-radius: $border-radius;
  margin-bottom: 20px;

  h4 {
    font-size: 13px;
    color: $text-secondary;
    margin-bottom: 8px;
  }

  .account-item {
    display: flex;
    gap: 8px;
    font-size: 13px;
    margin-bottom: 4px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .account-label {
    color: $text-secondary;
  }

  .account-value {
    color: $primary-color;
    font-family: 'Monaco', 'Menlo', monospace;
  }
}

.register-link {
  text-align: center;
  font-size: 14px;
  color: $text-secondary;

  a {
    color: $primary-color;
    text-decoration: none;
    font-weight: 500;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: $breakpoint-md) {
  .login-container {
    flex-direction: column;
    min-height: auto;
  }

  .login-left {
    padding: 40px 30px;
  }

  .login-right {
    padding: 40px 30px;
  }

  .features {
    display: none;
  }
}
</style>
