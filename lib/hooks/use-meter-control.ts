'use client';

import { useState } from 'react';
import { toast } from 'sonner';

/**
 * Shared hook for meter power toggle logic.
 * Used by both MeterCard and MeterListItem to avoid duplicated control code.
 */
export function useMeterControl(
  meterId: string,
  isPowerConnected: boolean,
  isNetworkConnected: boolean,
  onMeterUpdate?: () => void
) {
  const [isControlling, setIsControlling] = useState(false);

  const handleTogglePower = async () => {
    if (!isNetworkConnected) {
      toast.error('Cannot control meter - No network connection');
      return;
    }

    setIsControlling(true);
    try {
      // Toggle: if ON (1), turn OFF (0), if OFF, turn to Prepaid mode (2)
      const controlType = isPowerConnected ? 0 : 2;

      const response = await fetch(`/api/meters/${meterId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: controlType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to control meter');
      }

      toast.success(isPowerConnected ? 'Meter turned OFF' : 'Meter turned ON');

      // Refresh meter data immediately to get updated state
      if (onMeterUpdate) {
        setTimeout(onMeterUpdate, 500);
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to control meter');
    } finally {
      setIsControlling(false);
    }
  };

  return { isControlling, handleTogglePower };
}
