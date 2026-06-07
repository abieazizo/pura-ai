/**
 * ui — the canonical primitive set (Cycle 2 of the design elevation loop).
 *
 * Mature, token-driven building blocks the elevated screens (Cycles 3–20)
 * compose from: every one reads from the unified `ds` design system and shares
 * one press-feedback + haptic + motion language. Additive — existing bespoke
 * components keep working; new/reworked surfaces should reach for these first.
 */
export { PressableScale } from './PressableScale';
export type { PressableScaleProps } from './PressableScale';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Button } from './Button';
export type { ButtonProps } from './Button';

export { Pill } from './Pill';
export type { PillProps } from './Pill';

export { Badge } from './Badge';
export type { BadgeProps } from './Badge';

export { SectionHeader } from './SectionHeader';
export type { SectionHeaderProps } from './SectionHeader';

export { ListRow } from './ListRow';
export type { ListRowProps } from './ListRow';

export { Sheet } from './Sheet';
export type { SheetProps } from './Sheet';

// Skeletons (shipped v35) — re-exported so loading states pull from one place.
export {
  Skeleton,
  ProductCardSkeleton,
  HeroCardSkeleton,
  ConversationSkeleton,
  ProductDetailSkeleton,
  ScanCardSkeleton,
} from './Skeleton';
export type { SkeletonProps } from './Skeleton';
