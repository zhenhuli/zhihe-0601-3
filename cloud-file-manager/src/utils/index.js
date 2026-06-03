export function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

export function formatFileSize(bytes) {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatSpeed(bytesPerSecond) {
  if (!bytesPerSecond || bytesPerSecond === 0) return '0 B/s'
  const k = 1024
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s']
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k))
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export function formatTime(seconds) {
  if (!seconds || seconds === Infinity) return '计算中...'
  if (seconds < 60) return `${Math.round(seconds)} 秒`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟`
  return `${Math.floor(seconds / 3600)} 小时 ${Math.floor((seconds % 3600) / 60)} 分钟`
}

export function formatDate(timestamp) {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return `${Math.floor(diff / 60000)} 分钟前`
  if (diff < 86400000) return `${Math.floor(diff / 3600000)} 小时前`
  if (diff < 604800000) return `${Math.floor(diff / 86400000)} 天前`
  
  return date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function getFileType(filename) {
  if (!filename) return 'other'
  
  const ext = filename.split('.').pop().toLowerCase()
  
  const imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff']
  const documentExts = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'pdf', 'txt', 'md', 'rtf', 'odt', 'ods', 'odp', 'csv']
  const videoExts = ['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm', 'm4v', '3gp']
  const audioExts = ['mp3', 'wav', 'flac', 'aac', 'ogg', 'wma', 'm4a']
  const archiveExts = ['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'xz', 'iso']
  const codeExts = ['js', 'ts', 'jsx', 'tsx', 'vue', 'react', 'html', 'css', 'scss', 'less', 'php', 'python', 'py', 'java', 'c', 'cpp', 'csharp', 'go', 'rust', 'swift', 'kotlin', 'sql', 'json', 'xml', 'yaml', 'yml']
  
  if (imageExts.includes(ext)) return 'image'
  if (documentExts.includes(ext)) return 'document'
  if (videoExts.includes(ext)) return 'video'
  if (audioExts.includes(ext)) return 'audio'
  if (archiveExts.includes(ext)) return 'archive'
  if (codeExts.includes(ext)) return 'code'
  
  return 'other'
}

export function getFileIcon(type) {
  const icons = {
    folder: 'Folder',
    image: 'Picture',
    document: 'Document',
    video: 'VideoCamera',
    audio: 'Headset',
    archive: 'Files',
    code: 'Code',
    other: 'QuestionFilled'
  }
  return icons[type] || icons.other
}

export function getFileColor(type) {
  const colors = {
    folder: '#f59e0b',
    image: '#ec4899',
    document: '#3b82f6',
    video: '#8b5cf6',
    audio: '#10b981',
    archive: '#f97316',
    code: '#06b6d4',
    other: '#6b7280'
  }
  return colors[type] || colors.other
}

export function generateMockFiles() {
  const now = Date.now()
  const files = []
  
  const folders = [
    { name: '工作文档', path: '/' },
    { name: '个人照片', path: '/' },
    { name: '学习资料', path: '/' },
    { name: '项目文件', path: '/' },
    { name: '2024年度报告', path: '/工作文档' },
    { name: '旅行照片', path: '/个人照片' },
    { name: '技术文档', path: '/学习资料' },
    { name: '前端项目', path: '/项目文件' }
  ]
  
  folders.forEach((folder, index) => {
    files.push({
      id: generateId(),
      name: folder.name,
      isFolder: true,
      type: 'folder',
      path: folder.path,
      size: 0,
      createdAt: now - (index + 1) * 86400000,
      updatedAt: now - (index + 1) * 86400000,
      deleted: false
    })
  })
  
  const documents = [
    { name: '项目计划书.docx', type: 'document', size: 2.5 * 1024 * 1024, path: '/工作文档' },
    { name: '财务报表.xlsx', type: 'document', size: 1.8 * 1024 * 1024, path: '/工作文档' },
    { name: '会议记录.pdf', type: 'document', size: 3.2 * 1024 * 1024, path: '/工作文档' },
    { name: '年度总结.pptx', type: 'document', size: 8.5 * 1024 * 1024, path: '/工作文档/2024年度报告' },
    { name: '技术规范.pdf', type: 'document', size: 5.1 * 1024 * 1024, path: '/学习资料/技术文档' },
    { name: 'API文档.md', type: 'document', size: 0.3 * 1024 * 1024, path: '/学习资料/技术文档' },
    { name: '需求文档.docx', type: 'document', size: 1.2 * 1024 * 1024, path: '/工作文档' },
    { name: '合同模板.pdf', type: 'document', size: 0.8 * 1024 * 1024, path: '/工作文档' }
  ]
  
  const images = [
    { name: '风景照片1.jpg', type: 'image', size: 4.2 * 1024 * 1024, path: '/个人照片' },
    { name: '风景照片2.png', type: 'image', size: 6.8 * 1024 * 1024, path: '/个人照片' },
    { name: '家人合照.jpg', type: 'image', size: 5.3 * 1024 * 1024, path: '/个人照片' },
    { name: '产品截图.png', type: 'image', size: 1.2 * 1024 * 1024, path: '/个人照片' },
    { name: '海边旅行1.jpg', type: 'image', size: 7.5 * 1024 * 1024, path: '/个人照片/旅行照片' },
    { name: '海边旅行2.jpg', type: 'image', size: 8.1 * 1024 * 1024, path: '/个人照片/旅行照片' },
    { name: '建筑摄影.jpg', type: 'image', size: 3.6 * 1024 * 1024, path: '/个人照片/旅行照片' },
    { name: '美食照片.jpg', type: 'image', size: 2.9 * 1024 * 1024, path: '/个人照片/旅行照片' }
  ]
  
  const videos = [
    { name: '产品演示.mp4', type: 'video', size: 125 * 1024 * 1024, path: '/项目文件' },
    { name: '会议录像.mp4', type: 'video', size: 450 * 1024 * 1024, path: '/工作文档' },
    { name: '教程视频.mp4', type: 'video', size: 280 * 1024 * 1024, path: '/学习资料' },
    { name: '旅行记录.mp4', type: 'video', size: 890 * 1024 * 1024, path: '/个人照片/旅行照片' }
  ]
  
  const audio = [
    { name: '背景音乐.mp3', type: 'audio', size: 4.5 * 1024 * 1024, path: '/个人照片' },
    { name: '录音.wav', type: 'audio', size: 25 * 1024 * 1024, path: '/工作文档' },
    { name: '播客.mp3', type: 'audio', size: 45 * 1024 * 1024, path: '/学习资料' }
  ]
  
  const archives = [
    { name: '项目源码.zip', type: 'archive', size: 12 * 1024 * 1024, path: '/项目文件/前端项目' },
    { name: '备份文件.tar.gz', type: 'archive', size: 56 * 1024 * 1024, path: '/项目文件' },
    { name: '安装包.zip', type: 'archive', size: 89 * 1024 * 1024, path: '/项目文件' },
    { name: '资料打包.rar', type: 'archive', size: 120 * 1024 * 1024, path: '/学习资料' }
  ]
  
  const codeFiles = [
    { name: 'index.js', type: 'code', size: 0.05 * 1024 * 1024, path: '/项目文件/前端项目' },
    { name: 'App.vue', type: 'code', size: 0.03 * 1024 * 1024, path: '/项目文件/前端项目' },
    { name: 'package.json', type: 'code', size: 0.01 * 1024 * 1024, path: '/项目文件/前端项目' },
    { name: 'README.md', type: 'code', size: 0.02 * 1024 * 1024, path: '/项目文件/前端项目' },
    { name: 'utils.js', type: 'code', size: 0.04 * 1024 * 1024, path: '/项目文件/前端项目' }
  ]
  
  const other = [
    { name: 'ReadMe.txt', type: 'other', size: 0.01 * 1024 * 1024, path: '/' }
  ]
  
  ;[...documents, ...images, ...videos, ...audio, ...archives, ...codeFiles, ...other].forEach((file, index) => {
    files.push({
      id: generateId(),
      name: file.name,
      isFolder: false,
      type: file.type,
      path: file.path,
      size: file.size,
      createdAt: now - (index + 1) * 3600000,
      updatedAt: now - (index + 1) * 3600000,
      deleted: false
    })
  })
  
  return files
}

export function getPreviewUrl(file) {
  if (!file) return null
  
  if (file.previewUrl) {
    return file.previewUrl
  }
  
  if (file.type === 'image') {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 300
    const ctx = canvas.getContext('2d')
    
    const colors = ['#3b82f6', '#ec4899', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4']
    const color = colors[file.name.charCodeAt(0) % colors.length]
    
    const gradient = ctx.createLinearGradient(0, 0, 400, 300)
    gradient.addColorStop(0, color)
    gradient.addColorStop(1, adjustColor(color, -30))
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 300)
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
    for (let i = 0; i < 8; i++) {
      ctx.beginPath()
      ctx.arc(
        Math.sin(file.name.charCodeAt(i) * 0.1) * 200 + 200,
        Math.cos(file.name.charCodeAt(i) * 0.15) * 150 + 150,
        30 + (file.name.charCodeAt(i) % 20),
        0, Math.PI * 2
      )
      ctx.fill()
    }
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 32px sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    
    const ext = file.name.split('.').pop().toUpperCase()
    ctx.fillText(ext, 200, 140)
    
    ctx.font = '14px sans-serif'
    ctx.globalAlpha = 0.8
    ctx.fillText(file.name, 200, 180)
    ctx.globalAlpha = 1
    
    return canvas.toDataURL()
  }
  
  if (file.type === 'video') {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 225
    const ctx = canvas.getContext('2d')
    
    const gradient = ctx.createLinearGradient(0, 0, 400, 225)
    gradient.addColorStop(0, '#1e3a5f')
    gradient.addColorStop(1, '#0f172a')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 225)
    
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ctx.beginPath()
    ctx.moveTo(170, 80)
    ctx.lineTo(245, 112)
    ctx.lineTo(170, 145)
    ctx.closePath()
    ctx.fill()
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('视频文件', 200, 185)
    
    ctx.font = '12px sans-serif'
    ctx.globalAlpha = 0.7
    ctx.fillText(file.name, 200, 205)
    
    return canvas.toDataURL()
  }
  
  if (file.type === 'audio') {
    const canvas = document.createElement('canvas')
    canvas.width = 400
    canvas.height = 200
    const ctx = canvas.getContext('2d')
    
    const gradient = ctx.createLinearGradient(0, 0, 400, 200)
    gradient.addColorStop(0, '#065f46')
    gradient.addColorStop(1, '#022c22')
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, 400, 200)
    
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    for (let i = 0; i < 400; i += 5) {
      const height = Math.sin(i * 0.1 + file.name.charCodeAt(0)) * 40 + 60
      if (i === 0) {
        ctx.moveTo(i, 100 - height / 2)
      } else {
        ctx.lineTo(i, 100 - height / 2)
      }
    }
    ctx.stroke()
    
    ctx.beginPath()
    for (let i = 0; i < 400; i += 5) {
      const height = Math.sin(i * 0.1 + file.name.charCodeAt(1)) * 40 + 60
      if (i === 0) {
        ctx.moveTo(i, 100 + height / 2)
      } else {
        ctx.lineTo(i, 100 + height / 2)
      }
    }
    ctx.stroke()
    
    ctx.fillStyle = 'white'
    ctx.font = 'bold 16px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('音频文件', 200, 80)
    
    ctx.font = '12px sans-serif'
    ctx.globalAlpha = 0.7
    ctx.fillText(file.name, 200, 100)
    
    return canvas.toDataURL()
  }
  
  return null
}

function adjustColor(color, amount) {
  const hex = color.replace('#', '')
  const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + amount))
  const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + amount))
  const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + amount))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
