import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface DentalArchIconProps {
  size?: number;
  color?: string;
}

export const DentalArchIcon: React.FC<DentalArchIconProps> = ({ size = 24, color = '#000' }) => {
  // Dental arch from top-down view - U shape with bumpy teeth edges
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 21 C4 21 4 14 4 11 C4 5.5 7.5 3 12 3 C16.5 3 20 5.5 20 11 C20 14 20 21 20 21"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M8 20 C8 20 8 15 8 13 C8 9.5 9.5 8 12 8 C14.5 8 16 9.5 16 13 C16 15 16 20 16 20"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <Path
        d="M4 16 L8 16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M20 16 L16 16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M4 12 L8 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M20 12 L16 13"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M6 7 L9 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M18 7 L15 9"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
};
