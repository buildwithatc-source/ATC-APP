import { describe, expect, it } from 'vitest'
import { isOverdue } from './invoiceStatus'

const TODAY = '2026-08-15'

describe('isOverdue', () => {
  it('is true for a sent invoice with a past due date', () => {
    expect(isOverdue({ status: 'sent', due_date: '2026-08-01' }, TODAY)).toBe(true)
  })
  it('is false for a sent invoice due today or later', () => {
    expect(isOverdue({ status: 'sent', due_date: TODAY }, TODAY)).toBe(false)
    expect(isOverdue({ status: 'sent', due_date: '2026-09-01' }, TODAY)).toBe(false)
  })
  it('is false when the invoice is not sent, regardless of date', () => {
    expect(isOverdue({ status: 'draft', due_date: '2026-08-01' }, TODAY)).toBe(false)
    expect(isOverdue({ status: 'paid', due_date: '2026-08-01' }, TODAY)).toBe(false)
    expect(isOverdue({ status: 'void', due_date: '2026-08-01' }, TODAY)).toBe(false)
  })
  it('is false when there is no due date', () => {
    expect(isOverdue({ status: 'sent', due_date: null }, TODAY)).toBe(false)
  })
})
