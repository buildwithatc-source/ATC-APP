import { describe, it, expect } from 'vitest'
import { groupByCategory } from './invoiceForm'

describe('groupByCategory', () => {
  it('merges interleaved same-category items into one group', () => {
    const items = [
      { category: 'Materials', description: 'Paint' },
      { category: 'Misc', description: 'X' },
      { category: 'Materials', description: 'Flooring' }
    ]
    const groups = groupByCategory(items)
    expect(groups.map((g) => g.category)).toEqual(['Materials', 'Misc'])
    expect(groups[0].items.map((i) => i.description)).toEqual(['Paint', 'Flooring'])
  })

  it('sinks uncategorized items to the end and treats blank/whitespace as none', () => {
    const items = [
      { category: '   ', description: 'loose' },
      { category: 'Materials', description: 'Paint' },
      { category: null, description: 'other' }
    ]
    const groups = groupByCategory(items)
    expect(groups.map((g) => g.category)).toEqual(['Materials', ''])
    expect(groups[1].items.map((i) => i.description)).toEqual(['loose', 'other'])
  })
})
