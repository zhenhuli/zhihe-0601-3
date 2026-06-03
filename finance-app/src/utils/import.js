import * as XLSX from 'xlsx'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../db'

function normalizeText(text) {
  if (!text) return ''
  return String(text).trim().replace(/\s+/g, '')
}

function detectType(typeText) {
  const t = normalizeText(typeText)
  if (t.includes('收入') || t === 'income' || t === 'in') return 'income'
  if (t.includes('支出') || t === 'expense' || t === 'out' || t === 'exp') return 'expense'
  return null
}

function detectCategory(categoryText, type) {
  const cat = normalizeText(categoryText)
  if (!cat) {
    return type === 'income' ? '其他收入' : '其他支出'
  }
  
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  for (const c of categories) {
    if (cat.includes(c) || c.includes(cat)) {
      return c
    }
  }
  
  return type === 'income' ? '其他收入' : '其他支出'
}

function parseDate(dateText) {
  if (!dateText) return null
  
  const d = String(dateText).trim()
  
  if (d.includes('-') || d.includes('/')) {
    const parts = d.split(/[-/]/)
    if (parts.length === 3) {
      let [y, m, day] = parts
      if (y.length === 2) y = '20' + y
      return `${y}-${String(Number(m)).padStart(2, '0')}-${String(Number(day)).padStart(2, '0')}`
    }
  }
  
  if (d.length === 8 && /^\d+$/.test(d)) {
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
  }
  
  const parsed = new Date(d)
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear()
    const m = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  
  return null
}

function parseAmount(amountText) {
  if (amountText === null || amountText === undefined || amountText === '') return null
  const cleaned = String(amountText).replace(/[^\d.-]/g, '')
  const num = Number(cleaned)
  if (isNaN(num) || num <= 0) return null
  return Math.round(num * 100) / 100
}

function mapHeader(header) {
  const h = normalizeText(header).toLowerCase()
  if (h.includes('日期') || h === 'date' || h.includes('time') || h.includes('时间')) return 'date'
  if (h.includes('类型') || h === 'type' || h.includes('收支')) return 'type'
  if (h.includes('分类') || h === 'category' || h.includes('类别')) return 'category'
  if (h.includes('金额') || h === 'amount' || h.includes('money') || h.includes('价格')) return 'amount'
  if (h.includes('备注') || h === 'note' || h.includes('说明') || h.includes('remark')) return 'note'
  return null
}

export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
        
        if (jsonData.length < 2) {
          reject(new Error('文件内容为空或格式不正确'))
          return
        }
        
        const headers = jsonData[0]
        const headerMap = {}
        headers.forEach((h, idx) => {
          const mapped = mapHeader(h)
          if (mapped) {
            headerMap[mapped] = idx
          }
        })
        
        if (!headerMap.date || !headerMap.amount) {
          reject(new Error('缺少必要的列：日期或金额'))
          return
        }
        
        const records = []
        const errors = []
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.every(v => !v)) continue
          
          const date = parseDate(row[headerMap.date])
          const amount = parseAmount(row[headerMap.amount])
          
          if (!date) {
            errors.push(`第 ${i + 1} 行：日期格式不正确`)
            continue
          }
          if (!amount) {
            errors.push(`第 ${i + 1} 行：金额格式不正确`)
            continue
          }
          
          let type = headerMap.type !== undefined ? detectType(row[headerMap.type]) : null
          if (!type) {
            type = 'expense'
          }
          
          const category = headerMap.category !== undefined 
            ? detectCategory(row[headerMap.category], type)
            : (type === 'income' ? '其他收入' : '其他支出')
          
          const note = headerMap.note !== undefined ? String(row[headerMap.note] || '').trim() : ''
          
          records.push({
            type,
            category,
            amount,
            date,
            note
          })
        }
        
        resolve({ records, errors })
      } catch (err) {
        reject(new Error('文件解析失败：' + err.message))
      }
    }
    
    reader.onerror = () => {
      reject(new Error('文件读取失败'))
    }
    
    reader.readAsArrayBuffer(file)
  })
}

export function getImportTemplate() {
  const data = [
    ['日期', '类型', '分类', '金额', '备注'],
    ['2025-01-05', '支出', '餐饮', 35.5, '午餐'],
    ['2025-01-10', '收入', '工资', 8000, '1月工资'],
    ['2025-01-15', '支出', '交通', 15.5, '地铁'],
  ]
  
  const ws = XLSX.utils.aoa_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '导入模板')
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  
  return new Blob([buf], { type: 'application/octet-stream' })
}
