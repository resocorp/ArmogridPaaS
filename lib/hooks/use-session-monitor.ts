'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

/**
 * Hook to monitor API responses for token expiry and auto-logout
 */
export function useSessionMonitor() {
  const router = useRouter();

  const handleSessionExpiry = useCallback(() => {
    toast.error('Session expired. Please login again.');
    router.push('/login');
  }, [router]);

  useEffect(() => {
    // Intercept fetch to check for token expiry
    const originalFetch = window.fetch;
    
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      
      // Clone response to read it without consuming the original
      const clonedResponse = response.clone();
      
      try {
        const data = await clonedResponse.json();
        
        // Check if token expired
        if (response.status === 401 && data.tokenExpired) {
          handleSessionExpiry();
        }
      } catch (e) {
        // Response is not JSON, ignore
      }
      
      return response;
    };

    // Cleanup: restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [handleSessionExpiry]);

  return { handleSessionExpiry };
}
