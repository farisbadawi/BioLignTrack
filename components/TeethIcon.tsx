import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface TeethIconProps {
  size?: number;
  color?: string;
}

export const TeethIcon: React.FC<TeethIconProps> = ({ size = 24, color = '#000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Outer arch */}
      <Path
        d="M3 20 L3 11 C3 5 7 2 12 2 C17 2 21 5 21 11 L21 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Inner arch */}
      <Path
        d="M7 20 L7 12 C7 8 9 6 12 6 C15 6 17 8 17 12 L17 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Cross lines for teeth */}
      <Path
        d="M3 15 L7 15 M21 15 L17 15 M3 11 L7 12 M21 11 L17 12 M6 6 L9 8 M18 6 L15 8"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};
