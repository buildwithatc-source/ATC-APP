import { describe, expect, it } from 'vitest'
import {
  formatAmount2,
  formatPeso,
  formatTemplateDate,
  formatThousands,
  sanitizeNumericInput,
  toNumber,
  withMarkup
} from './format'

describe('formatPeso', () => {
  it('formats with peso sign, commas, and 2 decimals', () => {
    expect(formatPeso(1000)).toBe('₱1,000.00')
    expect(formatPeso(1234.5)).toBe('₱1,234.50')
  })
  it('renders negatives with a leading minus', () => {
    expect(formatPeso(-1234.5)).toBe('-₱1,234.50')
  })
  it('treats non-finite values as 0', () => {
    expect(formatPeso(NaN)).toBe('₱0.00')
    expect(formatPeso(Infinity)).toBe('₱0.00')
  })
})

describe('formatAmount2', () => {
  it('formats without a currency symbol', () => {
    expect(formatAmount2(1000)).toBe('1,000.00')
    expect(formatAmount2(0)).toBe('0.00')
  })
})

describe('withMarkup', () => {
  it('adds the markup percentage', () => {
    expect(withMarkup(100, 10)).toBeCloseTo(110)
    expect(withMarkup(200, 0)).toBe(200)
  })
})

describe('formatThousands', () => {
  it('groups the integer part with commas', () => {
    expect(formatThousands('1000')).toBe('1,000')
    expect(formatThousands('1234567')).toBe('1,234,567')
  })
  it('preserves a partial decimal being typed', () => {
    expect(formatThousands('1000.')).toBe('1,000.')
    expect(formatThousands('1000.5')).toBe('1,000.5')
  })
  it('handles negatives and empty input', () => {
    expect(formatThousands('-1000')).toBe('-1,000')
    expect(formatThousands('')).toBe('')
  })
})

describe('sanitizeNumericInput', () => {
  it('strips commas and non-numeric characters', () => {
    expect(sanitizeNumericInput('1,000')).toBe('1000')
    expect(sanitizeNumericInput('₱1,234.50')).toBe('1234.50')
  })
  it('keeps only the first decimal point', () => {
    expect(sanitizeNumericInput('1.2.3')).toBe('1.23')
  })
})

describe('toNumber', () => {
  it('parses numbers and comma-grouped strings', () => {
    expect(toNumber(42)).toBe(42)
    expect(toNumber('1,234.5')).toBe(1234.5)
  })
  it('returns 0 for junk or empty', () => {
    expect(toNumber('abc')).toBe(0)
    expect(toNumber(null)).toBe(0)
    expect(toNumber(undefined)).toBe(0)
  })
})

describe('formatTemplateDate', () => {
  it('reformats yyyy-mm-dd to mm-dd-yy', () => {
    expect(formatTemplateDate('2026-08-15')).toBe('08-15-26')
  })
  it('returns empty string for missing input', () => {
    expect(formatTemplateDate(null)).toBe('')
    expect(formatTemplateDate(undefined)).toBe('')
  })
})
