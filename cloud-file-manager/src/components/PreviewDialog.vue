<template>
  <el-dialog
    v-model="visible"
    :title="file?.name"
    width="90%"
    :max-width="isMobile ? '95%' : '1200px'"
    :close-on-click-modal="false"
    append-to-body
    destroy-on-close
    @close="handleClose"
  >
    <div class="preview-container" :class="{ mobile: isMobile }">
      <div class="preview-toolbar">
        <div class="toolbar-left">
          <el-button-group>
            <el-button size="small" @click="zoomIn">
              <el-icon><ZoomIn /></el-icon>
              放大
            </el-button>
            <el-button size="small" @click="zoomOut">
              <el-icon><ZoomOut /></el-icon>
              缩小
            </el-button>
            <el-button size="small" @click="resetZoom">
              <el-icon><RefreshRight /></el-icon>
              重置
            </el-button>
          </el-button-group>
          <span class="zoom-info">{{ Math.round(scale * 100) }}%</span>
        </div>
        <div class="toolbar-right">
          <el-button size="small" @click="handleDownload">
            <el-icon><Download /></el-icon>
            下载
          </el-button>
          <el-button size="small" @click="handleShare">
            <el-icon><Share /></el-icon>
            分享
          </el-button>
        </div>
      </div>

      <div class="preview-content" @wheel.prevent="handleWheel">
        <div v-if="file?.type === 'image'" class="preview-media">
          <img
            :src="imageSrc"
            :style="{ transform: `scale(${scale}) rotate(${rotation}deg)` }"
            class="preview-image"
            draggable="false"
            @error="handleImageError"
          />
        </div>

        <div v-else-if="file?.type === 'video'" class="preview-media">
          <div v-if="!videoSrc" class="video-placeholder">
            <img :src="getPreviewUrl(file)" class="video-thumb" />
            <div class="video-overlay">
              <el-icon :size="64" class="play-icon"><VideoPlay /></el-icon>
              <p class="video-tip">上传后可在线播放视频</p>
            </div>
          </div>
          <video
            v-else
            ref="videoRef"
            controls
            class="preview-video"
            :src="videoSrc"
            @error="handleVideoError"
          >
            您的浏览器不支持视频播放
          </video>
        </div>

        <div v-else-if="file?.type === 'audio'" class="preview-media audio-preview">
          <div v-if="!audioSrc" class="audio-placeholder">
            <img :src="getPreviewUrl(file)" class="audio-thumb" />
            <p class="audio-tip">上传后可在线播放音频</p>
          </div>
          <template v-else>
            <el-icon class="audio-icon" :size="80"><Headset /></el-icon>
            <audio controls class="preview-audio" :src="audioSrc" @error="handleAudioError">
              您的浏览器不支持音频播放
            </audio>
            <div class="audio-info">
              <h3>{{ file?.name }}</h3>
              <p>{{ formatFileSize(file?.size || 0) }}</p>
            </div>
          </template>
        </div>

        <div v-else-if="file?.type === 'document'" class="preview-document">
          <div class="document-placeholder">
            <el-icon :size="80" :color="getFileColor('document')"><Document /></el-icon>
            <h3>{{ file?.name }}</h3>
            <p class="document-tip">文档预览功能需要后端支持</p>
            <p class="document-size">{{ formatFileSize(file?.size || 0) }}</p>
            <el-button type="primary" @click="handleDownload">
              <el-icon><Download /></el-icon>
              下载查看
            </el-button>
          </div>
        </div>

        <div v-else-if="file?.type === 'archive'" class="preview-document">
          <div class="document-placeholder">
            <el-icon :size="80" :color="getFileColor('archive')"><Files /></el-icon>
            <h3>{{ file?.name }}</h3>
            <p class="document-tip">压缩包文件预览需要先解压</p>
            <p class="document-size">{{ formatFileSize(file?.size || 0) }}</p>
            <el-button type="primary" @click="handleExtract">
              <el-icon><Expand /></el-icon>
              解压文件
            </el-button>
          </div>
        </div>

        <div v-else-if="file?.type === 'code'" class="preview-document">
          <div class="code-preview">
            <div class="code-header">
              <span class="code-filename">{{ file?.name }}</span>
              <el-button size="small" @click="handleDownload">
                <el-icon><Download /></el-icon>
                下载
              </el-button>
            </div>
            <pre class="code-content"><code>// 代码预览需要后端支持
// 文件名: {{ file?.name }}
// 大小: {{ formatFileSize(file?.size || 0) }}

console.log('Hello World');</code></pre>
          </div>
        </div>

        <div v-else class="preview-document">
          <div class="document-placeholder">
            <el-icon :size="80" :color="getFileColor('other')"><QuestionFilled /></el-icon>
            <h3>{{ file?.name }}</h3>
            <p class="document-tip">该文件类型暂不支持预览</p>
            <p class="document-size">{{ formatFileSize(file?.size || 0) }}</p>
            <el-button type="primary" @click="handleDownload">
              <el-icon><Download /></el-icon>
              下载查看
            </el-button>
          </div>
        </div>
      </div>

      <div v-if="file?.type === 'image'" class="preview-footer">
        <div class="rotate-controls">
          <el-button size="small" @click="rotate(-90)">
            <el-icon><RefreshLeft /></el-icon>
            左旋
          </el-button>
          <el-button size="small" @click="rotate(90)">
            <el-icon><RefreshRight /></el-icon>
            右旋
          </el-button>
        </div>
      </div>

      <div v-if="documentPages > 1" class="preview-footer">
        <div class="page-controls">
          <el-button size="small" :disabled="currentPage <= 1" @click="currentPage--">
            <el-icon><ArrowLeft /></el-icon>
            上一页
          </el-button>
          <span class="page-info">{{ currentPage }} / {{ documentPages }}</span>
          <el-button size="small" :disabled="currentPage >= documentPages" @click="currentPage++">
            下一页
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useWindowSize } from '@vueuse/core'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '../stores/auth'
import { useFileStore } from '../stores/file'
import { formatFileSize, getFileColor, getPreviewUrl } from '../utils'

const authStore = useAuthStore()
const fileStore = useFileStore()

const { width } = useWindowSize()
const isMobile = ref(false)

watch(width, (newWidth) => {
  isMobile.value = newWidth < 768
}, { immediate: true })

const visible = ref(false)
const file = ref(null)
const scale = ref(1)
const rotation = ref(0)
const currentPage = ref(1)
const documentPages = ref(1)
const videoRef = ref(null)

const imageSrc = ref('')
const videoSrc = ref('')
const audioSrc = ref('')
const previewError = ref(false)

function open(targetFile) {
  file.value = targetFile
  scale.value = 1
  rotation.value = 0
  currentPage.value = 1
  previewError.value = false
  visible.value = true

  imageSrc.value = ''
  videoSrc.value = ''
  audioSrc.value = ''

  if (targetFile?.type === 'image') {
    imageSrc.value = targetFile.previewUrl || getPreviewUrl(targetFile)
  } else if (targetFile?.type === 'video') {
    videoSrc.value = targetFile.previewUrl || ''
  } else if (targetFile?.type === 'audio') {
    audioSrc.value = targetFile.previewUrl || ''
  }
}

function handleImageError() {
  previewError.value = true
  imageSrc.value = getPreviewUrl(file.value)
}

function handleVideoError() {
  previewError.value = true
}

function handleAudioError() {
  previewError.value = true
}

function handleClose() {
  visible.value = false
  file.value = null
  if (videoRef.value) {
    videoRef.value.pause()
  }
}

function zoomIn() {
  scale.value = Math.min(scale.value + 0.25, 3)
}

function zoomOut() {
  scale.value = Math.max(scale.value - 0.25, 0.25)
}

function resetZoom() {
  scale.value = 1
  rotation.value = 0
}

function rotate(degrees) {
  rotation.value = (rotation.value + degrees) % 360
}

function handleWheel(e) {
  if (e.deltaY < 0) {
    zoomIn()
  } else {
    zoomOut()
  }
}

function handleDownload() {
  if (!authStore.hasPermission('download')) {
    ElMessage.warning('请先登录后再下载')
    return
  }
  ElMessage.info('下载功能开发中')
}

function handleShare() {
  if (!authStore.hasPermission('share')) {
    ElMessage.warning('请先登录后再分享')
    return
  }
  if (file.value) {
    window.dispatchEvent(new CustomEvent('show-share-dialog', { 
      detail: { fileIds: [file.value.id] } 
    }))
  }
}

function handleExtract() {
  if (file.value) {
    fileStore.extractArchive(file.value.id, fileStore.currentPath)
    ElMessage.success('解压成功')
    handleClose()
  }
}

defineExpose({
  open
})

function handlePreviewFile(e) {
  open(e.detail)
}

watch(() => visible.value, (val) => {
  if (val) {
    nextTick(() => {
      document.body.style.overflow = 'hidden'
    })
  } else {
    document.body.style.overflow = ''
  }
})

if (typeof window !== 'undefined') {
  window.addEventListener('preview-file', handlePreviewFile)
}
</script>

<style lang="scss" scoped>
.preview-container {
  display: flex;
  flex-direction: column;
  height: 70vh;
  min-height: 500px;

  &.mobile {
    height: 80vh;
    min-height: auto;
  }
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: $bg-secondary;
  border-radius: $border-radius;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.zoom-info {
  font-size: 13px;
  color: $text-secondary;
  font-weight: 500;
}

.preview-content {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  background: $bg-secondary;
  border-radius: $border-radius-lg;
  overflow: auto;
  padding: 20px;
}

.preview-media {
  max-width: 100%;
  max-height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform $transition-normal;
  user-select: none;
}

.preview-video {
  max-width: 100%;
  max-height: 100%;
  border-radius: $border-radius;
}

.video-placeholder {
  position: relative;
  max-width: 100%;
  max-height: 100%;
  border-radius: $border-radius;
  overflow: hidden;
}

.video-thumb {
  display: block;
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.video-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  color: white;
}

.play-icon {
  margin-bottom: 16px;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

.video-tip {
  font-size: 14px;
  opacity: 0.9;
}

.audio-preview {
  flex-direction: column;
  gap: 24px;
  text-align: center;
}

.audio-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  text-align: center;
}

.audio-thumb {
  max-width: 300px;
  border-radius: $border-radius;
}

.audio-tip {
  font-size: 14px;
  color: $text-secondary;
}

.audio-icon {
  color: $primary-color;
}

.preview-audio {
  width: 100%;
  max-width: 400px;
}

.audio-info {
  h3 {
    font-size: 18px;
    color: $text-primary;
    margin-bottom: 8px;
  }
  p {
    font-size: 14px;
    color: $text-secondary;
  }
}

.preview-document {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.document-placeholder {
  text-align: center;
  padding: 40px;

  h3 {
    font-size: 18px;
    color: $text-primary;
    margin: 16px 0 8px;
  }

  .document-tip {
    font-size: 14px;
    color: $text-secondary;
    margin-bottom: 8px;
  }

  .document-size {
    font-size: 13px;
    color: $text-muted;
    margin-bottom: 24px;
  }
}

.code-preview {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #1e1e1e;
  border-radius: $border-radius;
  overflow: hidden;
}

.code-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #2d2d2d;
  border-bottom: 1px solid #404040;
}

.code-filename {
  font-size: 14px;
  color: #d4d4d4;
  font-family: 'Monaco', 'Menlo', monospace;
}

.code-content {
  flex: 1;
  padding: 20px;
  overflow: auto;
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 13px;
  line-height: 1.6;
  color: #d4d4d4;
}

.preview-footer {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 16px 0 0;
}

.rotate-controls, .page-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.page-info {
  font-size: 14px;
  color: $text-secondary;
  min-width: 60px;
  text-align: center;
}

@media (max-width: $breakpoint-md) {
  .preview-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .toolbar-right {
    width: 100%;
    display: flex;
    justify-content: flex-end;
  }

  .preview-content {
    padding: 12px;
  }

  .document-placeholder {
    padding: 20px;
  }
}

:deep(.el-dialog__body) {
  padding: 0 20px 20px;
}
</style>
