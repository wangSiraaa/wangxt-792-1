import { useState, useEffect, useCallback } from 'react'
import type { DonationItem, ItemCondition, OrganizationType, SortingBox } from './types'
import { storage } from './storage'
import { businessRules, generateId } from './rules'
import './App.css'

type TabType = 'scan' | 'sorting' | 'handover' | 'export' | 'review'

const CATEGORIES = ['衣物', '玩具', '书籍', '电子产品', '家居用品', '文具', '运动器材', '其他']
const CONDITIONS: { value: ItemCondition; label: string; icon: string }[] = [
  { value: 'new', label: '全新', icon: '✨' },
  { value: 'good', label: '良好', icon: '👍' },
  { value: 'fair', label: '一般', icon: '👌' },
  { value: 'poor', label: '较差', icon: '😕' },
  { value: 'damaged', label: '污损', icon: '⚠️' }
]

const ORG_TYPES: { value: OrganizationType; label: string }[] = [
  { value: 'children', label: '儿童机构' },
  { value: 'elderly', label: '老人机构' },
  { value: 'general', label: '综合机构' },
  { value: 'disaster', label: '灾区物资' }
]

const RESTRICTION_TAGS = ['易碎品', '电子产品', '需消毒', '仅成人', '高价值', '危险品']

function App() {
  const [activeTab, setActiveTab] = useState<TabType>('scan')
  const [items, setItems] = useState<DonationItem[]>([])
  const [sortingBoxes, setSortingBoxes] = useState<SortingBox[]>([])
  const [duplicateScans, setDuplicateScans] = useState(storage.getDuplicateScans())
  const [highlightedItemId, setHighlightedItemId] = useState<string | null>(null)

  const [barcodeInput, setBarcodeInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedCondition, setSelectedCondition] = useState<ItemCondition | null>(null)
  const [selectedOrgs, setSelectedOrgs] = useState<OrganizationType[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedBox, setSelectedBox] = useState<string | null>(null)
  const [isHighValue, setIsHighValue] = useState(false)
  const [itemNotes, setItemNotes] = useState('')
  const [alert, setAlert] = useState<{ type: 'error' | 'warning' | 'success' | 'info'; message: string } | null>(null)

  const [editingItem, setEditingItem] = useState<DonationItem | null>(null)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [reviewItem, setReviewItem] = useState<DonationItem | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    setItems(storage.getItems())
    setSortingBoxes(storage.getSortingBoxes())
    setDuplicateScans(storage.getDuplicateScans())
  }

  const showAlert = useCallback((type: 'error' | 'warning' | 'success' | 'info', message: string) => {
    setAlert({ type, message })
    setTimeout(() => setAlert(null), 4000)
  }, [])

  const handleScan = useCallback((e: React.FormEvent) => {
    e.preventDefault()
    if (!barcodeInput.trim()) return

    const duplicateCheck = businessRules.checkDuplicateBarcode(barcodeInput.trim())
    
    if (duplicateCheck.isDuplicate && duplicateCheck.item) {
      storage.addDuplicateScan(barcodeInput.trim(), duplicateCheck.item.id)
      setDuplicateScans(storage.getDuplicateScans())
      setHighlightedItemId(duplicateCheck.item.id)
      showAlert('warning', `条码 ${barcodeInput} 已存在！已定位到原记录。`)
      setTimeout(() => setHighlightedItemId(null), 2000)
      setBarcodeInput('')
      return
    }

    if (!selectedCategory) {
      showAlert('error', '请选择物品类别')
      return
    }
    if (!selectedCondition) {
      showAlert('error', '请评估物品成色')
      return
    }

    const newItem: DonationItem = {
      id: generateId(),
      barcode: barcodeInput.trim(),
      category: selectedCategory,
      condition: selectedCondition,
      suitableOrgs: selectedOrgs,
      restrictionTags: selectedTags,
      sortingBox: selectedBox,
      handoverStatus: isHighValue ? 'reviewing' : 'pending',
      isHighValue,
      isReviewed: false,
      handoverListId: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      notes: itemNotes
    }

    if (selectedBox) {
      storage.updateSortingBoxItemCount(selectedBox, 1)
    }

    storage.addItem(newItem)
    loadData()
    showAlert('success', `物品 ${barcodeInput} 录入成功`)
    
    setBarcodeInput('')
    setSelectedCondition(null)
    setSelectedOrgs([])
    setSelectedTags([])
    setSelectedBox(null)
    setIsHighValue(false)
    setItemNotes('')
  }, [barcodeInput, selectedCategory, selectedCondition, selectedOrgs, selectedTags, selectedBox, isHighValue, itemNotes, showAlert])

  const handleAssignBox = (itemId: string, boxId: string) => {
    const item = storage.getItemById(itemId)
    if (!item) return

    if (item.sortingBox) {
      storage.updateSortingBoxItemCount(item.sortingBox, -1)
    }
    storage.updateSortingBoxItemCount(boxId, 1)
    storage.updateItem(itemId, { sortingBox: boxId })
    loadData()
    showAlert('success', '已分配到分拣箱')
  }

  const handleOrgToggle = (itemId: string, orgType: OrganizationType) => {
    const item = storage.getItemById(itemId)
    if (!item) return

    const validation = businessRules.canAssignToOrg(item, orgType)
    if (!validation.valid) {
      showAlert(validation.severity, validation.message)
      return
    }

    const newOrgs = item.suitableOrgs.includes(orgType)
      ? item.suitableOrgs.filter(o => o !== orgType)
      : [...item.suitableOrgs, orgType]
    
    storage.updateItem(itemId, { suitableOrgs: newOrgs })
    loadData()
  }

  const handleConditionChange = (itemId: string, condition: ItemCondition) => {
    const item = storage.getItemById(itemId)
    if (!item) return

    const validation = businessRules.canModifyCondition(item)
    if (!validation.valid) {
      showAlert(validation.severity, validation.message)
      return
    }

    storage.updateItem(itemId, { condition })
    loadData()
  }

  const handleReview = (item: DonationItem) => {
    setReviewItem(item)
    setShowReviewModal(true)
  }

  const confirmReview = () => {
    if (!reviewItem) return
    storage.updateItem(reviewItem.id, { isReviewed: true, handoverStatus: 'ready' })
    loadData()
    setShowReviewModal(false)
    setReviewItem(null)
    showAlert('success', '复核通过，物品可交接')
  }

  const exportData = (format: 'json' | 'csv') => {
    const data = storage.getItems()
    let content: string
    let filename: string
    let mimeType: string

    if (format === 'json') {
      content = JSON.stringify(data, null, 2)
      filename = `donation_records_${Date.now()}.json`
      mimeType = 'application/json'
    } else {
      const headers = ['条码', '类别', '成色', '适配机构', '限制标签', '分拣箱', '交接状态', '是否高价值', '已复核', '备注', '创建时间']
      const rows = data.map(item => [
        item.barcode,
        item.category,
        CONDITIONS.find(c => c.value === item.condition)?.label || item.condition,
        item.suitableOrgs.map(o => ORG_TYPES.find(t => t.value === o)?.label).join(';'),
        item.restrictionTags.join(';'),
        item.sortingBox || '',
        item.handoverStatus,
        item.isHighValue ? '是' : '否',
        item.isReviewed ? '是' : '否',
        item.notes,
        new Date(item.createdAt).toLocaleString()
      ])
      content = [headers.join(','), ...rows.map(r => r.map(cell => `"${cell}"`).join(','))].join('\n')
      filename = `donation_records_${Date.now()}.csv`
      mimeType = 'text/csv'
    }

    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    showAlert('success', `已导出 ${format.toUpperCase()} 文件`)
  }

  const generateHandoverList = () => {
    const readyItems = items.filter(i => 
      i.handoverStatus === 'ready' || 
      (!i.isHighValue && i.handoverStatus === 'pending')
    )
    
    if (readyItems.length === 0) {
      showAlert('warning', '没有可交接的物品')
      return
    }

    const listId = generateId()
    readyItems.forEach(item => {
      storage.updateItem(item.id, { handoverListId: listId, handoverStatus: 'handed' })
    })
    
    loadData()
    showAlert('success', `已生成交接清单，共 ${readyItems.length} 件物品`)
  }

  const resetAll = () => {
    if (confirm('确定要清空所有数据吗？此操作不可撤销。')) {
      storage.clearAll()
      loadData()
      showAlert('info', '数据已清空')
    }
  }

  const stats = {
    total: items.length,
    pending: items.filter(i => i.handoverStatus === 'pending' || i.handoverStatus === 'reviewing').length,
    ready: items.filter(i => i.handoverStatus === 'ready').length,
    handed: items.filter(i => i.handoverStatus === 'handed').length,
    needReview: items.filter(i => i.isHighValue && !i.isReviewed).length,
    duplicates: duplicateScans.length
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-content">
          <h1>
            <span className="header-icon">🎁</span>
            二手捐赠分拣台
          </h1>
          <div className="user-info">
            <span className="user-badge">👤 志愿者</span>
            <span className="user-badge">🏷️ 分拣员</span>
            <button className="btn btn-secondary" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none' }} onClick={resetAll}>
              🔄 重置数据
            </button>
          </div>
        </div>
      </header>

      <main className="main">
        {alert && (
          <div className={`alert alert-${alert.type}`}>
            <span className="alert-icon">
              {alert.type === 'error' && '❌'}
              {alert.type === 'warning' && '⚠️'}
              {alert.type === 'success' && '✅'}
              {alert.type === 'info' && 'ℹ️'}
            </span>
            <span>{alert.message}</span>
          </div>
        )}

        <div className="stat-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.total}</div>
            <div className="stat-label">📦 总物品数</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#FFA07A' }}>{stats.pending}</div>
            <div className="stat-label">⏳ 待处理</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#28A745' }}>{stats.ready}</div>
            <div className="stat-label">✅ 可交接</div>
          </div>
          <div className="stat-card">
            <div className="stat-value" style={{ color: '#9B59B6' }}>{stats.handed}</div>
            <div className="stat-label">📋 已交接</div>
          </div>
          {stats.needReview > 0 && (
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#DC3545' }}>{stats.needReview}</div>
              <div className="stat-label">🔍 待复核</div>
            </div>
          )}
          {stats.duplicates > 0 && (
            <div className="stat-card">
              <div className="stat-value" style={{ color: '#FFC107' }}>{stats.duplicates}</div>
              <div className="stat-label">🔁 重复扫码</div>
            </div>
          )}
        </div>

        <div className="tabs">
          <button className={`tab ${activeTab === 'scan' ? 'active' : ''}`} onClick={() => setActiveTab('scan')}>
            📱 扫码录入
          </button>
          <button className={`tab ${activeTab === 'sorting' ? 'active' : ''}`} onClick={() => setActiveTab('sorting')}>
            📦 分拣管理
          </button>
          <button className={`tab ${activeTab === 'handover' ? 'active' : ''}`} onClick={() => setActiveTab('handover')}>
            📋 交接清单
          </button>
          <button className={`tab ${activeTab === 'export' ? 'active' : ''}`} onClick={() => setActiveTab('export')}>
            📤 导出记录
          </button>
          <button className={`tab ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>
            🔍 异常复核
          </button>
        </div>

        {activeTab === 'scan' && (
          <div className="scan-section">
            <div>
              <div className="card">
                <h3 className="card-title">📱 扫码录入</h3>
                <form onSubmit={handleScan}>
                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">物品条码</label>
                    <div className="scan-input-wrapper">
                      <input
                        type="text"
                        className="form-input scan-input"
                        value={barcodeInput}
                        onChange={e => setBarcodeInput(e.target.value)}
                        placeholder="扫描或输入条码..."
                        autoFocus
                        data-testid="barcode-input"
                      />
                      <span className="scan-icon">📷</span>
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">物品类别</label>
                    <select
                      className="form-select"
                      value={selectedCategory}
                      onChange={e => setSelectedCategory(e.target.value)}
                      data-testid="category-select"
                    >
                      <option value="">请选择类别</option>
                      {CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">成色评估</label>
                    <div className="condition-selector" data-testid="condition-selector">
                      {CONDITIONS.map(cond => (
                        <button
                          key={cond.value}
                          type="button"
                          className={`condition-btn ${selectedCondition === cond.value ? 'selected' : ''}`}
                          onClick={() => setSelectedCondition(cond.value)}
                          data-testid={`condition-${cond.value}`}
                        >
                          <span className="condition-icon">{cond.icon}</span>
                          <span className="condition-label">{cond.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">去向标签（适配机构）</label>
                    <div className="tag-group">
                      {ORG_TYPES.map(org => {
                        const testItem = { condition: selectedCondition || 'good' } as DonationItem
                        const validation = businessRules.canAssignToOrg(testItem, org.value)
                        const isDisabled = !validation.valid && selectedCondition !== null
                        return (
                          <span
                            key={org.value}
                            className={`tag ${selectedOrgs.includes(org.value) ? 'selected' : ''} ${isDisabled ? 'danger' : ''}`}
                            onClick={() => {
                              if (!validation.valid && !selectedOrgs.includes(org.value)) {
                                showAlert(validation.severity, validation.message)
                                return
                              }
                              setSelectedOrgs(prev => 
                                prev.includes(org.value) 
                                  ? prev.filter(o => o !== org.value)
                                  : [...prev, org.value]
                              )
                            }}
                            data-testid={`org-tag-${org.value}`}
                          >
                            {org.label}
                          </span>
                        )
                      })}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">限制标签</label>
                    <div className="tag-group">
                      {RESTRICTION_TAGS.map(tag => (
                        <span
                          key={tag}
                          className={`tag ${selectedTags.includes(tag) ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedTags(prev => 
                              prev.includes(tag) 
                                ? prev.filter(t => t !== tag)
                                : [...prev, tag]
                            )
                            if (tag === '高价值') {
                              setIsHighValue(prev => !prev)
                            }
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 20 }}>
                    <label className="form-label">备注</label>
                    <textarea
                      className="form-textarea"
                      value={itemNotes}
                      onChange={e => setItemNotes(e.target.value)}
                      placeholder="输入备注信息..."
                    />
                  </div>

                  <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', fontSize: 16 }} data-testid="submit-btn">
                    ➕ 添加物品
                  </button>
                </form>
              </div>
            </div>

            <div>
              <div className="card">
                <h3 className="card-title">🗃️ 分拣箱快捷分配</h3>
                <div className="box-grid">
                  {sortingBoxes.map(box => (
                    <div
                      key={box.id}
                      className={`box-card ${selectedBox === box.id ? 'selected' : ''}`}
                      style={{ background: `${box.color}20`, color: box.color }}
                      onClick={() => setSelectedBox(prev => prev === box.id ? null : box.id)}
                    >
                      <div className="box-name">{box.name}</div>
                      <div className="box-count">{box.itemCount}</div>
                      <div className="box-label">件物品</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="card-title">📋 规则验证</h3>
                <div style={{ fontSize: 13, lineHeight: 2 }}>
                  <p>🚫 <strong>污损物品</strong> 不能分配给儿童机构</p>
                  <p>🔁 同一物品<strong>重复扫码</strong>要提示并定位原记录</p>
                  <p>🔍 <strong>高价值物品</strong>必须经过复核后才能交接</p>
                  <p>📝 已生成交接清单的物品<strong>不能修改成色</strong></p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'sorting' && (
          <div>
            <div className="card">
              <h3 className="card-title">📦 物品分拣管理</h3>
              {items.length === 0 ? (
                <p style={{ textAlign: 'center', padding: 40, color: 'var(--text-secondary)' }}>
                  暂无物品，请先扫码录入
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="item-list">
                    <thead>
                      <tr>
                        <th>条码</th>
                        <th>类别</th>
                        <th>成色</th>
                        <th>去向标签</th>
                        <th>分拣箱</th>
                        <th>状态</th>
                        <th>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map(item => (
                        <tr key={item.id} className={highlightedItemId === item.id ? 'highlight' : ''} data-testid={`item-row-${item.id}`}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{item.barcode}</td>
                          <td>{item.category}</td>
                          <td>
                            <span className={`badge badge-${item.condition}`}>
                              {CONDITIONS.find(c => c.value === item.condition)?.label}
                            </span>
                          </td>
                          <td>
                            <div className="tag-group">
                              {item.suitableOrgs.map(org => (
                                <span key={org} className="tag selected" style={{ padding: '2px 8px', fontSize: 11 }}>
                                  {ORG_TYPES.find(t => t.value === org)?.label}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <select
                              className="form-select"
                              style={{ padding: '6px 10px', fontSize: 12 }}
                              value={item.sortingBox || ''}
                              onChange={e => handleAssignBox(item.id, e.target.value)}
                            >
                              <option value="">未分配</option>
                              {sortingBoxes.map(box => (
                                <option key={box.id} value={box.id}>{box.name}</option>
                              ))}
                            </select>
                          </td>
                          <td>
                            <span className={`badge badge-${item.handoverStatus}`}>
                              {item.handoverStatus === 'pending' && '待处理'}
                              {item.handoverStatus === 'reviewing' && '待复核'}
                              {item.handoverStatus === 'ready' && '可交接'}
                              {item.handoverStatus === 'handed' && '已交接'}
                            </span>
                          </td>
                          <td>
                            <div className="btn-group">
                              {item.isHighValue && !item.isReviewed && (
                                <button className="btn btn-warning" style={{ padding: '6px 10px', fontSize: 12 }} onClick={() => handleReview(item)}>
                                  🔍 复核
                                </button>
                              )}
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '6px 10px', fontSize: 12 }}
                                onClick={() => setEditingItem(item)}
                              >
                                ✏️ 编辑
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'handover' && (
          <div>
            <div className="card">
              <h3 className="card-title">📋 交接清单管理</h3>
              <div className="btn-group" style={{ marginBottom: 20 }}>
                <button className="btn btn-primary" onClick={generateHandoverList}>
                  📦 生成交接清单
                </button>
                <button className="btn btn-secondary" onClick={() => exportData('csv')}>
                  📤 导出交接数据
                </button>
              </div>

              <h4 style={{ marginBottom: 12, color: 'var(--text-secondary)' }}>待交接物品</h4>
              {items.filter(i => i.handoverStatus !== 'handed').length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  所有物品已完成交接
                </p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table className="item-list">
                    <thead>
                      <tr>
                        <th>条码</th>
                        <th>类别</th>
                        <th>成色</th>
                        <th>适配机构</th>
                        <th>状态</th>
                        <th>高价值</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.filter(i => i.handoverStatus !== 'handed').map(item => (
                        <tr key={item.id}>
                          <td style={{ fontFamily: 'monospace' }}>{item.barcode}</td>
                          <td>{item.category}</td>
                          <td>
                            <span className={`badge badge-${item.condition}`}>
                              {CONDITIONS.find(c => c.value === item.condition)?.label}
                            </span>
                          </td>
                          <td>{item.suitableOrgs.map(o => ORG_TYPES.find(t => t.value === o)?.label).join(', ') || '未设置'}</td>
                          <td>
                            <span className={`badge badge-${item.handoverStatus}`}>
                              {item.handoverStatus === 'pending' && '待处理'}
                              {item.handoverStatus === 'reviewing' && '待复核'}
                              {item.handoverStatus === 'ready' && '可交接'}
                            </span>
                          </td>
                          <td>{item.isHighValue ? (item.isReviewed ? '✅ 已复核' : '⚠️ 待复核') : '否'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'export' && (
          <div>
            <div className="card">
              <h3 className="card-title">📤 导出记录</h3>
              <p style={{ marginBottom: 20, color: 'var(--text-secondary)' }}>
                当前共 {items.length} 条记录，{duplicateScans.length} 条重复扫码记录
              </p>
              <div className="btn-group">
                <button className="btn btn-primary" onClick={() => exportData('json')}>
                  📄 导出 JSON
                </button>
                <button className="btn btn-primary" onClick={() => exportData('csv')}>
                  📊 导出 CSV
                </button>
              </div>
            </div>

            {duplicateScans.length > 0 && (
              <div className="card">
                <h3 className="card-title">🔁 重复扫码记录</h3>
                <div style={{ overflowX: 'auto' }}>
                  <table className="item-list">
                    <thead>
                      <tr>
                        <th>条码</th>
                        <th>重复次数</th>
                        <th>最近扫描时间</th>
                      </tr>
                    </thead>
                    <tbody>
                      {duplicateScans.map(scan => (
                        <tr key={scan.barcode}>
                          <td style={{ fontFamily: 'monospace', fontWeight: 500 }}>{scan.barcode}</td>
                          <td><span className="badge badge-poor">{scan.count} 次</span></td>
                          <td>{new Date(scan.scannedAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'review' && (
          <div>
            <div className="card">
              <h3 className="card-title">🔍 异常复核</h3>
              
              <h4 style={{ marginBottom: 12 }}>⏳ 待复核物品（高价值）</h4>
              {items.filter(i => i.isHighValue && !i.isReviewed).length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  暂无待复核物品
                </p>
              ) : (
                items.filter(i => i.isHighValue && !i.isReviewed).map(item => (
                  <div key={item.id} className="review-item">
                    <div className="review-info">
                      <div className="review-title">
                        {item.barcode} - {item.category}
                      </div>
                      <div className="review-desc">
                        成色: {CONDITIONS.find(c => c.value === item.condition)?.label} | 
                        标签: {item.restrictionTags.join(', ') || '无'}
                      </div>
                    </div>
                    <button className="btn btn-success" onClick={() => handleReview(item)}>
                      ✅ 通过复核
                    </button>
                  </div>
                ))
              )}

              <h4 style={{ margin: '24px 0 12px' }}>⚠️ 成色异常物品</h4>
              {items.filter(i => i.condition === 'damaged' || i.condition === 'poor').length === 0 ? (
                <p style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)' }}>
                  暂无成色异常物品
                </p>
              ) : (
                items.filter(i => i.condition === 'damaged' || i.condition === 'poor').map(item => (
                  <div key={item.id} className="review-item" style={{ background: '#FFF8E1' }}>
                    <div className="review-info">
                      <div className="review-title">
                        {item.barcode} - {item.category}
                        <span className={`badge badge-${item.condition}`} style={{ marginLeft: 8 }}>
                          {CONDITIONS.find(c => c.value === item.condition)?.label}
                        </span>
                      </div>
                      <div className="review-desc">
                        适配机构: {item.suitableOrgs.map(o => ORG_TYPES.find(t => t.value === o)?.label).join(', ') || '未设置'}
                      </div>
                    </div>
                    <div className="btn-group">
                      {!item.suitableOrgs.includes('children') && item.condition !== 'damaged' && (
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleOrgToggle(item.id, 'children')}
                          data-testid={`assign-children-${item.id}`}
                        >
                          👶 分配儿童机构
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </main>

      {showReviewModal && reviewItem && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">🔍 物品复核</h3>
            <div style={{ marginBottom: 16 }}>
              <p><strong>条码:</strong> {reviewItem.barcode}</p>
              <p><strong>类别:</strong> {reviewItem.category}</p>
              <p><strong>成色:</strong> {CONDITIONS.find(c => c.value === reviewItem.condition)?.label}</p>
              <p><strong>限制标签:</strong> {reviewItem.restrictionTags.join(', ') || '无'}</p>
              <p><strong>备注:</strong> {reviewItem.notes || '无'}</p>
            </div>
            <div className="alert alert-info">
              <span className="alert-icon">ℹ️</span>
              <span>高价值物品需要确认无误后才能进入交接流程</span>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>
                取消
              </button>
              <button className="btn btn-success" onClick={confirmReview}>
                ✅ 确认通过
              </button>
            </div>
          </div>
        </div>
      )}

      {editingItem && (
        <div className="modal-overlay" onClick={() => setEditingItem(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3 className="modal-title">✏️ 编辑物品</h3>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">成色（已生成交接清单的物品不可修改）</label>
              <div className="condition-selector">
                {CONDITIONS.map(cond => (
                  <button
                    key={cond.value}
                    type="button"
                    className={`condition-btn ${editingItem.condition === cond.value ? 'selected' : ''}`}
                    onClick={() => {
                      const validation = businessRules.canModifyCondition(editingItem)
                      if (!validation.valid) {
                        showAlert(validation.severity, validation.message)
                        return
                      }
                      setEditingItem({ ...editingItem, condition: cond.value })
                    }}
                    disabled={!!editingItem.handoverListId}
                  >
                    <span className="condition-icon">{cond.icon}</span>
                    <span className="condition-label">{cond.label}</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="form-group" style={{ marginBottom: 16 }}>
              <label className="form-label">去向标签</label>
              <div className="tag-group">
                {ORG_TYPES.map(org => {
                  const validation = businessRules.canAssignToOrg(editingItem, org.value)
                  const isDisabled = !validation.valid
                  return (
                    <span
                      key={org.value}
                      className={`tag ${editingItem.suitableOrgs.includes(org.value) ? 'selected' : ''} ${isDisabled ? 'danger' : ''}`}
                      onClick={() => {
                        if (!validation.valid && !editingItem.suitableOrgs.includes(org.value)) {
                          showAlert(validation.severity, validation.message)
                          return
                        }
                        setEditingItem({
                          ...editingItem,
                          suitableOrgs: editingItem.suitableOrgs.includes(org.value)
                            ? editingItem.suitableOrgs.filter(o => o !== org.value)
                            : [...editingItem.suitableOrgs, org.value]
                        })
                      }}
                      data-testid={`edit-org-${org.value}`}
                    >
                      {org.label}
                    </span>
                  )
                })}
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setEditingItem(null)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={() => {
                storage.updateItem(editingItem.id, {
                  condition: editingItem.condition,
                  suitableOrgs: editingItem.suitableOrgs
                })
                loadData()
                setEditingItem(null)
                showAlert('success', '修改成功')
              }}>
                保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
