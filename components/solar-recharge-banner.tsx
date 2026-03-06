'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Sun,
  CloudRain,
  AlertTriangle,
  X,
  Zap,
  TrendingDown,
} from 'lucide-react';

interface SolarRecommendation {
  available: boolean;
  locationName: string;
  showBanner: boolean;
  tomorrow: {
    date: string;
    solarPercent: number;
    advisoryLevel: string;
    weatherSummary: string | null;
    cloudCover: number;
  } | null;
  lowSolarDaysAhead: number;
  recommendation?: {
    currentBalance: number;
    avgDailyConsumption: number;
    recommendedRecharge: number;
    daysToCover: number;
    reason: string;
  };
}

interface SolarRechargeBannerProps {
  locationId: string;
  meterId?: string;
  onRechargeClick?: () => void;
}

export function SolarRechargeBanner({ locationId, meterId, onRechargeClick }: SolarRechargeBannerProps) {
  const [data, setData] = useState<SolarRecommendation | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRecommendation = async () => {
      try {
        let url = `/api/solar-recommendation?locationId=${locationId}`;
        if (meterId) url += `&meterId=${meterId}`;

        const response = await fetch(url);
        const result = await response.json();

        if (result.success) {
          setData(result);
        }
      } catch (error) {
        console.error('Failed to fetch solar recommendation:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRecommendation();
  }, [locationId, meterId]);

  // Don't show if loading, dismissed, no data, or banner shouldn't show
  if (isLoading || dismissed || !data?.showBanner || !data?.tomorrow) {
    return null;
  }

  const { tomorrow, recommendation, lowSolarDaysAhead } = data;

  const getBannerStyle = () => {
    switch (tomorrow.advisoryLevel) {
      case 'critical':
        return 'bg-gradient-to-r from-red-50 to-red-100 border-red-300 text-red-900';
      case 'very_low':
        return 'bg-gradient-to-r from-orange-50 to-orange-100 border-orange-300 text-orange-900';
      case 'low':
      default:
        return 'bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-300 text-yellow-900';
    }
  };

  const getIcon = () => {
    if (tomorrow.advisoryLevel === 'critical') {
      return <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />;
    }
    if (tomorrow.cloudCover > 70 || (tomorrow.weatherSummary?.toLowerCase().includes('rain'))) {
      return <CloudRain className="w-6 h-6 text-blue-600 flex-shrink-0" />;
    }
    return <TrendingDown className="w-6 h-6 text-yellow-600 flex-shrink-0" />;
  };

  return (
    <Card className={`border ${getBannerStyle()} mb-4`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sun className="w-4 h-4" />
              <span className="font-semibold text-sm">
                Solar Advisory — {tomorrow.solarPercent}% Generation Expected Tomorrow
              </span>
            </div>
            <p className="text-sm opacity-90">
              {tomorrow.advisoryLevel === 'critical'
                ? 'Minimal solar generation expected.'
                : tomorrow.advisoryLevel === 'very_low'
                ? 'Very low solar generation expected.'
                : 'Reduced solar generation expected.'}
              {tomorrow.weatherSummary && ` ${tomorrow.weatherSummary}.`}
              {lowSolarDaysAhead > 1 &&
                ` ${lowSolarDaysAhead} low-solar days ahead.`}
            </p>

            {recommendation && (
              <div className="mt-2 flex items-center gap-3 flex-wrap">
                <div className="text-sm">
                  <span className="font-medium">Recommended recharge: </span>
                  <span className="font-bold">
                    ₦{recommendation.recommendedRecharge.toLocaleString()}
                  </span>
                  <span className="opacity-70 ml-1">
                    (covers {recommendation.daysToCover} days)
                  </span>
                </div>
                {onRechargeClick && (
                  <Button
                    size="sm"
                    onClick={onRechargeClick}
                    className="bg-primary text-primary-foreground"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Recharge Now
                  </Button>
                )}
              </div>
            )}

            {!recommendation && onRechargeClick && (
              <Button
                size="sm"
                variant="outline"
                onClick={onRechargeClick}
                className="mt-2"
              >
                <Zap className="w-4 h-4 mr-1" />
                Recharge in Advance
              </Button>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 flex-shrink-0 opacity-60 hover:opacity-100"
            onClick={() => setDismissed(true)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
