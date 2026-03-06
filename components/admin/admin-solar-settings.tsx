'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sun,
  MapPin,
  Plus,
  Trash2,
  RefreshCw,
  Save,
  Settings2,
  Zap,
  AlertTriangle,
  Check,
  X,
  Key,
  Eye,
  EyeOff,
  Bell,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';

interface SolarLocation {
  id: string;
  project_id: string;
  project_name: string | null;
  lat: number;
  lon: number;
  timezone: string;
  owm_location_id: string | null;
  owm_panel_ids: string[];
  panel_config: any;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface Project {
  projectId: string;
  projectName: string;
}

export function AdminSolarSettings() {
  const [locations, setLocations] = useState<SolarLocation[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // API key + advisory settings state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [advisoryEnabled, setAdvisoryEnabled] = useState(true);
  const [smsAdvisoryEnabled, setSmsAdvisoryEnabled] = useState(true);
  const [lowThreshold, setLowThreshold] = useState('0.40');
  const [veryLowThreshold, setVeryLowThreshold] = useState('0.25');
  const [criticalThreshold, setCriticalThreshold] = useState('0.15');
  const [isSavingApiSettings, setIsSavingApiSettings] = useState(false);
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [deratingFactor, setDeratingFactor] = useState('0.78');

  // Form state for new/edit location
  const [showForm, setShowForm] = useState(false);
  const [editingLocation, setEditingLocation] = useState<SolarLocation | null>(null);
  const [formData, setFormData] = useState({
    projectId: '',
    projectName: '',
    lat: '',
    lon: '',
    timezone: '+01:00',
    enabled: true,
    panelType: 'mono-si',
    panelTilt: '15',
    panelAzimuth: '180',
    panelPeakPower: '',
    panelArea: '',
    peakSunHours: '5.0',
  });

  const loadSolarSettings = async () => {
    try {
      const response = await fetch('/api/admin/settings');
      const data = await response.json();
      if (data.success) {
        const s = data.data;
        if (s.openweathermap_api_key) {
          setApiKey(s.openweathermap_api_key);
          setApiKeyConfigured(!!s.openweathermap_api_key);
        }
        if (s.solar_advisory_enabled !== undefined) setAdvisoryEnabled(s.solar_advisory_enabled === 'true');
        if (s.sms_solar_advisory_enabled !== undefined) setSmsAdvisoryEnabled(s.sms_solar_advisory_enabled !== 'false');
        if (s.solar_advisory_threshold) setLowThreshold(s.solar_advisory_threshold);
        if (s.solar_very_low_threshold) setVeryLowThreshold(s.solar_very_low_threshold);
        if (s.solar_critical_threshold) setCriticalThreshold(s.solar_critical_threshold);
        if (s.solar_derating_factor) setDeratingFactor(s.solar_derating_factor);
      }
    } catch (error) {
      console.error('Failed to load solar settings:', error);
    }
  };

  const saveApiSettings = async () => {
    try {
      setIsSavingApiSettings(true);
      const response = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          settings: {
            openweathermap_api_key: apiKey,
            solar_advisory_enabled: String(advisoryEnabled),
            sms_solar_advisory_enabled: String(smsAdvisoryEnabled),
            solar_advisory_threshold: lowThreshold,
            solar_very_low_threshold: veryLowThreshold,
            solar_critical_threshold: criticalThreshold,
            solar_derating_factor: deratingFactor,
          },
        }),
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Solar API settings saved');
        setApiKeyConfigured(!!apiKey);
      } else {
        toast.error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setIsSavingApiSettings(false);
    }
  };

  const loadLocations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/solar-locations');
      const data = await response.json();
      if (data.success) {
        setLocations(data.data || []);
      }
    } catch (error) {
      console.error('Failed to load solar locations:', error);
      toast.error('Failed to load solar locations');
    } finally {
      setIsLoading(false);
    }
  };

  const loadProjects = async () => {
    try {
      const response = await fetch('/api/admin/projects');
      const data = await response.json();
      if (data.success && data.data) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error('Failed to load projects:', error);
    }
  };

  useEffect(() => {
    loadLocations();
    loadProjects();
    loadSolarSettings();
  }, []);

  const handleProjectSelect = (projectId: string) => {
    const project = projects.find((p) => p.projectId === projectId);
    setFormData((prev) => ({
      ...prev,
      projectId,
      projectName: project?.projectName || '',
    }));
  };

  const handleSaveLocation = async () => {
    if (!formData.projectId || !formData.lat || !formData.lon) {
      toast.error('Project, latitude, and longitude are required');
      return;
    }

    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/solar-locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: formData.projectId,
          projectName: formData.projectName,
          lat: parseFloat(formData.lat),
          lon: parseFloat(formData.lon),
          timezone: formData.timezone,
          panelConfig: {
            type: formData.panelType,
            tilt: parseFloat(formData.panelTilt) || 15,
            azimuth: parseFloat(formData.panelAzimuth) || 180,
            peak_power: formData.panelPeakPower ? parseFloat(formData.panelPeakPower) : undefined,
            area: formData.panelArea ? parseFloat(formData.panelArea) : undefined,
            peak_sun_hours: parseFloat(formData.peakSunHours) || 5.0,
          },
          enabled: formData.enabled,
        }),
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Solar location saved successfully');
        setShowForm(false);
        setEditingLocation(null);
        resetForm();
        loadLocations();
      } else {
        toast.error(data.error || 'Failed to save location');
      }
    } catch (error) {
      toast.error('Failed to save location');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteLocation = async (projectId: string) => {
    if (!confirm('Delete this solar location? This will also remove any OWM panels.')) return;

    try {
      const response = await fetch(`/api/admin/solar-locations?projectId=${projectId}`, {
        method: 'DELETE',
      });
      const data = await response.json();
      if (data.success) {
        toast.success('Solar location deleted');
        loadLocations();
      } else {
        toast.error(data.error || 'Failed to delete');
      }
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  const editLocation = (location: SolarLocation) => {
    setEditingLocation(location);
    setFormData({
      projectId: location.project_id,
      projectName: location.project_name || '',
      lat: String(location.lat),
      lon: String(location.lon),
      timezone: location.timezone || '+01:00',
      enabled: location.enabled,
      panelType: location.panel_config?.type || 'mono-si',
      panelTilt: String(location.panel_config?.tilt || 15),
      panelAzimuth: String(location.panel_config?.azimuth || 180),
      panelPeakPower: location.panel_config?.peak_power ? String(location.panel_config.peak_power) : '',
      panelArea: location.panel_config?.area ? String(location.panel_config.area) : '',
      peakSunHours: location.panel_config?.peak_sun_hours ? String(location.panel_config.peak_sun_hours) : '5.0',
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      projectId: '',
      projectName: '',
      lat: '',
      lon: '',
      timezone: '+01:00',
      enabled: true,
      panelType: 'mono-si',
      panelTilt: '15',
      panelAzimuth: '180',
      panelPeakPower: '',
      panelArea: '',
      peakSunHours: '5.0',
    });
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <RefreshCw className="w-6 h-6 animate-spin text-yellow-500" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* API Key Configuration Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Key className="w-4 h-4 text-primary" />
            OpenWeatherMap API Configuration
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Required for solar irradiance forecasts and weather data.{' '}
            <a
              href="https://openweathermap.org/api/solar-irradiance"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline inline-flex items-center gap-1"
            >
              Get API key <ExternalLink className="w-3 h-3" />
            </a>
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* API Key */}
          <div>
            <label className="text-sm font-medium">OpenWeatherMap API Key</label>
            <div className="flex gap-2 mt-1">
              <div className="relative flex-1">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  className="w-full px-3 py-2 border rounded-md bg-background text-sm pr-10"
                  placeholder="Enter your OpenWeatherMap API key..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowApiKey((v) => !v)}
                >
                  {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {apiKeyConfigured && (
                <span className="flex items-center gap-1 text-xs text-emerald-600 whitespace-nowrap">
                  <Check className="w-3 h-3" /> Configured
                </span>
              )}
            </div>
          </div>

          {/* Advisory Toggles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="advisoryEnabled"
                checked={advisoryEnabled}
                onChange={(e) => setAdvisoryEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="advisoryEnabled" className="text-sm font-medium">
                Enable solar advisory checks
              </label>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="smsAdvisoryEnabled"
                checked={smsAdvisoryEnabled}
                onChange={(e) => setSmsAdvisoryEnabled(e.target.checked)}
                className="w-4 h-4"
              />
              <label htmlFor="smsAdvisoryEnabled" className="text-sm font-medium flex items-center gap-1">
                <Bell className="w-3 h-3" /> Send SMS advisories to customers
              </label>
            </div>
          </div>

          {/* Derating Factor */}
          <div className="pt-2 border-t">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Panel Derating Factor</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.5"
                  max="1"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  value={deratingFactor}
                  onChange={(e) => setDeratingFactor(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">Accounts for real-world losses (inverter, wiring, dust, temp). Standard: 0.75–0.80</p>
              </div>
            </div>
          </div>

          {/* Advisory Thresholds */}
          <div className="space-y-2 pt-2 border-t">
            <p className="text-sm font-medium">Advisory Thresholds (solar ratio 0.0 – 1.0)</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-yellow-600 font-medium">Low Solar</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm"
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">e.g. 0.40 = below 40%</p>
              </div>
              <div>
                <label className="text-xs text-orange-600 font-medium">Very Low Solar</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm"
                  value={veryLowThreshold}
                  onChange={(e) => setVeryLowThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">e.g. 0.25 = below 25%</p>
              </div>
              <div>
                <label className="text-xs text-red-600 font-medium">Critical Solar</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="1"
                  className="w-full mt-1 px-2 py-1.5 border rounded-md bg-background text-sm"
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-0.5">e.g. 0.15 = below 15%</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button onClick={saveApiSettings} disabled={isSavingApiSettings}>
              {isSavingApiSettings ? (
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Save API Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Sun className="w-5 h-5 text-yellow-500" />
            Solar Project Locations
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure geographic coordinates and panel specs for solar forecasting
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => {
            resetForm();
            setEditingLocation(null);
            setShowForm(true);
          }}
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Location
        </Button>
      </div>

      {/* Add/Edit Form */}
      {showForm && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              {editingLocation ? 'Edit Solar Location' : 'Add Solar Location'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Project Selection */}
              <div>
                <label className="text-sm font-medium">Project</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.projectId}
                  onChange={(e) => handleProjectSelect(e.target.value)}
                  disabled={!!editingLocation}
                >
                  <option value="">Select a project...</option>
                  {projects.map((p) => (
                    <option key={p.projectId} value={p.projectId}>
                      {p.projectName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="text-sm font-medium">Timezone</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.timezone}
                  onChange={(e) => setFormData((prev) => ({ ...prev, timezone: e.target.value }))}
                >
                  <option value="+01:00">WAT (+01:00)</option>
                  <option value="+00:00">GMT (+00:00)</option>
                  <option value="+02:00">CAT (+02:00)</option>
                  <option value="+03:00">EAT (+03:00)</option>
                </select>
              </div>

              {/* Latitude */}
              <div>
                <label className="text-sm font-medium">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="e.g. 6.5244"
                  value={formData.lat}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lat: e.target.value }))}
                />
              </div>

              {/* Longitude */}
              <div>
                <label className="text-sm font-medium">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="e.g. 3.3792"
                  value={formData.lon}
                  onChange={(e) => setFormData((prev) => ({ ...prev, lon: e.target.value }))}
                />
              </div>

              {/* Panel Type */}
              <div>
                <label className="text-sm font-medium">Panel Type</label>
                <select
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  value={formData.panelType}
                  onChange={(e) => setFormData((prev) => ({ ...prev, panelType: e.target.value }))}
                >
                  <option value="mono-si">Monocrystalline Silicon (mono-si)</option>
                  <option value="poly-si">Polycrystalline Silicon (poly-si)</option>
                  <option value="tf-as">Thin Film Amorphous (tf-as)</option>
                  <option value="cdte">Cadmium Telluride (cdte)</option>
                </select>
              </div>

              {/* Panel Tilt */}
              <div>
                <label className="text-sm font-medium">Tilt Angle (°)</label>
                <input
                  type="number"
                  min="0"
                  max="90"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="0-90"
                  value={formData.panelTilt}
                  onChange={(e) => setFormData((prev) => ({ ...prev, panelTilt: e.target.value }))}
                />
              </div>

              {/* Panel Azimuth */}
              <div>
                <label className="text-sm font-medium">Azimuth Angle (°)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="0-360 (180 = South)"
                  value={formData.panelAzimuth}
                  onChange={(e) => setFormData((prev) => ({ ...prev, panelAzimuth: e.target.value }))}
                />
              </div>

              {/* Peak Power */}
              <div>
                <label className="text-sm font-medium">Peak Power (kW)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="e.g. 5.0"
                  value={formData.panelPeakPower}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, panelPeakPower: e.target.value }))
                  }
                />
              </div>

              {/* Panel Area */}
              <div>
                <label className="text-sm font-medium">Panel Area (m²)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="Optional if peak power is set"
                  value={formData.panelArea}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, panelArea: e.target.value }))
                  }
                />
              </div>

              {/* Peak Sun Hours */}
              <div>
                <label className="text-sm font-medium">Peak Sun Hours (h/day)</label>
                <input
                  type="number"
                  step="0.1"
                  min="1"
                  max="10"
                  className="w-full mt-1 px-3 py-2 border rounded-md bg-background text-sm"
                  placeholder="e.g. 5.0 (SE Nigeria default)"
                  value={formData.peakSunHours}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, peakSunHours: e.target.value }))
                  }
                />
                <p className="text-xs text-muted-foreground mt-0.5">Awka/SE Nigeria: 4.5–5.5h. Used for kWh estimation.</p>
              </div>

              {/* Enabled */}
              <div className="flex items-center gap-2 pt-6">
                <input
                  type="checkbox"
                  id="locationEnabled"
                  checked={formData.enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, enabled: e.target.checked }))
                  }
                  className="w-4 h-4"
                />
                <label htmlFor="locationEnabled" className="text-sm font-medium">
                  Enabled (receive forecasts and send advisories)
                </label>
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <Button onClick={handleSaveLocation} disabled={isSaving}>
                {isSaving ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {editingLocation ? 'Update' : 'Save'} Location
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowForm(false);
                  setEditingLocation(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Locations List */}
      {locations.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <MapPin className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>No solar locations configured</p>
            <p className="text-xs mt-1">Add project locations to enable solar forecasting</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {locations.map((location) => (
            <Card key={location.id} className={!location.enabled ? 'opacity-60' : ''}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <MapPin className="w-4 h-4 text-primary" />
                      <span className="font-medium">{location.project_name || location.project_id}</span>
                      {!location.enabled && (
                        <Badge variant="outline" className="text-xs">
                          Disabled
                        </Badge>
                      )}
                      {location.panel_config?.peak_power && (
                        <Badge variant="default" className="text-xs bg-blue-600">
                          <Zap className="w-3 h-3 mr-1" />
                          kWh Est. Enabled
                        </Badge>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-muted-foreground mt-2">
                      <span>Lat: {location.lat}</span>
                      <span>Lon: {location.lon}</span>
                      <span>TZ: {location.timezone}</span>
                      <span>
                        Type: {location.panel_config?.type || 'N/A'}
                      </span>
                      {location.panel_config?.peak_power && (
                        <span>Peak: {location.panel_config.peak_power} kW</span>
                      )}
                      {location.panel_config?.tilt !== undefined && (
                        <span>Tilt: {location.panel_config.tilt}°</span>
                      )}
                      {location.panel_config?.azimuth !== undefined && (
                        <span>Azimuth: {location.panel_config.azimuth}°</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => editLocation(location)}
                      title="Edit location"
                    >
                      <Settings2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteLocation(location.project_id)}
                      className="text-destructive hover:text-destructive"
                      title="Delete location"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
