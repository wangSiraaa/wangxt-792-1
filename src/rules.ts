import type { DonationItem, OrganizationType } from './types'
import { storage } from './storage'

export interface ValidationResult {
  valid: boolean
  message: string
  severity: 'error' | 'warning' | 'info'
}

export const businessRules = {
  canAssignToOrg(item: DonationItem, orgType: OrganizationType): ValidationResult {
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

  checkDuplicateBarcode(barcode: string): { isDuplicate: boolean; item?: DonationItem } {
    const item = storage.getItemByBarcode(barcode)
    if (item) {
      return { isDuplicate: true, item }
    }
    return { isDuplicate: false }
  },

  canHandover(item: DonationItem): ValidationResult {
    if (item.isHighValue && !item.isReviewed) {
      return {
        valid: false,
        message: '高价值物品必须经过复核后才能交接',
        severity: 'error'
      }
    }
    return { valid: true, message: '', severity: 'info' }
  },

  canModifyCondition(item: DonationItem): ValidationResult {
    if (item.handoverListId) {
      return {
        valid: false,
        message: '已生成交接清单的物品不能修改成色',
        severity: 'error'
      }
    }
    return { valid: true, message: '', severity: 'info' }
  },

  validateItem(item: DonationItem): ValidationResult[] {
    const results: ValidationResult[] = []

    if (item.isHighValue && !item.isReviewed) {
      results.push({
        valid: false,
        message: '高价值物品需要复核',
        severity: 'warning'
      })
    }

    if (item.condition === 'damaged') {
      results.push({
        valid: false,
        message: '物品有污损，仅限特定机构',
        severity: 'warning'
      })
    }

    return results
  }
}

export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}
