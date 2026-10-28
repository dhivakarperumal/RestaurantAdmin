import React from 'react';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';

type IconProps = { color?: string; size?: number };

export function PrinterIcon({ color = '#64748B', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9V3h12v6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Rect x="6" y="14" width="12" height="7" rx="1" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function UsbIcon({ color = '#64748B', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 2v11M8 8l4-4 4 4" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M9 13H7a2 2 0 0 0-2 2v1a2 2 0 0 0 2 2h2M15 13h2a2 2 0 0 1 2 2v1a2 2 0 0 1-2 2h-2" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M12 18v4" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="21" r="1" fill={color} />
    </Svg>
  );
}

export function NetworkIcon({ color = '#64748B', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect x="2" y="2" width="6" height="5" rx="1" stroke={color} strokeWidth="2" />
      <Rect x="16" y="2" width="6" height="5" rx="1" stroke={color} strokeWidth="2" />
      <Rect x="9" y="17" width="6" height="5" rx="1" stroke={color} strokeWidth="2" />
      <Path d="M5 7v3h14V7M12 10v7" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
  );
}

export function WifiIcon({ color = '#64748B', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M5 12.55a11 11 0 0 1 14.08 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M1.42 9a16 16 0 0 1 21.16 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <Circle cx="12" cy="20" r="1" fill={color} />
    </Svg>
  );
}

export function BluetoothIcon({ color = '#3B82F6', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6.5 6.5 17.5 17.5 12 23V1l5.5 5.5-11 11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ArrowLeftIcon({ color = '#012711', size = 20 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 12H5M12 5l-7 7 7 7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronDownIcon({ color = '#6B7280', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function ChevronRightIcon({ color = '#9CA3AF', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M9 18l6-6-6-6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function SaveIcon({ color = '#FFFFFF', size = 18 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M17 21v-8H7v8M7 3v5h8" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function CheckIcon({ color = '#10B981', size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
