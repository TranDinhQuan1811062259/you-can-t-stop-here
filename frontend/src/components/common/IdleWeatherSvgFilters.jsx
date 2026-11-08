import React from 'react';

export const IdleWeatherSvgFilters = () => {
  return (
    <svg
      id="idle-weather-svg-filters"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        {/* Filter làm méo & tan chảy lượn sóng cho Mùa Hạ */}
        <filter id="summer-melt-filter-mild">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.08" numOctaves="2" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="4" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="summer-melt-filter-medium">
          <feTurbulence type="fractalNoise" baseFrequency="0.03 0.12" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="8" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        <filter id="summer-melt-filter-heavy">
          <feTurbulence type="fractalNoise" baseFrequency="0.04 0.18" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>

        {/* Filter sương tuyết băng giá cho Mùa Đông */}
        <filter id="winter-frost-filter">
          <feTurbulence type="fractalNoise" baseFrequency="0.05 0.05" numOctaves="2" result="frostNoise" />
          <feColorMatrix type="matrix" values="0 0 0 0 0.8  0 0 0 0 0.95  0 0 0 0 1  0 0 0 1 0" result="frostColor" />
          <feBlend in="SourceGraphic" in2="frostColor" mode="screen" />
        </filter>
      </defs>
    </svg>
  );
};
