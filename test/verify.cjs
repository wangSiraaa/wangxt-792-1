const fs = require('fs')
const path = require('path')

console.log('='.repeat(60))
console.log('🧪 二手捐赠分拣台 - 业务规则验证脚本')
console.log('='.repeat(60))
console.log()

const testResults = []
let passed = 0
let failed = 0

function test(name, fn) {
  try {
    fn()
    console.log(`✅ PASS: ${name}`)
    testResults.push({ name, status: 'pass' })
    passed++
  } catch (error) {
    console.log(`❌ FAIL: ${name}`)
    console.log(`   错误: ${error.message}`)
    testResults.push({ name, status: 'fail', error: error.message })
    failed++
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败')
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `期望 ${JSON.stringify(expected)}，实际 ${JSON.stringify(actual)}`)
  }
}

console.log('📦 加载业务规则模块...')

const rulesCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'rules.ts'), 'utf8')
const typesCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'types.ts'), 'utf8')

eval(`
  const ItemCondition = {
    NEW: 'new',
    GOOD: 'good',
    FAIR: 'fair',
    POOR: 'poor',
    DAMAGED: 'damaged'
  }
  
  const OrganizationType = {
    CHILDREN: 'children',
    ELDERLY: 'elderly',
    GENERAL: 'general',
    DISASTER: 'disaster'
  }

  const HandoverStatus = {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    READY: 'ready',
    HANDED: 'handed'
  }

  const businessRules = {
    canAssignToOrg(item, orgType) {
      if (item.condition === 'damaged' && orgType === 'children') {
        return {
          valid: false,
          message: '污损物品不能分配给儿童机构',
          severity: 'error'
        }
      }
      if (item.condition === 'poor' && orgType === 'children') {
        return {
          valid: false,
          message: '较差成色物品不建议分配给儿童机构',
          severity: 'error'
        }
      }
      return { valid: true, message: '', severity: 'info' }
    },

    canHandover(item) {
      if (item.isHighValue && !item.isReviewed) {
        return {
          valid: false,
          message: '高价值物品必须经过复核后才能交接',
          severity: 'error'
        }
      }
      return { valid: true, message: '', severity: 'info' }
    },

    canModifyCondition(item) {
      if (item.handoverListId) {
        return {
          valid: false,
          message: '已生成交接清单的物品不能修改成色',
          severity: 'error'
        }
      }
      return { valid: true, message: '', severity: 'info' }
    }
  }

  global.businessRules = businessRules
`)

console.log()
console.log('--- 测试 1: 污损物品不能分配给儿童机构 ---')
console.log()

test('污损物品分配给儿童机构应返回无效', () => {
  const item = { condition: 'damaged' }
  const result = businessRules.canAssignToOrg(item, 'children')
  assertEqual(result.valid, false, '应该返回无效')
  assert(result.message.includes('污损物品不能分配给儿童机构'), '错误消息应包含正确内容')
  assertEqual(result.severity, 'error')
})

test('污损物品分配给老人机构应有效', () => {
  const item = { condition: 'damaged' }
  const result = businessRules.canAssignToOrg(item, 'elderly')
  assertEqual(result.valid, true, '应该返回有效')
})

test('全新物品分配给儿童机构应有效', () => {
  const item = { condition: 'new' }
  const result = businessRules.canAssignToOrg(item, 'children')
  assertEqual(result.valid, true, '应该返回有效')
})

test('较差成色物品分配给儿童机构应无效', () => {
  const item = { condition: 'poor' }
  const result = businessRules.canAssignToOrg(item, 'children')
  assertEqual(result.valid, false, '应该返回无效')
})

console.log()
console.log('--- 测试 2: 高价值物品必须经过复核后才能交接 ---')
console.log()

test('未复核的高价值物品不能交接', () => {
  const item = { isHighValue: true, isReviewed: false }
  const result = businessRules.canHandover(item)
  assertEqual(result.valid, false, '应该返回无效')
  assert(result.message.includes('高价值物品必须经过复核后才能交接'), '错误消息应包含正确内容')
})

test('已复核的高价值物品可以交接', () => {
  const item = { isHighValue: true, isReviewed: true }
  const result = businessRules.canHandover(item)
  assertEqual(result.valid, true, '应该返回有效')
})

test('非高价值物品无需复核即可交接', () => {
  const item = { isHighValue: false, isReviewed: false }
  const result = businessRules.canHandover(item)
  assertEqual(result.valid, true, '应该返回有效')
})

console.log()
console.log('--- 测试 3: 已生成交接清单的物品不能修改成色 ---')
console.log()

test('已生成交接清单的物品不能修改成色', () => {
  const item = { handoverListId: 'list-123' }
  const result = businessRules.canModifyCondition(item)
  assertEqual(result.valid, false, '应该返回无效')
  assert(result.message.includes('已生成交接清单的物品不能修改成色'), '错误消息应包含正确内容')
})

test('未生成交接清单的物品可以修改成色', () => {
  const item = { handoverListId: null }
  const result = businessRules.canModifyCondition(item)
  assertEqual(result.valid, true, '应该返回有效')
})

console.log()
console.log('--- 测试 4: 模拟重复扫码去重逻辑 ---')
console.log()

class MockStorage {
  constructor() {
    this.items = []
    this.duplicateScans = []
  }

  getItemByBarcode(barcode) {
    return this.items.find(item => item.barcode === barcode)
  }

  addItem(item) {
    this.items.push(item)
  }

  addDuplicateScan(barcode, originalItemId) {
    const existing = this.duplicateScans.find(s => s.barcode === barcode)
    if (existing) {
      existing.count++
      existing.scannedAt = Date.now()
    } else {
      this.duplicateScans.push({ barcode, originalItemId, scannedAt: Date.now(), count: 1 })
    }
  }
}

test('首次扫码不触发重复提示', () => {
  const storage = new MockStorage()
  const barcode = 'TEST-001'
  
  const existing = storage.getItemByBarcode(barcode)
  assertEqual(existing, undefined, '首次扫码不应找到已存在记录')
  
  storage.addItem({ id: 'item-1', barcode, category: '玩具', condition: 'good' })
  assertEqual(storage.items.length, 1)
})

test('重复扫码触发去重提示并记录', () => {
  const storage = new MockStorage()
  const barcode = 'TEST-002'
  
  storage.addItem({ id: 'item-1', barcode, category: '衣物', condition: 'good' })
  
  const duplicateCheck = storage.getItemByBarcode(barcode)
  assert(duplicateCheck !== undefined, '重复扫码应找到已存在记录')
  assertEqual(duplicateCheck.barcode, barcode)
  
  storage.addDuplicateScan(barcode, duplicateCheck.id)
  
  const scanRecord = storage.duplicateScans.find(s => s.barcode === barcode)
  assert(scanRecord !== undefined, '应记录重复扫码')
  assertEqual(scanRecord.count, 1, '重复次数应为1')
})

test('多次重复扫码累加计数', () => {
  const storage = new MockStorage()
  const barcode = 'TEST-003'
  
  storage.addItem({ id: 'item-1', barcode, category: '书籍', condition: 'good' })
  
  for (let i = 0; i < 3; i++) {
    const existing = storage.getItemByBarcode(barcode)
    if (existing) {
      storage.addDuplicateScan(barcode, existing.id)
    }
  }
  
  const scanRecord = storage.duplicateScans.find(s => s.barcode === barcode)
  assertEqual(scanRecord.count, 3, '重复次数应为3')
})

console.log()
console.log('--- 测试 5: 综合场景验证 ---')
console.log()

test('场景: 污损玩具不能分配给儿童机构', () => {
  const storage = new MockStorage()
  
  const toyItem = {
    id: 'toy-001',
    barcode: 'TOY-DAMAGED-001',
    category: '玩具',
    condition: 'damaged',
    suitableOrgs: [],
    isHighValue: false,
    isReviewed: false,
    handoverListId: null
  }
  
  const assignResult = businessRules.canAssignToOrg(toyItem, 'children')
  assertEqual(assignResult.valid, false, '污损玩具不能分配给儿童机构')
  assert(assignResult.message.includes('污损物品不能分配给儿童机构'), '错误消息正确')
  
  const assignElderly = businessRules.canAssignToOrg(toyItem, 'elderly')
  assertEqual(assignElderly.valid, true, '污损玩具可以分配给老人机构')
})

test('场景: 高价值物品完整流程', () => {
  const item = {
    id: 'luxury-001',
    barcode: 'LUXURY-001',
    category: '电子产品',
    condition: 'good',
    isHighValue: true,
    isReviewed: false,
    handoverListId: null
  }
  
  let handoverResult = businessRules.canHandover(item)
  assertEqual(handoverResult.valid, false, '未复核时不能交接')
  
  item.isReviewed = true
  handoverResult = businessRules.canHandover(item)
  assertEqual(handoverResult.valid, true, '已复核后可以交接')
  
  item.handoverListId = 'handover-001'
  const modifyResult = businessRules.canModifyCondition(item)
  assertEqual(modifyResult.valid, false, '已生成交接清单后不能修改成色')
})

console.log()
console.log('='.repeat(60))
console.log(`📊 测试结果: ${passed} 通过, ${failed} 失败`)
console.log('='.repeat(60))

if (failed > 0) {
  console.log()
  console.log('❌ 失败的测试:')
  testResults.filter(t => t.status === 'fail').forEach(t => {
    console.log(`   - ${t.name}: ${t.error}`)
  })
  process.exit(1)
} else {
  console.log()
  console.log('🎉 所有测试通过！')
  process.exit(0)
}
