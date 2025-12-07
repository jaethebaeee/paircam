import { useState, useEffect } from 'react';

interface GeoLocation {
  country: string;
  countryCode: string;
  city?: string;
  loading: boolean;
  error?: string;
}

/**
 * Hook to get user's country from IP address
 * Uses ipapi.co free API (1000 requests/day)
 */
export function useGeolocation(): GeoLocation {
  const [location, setLocation] = useState<GeoLocation>({
    country: '',
    countryCode: '',
    loading: true,
  });

  useEffect(() => {
    // Check cache first
    const cached = sessionStorage.getItem('geo_location');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setLocation({ ...parsed, loading: false });
        return;
      } catch {
        // Invalid cache, continue with fetch
      }
    }

    // Fetch from ipapi.co (free, no API key needed)
    fetch('https://ipapi.co/json/')
      .then((res) => res.json())
      .then((data) => {
        const geoData = {
          country: data.country_name || 'Unknown',
          countryCode: data.country_code || 'XX',
          city: data.city,
          loading: false,
        };
        // Cache for session
        sessionStorage.setItem('geo_location', JSON.stringify(geoData));
        setLocation(geoData);
      })
      .catch((error) => {
        console.error('Geolocation error:', error);
        setLocation({
          country: 'Unknown',
          countryCode: 'XX',
          loading: false,
          error: error.message,
        });
      });
  }, []);

  return location;
}

/**
 * Get flag emoji from country code
 */
export function getFlagEmoji(countryCode: string): string {
  if (!countryCode || countryCode.length !== 2) return '🌍';

  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));

  return String.fromCodePoint(...codePoints);
}

/**
 * Get flag image URL from flagcdn.com
 */
export function getFlagUrl(countryCode: string, size: 'w20' | 'w40' | 'w80' | 'w160' = 'w40'): string {
  if (!countryCode || countryCode.length !== 2) {
    return `https://flagcdn.com/${size}/un.png`; // UN flag as fallback
  }
  return `https://flagcdn.com/${size}/${countryCode.toLowerCase()}.png`;
}

export default useGeolocation;
