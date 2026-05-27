/**
 * Plan-screen palette — wraps the global theme tokens with the
 * Today's-Plan color spec from the v23.4 product brief.
 *
 * Background: #F7F9FC      → palette.bg (close enough; bg is #F8FAFC)
 * Card:       #FFFFFF      → mapped here, not palette.bg
 * Primary:    #07111F      → palette.ink
 * Secondary:  #4D5B6D      → mapped here
 * Muted:      #8A97A8      → palette.inkTertiary (close)
 * Border:     #E3E8F0      → mapped here
 * Soft blue:  #EEF5FF      → mapped here (vs clayPaper #EEF4FF)
 * Primary blue: #2F6FEB    → mapped here (vs clay #2B7FFF)
 * Deep navy: #07111F       → palette.ink
 * Success:   #1F8A5B
 * Warning:   #B7791F
 * Soft red:  #C45252
 * SPF warm:  #FFF5DA
 *
 * Centralising these mappings here keeps the broader theme stable
 * while letting the Plan screens hit the brief's exact values.
 */

export const plan = {
  bg: '#F7F9FC',
  card: '#FFFFFF',
  ink: '#07111F',
  inkSecondary: '#4D5B6D',
  inkMuted: '#8A97A8',
  border: '#E3E8F0',
  softBlue: '#EEF5FF',
  brand: '#2F6FEB',
  navy: '#07111F',
  success: '#1F8A5B',
  successSoft: '#E3F4EB',
  warning: '#B7791F',
  warningSoft: '#FFF5DA',
  danger: '#C45252',
  spfWarm: '#FFF5DA',
} as const;
