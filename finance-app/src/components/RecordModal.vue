<script setup>
import { ref, watch, computed } from 'vue'
import { showToast } from 'vant'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, CATEGORY_ICONS } from '../db'

const props = defineProps({
  show: Boolean,
  record: Object
})

const emit = defineEmits(['update:show', 'saved'])

const formType = ref('expense')
const formCategory = ref('')
const formAmount = ref('')
const formDate = ref('')
const formNote = ref('')
const showCategoryPicker = ref(false)
const showDatePicker = ref(false)
const saving = ref(false)
const datePickerValue = ref([])

const categoryOptions = computed(() => {
  return formType.value === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
})

const categoryColumns = computed(() => {
  return categoryOptions.value.map(c => ({
    text: `${CATEGORY_ICONS[c] || ''} ${c}`,
    value: c
  }))
})

watch(() => props.show, (val) => {
  if (val) {
    if (props.record && props.record.id) {
      formType.value = props.record.type || 'expense'
      formCategory.value = props.record.category || ''
      formAmount.value = props.record.amount ? String(props.record.amount) : ''
      formDate.value = props.record.date || getToday()
      formNote.value = props.record.note || ''
    } else {
      formType.value = 'expense'
      formCategory.value = ''
      formAmount.value = ''
      formDate.value = getToday()
      formNote.value = ''
    }
    const parts = formDate.value.split('-').map(Number)
    datePickerValue.value = parts
  }
})

function getToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function onTypeChange(val) {
  formType.value = val
  formCategory.value = ''
}

function onCategoryConfirm({ selectedValues }) {
  formCategory.value = selectedValues[0]
  showCategoryPicker.value = false
}

function onDateConfirm({ selectedValues }) {
  const [year, month, day] = selectedValues
  formDate.value = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  showDatePicker.value = false
}

async function onSave() {
  if (!formCategory.value) {
    showToast('请选择分类')
    return
  }
  if (!formAmount.value || Number(formAmount.value) <= 0) {
    showToast('请输入有效金额')
    return
  }
  if (!formDate.value) {
    showToast('请选择日期')
    return
  }

  saving.value = true
  try {
    const record = {
      type: formType.value,
      category: formCategory.value,
      amount: Number(formAmount.value),
      date: formDate.value,
      note: formNote.value
    }
    if (props.record && props.record.id) {
      record.id = props.record.id
    }
    emit('saved', record)
    emit('update:show', false)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <van-popup
    :show="show"
    @update:show="emit('update:show', $event)"
    position="bottom"
    :style="{ height: '85%' }"
    round
  >
    <div class="modal-content">
      <div class="modal-header">
        <span class="modal-title">{{ record?.id ? '编辑记录' : '添加记录' }}</span>
        <van-button size="small" type="primary" @click="onSave" :loading="saving">保存</van-button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <div class="form-label">类型</div>
          <van-radio-group v-model="formType" direction="horizontal" @change="onTypeChange">
            <van-radio name="expense">支出</van-radio>
            <van-radio name="income">收入</van-radio>
          </van-radio-group>
        </div>

        <van-field
          v-model="formCategory"
          label="分类"
          placeholder="请选择分类"
          readonly
          is-link
          @click="showCategoryPicker = true"
        />

        <van-field
          v-model="formAmount"
          label="金额"
          type="number"
          placeholder="请输入金额"
          :rules="[{ validator: val => Number(val) > 0, message: '金额必须大于0' }]"
        />

        <van-field
          v-model="formDate"
          label="日期"
          placeholder="请选择日期"
          readonly
          is-link
          @click="showDatePicker = true"
        />

        <van-field
          v-model="formNote"
          label="备注"
          placeholder="请输入备注（选填）"
          maxlength="100"
          show-word-limit
        />
      </div>
    </div>
  </van-popup>

  <van-popup :show="showCategoryPicker" @update:show="showCategoryPicker = $event" position="bottom" round>
    <van-picker
      :columns="categoryColumns"
      @confirm="onCategoryConfirm"
      @cancel="showCategoryPicker = false"
    />
  </van-popup>

  <van-popup :show="showDatePicker" @update:show="showDatePicker = $event" position="bottom" round>
    <van-date-picker
      v-model="datePickerValue"
      :min-date="new Date(2020, 0, 1)"
      :max-date="new Date(2030, 11, 31)"
      @confirm="onDateConfirm"
      @cancel="showDatePicker = false"
    />
  </van-popup>
</template>

<style scoped>
.modal-content {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #ebedf0;
}

.modal-title {
  font-size: 17px;
  font-weight: 600;
  color: #323233;
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 20px;
}

.form-group {
  padding: 16px;
  display: flex;
  align-items: center;
}

.form-label {
  font-size: 14px;
  color: #646566;
  margin-right: 12px;
  width: 60px;
  flex-shrink: 0;
}
</style>
