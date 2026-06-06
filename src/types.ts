export type ItemCondition = 'new' | 'good' | 'fair' | 'poor' | 'damaged'

export type HandoverStatus = 'pending' | 'reviewing' | 'ready' | 'handed'

export type OrganizationType = 'children' | 'elderly' | 'general' | 'disaster'

export interface DonationItem {
  id: string
  barcode: string
  category: string
  condition: ItemCondition
  suitableOrgs: OrganizationType[]
  restrictionTags: string[]
  sortingBox: string | null
  handoverStatus: HandoverStatus
  isHighValue: boolean
  isReviewed: boolean
  handoverListId: string | null
  createdAt: number
  updatedAt: number
  notes: string
}

export interface HandoverList {
  id: string
  name: string
  organization: string
  orgType: OrganizationType
  itemIds: string[]
  createdAt: number
  createdBy: string
}

export interface DuplicateScanRecord {
  barcode: string
  originalItemId: string
  scannedAt: number
  count: number
}

export interface SortingBox {
  id: string
  name: string
  color: string
  orgType: OrganizationType | 'mixed'
  itemCount: number
}
