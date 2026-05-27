/**
 * Image render transform — maps normalized image coordinates (0..1
 * against the captured photo) onto rendered screen coordinates after
 * aspect-fit / aspect-fill cropping has been applied to the photo.
 *
 * All overlay regions in the scan-results flow are authored in
 * normalized image space (the AI returns coordinates that way; the
 * landmark layer normalizes them the same way). This module is the
 * single boundary between those normalized coordinates and the pixels
 * that actually render on the device — so the overlay never drifts.
 */

import type {
  ImageRenderTransform,
  NormalizedPoint,
  NormalizedRect,
} from '@/types/scanResults';

export interface BuildTransformArgs {
  sourceWidth: number;
  sourceHeight: number;
  renderedWidth: number;
  renderedHeight: number;
  /** 'cover' = aspect-fill (default for photo frames). 'contain' =
   *  aspect-fit. */
  resizeMode?: 'cover' | 'contain';
  mirrored?: boolean;
}

/**
 * Build an `ImageRenderTransform` for the given source image rendered
 * into a frame of (renderedWidth × renderedHeight). The transform
 * accounts for letterboxing (`contain`) and edge-cropping (`cover`).
 */
export function buildImageRenderTransform(
  args: BuildTransformArgs
): ImageRenderTransform {
  const {
    sourceWidth,
    sourceHeight,
    renderedWidth,
    renderedHeight,
    resizeMode = 'cover',
    mirrored = false,
  } = args;

  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return {
      sourceWidth: 1,
      sourceHeight: 1,
      renderedWidth,
      renderedHeight,
      offsetX: 0,
      offsetY: 0,
      scale: 1,
      mirrored,
    };
  }

  const scaleX = renderedWidth / sourceWidth;
  const scaleY = renderedHeight / sourceHeight;
  const scale =
    resizeMode === 'cover' ? Math.max(scaleX, scaleY) : Math.min(scaleX, scaleY);

  const drawnWidth = sourceWidth * scale;
  const drawnHeight = sourceHeight * scale;
  const offsetX = (renderedWidth - drawnWidth) / 2;
  const offsetY = (renderedHeight - drawnHeight) / 2;

  return {
    sourceWidth,
    sourceHeight,
    renderedWidth,
    renderedHeight,
    offsetX,
    offsetY,
    scale,
    mirrored,
  };
}

/**
 * Map a normalized point (each axis in [0, 1] against the source image)
 * onto rendered screen coordinates.
 */
export function mapNormalizedPointToRenderedImage(
  point: NormalizedPoint,
  transform: ImageRenderTransform
): { x: number; y: number } {
  const localX = point.x * transform.sourceWidth;
  const localY = point.y * transform.sourceHeight;
  const renderedX = localX * transform.scale + transform.offsetX;
  const renderedY = localY * transform.scale + transform.offsetY;

  if (transform.mirrored) {
    return {
      x: transform.renderedWidth - renderedX,
      y: renderedY,
    };
  }
  return { x: renderedX, y: renderedY };
}

/**
 * Map a normalized rectangle onto rendered screen coordinates.
 */
export function mapNormalizedRectToRenderedImage(
  rect: NormalizedRect,
  transform: ImageRenderTransform
): { x: number; y: number; width: number; height: number } {
  const topLeft = mapNormalizedPointToRenderedImage(
    { x: rect.x, y: rect.y },
    transform
  );
  const bottomRight = mapNormalizedPointToRenderedImage(
    { x: rect.x + rect.width, y: rect.y + rect.height },
    transform
  );
  const x = Math.min(topLeft.x, bottomRight.x);
  const y = Math.min(topLeft.y, bottomRight.y);
  return {
    x,
    y,
    width: Math.abs(bottomRight.x - topLeft.x),
    height: Math.abs(bottomRight.y - topLeft.y),
  };
}

/**
 * Clamp a normalized point inside [0, 1] on both axes.
 */
export function clampNormalizedPoint(p: NormalizedPoint): NormalizedPoint {
  return {
    x: Math.max(0, Math.min(1, p.x)),
    y: Math.max(0, Math.min(1, p.y)),
  };
}
