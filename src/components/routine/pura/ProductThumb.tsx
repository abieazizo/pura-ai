/**
 * ProductThumb — small, real-data product visual.
 *
 * Renders the catalog packshot image when the step has a matched
 * product, or a neutral category-tinted fallback tile when no match
 * exists yet. No generated branding, no fake Pura bottles.
 */

import React from 'react';
import {
  Image,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  RadialGradient,
  Stop,
  Rect,
} from 'react-native-svg';
import { findShopProduct } from '@/screens/shop/shopCatalog';
import {
  puraRoutineColors as C,
  puraRoutineRadius as R,
} from '@/theme';
import type { RoutineProduct, RoutineStepType } from '@/types/routine';

const CATEGORY_BACKDROP: Record<RoutineStepType, string> = {
  cleanse: C.surfaceSoft,
  treat: C.coralWash,
  hydrate: C.sageWash,
  protect: C.amberWash,
};

interface ProductThumbProps {
  product?: RoutineProduct;
  /** Step type used to choose the neutral fallback color. */
  fallbackType: RoutineStepType;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function ProductThumb({
  product,
  fallbackType,
  size = 56,
  style,
}: ProductThumbProps) {
  const shopMatch = product ? findShopProduct(product.id) : undefined;

  if (shopMatch) {
    return (
      <View
        style={[
          styles.wrap,
          {
            width: size,
            height: size,
            backgroundColor: CATEGORY_BACKDROP[fallbackType],
            borderColor: C.line,
          },
          style,
        ]}
        accessibilityRole="image"
        accessibilityLabel={`${shopMatch.brand} ${shopMatch.name}`}
      >
        <Image
          source={shopMatch.catalogPackshot}
          style={styles.image}
          resizeMode="cover"
        />
      </View>
    );
  }

  const bg = CATEGORY_BACKDROP[fallbackType];
  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          backgroundColor: bg,
          borderColor: C.line,
        },
        style,
      ]}
      accessibilityRole="image"
      accessibilityLabel="Image unavailable"
    >
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient id="ft" cx="40%" cy="30%" rx="60%" ry="60%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity={0.65} />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={100} height={100} rx={18} ry={18} fill="url(#ft)" />
        <Circle
          cx={50}
          cy={50}
          r={18}
          fill="none"
          stroke={C.lineStrong}
          strokeWidth={1.2}
          strokeDasharray="3 4"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: R.productThumb,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
