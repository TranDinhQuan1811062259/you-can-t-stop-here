import { useState, useEffect } from 'react';
import { subscribeIdleWeather, getIdleWeatherState } from '../utils/idleWeatherEngine';

export const useIdleWeather = () => {
  const [weatherState, setWeatherState] = useState(() => getIdleWeatherState());

  useEffect(() => {
    const unsubscribe = subscribeIdleWeather((state) => {
      setWeatherState(state);
    });

    const handleSeasonChange = (e) => {
      setWeatherState((prev) => ({
        ...prev,
        seasonId: e.detail?.id || prev.seasonId,
      }));
    };

    window.addEventListener('freedom_season_changed', handleSeasonChange);

    return () => {
      unsubscribe();
      window.removeEventListener('freedom_season_changed', handleSeasonChange);
    };
  }, []);

  return weatherState;
};
