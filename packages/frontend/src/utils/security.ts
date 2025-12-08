/**
 * Security utilities for production environment
 */

/**
 * Enforces HTTPS in production environment
 * Redirects HTTP requests to HTTPS automatically
 * 
 * @throws Error if WebSocket connection is not secure in production
 */
export function enforceSecureConnection(): void {
  // Only enforce in production
  if (import.meta.env.PROD) {
    const protocol = window.location.protocol;
    const hostname = window.location.hostname;
    
    // Allow localhost for local production testing
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (!isLocalhost && protocol === 'http:') {
      // Redirect to HTTPS
      const secureUrl = `https://${window.location.host}${window.location.pathname}${window.location.search}${window.location.hash}`;
      console.warn('🔒 Redirecting to HTTPS for security...');
      window.location.replace(secureUrl);
      throw new Error('Redirecting to HTTPS');
    }
  }
}

/**
 * Validates that WebSocket connection will be secure
 * 
 * @param wsUrl - WebSocket URL to validate
 * @returns Secure WebSocket URL (wss://)
 * @throws Error if trying to use insecure ws:// in production
 */
export function enforceSecureWebSocket(wsUrl: string): string {
  if (import.meta.env.PROD) {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    
    if (!isLocalhost && wsUrl.startsWith('ws://')) {
      throw new Error(
        '❌ SECURITY ERROR: Insecure WebSocket (ws://) not allowed in production!\n' +
        'Use wss:// instead for encrypted connections.'
      );
    }
  }
  
  // In production, automatically upgrade ws:// to wss:// for non-localhost
  if (import.meta.env.PROD && wsUrl.startsWith('ws://') && !wsUrl.includes('localhost')) {
    return wsUrl.replace('ws://', 'wss://');
  }
  
  return wsUrl;
}

/**
 * Checks if DTLS-SRTP is enabled for WebRTC connection
 * DTLS-SRTP provides end-to-end encryption for media streams
 * 
 * @param peerConnection - RTCPeerConnection to check
 * @returns Promise<boolean> - true if connection is secure
 */
export async function verifyDTLSSRTP(peerConnection: RTCPeerConnection): Promise<boolean> {
  try {
    const stats = await peerConnection.getStats();
    let dtlsConnected = false;
    let srtpActive = false;
    
    stats.forEach((stat: RTCStats) => {
      // Check DTLS state (RTCTransportStats)
      if (stat.type === 'transport') {
        const transportStat = stat as RTCTransportStats;
        if (transportStat.dtlsState === 'connected') {
          dtlsConnected = true;
        }
        if ('srtpCipher' in transportStat && transportStat.srtpCipher) {
          srtpActive = true;
        }
      }

      // Alternative: Check candidate pair (RTCIceCandidatePairStats)
      if (stat.type === 'candidate-pair') {
        const candidateStat = stat as RTCIceCandidatePairStats;
        // If connection succeeded, DTLS should be active
        if (candidateStat.state === 'succeeded' && candidateStat.transportId) {
          dtlsConnected = true;
        }
      }
    });
    
    return dtlsConnected || srtpActive;
  } catch (error) {
    console.error('Failed to verify DTLS-SRTP:', error);
    return false;
  }
}

/**
 * Monitors WebRTC connection security continuously
 * Logs warnings if connection becomes insecure
 * 
 * @param peerConnection - RTCPeerConnection to monitor
 * @param onInsecure - Callback if connection becomes insecure
 */
export function monitorConnectionSecurity(
  peerConnection: RTCPeerConnection,
  onInsecure?: () => void
): () => void {
  let monitoring = true;
  let checkCount = 0;
  const MAX_CHECKS = 10; // Check for first 10 seconds
  
  const checkInterval = setInterval(async () => {
    if (!monitoring || checkCount >= MAX_CHECKS) {
      clearInterval(checkInterval);
      return;
    }
    
    checkCount++;
    const isSecure = await verifyDTLSSRTP(peerConnection);
    
    if (!isSecure && peerConnection.connectionState === 'connected') {
      console.warn(
        '⚠️  WARNING: WebRTC connection may not be using DTLS-SRTP encryption!\n' +
        'This could indicate a security issue.'
      );
      onInsecure?.();
    } else if (isSecure && checkCount === 1) {
      console.log('✅ WebRTC connection is encrypted with DTLS-SRTP');
    }
  }, 1000);
  
  // Return cleanup function
  return () => {
    monitoring = false;
    clearInterval(checkInterval);
  };
}

/**
 * Validates environment configuration for security
 * Checks that all required security settings are in place
 */
export function validateSecurityConfig(): { valid: boolean; warnings: string[] } {
  const warnings: string[] = [];
  
  // Check if running in production
  const isProduction = import.meta.env.PROD;
  
  if (isProduction) {
    // Check HTTPS
    if (window.location.protocol !== 'https:' && 
        window.location.hostname !== 'localhost') {
      warnings.push('Site is not served over HTTPS');
    }
    
    // Check if API URL is configured
    const apiUrl = import.meta.env.VITE_API_URL;
    if (!apiUrl) {
      warnings.push('VITE_API_URL not configured');
    } else if (!apiUrl.startsWith('https://') && !apiUrl.includes('localhost')) {
      warnings.push('API URL is not using HTTPS');
    }
    
    // Check if WebSocket URL is configured
    const wsUrl = import.meta.env.VITE_WS_URL;
    if (!wsUrl) {
      warnings.push('VITE_WS_URL not configured');
    } else if (!wsUrl.startsWith('wss://') && !wsUrl.includes('localhost')) {
      warnings.push('WebSocket URL is not using WSS');
    }
  }
  
  return {
    valid: warnings.length === 0,
    warnings,
  };
}

