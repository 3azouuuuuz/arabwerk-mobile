
import { CityCoordinates, Provider } from './types';

export const cityCoordsCache: { [key: string]: CityCoordinates } = {};

/**
 * Calculate distance between two geographic points using Haversine formula
 * @returns Distance in kilometers
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Get the first letter of a name for avatar placeholder
 */
export const getInitial = (name: string): string => {
  return name ? name.charAt(0).toUpperCase() : '?';
};

/**
 * Fetch coordinates for a city name using OpenStreetMap Nominatim
 */
export const fetchCoordsForCity = async (
  cityName: string
): Promise<CityCoordinates | null> => {
  if (!cityName) return null;

  if (cityCoordsCache[cityName]) {
    return cityCoordsCache[cityName];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        cityName
      )}&format=json&limit=1`
    );
    const data = await response.json();

    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lon: parseFloat(data[0].lon),
      };
      cityCoordsCache[cityName] = coords;
      return coords;
    }
    return null;
  } catch (error) {
    console.error('Error fetching coords:', error);
    return null;
  }
};

/**
 * Sort providers by plan (Pro first) and optionally by distance
 */
export const sortProviders = (
  providers: Provider[],
  sortByDistance: boolean = false,
  userCoords?: CityCoordinates | null
): Provider[] => {
  return [...providers].sort((a, b) => {
    // First priority: Pro plans
    const isAPro = a.provider_plan === 'Pro';
    const isBPro = b.provider_plan === 'Pro';

    if (isAPro && !isBPro) return -1;
    if (!isAPro && isBPro) return 1;

    // Second priority: Distance (if enabled and coords available)
    if (sortByDistance && userCoords) {
      const distA =
        a.latitude && a.longitude
          ? calculateDistance(
              userCoords.lat,
              userCoords.lon,
              parseFloat(a.latitude),
              parseFloat(a.longitude)
            )
          : Infinity;

      const distB =
        b.latitude && b.longitude
          ? calculateDistance(
              userCoords.lat,
              userCoords.lon,
              parseFloat(b.latitude),
              parseFloat(b.longitude)
            )
          : Infinity;

      return distA - distB;
    }

    return 0;
  });
};

/**
 * Filter providers by category and city
 */
export const filterProviders = (
  providers: Provider[],
  selectedCategory: string,
  city: string,
  selectedCityCoords: CityCoordinates | null
): Provider[] => {
  return providers.filter((provider) => {
    // Filter by category
    if (selectedCategory) {
      if (!provider.categories) return false;
      const cleanProviderCategories = provider.categories.map((cat) =>
        cat.trim()
      );
      if (!cleanProviderCategories.includes(selectedCategory.trim())) {
        return false;
      }
    }

    // Filter by city
    if (city) {
      const providerCityLower = (provider.city || '').toLowerCase();
      const searchCityLower = city.toLowerCase();

      // Check if city names match
      if (
        providerCityLower.includes(searchCityLower) ||
        searchCityLower.includes(providerCityLower)
      ) {
        return true;
      }

      // Check distance if coordinates available
      if (selectedCityCoords && provider.latitude && provider.longitude) {
        const distance = calculateDistance(
          selectedCityCoords.lat,
          selectedCityCoords.lon,
          parseFloat(provider.latitude),
          parseFloat(provider.longitude)
        );
        return distance <= Infinity; // You can adjust this threshold
      }

      return false;
    }

    return true;
  });
};