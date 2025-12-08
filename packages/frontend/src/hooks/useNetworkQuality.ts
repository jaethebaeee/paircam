import { useState, useEffect, useCallback } from 'react';

export type NetworkQuality = 'excellent' | 'good' | 'fair' | 'poor' | 'offline';
export type ConnectionType = 'wifi' | '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';

// Network Information API types (experimental API)
interface NetworkInformation extends EventTarget {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformation;
  mozConnection?: NetworkInformation;
  webkitConnection?: NetworkInformation;
}

interface NetworkInfo {
  quality: NetworkQuality;
  type: ConnectionType;
  downlink?: number; // Mbps
  rtt?: number; // Round trip time in ms
  saveData?: boolean;
}

export function useNetworkQuality() {
  const [networkInfo, setNetworkInfo] = useState<NetworkInfo>({
    quality: 'good',
    type: 'unknown',
  });

  const checkNetworkQuality = useCallback(() => {
    // Check online/offline status
    if (!navigator.onLine) {
      setNetworkInfo(prev => ({ ...prev, quality: 'offline' }));
      return;
    }

    // Use Network Information API if available
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      const { effectiveType, downlink, rtt, saveData } = connection;
      
      let quality: NetworkQuality = 'good';
      let type: ConnectionType = 'unknown';

      // Map effective type
      switch (effectiveType) {
        case '4g':
          quality = 'excellent';
          type = '4g';
          break;
        case '3g':
          quality = 'good';
          type = '3g';
          break;
        case '2g':
          quality = 'fair';
          type = '2g';
          break;
        case 'slow-2g':
          quality = 'poor';
          type = 'slow-2g';
          break;
        default:
          type = 'unknown';
      }

      // Refine based on actual measurements
      if (downlink !== undefined) {
        if (downlink >= 5) quality = 'excellent';
        else if (downlink >= 2) quality = 'good';
        else if (downlink >= 0.5) quality = 'fair';
        else quality = 'poor';
      }

      if (rtt !== undefined && rtt > 500) {
        // High latency degrades quality
        if (quality === 'excellent') quality = 'good';
        else if (quality === 'good') quality = 'fair';
      }

      setNetworkInfo({ quality, type, downlink, rtt, saveData });
    } else {
      // Fallback: assume good connection
      setNetworkInfo({ quality: 'good', type: 'unknown' });
    }
  }, []);

  useEffect(() => {
    checkNetworkQuality();

    // Listen for online/offline events
    window.addEventListener('online', checkNetworkQuality);
    window.addEventListener('offline', checkNetworkQuality);

    // Listen for connection changes if API is available
    const nav = navigator as NavigatorWithConnection;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;
    
    if (connection) {
      connection.addEventListener('change', checkNetworkQuality);
    }

    return () => {
      window.removeEventListener('online', checkNetworkQuality);
      window.removeEventListener('offline', checkNetworkQuality);
      if (connection) {
        connection.removeEventListener('change', checkNetworkQuality);
      }
    };
  }, [checkNetworkQuality]);

  return networkInfo;
}

