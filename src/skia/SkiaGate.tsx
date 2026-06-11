import React from 'react';
import { useSkiaReady } from './useSkiaReady';

/**
 * Progressive-enhancement boundary for the Skia GPU path.
 *
 * Renders `fallback` (the RN/SVG path) until CanvasKit is ready, then upgrades
 * to `children` (the real Skia render). On native this is `children` from the
 * first frame; on web it shows the SVG fallback for the brief window while
 * CanvasKit downloads, then swaps with no layout shift.
 *
 * This is NOT a downgrade: the SVG fallback is the already-shipping high-quality
 * path, and Skia takes over for true additive (BlendMode.Plus) compositing the
 * instant the GPU is available.
 */
export function SkiaGate({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback: React.ReactNode;
}) {
  const ready = useSkiaReady();
  return <>{ready ? children : fallback}</>;
}
