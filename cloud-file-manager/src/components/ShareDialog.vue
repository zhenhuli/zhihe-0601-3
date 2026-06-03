<template>
  <el-dialog
    v-model="visible"
    title="创建分享链接"
    width="500px"
    append-to-body
    @close="handleClose"
  >
    <div class="share-dialog">
      <div class="share-preview">
        <div class="preview-files">
          <el-icon :size="18"><Files /></el-icon>
          <span>已选择 {{ fileIds.length }} 个文件</span>
        </div>
      </div>

      <el-form :model="shareForm" label-width="100px">
        <el-form-item label="分享类型">
          <el-radio-group v-model="shareForm.type">
            <el-radio value="public">公开分享</el-radio>
            <el-radio value="private">私密分享</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="有效期">
          <el-select v-model="shareForm.expireDays" style="width: 100%;">
            <el-option label="1天" :value="1" />
            <el-option label="7天" :value="7" />
            <el-option label="30天" :value="30" />
            <el-option label="永久有效" :value="0" />
          </el-select>
        </el-form-item>

        <el-form-item label="提取密码" v-if="shareForm.type === 'private'">
          <div class="password-input">
            <el-input v-model="shareForm.password" placeholder="请输入提取密码" maxlength="6">
              <template #append>
                <el-button @click="generatePassword">
                  <el-icon><Refresh /></el-icon>
                </el-button>
              </template>
            </el-input>
            <span class="password-tip">请输入4-6位密码</span>
          </div>
        </el-form-item>

        <el-form-item label="访问限制">
          <el-checkbox v-model="shareForm.limitViews">限制访问次数</el-checkbox>
          <el-input-number
            v-if="shareForm.limitViews"
            v-model="shareForm.maxViews"
            :min="1"
            :max="10000"
            size="small"
            style="margin-left: 8px"
          />
        </el-form-item>

        <el-form-item label="允许下载">
          <el-switch v-model="shareForm.allowDownload" />
        </el-form-item>
      </el-form>

      <div v-if="generatedLink" class="share-result">
        <el-alert title="分享链接已生成" type="success" :closable="false" show-icon>
          <template #default>
            <div class="link-info">
              <div class="link-row">
                <span class="link-label">分享链接：</span>
                <el-input :model-value="generatedLink.link" readonly style="flex: 1;">
                  <template #append>
                    <el-button @click="copyLink">复制</el-button>
                  </template>
                </el-input>
              </div>
              <div v-if="generatedLink.password" class="link-row">
                <span class="link-label">提取密码：</span>
                <span class="link-password">{{ generatedLink.password }}</span>
                <el-button size="small" @click="copyPassword">复制</el-button>
              </div>
            </div>
          </template>
        </el-alert>
      </div>

      <div class="dialog-actions">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="createShare">创建分享</el-button>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, reactive, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { useFileStore } from '../stores/file'

const props = defineProps({
  fileIds: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close'])

const fileStore = useFileStore()

const visible = ref(false)
const generatedLink = ref(null)

const shareForm = reactive({
  type: 'public',
  expireDays: 7,
  password: '',
  limitViews: false,
  maxViews: 100,
  allowDownload: true
})

watch(() => props.fileIds.length, (len) => {
  if (len > 0) {
    visible.value = true
    generatedLink.value = null
    shareForm.type = 'public'
    shareForm.expireDays = 7
    shareForm.password = ''
    shareForm.limitViews = false
    shareForm.maxViews = 100
    shareForm.allowDownload = true
  }
})

function generatePassword() {
  shareForm.password = Math.random().toString(36).slice(-6).toUpperCase()
}

function createShare() {
  if (shareForm.type === 'private' && (!shareForm.password || shareForm.password.length < 4)) {
    ElMessage.warning('请输入4-6位提取密码')
    return
  }

  const options = {
    type: shareForm.type,
    expireDays: shareForm.expireDays,
    password: shareForm.type === 'private' ? shareForm.password : null,
    maxViews: shareForm.limitViews ? shareForm.maxViews : null,
    allowDownload: shareForm.allowDownload
  }

  const share = fileStore.createShare(props.fileIds, options)
  generatedLink.value = {
    link: `${window.location.origin}/#/share/${share.shareId}`,
    password: share.password
  }

  ElMessage.success('分享链接创建成功')
}

function copyLink() {
  if (generatedLink.value) {
    navigator.clipboard.writeText(generatedLink.value.link)
    ElMessage.success('链接已复制')
  }
}

function copyPassword() {
  if (generatedLink.value?.password) {
    navigator.clipboard.writeText(generatedLink.value.password)
    ElMessage.success('密码已复制')
  }
}

function handleClose() {
  visible.value = false
  emit('close')
}
</script>

<style lang="scss" scoped>
.share-dialog {
  .share-preview {
    padding: 12px;
    background: $bg-secondary;
    border-radius: $border-radius;
    margin-bottom: 16px;
  }

  .preview-files {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    color: $text-secondary;
  }

  .password-input {
    width: 100%;

    .password-tip {
      display: block;
      font-size: 12px;
      color: $text-muted;
      margin-top: 4px;
    }
  }

  .share-result {
    margin-top: 16px;
  }

  .link-info {
    margin-top: 12px;
  }

  .link-row {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    &:last-child {
      margin-bottom: 0;
    }
  }

  .link-label {
    font-size: 13px;
    color: $text-secondary;
    white-space: nowrap;
  }

  .link-password {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 14px;
    font-weight: 600;
    color: $primary-color;
    letter-spacing: 2px;
  }

  .dialog-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 20px;
  }
}
</style>
