import type { DonationItem, DuplicateScanRecord, HandoverList, SortingBox } from './types'

const STORAGE_KEYS = {
  ITEMS: 'donation_items',
  HANDOVER_LISTS: 'handover_lists',
  DUPLICATE_SCANS: 'duplicate_scans',
  SORTING_BOXES: 'sorting_boxes'
}

export const storage = {
  getItems(): DonationItem[] {
    const data = localStorage.getItem(STORAGE_KEYS.ITEMS)
    return data ? JSON.parse(data) : []
  },

  saveItems(items: DonationItem[]): void {
    localStorage.setItem(STORAGE_KEYS.ITEMS, JSON.stringify(items))
  },

  getItemByBarcode(barcode: string): DonationItem | undefined {
    return this.getItems().find(item => item.barcode === barcode)
  },

  getItemById(id: string): DonationItem | undefined {
    return this.getItems().find(item => item.id === id)
  },

  addItem(item: DonationItem): void {
    const items = this.getItems()
    items.push(item)
    this.saveItems(items)
  },

  updateItem(id: string, updates: Partial<DonationItem>): void {
    const items = this.getItems()
    const index = items.findIndex(item => item.id === id)
    if (index !== -1) {
      items[index] = { ...items[index], ...updates, updatedAt: Date.now() }
      this.saveItems(items)
    }
  },

  getHandoverLists(): HandoverList[] {
    const data = localStorage.getItem(STORAGE_KEYS.HANDOVER_LISTS)
    return data ? JSON.parse(data) : []
  },

  saveHandoverList(list: HandoverList): void {
    const lists = this.getHandoverLists()
    const existing = lists.find(l => l.id === list.id)
    if (existing) {
      const index = lists.findIndex(l => l.id === list.id)
      lists[index] = list
    } else {
      lists.push(list)
    }
    localStorage.setItem(STORAGE_KEYS.HANDOVER_LISTS, JSON.stringify(lists))
  },

  getDuplicateScans(): DuplicateScanRecord[] {
    const data = localStorage.getItem(STORAGE_KEYS.DUPLICATE_SCANS)
    return data ? JSON.parse(data) : []
  },

  addDuplicateScan(barcode: string, originalItemId: string): void {
    const scans = this.getDuplicateScans()
    const existing = scans.find(s => s.barcode === barcode)
    if (existing) {
      existing.count++
      existing.scannedAt = Date.now()
    } else {
      scans.push({ barcode, originalItemId, scannedAt: Date.now(), count: 1 })
    }
    localStorage.setItem(STORAGE_KEYS.DUPLICATE_SCANS, JSON.stringify(scans))
  },

  getSortingBoxes(): SortingBox[] {
    const data = localStorage.getItem(STORAGE_KEYS.SORTING_BOXES)
    if (data) return JSON.parse(data)
    const defaultBoxes: SortingBox[] = [
      { id: 'box1', name: '儿童机构箱', color: '#FF6B9D', orgType: 'children', itemCount: 0 },
      { id: 'box2', name: '老人机构箱', color: '#4ECDC4', orgType: 'elderly', itemCount: 0 },
      { id: 'box3', name: '综合机构箱', color: '#45B7D1', orgType: 'general', itemCount: 0 },
      { id: 'box4', name: '灾区物资箱', color: '#FFA07A', orgType: 'disaster', itemCount: 0 },
      { id: 'box5', name: '待复核箱', color: '#9B59B6', orgType: 'mixed', itemCount: 0 }
    ]
    localStorage.setItem(STORAGE_KEYS.SORTING_BOXES, JSON.stringify(defaultBoxes))
    return defaultBoxes
  },

  updateSortingBoxItemCount(boxId: string, delta: number): void {
    const boxes = this.getSortingBoxes()
    const box = boxes.find(b => b.id === boxId)
    if (box) {
      box.itemCount = Math.max(0, box.itemCount + delta)
      localStorage.setItem(STORAGE_KEYS.SORTING_BOXES, JSON.stringify(boxes))
    }
  },

  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key))
  }
}
