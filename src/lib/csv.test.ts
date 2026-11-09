import { describe, expect, it } from 'vitest'
import { csvDate, toCsv } from './csv'

describe('toCsv', () => {
  it('quotes cells with commas, quotes or newlines and starts with a BOM for Excel', () => {
    expect(toCsv([['a', 'b,c'], ['say "hi"', 'two\nlines']])).toBe('﻿a,"b,c"\r\n"say ""hi""","two\nlines"')
  })
})

describe('csvDate', () => {
  it('writes portal dates as YYYY-MM-DD and leaves placeholders alone', () => {
    expect(csvDate('6/5/2026')).toBe('2026-06-05')
    expect(csvDate('12/13/2026')).toBe('2026-12-13')
    expect(csvDate('TBD')).toBe('TBD')
    expect(csvDate(undefined)).toBe('')
  })
})
