// @ts-nocheck
// Trimmed copy of uni-pjsk-viewer's `vendor/sekai-sus2img/ghostNote.ts`:
// only the marker render type is kept, because mmwViewer does not port the
// SUS conflict-audit feature that produces the markers.
import { Fraction } from './fraction'

export type CrashMarkerRender = {
  id: string
  diagnosticId: string
  bar: Fraction
  lane: number
  width: number
  label: string
  role: string
  color: string
  markerIndex: number
}
