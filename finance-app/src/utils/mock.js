import { addRecord, setBudget, EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '../db'

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function randomDate(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate()
  const day = randomInt(1, daysInMonth)
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export async function generateMockData() {
  const notes = ['早餐', '午餐', '晚餐', '地铁', '公交', '打车', '超市', '网购', '电影', 'KTV', '房租', '水电费', '话费', '药费', '学费', '加班', '年终', '理财收益']

  const now = new Date()
  const promises = []

  for (let monthOffset = 0; monthOffset < 12; monthOffset++) {
    let m = now.getMonth() + 1 - monthOffset
    let y = now.getFullYear()
    if (m <= 0) {
      m += 12
      y -= 1
    }

    const incomeCount = randomInt(2, 5)
    for (let i = 0; i < incomeCount; i++) {
      promises.push(addRecord({
        type: 'income',
        category: INCOME_CATEGORIES[randomInt(0, INCOME_CATEGORIES.length - 1)],
        amount: randomInt(3000, 25000),
        date: randomDate(y, m),
        note: notes[randomInt(0, notes.length - 1)],
        createdAt: Date.now() - randomInt(0, 86400000 * 30)
      }))
    }

    const expenseCount = randomInt(15, 40)
    for (let i = 0; i < expenseCount; i++) {
      const cat = EXPENSE_CATEGORIES[randomInt(0, EXPENSE_CATEGORIES.length - 1)]
      let amount
      if (cat === '住房') amount = randomInt(1500, 5000)
      else if (cat === '餐饮') amount = randomInt(10, 150)
      else if (cat === '交通') amount = randomInt(3, 80)
      else if (cat === '购物') amount = randomInt(20, 800)
      else amount = randomInt(10, 500)

      promises.push(addRecord({
        type: 'expense',
        category: cat,
        amount,
        date: randomDate(y, m),
        note: notes[randomInt(0, notes.length - 1)],
        createdAt: Date.now() - randomInt(0, 86400000 * 30)
      }))
    }

    promises.push(setBudget(y, m, randomInt(5000, 15000)))
  }

  await Promise.all(promises)
  console.log('Mock data generated!')
}
