import Svg, { Path, Rect } from 'react-native-svg';

type AddCategoryIconProps = {
  color: string;
  size?: number;
};

function AddCategoryIcon({ color, size = 20 }: AddCategoryIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="3"
        y="3"
        width="8"
        height="8"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Rect
        x="13"
        y="3"
        width="8"
        height="8"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M7 15v6M4 18h6M17 15v6m-3-3h6"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export default AddCategoryIcon;
