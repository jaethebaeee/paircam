import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { enforceSecureConnection, validateSecurityConfig } from './utils/security';

// ═══════════════════════════════════════════════════════════════════
// 🔒 SECURITY: Enforce HTTPS in production
// ═══════════════════════════════════════════════════════════════════
try {
  enforceSecureConnection();
  
  // Validate security configuration
  const securityCheck = validateSecurityConfig();
  if (!securityCheck.valid) {
    console.warn('⚠️  Security Configuration Warnings:');
    securityCheck.warnings.forEach(warning => {
      console.warn(`   - ${warning}`);
    });
  }
} catch (error) {
  // If enforceSecureConnection redirects to HTTPS, this will throw
  // We catch it to prevent render, as the page is redirecting
  if (error instanceof Error && error.message !== 'Redirecting to HTTPS') {
    console.error('Security check failed:', error);
  }
  // Don't render if redirecting
  if (error instanceof Error && error.message === 'Redirecting to HTTPS') {
    throw error;
  }
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>,
);
// Cache bust Fri Oct 24 14:32:13 EDT 2025
