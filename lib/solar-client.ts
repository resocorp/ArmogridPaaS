import { supabaseAdmin, loadAdminSettings } from './supabase';

// =============================================================================
// TYPES
// =============================================================================

export interface SolarIrradianceInterval {
  start: string;
  end: string;
  avg_irradiance: {
    clear_sky: { ghi: number; dni: number; dhi: number };
    cloudy_sky: { ghi: number; dni: number; dhi: number };
  };
  max_irradiance: {
    clear_sky: { ghi: number; dni: number; dhi: number };
    cloudy_sky: { ghi: number; dni: number; dhi: number };
  };
  irradiation: {
    clear_sky: { ghi: number; dni: number; dhi: number };
    cloudy_sky: { ghi: number; dni: number; dhi: number };
  };
  panels?: SolarPanelInterval[];
}

export interface SolarPanelInterval {
  panel_id: string;
  clear_sky: { avg_power: number; max_power: number; energy: number };
  cloudy_sky: { avg_power: number; max_power: number; energy: number };
}

export interface SolarIrradianceResponse {
  lat: number;
  lon: number;
  date: string;
  interval: string;
  tz: string;
  sunrise?: string;
  sunset?: string;
  intervals: SolarIrradianceInterval[];
  // Panel prediction responses also include location_id
  location_id?: string;
}

export interface SolarDailySummary {
  date: string;
  clearSkyGhi: number;
  cloudySkyGhi: number;
  clearSkyDni: number;
  cloudySkyDni: number;
  clearSkyDhi: number;
  cloudySkyDhi: number;
  solarRatio: number;
  sunrise: string | null;
  sunset: string | null;
  panelEnergyClearSky: number;
  panelEnergyCloudySky: number;
  hourlyData: SolarIrradianceInterval[];
}

export interface OneCallDailyForecast {
  dt: number;
  sunrise: number;
  sunset: number;
  temp: { day: number; min: number; max: number; night: number; eve: number; morn: number };
  feels_like: { day: number; night: number; eve: number; morn: number };
  pressure: number;
  humidity: number;
  dew_point: number;
  wind_speed: number;
  wind_deg: number;
  weather: { id: number; main: string; description: string; icon: string }[];
  clouds: number;
  pop: number;
  rain?: number;
  snow?: number;
  uvi: number;
}

export interface OneCallResponse {
  lat: number;
  lon: number;
  timezone: string;
  timezone_offset: number;
  current?: any;
  daily?: OneCallDailyForecast[];
  hourly?: any[];
  alerts?: any[];
}

export interface FiveDayForecastEntry {
  dt: number;
  dt_txt: string;
  main: { temp: number; feels_like: number; temp_min: number; temp_max: number; pressure: number; humidity: number };
  weather: { id: number; main: string; description: string; icon: string }[];
  clouds: { all: number };
  wind: { speed: number; deg: number; gust?: number };
  pop: number;
  rain?: { '3h': number };
  snow?: { '3h': number };
  visibility: number;
}

export interface FiveDayForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: FiveDayForecastEntry[];
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    population: number;
    timezone: number;
    sunrise: number;
    sunset: number;
  };
}

export interface PanelConfig {
  type: 'mono-si' | 'poly-si' | 'tf-as' | 'cdte';
  area?: number;
  tilt: number;
  azimuth: number;
  peak_power?: number;
}

export interface OWMLocation {
  location_id: string;
  type: string;
  coordinates: { lat: number; lon: number }[];
}

export interface OWMPanel {
  panel_id: string;
  location_id: string;
  type: string;
  area?: number;
  tilt: number;
  azimuth: number;
  peak_power?: number;
}

// =============================================================================
// SOLAR CLIENT
// =============================================================================

class SolarClient {
  private baseUrl = 'https://api.openweathermap.org';

  /**
   * Get the OpenWeatherMap API key from admin settings
   */
  private async getApiKey(): Promise<string> {
    const { data } = await supabaseAdmin
      .from('admin_settings')
      .select('value')
      .eq('key', 'openweathermap_api_key')
      .single();

    const key = data?.value;
    if (!key) {
      throw new Error('OpenWeatherMap API key not configured. Set it in Admin Settings.');
    }
    return key;
  }

  /**
   * Make a GET request to OpenWeatherMap API
   */
  private async get<T>(url: string): Promise<T> {
    console.log(`[Solar] GET ${url.replace(/appid=[^&]+/, 'appid=***')}`);
    const response = await fetch(url);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Solar] API error ${response.status}:`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`OpenWeatherMap API Error: ${errorJson.message || response.statusText}`);
      } catch {
        throw new Error(`OpenWeatherMap API Error: ${response.statusText}`);
      }
    }

    return response.json();
  }

  /**
   * Make a POST request to OpenWeatherMap API
   */
  private async post<T>(url: string, body: any): Promise<T> {
    console.log(`[Solar] POST ${url.replace(/appid=[^&]+/, 'appid=***')}`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Solar] API error ${response.status}:`, errorText);
      try {
        const errorJson = JSON.parse(errorText);
        throw new Error(`OpenWeatherMap API Error: ${errorJson.message || response.statusText}`);
      } catch {
        throw new Error(`OpenWeatherMap API Error: ${response.statusText}`);
      }
    }

    return response.json();
  }

  /**
   * Make a DELETE request to OpenWeatherMap API
   */
  private async delete(url: string): Promise<void> {
    console.log(`[Solar] DELETE ${url.replace(/appid=[^&]+/, 'appid=***')}`);
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok && response.status !== 204) {
      const errorText = await response.text();
      console.error(`[Solar] API error ${response.status}:`, errorText);
      throw new Error(`OpenWeatherMap API Error: ${response.statusText}`);
    }
  }

  // ===========================================================================
  // SOLAR IRRADIANCE API (v2)
  // ===========================================================================

  /**
   * Get solar irradiance data for a location and date
   * @param lat Latitude
   * @param lon Longitude
   * @param date Date in YYYY-MM-DD format (historical from 1979-01-01, forecast up to +15 days)
   * @param interval '15m' | '1h' | '1d' (default: '1h')
   * @param tz Optional timezone in ±XX:XX format
   */
  async getSolarIrradiance(
    lat: number,
    lon: number,
    date: string,
    interval: '15m' | '1h' | '1d' = '1h',
    tz?: string
  ): Promise<SolarIrradianceResponse> {
    const apiKey = await this.getApiKey();
    let url = `${this.baseUrl}/energy/2.0/solar/interval_data?lat=${lat}&lon=${lon}&date=${date}&interval=${interval}&appid=${apiKey}`;
    if (tz) {
      url += `&tz=${encodeURIComponent(tz)}`;
    }
    return this.get<SolarIrradianceResponse>(url);
  }

  /**
   * Get daily solar summary (aggregated from hourly data or direct 1d interval)
   * Returns totals for clear_sky and cloudy_sky GHI/DNI/DHI
   */
  async getDailySolarSummary(
    lat: number,
    lon: number,
    date: string,
    tz?: string
  ): Promise<SolarDailySummary> {
    // Fetch hourly data for charts + daily aggregate for totals
    const [hourlyData, dailyData] = await Promise.all([
      this.getSolarIrradiance(lat, lon, date, '1h', tz),
      this.getSolarIrradiance(lat, lon, date, '1d', tz),
    ]);

    // Daily interval has a single entry with totals
    const daily = dailyData.intervals[0];

    // Sum panel energy from hourly data if panels exist
    let panelEnergyClearSky = 0;
    let panelEnergyCloudySky = 0;

    if (daily?.panels) {
      for (const panel of daily.panels) {
        panelEnergyClearSky += panel.clear_sky.energy;
        panelEnergyCloudySky += panel.cloudy_sky.energy;
      }
    }

    const clearSkyGhi = daily?.irradiation?.clear_sky?.ghi || 0;
    const cloudySkyGhi = daily?.irradiation?.cloudy_sky?.ghi || 0;
    const solarRatio = clearSkyGhi > 0 ? cloudySkyGhi / clearSkyGhi : 0;

    return {
      date,
      clearSkyGhi,
      cloudySkyGhi,
      clearSkyDni: daily?.irradiation?.clear_sky?.dni || 0,
      cloudySkyDni: daily?.irradiation?.cloudy_sky?.dni || 0,
      clearSkyDhi: daily?.irradiation?.clear_sky?.dhi || 0,
      cloudySkyDhi: daily?.irradiation?.cloudy_sky?.dhi || 0,
      solarRatio,
      sunrise: hourlyData.sunrise || dailyData.sunrise || null,
      sunset: hourlyData.sunset || dailyData.sunset || null,
      panelEnergyClearSky,
      panelEnergyCloudySky,
      hourlyData: hourlyData.intervals,
    };
  }

  /**
   * Get multi-day solar forecast summary
   */
  async getMultiDayForecast(
    lat: number,
    lon: number,
    days: number = 7,
    tz?: string
  ): Promise<SolarDailySummary[]> {
    const today = new Date();
    const forecasts: SolarDailySummary[] = [];

    // Fetch each day (could be parallelized but respecting rate limits)
    for (let i = 0; i <= days; i++) {
      const forecastDate = new Date(today);
      forecastDate.setDate(today.getDate() + i);
      const dateStr = forecastDate.toISOString().split('T')[0];

      try {
        const summary = await this.getDailySolarSummary(lat, lon, dateStr, tz);
        forecasts.push(summary);
      } catch (error) {
        console.error(`[Solar] Failed to fetch forecast for ${dateStr}:`, error);
      }
    }

    return forecasts;
  }

  // ===========================================================================
  // ONE CALL API 3.0
  // ===========================================================================

  /**
   * Get weather forecast from One Call API 3.0
   * @param lat Latitude
   * @param lon Longitude
   * @param exclude Comma-separated parts to exclude: current,minutely,hourly,daily,alerts
   */
  async getOneCallForecast(
    lat: number,
    lon: number,
    exclude: string = 'minutely'
  ): Promise<OneCallResponse> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/data/3.0/onecall?lat=${lat}&lon=${lon}&exclude=${exclude}&units=metric&appid=${apiKey}`;
    return this.get<OneCallResponse>(url);
  }

  /**
   * Get daily weather forecast for the next 8 days
   */
  async getDailyWeatherForecast(
    lat: number,
    lon: number
  ): Promise<OneCallDailyForecast[]> {
    const response = await this.getOneCallForecast(lat, lon, 'current,minutely,hourly,alerts');
    return response.daily || [];
  }

  /**
   * Get combined solar + weather forecast for a specific date
   */
  async getCombinedForecast(
    lat: number,
    lon: number,
    date: string,
    tz?: string
  ): Promise<{
    solar: SolarDailySummary;
    weather: OneCallDailyForecast | null;
  }> {
    const [solar, weatherResponse] = await Promise.all([
      this.getDailySolarSummary(lat, lon, date, tz),
      this.getOneCallForecast(lat, lon, 'current,minutely,hourly,alerts').catch(() => null),
    ]);

    // Find the matching day in the weather forecast
    let weather: OneCallDailyForecast | null = null;
    if (weatherResponse?.daily) {
      const targetDate = new Date(date + 'T00:00:00Z');
      weather = weatherResponse.daily.find(d => {
        const dayDate = new Date(d.dt * 1000);
        return dayDate.toISOString().split('T')[0] === date;
      }) || null;
    }

    return { solar, weather };
  }

  // ===========================================================================
  // SOLAR PANEL ENERGY PREDICTION API
  // ===========================================================================

  /**
   * Create a location for solar panel energy prediction
   */
  async createLocation(lat: number, lon: number): Promise<OWMLocation> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/locations?appid=${apiKey}`;
    return this.post<OWMLocation>(url, {
      type: 'point',
      coordinates: [{ lat, lon }],
    });
  }

  /**
   * Get a location by ID
   */
  async getLocation(locationId: string): Promise<OWMLocation> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/location/${locationId}?appid=${apiKey}`;
    return this.get<OWMLocation>(url);
  }

  /**
   * List all created locations
   */
  async listLocations(): Promise<OWMLocation[]> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/locations?appid=${apiKey}`;
    return this.get<OWMLocation[]>(url);
  }

  /**
   * Delete a location (and all associated panels)
   */
  async deleteLocation(locationId: string): Promise<void> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/location/${locationId}?appid=${apiKey}`;
    return this.delete(url);
  }

  /**
   * Create a solar panel for a location
   */
  async createPanel(locationId: string, config: PanelConfig): Promise<OWMPanel> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/location/${locationId}/panels?appid=${apiKey}`;
    return this.post<OWMPanel>(url, config);
  }

  /**
   * Get a solar panel by ID
   */
  async getPanel(panelId: string): Promise<OWMPanel> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/panel/${panelId}?appid=${apiKey}`;
    return this.get<OWMPanel>(url);
  }

  /**
   * List all panels for a location
   */
  async listPanels(locationId: string): Promise<OWMPanel[]> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/location/${locationId}/panels?appid=${apiKey}`;
    return this.get<OWMPanel[]>(url);
  }

  /**
   * Delete a solar panel
   */
  async deletePanel(panelId: string): Promise<void> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/energy/2.0/panel/${panelId}?appid=${apiKey}`;
    return this.delete(url);
  }

  /**
   * Get solar panel power output and irradiation data by location
   * This returns data for ALL panels associated with the location
   */
  async getLocationIntervalData(
    locationId: string,
    date: string,
    interval: '15m' | '1h' | '1d' = '1h',
    tz?: string
  ): Promise<SolarIrradianceResponse> {
    const apiKey = await this.getApiKey();
    let url = `${this.baseUrl}/energy/2.0/location/${locationId}/interval_data?date=${date}&interval=${interval}&appid=${apiKey}`;
    if (tz) {
      url += `&tz=${encodeURIComponent(tz)}`;
    }
    return this.get<SolarIrradianceResponse>(url);
  }

  // ===========================================================================
  // WEATHER-BASED SOLAR FORECAST (FREE TIER — /data/2.5/forecast)
  // ===========================================================================

  /**
   * Estimate solar ratio from cloud cover percentage.
   * Free tier has no UV index — cloud cover is the primary attenuation factor.
   * 0% clouds → 1.0, 50% → 0.625, 100% → 0.25 (diffuse still gets through)
   */
  estimateSolarRatio(cloudCoverPct: number): number {
    return Math.max(0.05, 1 - (cloudCoverPct / 100) * 0.75);
  }

  /**
   * Estimate daily kWh production from panel specs and solar ratio.
   * Formula: panelCapacityKw × peakSunHours × solarRatio × deratingFactor
   */
  estimateDailyKwh(
    panelCapacityKw: number,
    peakSunHours: number,
    solarRatio: number,
    deratingFactor: number = 0.78
  ): number {
    return panelCapacityKw * peakSunHours * solarRatio * deratingFactor;
  }

  /**
   * Get the free 5-day/3-hour forecast from /data/2.5/forecast.
   */
  async getFiveDayForecast(lat: number, lon: number): Promise<FiveDayForecastResponse> {
    const apiKey = await this.getApiKey();
    const url = `${this.baseUrl}/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
    return this.get<FiveDayForecastResponse>(url);
  }

  /**
   * Get weather-based solar forecast using the FREE 5-day/3-hour forecast API.
   * Aggregates 3-hour intervals into daily summaries with estimated solar ratio and kWh.
   * Returns up to 5 days of forecast. This is the primary method.
   */
  async getWeatherBasedSolarForecast(
    lat: number,
    lon: number,
    panelCapacityKw: number = 0,
    peakSunHours: number = 5.0,
    deratingFactor: number = 0.78
  ): Promise<{
    days: Array<{
      date: string;
      solarRatio: number;
      estimatedKwh: number;
      estimatedKwhClearSky: number;
      uvi: number;
      clouds: number;
      pop: number;
      rainMm: number;
      tempMin: number;
      tempMax: number;
      humidity: number;
      windSpeed: number;
      weatherSummary: string;
      weatherIcon: string;
      sunrise: string;
      sunset: string;
    }>;
    raw: FiveDayForecastResponse;
  }> {
    const weatherData = await this.getFiveDayForecast(lat, lon);
    const intervals = weatherData.list || [];
    const city = weatherData.city;

    // Aggregate 3-hour intervals into daily buckets
    const dailyBuckets: Record<string, {
      clouds: number[];
      temps: number[];
      rain: number;
      wind: number[];
      humidity: number[];
      pop: number[];
      weatherDesc: string;
      weatherIcon: string;
    }> = {};

    for (const entry of intervals) {
      const date = entry.dt_txt.split(' ')[0];
      if (!dailyBuckets[date]) {
        dailyBuckets[date] = {
          clouds: [], temps: [], rain: 0, wind: [], humidity: [], pop: [],
          weatherDesc: entry.weather?.[0]?.description || '',
          weatherIcon: entry.weather?.[0]?.icon || '',
        };
      }
      const b = dailyBuckets[date];
      b.clouds.push(entry.clouds?.all ?? 0);
      b.temps.push(entry.main?.temp ?? 0);
      b.humidity.push(entry.main?.humidity ?? 0);
      b.wind.push(entry.wind?.speed ?? 0);
      b.pop.push(entry.pop ?? 0);
      b.rain += entry.rain?.['3h'] ?? 0;
      // Prefer the 12:00 slot for weather description
      if (entry.dt_txt.includes('12:00')) {
        b.weatherDesc = entry.weather?.[0]?.description || b.weatherDesc;
        b.weatherIcon = entry.weather?.[0]?.icon || b.weatherIcon;
      }
    }

    const sunrise = city?.sunrise
      ? new Date(city.sunrise * 1000).toISOString()
      : '';
    const sunset = city?.sunset
      ? new Date(city.sunset * 1000).toISOString()
      : '';

    const days = Object.entries(dailyBuckets).map(([date, b]) => {
      const avgCloud = b.clouds.reduce((a, c) => a + c, 0) / b.clouds.length;
      const solarRatio = this.estimateSolarRatio(avgCloud);
      const estimatedKwh = this.estimateDailyKwh(panelCapacityKw, peakSunHours, solarRatio, deratingFactor);
      const estimatedKwhClearSky = this.estimateDailyKwh(panelCapacityKw, peakSunHours, 1.0, deratingFactor);

      const desc = b.weatherDesc;
      const parts: string[] = [];
      if (desc) parts.push(desc.charAt(0).toUpperCase() + desc.slice(1));
      if (b.rain > 0) parts.push(`${b.rain.toFixed(1)}mm rain expected`);
      if (avgCloud > 70) parts.push(`${Math.round(avgCloud)}% cloud cover`);

      return {
        date,
        solarRatio,
        estimatedKwh,
        estimatedKwhClearSky,
        uvi: 0, // UV not available on free tier
        clouds: Math.round(avgCloud),
        pop: Math.max(...b.pop),
        rainMm: b.rain,
        tempMin: Math.min(...b.temps),
        tempMax: Math.max(...b.temps),
        humidity: Math.round(b.humidity.reduce((a, c) => a + c, 0) / b.humidity.length),
        windSpeed: +(b.wind.reduce((a, c) => a + c, 0) / b.wind.length).toFixed(1),
        weatherSummary: parts.join('. ') || 'No weather data',
        weatherIcon: b.weatherIcon,
        sunrise,
        sunset,
      };
    });

    return { days, raw: weatherData };
  }

  // ===========================================================================
  // ADVISORY LEVEL HELPERS
  // ===========================================================================

  /**
   * Determine the advisory level based on solar ratio and configured thresholds
   */
  async getAdvisoryLevel(solarRatio: number): Promise<'normal' | 'low' | 'very_low' | 'critical'> {
    const settingsMap = await loadAdminSettings([
      'solar_advisory_threshold',
      'solar_very_low_threshold',
      'solar_critical_threshold',
    ]);

    const lowThreshold = parseFloat(settingsMap.solar_advisory_threshold || '0.40');
    const veryLowThreshold = parseFloat(settingsMap.solar_very_low_threshold || '0.25');
    const criticalThreshold = parseFloat(settingsMap.solar_critical_threshold || '0.15');

    if (solarRatio <= criticalThreshold) return 'critical';
    if (solarRatio <= veryLowThreshold) return 'very_low';
    if (solarRatio <= lowThreshold) return 'low';
    return 'normal';
  }

  /**
   * Get a human-readable weather description from forecast data
   */
  getWeatherDescription(weatherDesc: string, clouds: number, rain: number, windSpeed: number): string {
    const parts: string[] = [];

    if (weatherDesc) {
      parts.push(weatherDesc.charAt(0).toUpperCase() + weatherDesc.slice(1));
    }

    if (rain > 0) {
      parts.push(`${rain.toFixed(1)}mm rain expected`);
    }

    if (clouds > 70) {
      parts.push(`${Math.round(clouds)}% cloud cover`);
    }

    if (windSpeed > 10) {
      parts.push(`wind ${windSpeed.toFixed(1)} m/s`);
    }

    return parts.join('. ') || 'No weather data';
  }

  /**
   * Calculate recommended recharge amount based on forecast deficit
   * @param avgDailyConsumptionNaira Average daily consumption in Naira
   * @param solarRatio Predicted solar ratio for the day
   * @param daysToCovert Number of low-solar days to cover
   */
  calculateRechargeRecommendation(
    avgDailyConsumptionNaira: number,
    solarRatio: number,
    daysToCover: number = 2
  ): number {
    // If solar ratio is low, customers may need to rely more on stored credit
    // Recommend enough to cover the deficit days
    const deficitMultiplier = 1 + (1 - solarRatio); // e.g. 0.3 ratio → 1.7x normal
    const recommended = avgDailyConsumptionNaira * deficitMultiplier * daysToCover;
    // Round up to nearest 100
    return Math.ceil(recommended / 100) * 100;
  }
}

// Export singleton instance
export const solarClient = new SolarClient();
