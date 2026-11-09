import React from 'react';

export const IdleWeatherSvgFilters = () => {
  return (
    <svg
      id="idle-weather-svg-filters"
      style={{ position: 'absolute', width: 0, height: 0, pointerEvents: 'none' }}
      aria-hidden="true"
    >
      <defs>
        {/* Filter ánh nắng mùa hè ấm áp, dịu nhẹ không làm biến dạng chữ */}
        <filter id="summer-melt-filter-mild">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="summer-melt-filter-medium">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="summer-melt-filter-heavy">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.8" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  );
};
