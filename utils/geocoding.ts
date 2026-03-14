import { ENV } from '../config/env';
import { CityCoordinates } from './types';

/**
 * Get coordinates for a city name using Geoapify API
 */
export async function getCityCoordinates(cityName: string): Promise<CityCoordinates | null> {
  if (!cityName || cityName.trim() === '') {
    return null;
  }

  try {
    const url = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
      cityName
    )}&type=city&limit=1&apiKey=${ENV.GEOAPIFY_API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('Failed to fetch city coordinates for:', cityName);
      return null;
    }
    
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lon, lat] = data.features[0].geometry.coordinates;
      return { lat, lon };
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching coordinates for city:', cityName, error);
    return null;
  }
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in kilometers
 */
export function calculateDistance(
  coord1: CityCoordinates,
  coord2: CityCoordinates
): number {
  const R = 6371; // Earth's radius in kilometers
  
  const dLat = toRadians(coord2.lat - coord1.lat);
  const dLon = toRadians(coord2.lon - coord1.lon);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(coord1.lat)) *
      Math.cos(toRadians(coord2.lat)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal place
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Batch geocode multiple cities with caching to avoid rate limits
 */
export async function batchGeocodeCities(
  cities: string[],
  delayMs: number = 150
): Promise<Map<string, CityCoordinates | null>> {
  const results = new Map<string, CityCoordinates | null>();
  
  // Remove duplicates and empty values
  const uniqueCities = [...new Set(cities.filter(c => c && c.trim() !== ''))];
  
  console.log(`🌍 Geocoding ${uniqueCities.length} unique cities...`);
  
  for (let i = 0; i < uniqueCities.length; i++) {
    const city = uniqueCities[i];
    console.log(`  📍 Geocoding ${i + 1}/${uniqueCities.length}: ${city}`);
    
    const coords = await getCityCoordinates(city);
    results.set(city, coords);
    
    if (coords) {
      console.log(`    ✅ Found: ${coords.lat}, ${coords.lon}`);
    } else {
      console.log(`    ❌ Not found`);
    }
    
    // Small delay to avoid rate limiting
    if (delayMs > 0 && i < uniqueCities.length - 1) {
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  console.log(`✅ Geocoding complete!`);
  return results;
}