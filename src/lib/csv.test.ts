import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('quotes cells with commas, quotes or newlines and starts with a BOM for Excel', () => {
    expect(toCsv([['a', 'b,c'], ['say "hi"', 'two\nlines']])).toBe('﻿a,"b,c"\r\n"say ""hi""","two\nlines"')
  })
})
