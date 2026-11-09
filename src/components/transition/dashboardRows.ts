import type { DashboardRow, TransitionData } from '../../data/transitionData'

// The Transition Dashboard as grid rows, with the slide's merged cells worked out: the Tower cell
// spans its tower's rows, and a Notes cell spans notesRowSpan rows (never past its tower).

export interface DashRow {
  id: string
  g: number
  i: number
  tower: string
  /** Rows in this tower (the Tower cell spans them). */
  groupSize: number
  /** >0 on the row whose Notes cell spans that many rows; 0 on rows covered by a span above. */
  notesSpan: number
  row: DashboardRow
}

export function flattenDashboard(groups: TransitionData['dashboard']): DashRow[] {
  return groups.flatMap((group, g) => {
    let covered = 0 // rows still hidden under a merged Notes cell
    return group.rows.map((row, i) => {
      let notesSpan = 0
      if (covered === 0) {
        notesSpan = Math.min(row.notesRowSpan ?? 1, group.rows.length - i)
        covered = notesSpan
      }
      covered--
      return { id: `${g}:${i}`, g, i, tower: group.tower, groupSize: group.rows.length, notesSpan, row }
    })
  })
}

