import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '@/theme';

export type GlyphName =
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'chevron-right'
  | 'chevron-down'
  | 'chevron-left'
  | 'check'
  | 'close'
  | 'plus'
  | 'minus'
  | 'camera'
  | 'barcode'
  | 'home'
  | 'grid'
  | 'message'
  | 'chart'
  | 'face'
  | 'heart'
  | 'heart-filled'
  | 'search'
  | 'filter'
  | 'sparkle'
  | 'bell'
  | 'dot';

export interface GlyphProps {
  name: GlyphName;
  size?: number;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

/**
 * Lightweight geometric glyphs built from Views. Keeps the bundle free of an
 * icon library while staying sharp at any size.
 */
export function Glyph({
  name,
  size = 24,
  color = colors.textPrimary,
  style,
}: GlyphProps) {
  const s = size;
  const stroke = Math.max(1.5, Math.round(s * 0.08));

  switch (name) {
    case 'arrow-right':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.7,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              alignSelf: 'center',
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.1,
              top: s * 0.28,
              width: s * 0.4,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.1,
              bottom: s * 0.28,
              width: s * 0.4,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'arrow-left':
      return (
        <View
          style={[
            { width: s, height: s, justifyContent: 'center', transform: [{ scaleX: -1 }] },
            style,
          ]}
        >
          <Glyph name="arrow-right" size={s} color={color} />
        </View>
      );

    case 'arrow-up':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center' }, style]}>
          <View
            style={{
              width: stroke,
              height: s * 0.7,
              backgroundColor: color,
              borderRadius: stroke,
              position: 'absolute',
              top: s * 0.15,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.15,
              left: s * 0.28,
              width: s * 0.4,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '-45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.15,
              right: s * 0.28,
              width: s * 0.4,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'chevron-right':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'center' }, style]}>
          <View
            style={{
              position: 'absolute',
              left: s * 0.3,
              top: s * 0.2,
              width: s * 0.42,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.3,
              bottom: s * 0.2,
              width: s * 0.42,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'chevron-left':
      return (
        <View
          style={[
            { width: s, height: s, transform: [{ scaleX: -1 }] },
            style,
          ]}
        >
          <Glyph name="chevron-right" size={s} color={color} />
        </View>
      );

    case 'chevron-down':
      return (
        <View style={[{ width: s, height: s }, style]}>
          <View
            style={{
              position: 'absolute',
              left: s * 0.2,
              top: s * 0.35,
              width: s * 0.42,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.2,
              top: s * 0.35,
              width: s * 0.42,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'check':
      return (
        <View style={[{ width: s, height: s }, style]}>
          <View
            style={{
              position: 'absolute',
              left: s * 0.15,
              top: s * 0.45,
              width: s * 0.3,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              left: s * 0.3,
              top: s * 0.45,
              width: s * 0.55,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'close':
      return (
        <View style={[{ width: s, height: s }, style]}>
          <View
            style={{
              position: 'absolute',
              top: (s - stroke) / 2,
              left: s * 0.15,
              right: s * 0.15,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: (s - stroke) / 2,
              left: s * 0.15,
              right: s * 0.15,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'plus':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View style={{ position: 'absolute', width: s * 0.7, height: stroke, backgroundColor: color, borderRadius: stroke }} />
          <View style={{ position: 'absolute', height: s * 0.7, width: stroke, backgroundColor: color, borderRadius: stroke }} />
        </View>
      );

    case 'minus':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View style={{ width: s * 0.7, height: stroke, backgroundColor: color, borderRadius: stroke }} />
        </View>
      );

    case 'camera':
      return (
        <View
          style={[
            {
              width: s,
              height: s * 0.82,
              borderRadius: s * 0.12,
              borderWidth: stroke,
              borderColor: color,
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: s * 0.08,
            },
            style,
          ]}
        >
          <View
            style={{
              position: 'absolute',
              top: -stroke - 2,
              width: s * 0.35,
              height: s * 0.15,
              borderTopLeftRadius: s * 0.08,
              borderTopRightRadius: s * 0.08,
              borderWidth: stroke,
              borderColor: color,
              borderBottomWidth: 0,
            }}
          />
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderRadius: s * 0.19,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
        </View>
      );

    case 'barcode':
      return (
        <View style={[{ width: s, height: s, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: s * 0.1 }, style]}>
          {[2, 1, 3, 1, 2, 1, 3].map((w, i) => (
            <View
              key={i}
              style={{
                width: w,
                height: s * 0.7,
                backgroundColor: color,
                borderRadius: 1,
              }}
            />
          ))}
        </View>
      );

    case 'home':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.6,
              height: s * 0.6,
              borderRadius: s * 0.12,
              borderWidth: stroke,
              borderColor: color,
              marginTop: s * 0.25,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.05,
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.4,
              borderRightWidth: s * 0.4,
              borderBottomWidth: s * 0.3,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderBottomColor: color,
            }}
          />
        </View>
      );

    case 'grid':
      return (
        <View style={[{ width: s, height: s, flexDirection: 'row', flexWrap: 'wrap', padding: s * 0.1 }, style]}>
          {[0, 1, 2, 3].map((i) => (
            <View
              key={i}
              style={{
                width: s * 0.32,
                height: s * 0.32,
                margin: s * 0.04,
                borderRadius: s * 0.06,
                borderWidth: stroke,
                borderColor: color,
              }}
            />
          ))}
        </View>
      );

    case 'message':
      return (
        <View style={[{ width: s, height: s }, style]}>
          <View
            style={{
              width: s * 0.88,
              height: s * 0.72,
              borderRadius: s * 0.18,
              borderWidth: stroke,
              borderColor: color,
              marginLeft: s * 0.06,
              marginTop: s * 0.06,
            }}
          />
          <View
            style={{
              position: 'absolute',
              bottom: s * 0.05,
              left: s * 0.25,
              width: 0,
              height: 0,
              borderLeftWidth: s * 0.1,
              borderRightWidth: s * 0.1,
              borderTopWidth: s * 0.15,
              borderLeftColor: 'transparent',
              borderRightColor: 'transparent',
              borderTopColor: color,
            }}
          />
        </View>
      );

    case 'chart':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'flex-end' }, style]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: s * 0.75 }}>
            {[0.4, 0.65, 0.9, 0.55, 0.8].map((h, i) => (
              <View
                key={i}
                style={{
                  width: s * 0.12,
                  height: s * h,
                  borderRadius: stroke,
                  backgroundColor: color,
                }}
              />
            ))}
          </View>
        </View>
      );

    case 'face':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.75,
              height: s * 0.95,
              borderRadius: s * 0.4,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.4,
              left: s * 0.33,
              width: stroke * 1.5,
              height: stroke * 1.5,
              borderRadius: stroke,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.4,
              right: s * 0.33,
              width: stroke * 1.5,
              height: stroke * 1.5,
              borderRadius: stroke,
              backgroundColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              top: s * 0.62,
              width: s * 0.3,
              height: stroke,
              borderRadius: stroke,
              backgroundColor: color,
            }}
          />
        </View>
      );

    case 'heart':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderTopLeftRadius: s * 0.2,
              borderTopRightRadius: s * 0.2,
              borderWidth: stroke,
              borderColor: color,
              borderBottomWidth: 0,
              position: 'absolute',
              left: s * 0.12,
              top: s * 0.18,
              transform: [{ rotate: '-45deg' }],
            }}
          />
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderTopLeftRadius: s * 0.2,
              borderTopRightRadius: s * 0.2,
              borderWidth: stroke,
              borderColor: color,
              borderBottomWidth: 0,
              position: 'absolute',
              right: s * 0.12,
              top: s * 0.18,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'heart-filled':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderTopLeftRadius: s * 0.2,
              borderTopRightRadius: s * 0.2,
              backgroundColor: color,
              position: 'absolute',
              left: s * 0.12,
              top: s * 0.18,
              transform: [{ rotate: '-45deg' }],
            }}
          />
          <View
            style={{
              width: s * 0.38,
              height: s * 0.38,
              borderTopLeftRadius: s * 0.2,
              borderTopRightRadius: s * 0.2,
              backgroundColor: color,
              position: 'absolute',
              right: s * 0.12,
              top: s * 0.18,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'search':
      return (
        <View style={[{ width: s, height: s }, style]}>
          <View
            style={{
              position: 'absolute',
              top: s * 0.1,
              left: s * 0.1,
              width: s * 0.55,
              height: s * 0.55,
              borderRadius: s * 0.28,
              borderWidth: stroke,
              borderColor: color,
            }}
          />
          <View
            style={{
              position: 'absolute',
              right: s * 0.1,
              bottom: s * 0.12,
              width: s * 0.22,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              transform: [{ rotate: '45deg' }],
            }}
          />
        </View>
      );

    case 'filter':
      return (
        <View style={[{ width: s, height: s, justifyContent: 'space-around', paddingVertical: s * 0.15 }, style]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: stroke, backgroundColor: color, borderRadius: stroke }} />
            <View style={{ width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color, marginLeft: s * 0.04 }} />
            <View style={{ width: s * 0.15, height: stroke, backgroundColor: color, borderRadius: stroke, marginLeft: s * 0.04 }} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ width: s * 0.2, height: stroke, backgroundColor: color, borderRadius: stroke }} />
            <View style={{ width: s * 0.2, height: s * 0.2, borderRadius: s * 0.1, backgroundColor: color, marginLeft: s * 0.04 }} />
            <View style={{ flex: 1, height: stroke, backgroundColor: color, borderRadius: stroke, marginLeft: s * 0.04 }} />
          </View>
        </View>
      );

    case 'sparkle':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center', justifyContent: 'center' }, style]}>
          <View
            style={{
              position: 'absolute',
              width: s * 0.2,
              height: s * 0.9,
              borderRadius: s * 0.1,
              backgroundColor: color,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: s * 0.2,
              height: s * 0.9,
              borderRadius: s * 0.1,
              backgroundColor: color,
              transform: [{ rotate: '-45deg' }],
            }}
          />
        </View>
      );

    case 'bell':
      return (
        <View style={[{ width: s, height: s, alignItems: 'center' }, style]}>
          <View
            style={{
              width: s * 0.7,
              height: s * 0.7,
              borderTopLeftRadius: s * 0.4,
              borderTopRightRadius: s * 0.4,
              borderWidth: stroke,
              borderColor: color,
              borderBottomWidth: 0,
              marginTop: s * 0.1,
            }}
          />
          <View
            style={{
              width: s * 0.85,
              height: stroke,
              backgroundColor: color,
              borderRadius: stroke,
              marginTop: -stroke / 2,
            }}
          />
          <View
            style={{
              width: s * 0.18,
              height: s * 0.12,
              borderBottomLeftRadius: s * 0.12,
              borderBottomRightRadius: s * 0.12,
              backgroundColor: color,
              marginTop: 2,
            }}
          />
        </View>
      );

    case 'dot':
      return (
        <View
          style={[
            {
              width: s,
              height: s,
              borderRadius: s / 2,
              backgroundColor: color,
            },
            style,
          ]}
        />
      );

    default:
      return <View style={[{ width: s, height: s }, style]} />;
  }
}

export const glyphStyles = StyleSheet.create({ _: {} });
