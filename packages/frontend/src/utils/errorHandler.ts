// Centralized error handling utility

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string,
    public severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    public userMessage?: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const ERROR_CODES = {
  // Permission errors
  CAMERA_PERMISSION_DENIED: 'CAMERA_PERMISSION_DENIED',
  MIC_PERMISSION_DENIED: 'MIC_PERMISSION_DENIED',
  DEVICE_NOT_FOUND: 'DEVICE_NOT_FOUND',
  DEVICE_IN_USE: 'DEVICE_IN_USE',
  
  // WebRTC errors
  WEBRTC_CONNECTION_FAILED: 'WEBRTC_CONNECTION_FAILED',
  ICE_CONNECTION_FAILED: 'ICE_CONNECTION_FAILED',
  PEER_CONNECTION_ERROR: 'PEER_CONNECTION_ERROR',
  
  // Network errors
  NETWORK_ERROR: 'NETWORK_ERROR',
  WEBSOCKET_DISCONNECTED: 'WEBSOCKET_DISCONNECTED',
  BACKEND_UNREACHABLE: 'BACKEND_UNREACHABLE',
  
  // Auth errors
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  AUTH_FAILED: 'AUTH_FAILED',
  
  // Session errors
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  PEER_DISCONNECTED: 'PEER_DISCONNECTED',
  MATCHING_TIMEOUT: 'MATCHING_TIMEOUT',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  
  // General
  UNKNOWN_ERROR: 'UNKNOWN_ERROR',
};

export function handleMediaError(error: Error): AppError {
  const name = error.name;
  const message = error.message;
  
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return new AppError(
      'Camera and microphone access was denied',
      ERROR_CODES.CAMERA_PERMISSION_DENIED,
      'high',
      'Please allow camera and microphone access in your browser settings to use video chat.'
    );
  }
  
  if (name === 'NotFoundError') {
    return new AppError(
      'No camera or microphone found',
      ERROR_CODES.DEVICE_NOT_FOUND,
      'high',
      'No camera or microphone device was found. Please connect a device and try again.'
    );
  }
  
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return new AppError(
      'Camera or microphone is already in use',
      ERROR_CODES.DEVICE_IN_USE,
      'medium',
      'Your camera or microphone is being used by another application. Please close other apps and try again.'
    );
  }
  
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return new AppError(
      'Camera constraints not supported',
      ERROR_CODES.DEVICE_NOT_FOUND,
      'medium',
      'Your camera doesn\'t support the required settings. Try using a different device.'
    );
  }
  
  return new AppError(
    `Media error: ${message}`,
    ERROR_CODES.UNKNOWN_ERROR,
    'medium',
    'Failed to access camera or microphone. Please check your device settings.'
  );
}

export function handleWebRTCError(error: Error): AppError {
  const message = error.message;
  
  if (message.includes('setRemoteDescription') || message.includes('setLocalDescription')) {
    return new AppError(
      'Failed to establish connection',
      ERROR_CODES.PEER_CONNECTION_ERROR,
      'high',
      'Could not establish connection with peer. Please try again.'
    );
  }
  
  if (message.includes('ICE') || message.includes('candidate')) {
    return new AppError(
      'Network connection failed',
      ERROR_CODES.ICE_CONNECTION_FAILED,
      'critical',
      'Could not establish network connection. You may be behind a strict firewall.'
    );
  }
  
  return new AppError(
    `WebRTC error: ${message}`,
    ERROR_CODES.WEBRTC_CONNECTION_FAILED,
    'high',
    'Connection failed. Please check your internet connection and try again.'
  );
}

export function handleNetworkError(error: Error): AppError {
  return new AppError(
    `Network error: ${error.message}`,
    ERROR_CODES.NETWORK_ERROR,
    'high',
    'Network connection lost. Please check your internet connection.'
  );
}

export function logError(error: AppError | Error, context?: string) {
  // In production, send to error tracking service (Sentry, etc.)
  console.error(`[${context || 'App'}]`, error);
  
  // Could send to backend for logging
  if (process.env.NODE_ENV === 'production') {
    // fetch('/api/log-error', {
    //   method: 'POST',
    //   body: JSON.stringify({ error, context })
    // });
  }
}

export function getUserFriendlyMessage(error: Error | AppError): string {
  if (error instanceof AppError && error.userMessage) {
    return error.userMessage;
  }
  
  // Generic message
  return 'Something went wrong. Please try again or refresh the page.';
}

