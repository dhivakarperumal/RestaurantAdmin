import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type AuthIconProps = {
  color: string;
  size?: number;
};

export function UserIcon({ color, size = 20 }: AuthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8" r="4" stroke={color} strokeWidth="1.8" />
      <Path
        d="M4 21a8 8 0 0 1 16 0"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function MailIcon({ color, size = 20 }: AuthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="5"
        width="18"
        height="14"
        rx="2.5"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="m4 7 8 6 8-6"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LockIcon({ color, size = 20 }: AuthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="4"
        y="10"
        width="16"
        height="11"
        rx="2.5"
        stroke={color}
        strokeWidth="1.8"
      />
      <Path
        d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function EyeIcon({ color, size = 20 }: AuthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M2.5 12s3.4-6 9.5-6 9.5 6 9.5 6-3.4 6-9.5 6-9.5-6-9.5-6Z"
        stroke={color}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <Circle cx="12" cy="12" r="2.5" stroke={color} strokeWidth="1.8" />
    </Svg>
  );
}

export function EyeOffIcon({ color, size = 20 }: AuthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 3l18 18M10.6 6.2A9.6 9.6 0 0 1 12 6c6.1 0 9.5 6 9.5 6a15 15 0 0 1-3 3.6M6.2 6.3C3.8 8 2.5 12 2.5 12s3.4 6 9.5 6c1 0 2-.2 2.8-.5M9.9 9.9a3 3 0 0 0 4.2 4.2"
        stroke={color}
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function LedgerIcon({ color, size = 28 }: AuthIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 3.5h10a2 2 0 0 1 2 2v15l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5v-15a2 2 0 0 1 2-2Z"
        stroke={color}
        strokeWidth="1.7"
        strokeLinejoin="round"
      />
      <Path
        d="M9 8h6M9 12h6M9 16h3"
        stroke={color}
        strokeWidth="1.7"
        strokeLinecap="round"
      />
    </Svg>
  );
}
