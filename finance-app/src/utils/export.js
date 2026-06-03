import * as XLSX from 'xlsx'
import { saveAs } from 'file-saver'
import { getAllRecords } from '../db'

export async function exportToExcel(year, month) {
  const allRecords = await getAllRecords()
  const filtered = allRecords.filter(r => {
    const [y, m] = r.date.split('-').map(Number)
    return y === year && m === month
  })

  const data = filtered.map(r => ({
    '日期': r.date,
    '类型': r.type === 'income' ? '收入' : '支出',
    '分类': r.category,
    '金额': r.amount,
    '备注': r.note || ''
  }))

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, `${year}年${month}月`)
  const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' })
  saveAs(new Blob([buf], { type: 'application/octet-stream' }), `记账本_${year}_${month}.xlsx`)
}

export async function exportToCSV(year, month) {
  const allRecords = await getAllRecords()
  const filtered = allRecords.filter(r => {
    const [y, m] = r.date.split('-').map(Number)
    return y === year && m === month
  })

  const header = '日期,类型,分类,金额,备注'
  const rows = filtered.map(r =>
    `${r.date},${r.type === 'income' ? '收入' : '支出'},${r.category},${r.amount},"${(r.note || '').replace(/"/g, '""')}"`
  )
  const csv = '\uFEFF' + header + '\n' + rows.join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  saveAs(blob, `记账本_${year}_${month}.csv`)
}
