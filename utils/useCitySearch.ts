import { useCallback, useRef, useState } from 'react';
import { ENV } from '../config/env';

export const useCitySearch = () => {
  const [city, setCity] = useState<string>('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const cityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handleCityInputChange = useCallback((text: string) => {
    setCity(text);
    setCitySuggestions([]);

    if (!text || text.trim().length < 3) {
      if (cityTimeoutRef.current) {
        clearTimeout(cityTimeoutRef.current);
        cityTimeoutRef.current = null;
      }
      return;
    }

    if (cityTimeoutRef.current) {
      clearTimeout(cityTimeoutRef.current);
    }

    cityTimeoutRef.current = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://api.geoapify.com/v1/geocode/autocomplete?text=${encodeURIComponent(
            text
          )}&type=city&filter=countrycode:de&limit=10&lang=en&apiKey=${ENV.GEOAPIFY_API_KEY}`
        );
        const data = await response.json();
        const cities =
          data?.features
            ?.map((f: any) => f?.properties?.city)
            .filter((c: string) => Boolean(c)) || [];
        const uniqueCities = Array.from(new Set(cities));
        setCitySuggestions(uniqueCities as string[]);
      } catch (error) {
        console.error('Error fetching city suggestions:', error);
        setCitySuggestions([]);
      }
    }, 500);
  }, []);

  const handleCitySelect = useCallback((selectedCity: string) => {
    setCity(selectedCity);
    setCitySuggestions([]);
    if (cityTimeoutRef.current) {
      clearTimeout(cityTimeoutRef.current);
      cityTimeoutRef.current = null;
    }
  }, []);

  return {
    city,
    citySuggestions,
    handleCityInputChange,
    handleCitySelect,
  };
};