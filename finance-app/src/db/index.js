import Dexie from 'dexie'

const db = new Dexie('FinanceDB')

db.version(1).stores({
  records: '++id, type, category, amount, date, note, createdAt',
  budgets: '[year+month], amount'
})

export const EXPENSE_CATEGORIES = ['餐饮', '购物', '交通', '住房', '娱乐', '医疗', '教育', '通讯', '服饰', '其他支出']
export const INCOME_CATEGORIES = ['工资', '奖金', '理财', '兼职', '其他收入']

export const CATEGORY_ICONS = {
  '餐饮': '🍜',
  '购物': '🛒',
  '交通': '🚌',
  '住房': '🏠',
  '娱乐': '🎮',
  '医疗': '💊',
  '教育': '📚',
  '通讯': '📱',
  '服饰': '👔',
  '其他支出': '💸',
  '工资': '💰',
  '奖金': '🎁',
  '理财': '📈',
  '兼职': '💼',
  '其他收入': '💵'
}

export async function addRecord(record) {
  record.createdAt = Date.now()
  return db.records.add(record)
}

export async function updateRecord(id, changes) {
  return db.records.update(id, changes)
}

export async function deleteRecord(id) {
  return db.records.delete(id)
}

export async function getRecordsByMonth(year, month, offset = 0, limit = 30) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`
  const records = await db.records
    .where('date')
    .between(start, end, true, true)
    .toArray()
  records.sort((a, b) => {
    if (b.date !== a.date) return b.date.localeCompare(a.date)
    return b.createdAt - a.createdAt
  })
  return records.slice(offset, offset + limit)
}

export async function getRecordsCountByMonth(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`
  return db.records
    .where('date')
    .between(start, end, true, true)
    .count()
}

export async function getMonthlyStats(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const end = `${year}-${String(month).padStart(2, '0')}-31`
  const records = await db.records
    .where('date')
    .between(start, end, true, true)
    .toArray()

  let totalIncome = 0
  let totalExpense = 0
  const dailyStats = {}
  const categoryStats = {}

  records.forEach(r => {
    if (!dailyStats[r.date]) {
      dailyStats[r.date] = { income: 0, expense: 0 }
    }
    if (r.type === 'income') {
      totalIncome += r.amount
      dailyStats[r.date].income += r.amount
    } else {
      totalExpense += r.amount
      dailyStats[r.date].expense += r.amount
      if (!categoryStats[r.category]) {
        categoryStats[r.category] = 0
      }
      categoryStats[r.category] += r.amount
    }
  })

  return { totalIncome, totalExpense, dailyStats, categoryStats, records }
}

export async function setBudget(year, month, amount) {
  return db.budgets.put({ year, month, amount })
}

export async function getBudget(year, month) {
  return db.budgets.get({ year, month })
}

export async function getAllRecords() {
  return db.records.toArray()
}

export async function addRecordsBatch(records) {
  const now = Date.now()
  const recordsWithTimestamp = records.map(r => ({
    ...r,
    createdAt: now
  }))
  return db.records.bulkAdd(recordsWithTimestamp)
}

export async function getYearlyStats(year) {
  const start = `${year}-01-01`
  const end = `${year}-12-31`
  const records = await db.records
    .where('date')
    .between(start, end, true, true)
    .toArray()

  const monthlyStats = {}
  for (let m = 1; m <= 12; m++) {
    monthlyStats[m] = { income: 0, expense: 0 }
  }

  let totalIncome = 0
  let totalExpense = 0

  records.forEach(r => {
    const [, month] = r.date.split('-').map(Number)
    if (r.type === 'income') {
      totalIncome += r.amount
      monthlyStats[month].income += r.amount
    } else {
      totalExpense += r.amount
      monthlyStats[month].expense += r.amount
    }
  })

  return { totalIncome, totalExpense, monthlyStats }
}

export default db
