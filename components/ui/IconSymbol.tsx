// This file is a fallback for using Ionicons on Android and web.

import Ionicons from '@expo/vector-icons/Ionicons';
import React from 'react';
import { OpaqueColorValue, StyleProp, ViewStyle } from 'react-native';
import CourtIconSvg from './CourtIconSvg';

type IconMapping = {
  type: 'ionicon' | 'custom';
  icon: React.ComponentProps<typeof Ionicons>['name'] | React.ComponentType<any>;
};

const MAPPING: Record<string, IconMapping> = {
  'arrow.right.circle.fill': { type: 'ionicon', icon: 'arrow-forward-circle' },
  'chevron.right': { type: 'ionicon', icon: 'chevron-forward' },
  'sportscourt.fill': { type: 'custom', icon: CourtIconSvg },
  'person.3.fill': { type: 'ionicon', icon: 'people' },
  'gear': { type: 'ionicon', icon: 'settings' },
} as const;

export type IconSymbolName = keyof typeof MAPPING;

/**
 * An icon component that uses native SFSymbols on iOS, and Ionicons on Android and web. This ensures a consistent look across platforms, and optimal resource usage.
 *
 * Icon `name`s are based on SFSymbols and require manual mapping to Ionicons.
 */
export function IconSymbol({
  name,
  size = 24,
  color,
  style,
}: {
  name: IconSymbolName;
  size?: number;
  color: string | OpaqueColorValue;
  style?: StyleProp<ViewStyle>;
}) {
  const mapping = MAPPING[name];
  
  if (!mapping) {
    console.warn(`No mapping found for icon: ${name}`);
    return null;
  }

  if (mapping.type === 'custom') {
    const CustomIcon = mapping.icon as React.ComponentType<any>;
    return <CustomIcon width={size} height={size} fill={color} style={style} />;
  }

  return <Ionicons 
    name={mapping.icon as React.ComponentProps<typeof Ionicons>['name']} 
    size={size} 
    color={color} 
    style={style}
  />;
}
