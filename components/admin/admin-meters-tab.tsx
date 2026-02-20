'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, RefreshCw, Power, PowerOff, Building2, Search, CheckCircle2, Wallet, ArrowUpDown, ChevronUp, ChevronDown, KeyRound, Link2, Eye, EyeOff, Info, Bolt, CircuitBoard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getMeterStatusBadge } from './status-badges';
import type { Meter, Project, SortField, SortDirection } from './types';

interface AdminMetersTabProps {
  projects: Project[];
  projectsLoading: boolean;
  onLoadProjects: () => void;
}

export function AdminMetersTab({ projects, projectsLoading, onLoadProjects }: AdminMetersTabProps) {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [metersLoading, setMetersLoading] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [meterSearch, setMeterSearch] = useState('');
  const [sortField, setSortField] = useState<SortField>('roomNo');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [linkedCredentials, setLinkedCredentials] = useState<Record<string, any>>({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMeter, setSelectedMeter] = useState<Meter | null>(null);
  const [controlDialogOpen, setControlDialogOpen] = useState(false);
  const [rechargeDialogOpen, setRechargeDialogOpen] = useState(false);
  const [rechargeAmount, setRechargeAmount] = useState('');
  const [rechargeNote, setRechargeNote] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkUsername, setLinkUsername] = useState('');
  const [linkPassword, setLinkPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [detailsMeter, setDetailsMeter] = useState<any>(null);

  useEffect(() => { loadLinkedCredentials(); }, []);

  useEffect(() => {
    if (projects.length > 0) loadMetersByProject(selectedProjectId);
  }, [selectedProjectId, projects.length]);

  const loadLinkedCredentials = async () => {
    try {
      const res = await fetch('/api/admin/meters/sync');
      const data = await res.json();
      if (data.success) setLinkedCredentials(data.data || {});
    } catch { /* silent */ }
  };

  const loadMetersByProject = async (projectId: string) => {
    setMetersLoading(true);
    try {
      if (projectId === 'all') {
        const allMeters: Meter[] = [];
        for (const project of projects) {
          try {
            const res = await fetch(`/api/admin/projects/${project.projectId}/meters`);
            const data = await res.json();
            if (data.success && data.data) allMeters.push(...data.data);
          } catch { /* skip failed project */ }
        }
        setMeters(allMeters);
      } else {
        const res = await fetch(`/api/admin/projects/${projectId}/meters`);
        const data = await res.json();
        if (data.success) { setMeters(data.data || []); }
        else { toast.error(data.error || 'Failed to load meters'); setMeters([]); }
      }
    } catch { toast.error('Failed to load meters'); setMeters([]); }
    finally { setMetersLoading(false); }
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  };

  const handleSyncAll = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/admin/meters/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({}) });
      const data = await res.json();
      if (data.success) { toast.success(`Synced ${data.synced} meters`); loadLinkedCredentials(); loadMetersByProject(selectedProjectId); }
      else toast.error(data.error || 'Failed to sync');
    } catch { toast.error('Failed to sync meters'); }
    finally { setIsSyncing(false); }
  };

  const openLinkDialog = (meter: Meter) => {
    setSelectedMeter(meter);
    setLinkUsername(meter.roomNo.toLowerCase().replace(/[^a-z0-9]/g, ''));
    setLinkPassword(''); setShowPassword(false); setLinkDialogOpen(true);
  };

  const handleLinkAccount = async () => {
    if (!selectedMeter || !linkUsername || !linkPassword) { toast.error('Please enter username and password'); return; }
    setIsLinking(true);
    try {
      const res = await fetch(`/api/admin/meters/${selectedMeter.meterId}/credentials`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomNo: selectedMeter.roomNo, projectId: selectedMeter.projectId, projectName: selectedMeter.projectName, username: linkUsername, password: linkPassword }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Account linked successfully!'); setLinkDialogOpen(false); setLinkUsername(''); setLinkPassword('');
        setLinkedCredentials(prev => ({ ...prev, [selectedMeter.roomNo]: { linked: true, username: linkUsername, lastSyncAt: data.data.lastSyncAt, meterData: data.data.meterData } }));
      } else toast.error(data.error || 'Failed to link account');
    } catch { toast.error('Failed to link account'); }
    finally { setIsLinking(false); }
  };

  const handleMeterControl = async (type: 0 | 1 | 2) => {
    if (!selectedMeter?.meterId) return;
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/meters/${selectedMeter.meterId}/control`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type }) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setControlDialogOpen(false); loadMetersByProject(selectedProjectId); }
      else toast.error(data.error || 'Failed to control meter');
    } catch { toast.error('Failed to control meter'); }
    finally { setIsProcessing(false); }
  };

  const handleRecharge = async () => {
    if (!selectedMeter?.meterId || !rechargeAmount) return;
    const amount = parseFloat(rechargeAmount);
    if (isNaN(amount) || amount <= 0) { toast.error('Please enter a valid amount'); return; }
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/admin/meters/${selectedMeter.meterId}/recharge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount, note: rechargeNote }) });
      const data = await res.json();
      if (data.success) { toast.success(data.message); setRechargeDialogOpen(false); setRechargeAmount(''); setRechargeNote(''); loadMetersByProject(selectedProjectId); }
      else toast.error(data.error || 'Failed to recharge meter');
    } catch { toast.error('Failed to recharge meter'); }
    finally { setIsProcessing(false); }
  };

  const filteredMeters = useMemo(() => meters
    .filter(m => {
      const s = meterSearch.toLowerCase();
      return m.roomNo?.toLowerCase().includes(s) || m.projectName?.toLowerCase().includes(s) || m.meterId?.toLowerCase().includes(s);
    })
    .sort((a, b) => {
      let aVal: any = a[sortField] || '', bVal: any = b[sortField] || '';
      if (sortField === 'balance' || sortField === 'readValue') { aVal = parseFloat(aVal) || 0; bVal = parseFloat(bVal) || 0; }
      else { aVal = String(aVal).toLowerCase(); bVal = String(bVal).toLowerCase(); }
      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    }), [meters, meterSearch, sortField, sortDirection]);

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField !== field ? <ArrowUpDown className="w-4 h-4 opacity-50" /> :
    sortDirection === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;

  const colLabels: Record<SortField, string> = { roomNo: 'Room/Unit', projectName: 'Project', meterId: 'Meter ID', balance: 'Balance', readValue: 'Reading' };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2"><Zap className="w-5 h-5" />Meter Management</CardTitle>
                <CardDescription>Select a project to view and control its meters</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleSyncAll} disabled={isSyncing || Object.keys(linkedCredentials).length === 0}>
                  <RefreshCw className={`w-4 h-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />Sync All ({Object.keys(linkedCredentials).length})
                </Button>
                <Button variant="outline" size="icon" onClick={() => { onLoadProjects(); if (selectedProjectId) loadMetersByProject(selectedProjectId); }} disabled={metersLoading || projectsLoading}>
                  <RefreshCw className={`w-4 h-4 ${(metersLoading || projectsLoading) ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium">Project:</span>
                <select className="px-3 py-2 rounded-md border bg-background text-sm min-w-[200px]" value={selectedProjectId} onChange={(e) => { setSelectedProjectId(e.target.value); setMeterSearch(''); }} disabled={projectsLoading}>
                  {projectsLoading ? <option>Loading projects...</option> : projects.length === 0 ? <option value="">No projects found</option> : (
                    <><option value="all">All Projects ({projects.length})</option>{projects.map(p => <option key={p.projectId} value={p.projectId}>{p.projectName}</option>)}</>
                  )}
                </select>
              </div>
              <div className="relative flex-1 max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="Search meters by room..." className="pl-9" value={meterSearch} onChange={(e) => setMeterSearch(e.target.value)} />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {projectsLoading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /><p className="ml-3 text-muted-foreground">Loading projects...</p></div>
          ) : projects.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Building2 className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="text-lg font-medium">No projects found</p><p className="text-sm">Click refresh to load projects from the IoT platform</p></div>
          ) : metersLoading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /><p className="ml-3 text-muted-foreground">Loading meters...</p></div>
          ) : filteredMeters.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground"><Zap className="w-16 h-16 mx-auto mb-4 opacity-30" /><p className="text-lg font-medium">No meters found</p><p className="text-sm">{meterSearch ? 'Try a different search term' : 'Select a project to view its meters'}</p></div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {(Object.keys(colLabels) as SortField[]).map(field => (
                      <TableHead key={field} className="cursor-pointer hover:bg-muted/50" onClick={() => handleSort(field)}>
                        <div className="flex items-center gap-1">{colLabels[field]}<SortIcon field={field} /></div>
                      </TableHead>
                    ))}
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMeters.map((meter, index) => {
                    const linkedData = linkedCredentials[meter.roomNo];
                    const meterData = linkedData?.meterData;
                    const displayBalance = meterData?.balance || meter.balance;
                    const displayReading = meterData?.epi || meter.readValue;
                    const displayStatus = meterData ? { switchSta: meterData.switchSta, unConnect: meterData.unConnnect ?? meterData.unConnect, controlMode: meterData.controlMode } : meter;
                    return (
                      <TableRow key={meter.meterId || meter.roomNo || index}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {meter.roomNo}
                            {linkedData?.linked && <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200"><Link2 className="w-3 h-3 mr-1" />Linked</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{meter.projectName || '-'}</TableCell>
                        <TableCell className="font-mono text-xs">{meter.meterId || '-'}</TableCell>
                        <TableCell>{displayBalance && parseFloat(displayBalance) > 0 ? <span className="text-green-600 font-medium">₦{parseFloat(displayBalance).toLocaleString()}</span> : <span className="text-muted-foreground">₦0</span>}</TableCell>
                        <TableCell className="text-sm">{displayReading ? `${parseFloat(displayReading).toFixed(2)} kWh` : '-'}</TableCell>
                        <TableCell>{getMeterStatusBadge(displayStatus)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {meterData && <Button variant="outline" size="sm" title="Electrical Details" onClick={() => { setDetailsMeter({ ...meter, ...meterData }); setDetailsDialogOpen(true); }} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Info className="w-4 h-4" /></Button>}
                            <Button variant={linkedData?.linked ? 'default' : 'outline'} size="sm" onClick={() => openLinkDialog(meter)} className={linkedData?.linked ? 'bg-green-600 hover:bg-green-700' : ''}><KeyRound className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedMeter(meter); setControlDialogOpen(true); }} disabled={!meter.meterId}><Power className="w-4 h-4" /></Button>
                            <Button variant="outline" size="sm" onClick={() => { setSelectedMeter(meter); setRechargeDialogOpen(true); }} disabled={!meter.meterId}><Wallet className="w-4 h-4" /></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing {filteredMeters.length} of {meters.length} meters</span>
            {selectedProjectId !== 'all' && projects.find(p => p.projectId === selectedProjectId) && (
              <span className="flex items-center gap-1"><Building2 className="w-4 h-4" />{projects.find(p => p.projectId === selectedProjectId)?.projectName}</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={controlDialogOpen} onOpenChange={setControlDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Meter Control</DialogTitle><DialogDescription>Control power for meter {selectedMeter?.roomNo} ({selectedMeter?.meterId})</DialogDescription></DialogHeader>
          <div className="grid grid-cols-3 gap-4 py-4">
            <Button variant="outline" className="flex flex-col items-center py-6 hover:bg-green-500/10 hover:border-green-500" onClick={() => handleMeterControl(1)} disabled={isProcessing}><Power className="w-8 h-8 text-green-500 mb-2" /><span>Turn On</span></Button>
            <Button variant="outline" className="flex flex-col items-center py-6 hover:bg-red-500/10 hover:border-red-500" onClick={() => handleMeterControl(0)} disabled={isProcessing}><PowerOff className="w-8 h-8 text-red-500 mb-2" /><span>Turn Off</span></Button>
            <Button variant="outline" className="flex flex-col items-center py-6 hover:bg-blue-500/10 hover:border-blue-500" onClick={() => handleMeterControl(2)} disabled={isProcessing}><RefreshCw className="w-8 h-8 text-blue-500 mb-2" /><span>Prepaid</span></Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={rechargeDialogOpen} onOpenChange={setRechargeDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Manual Recharge</DialogTitle><DialogDescription>Credit meter {selectedMeter?.roomNo} ({selectedMeter?.meterId})</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div><label className="text-sm font-medium">Amount (₦)</label><Input type="number" placeholder="Enter amount in Naira" value={rechargeAmount} onChange={(e) => setRechargeAmount(e.target.value)} /></div>
            <div><label className="text-sm font-medium">Note (Optional)</label><Input placeholder="Reason for manual recharge" value={rechargeNote} onChange={(e) => setRechargeNote(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRechargeDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleRecharge} disabled={isProcessing || !rechargeAmount}>{isProcessing ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Wallet className="w-4 h-4 mr-2" />}Recharge</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5" />Link User Account</DialogTitle><DialogDescription>Enter the IoT platform credentials for {selectedMeter?.roomNo} to sync detailed meter data.</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2"><label className="text-sm font-medium">Username</label><Input placeholder="e.g., flat1" value={linkUsername} onChange={(e) => setLinkUsername(e.target.value)} autoComplete="off" /></div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <div className="relative">
                <Input type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={linkPassword} onChange={(e) => setLinkPassword(e.target.value)} autoComplete="off" />
                <Button type="button" variant="ghost" size="sm" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="w-4 h-4 text-muted-foreground" /> : <Eye className="w-4 h-4 text-muted-foreground" />}</Button>
              </div>
            </div>
            {linkedCredentials[selectedMeter?.roomNo || '']?.linked && (
              <div className="rounded-md bg-green-50 border border-green-200 p-3">
                <div className="flex items-center gap-2 text-green-700 text-sm"><CheckCircle2 className="w-4 h-4" /><span>This meter is already linked. Saving will update credentials.</span></div>
                <p className="text-xs text-green-600 mt-1">Last synced: {linkedCredentials[selectedMeter?.roomNo || '']?.lastSyncAt ? format(new Date(linkedCredentials[selectedMeter?.roomNo || '']?.lastSyncAt), 'MMM d, yyyy HH:mm') : 'Never'}</p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setLinkDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkAccount} disabled={isLinking || !linkUsername || !linkPassword}>{isLinking ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Link2 className="w-4 h-4 mr-2" />}{linkedCredentials[selectedMeter?.roomNo || '']?.linked ? 'Update & Sync' : 'Link & Sync'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><CircuitBoard className="w-5 h-5" />Meter Details - {detailsMeter?.roomNo}</DialogTitle><DialogDescription>Electrical parameters and meter information</DialogDescription></DialogHeader>
          {detailsMeter && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted/50 rounded-lg">
                <div><p className="text-xs text-muted-foreground">Meter ID</p><p className="font-mono font-medium">{detailsMeter.meterId || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">Model</p><p className="font-medium">{detailsMeter.model || '-'}</p></div>
                <div><p className="text-xs text-muted-foreground">CT Ratio</p><p className="font-medium">{detailsMeter.ct || 1}:1</p></div>
                <div><p className="text-xs text-muted-foreground">Last Update</p><p className="font-medium text-sm">{detailsMeter.createTime || '-'}</p></div>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2"><Bolt className="w-4 h-4 text-yellow-500" />Electrical Parameters</h4>
                <div className="p-3 border rounded-lg"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Active Power</span><span className="font-mono text-lg font-bold">{detailsMeter.p && detailsMeter.p !== '--' ? `${parseFloat(detailsMeter.p).toFixed(3)} kW` : '-- kW'}</span></div></div>
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Voltage (V)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ phase: 'A', key: 'ua', color: 'blue' }, { phase: 'B', key: 'ub', color: 'green' }, { phase: 'C', key: 'uc', color: 'orange' }].map(({ phase, key, color }) => (
                      <div key={key} className={`text-center p-2 bg-${color}-50 rounded`}><p className={`text-xs text-${color}-600`}>Phase {phase}</p><p className={`font-mono font-bold text-${color}-700`}>{detailsMeter[key] && detailsMeter[key] !== '--' ? detailsMeter[key] : '--'}</p></div>
                    ))}
                  </div>
                </div>
                <div className="p-3 border rounded-lg space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Current (A)</p>
                  <div className="grid grid-cols-3 gap-2">
                    {[{ phase: 'A', key: 'ia', color: 'blue' }, { phase: 'B', key: 'ib', color: 'green' }, { phase: 'C', key: 'ic', color: 'orange' }].map(({ phase, key, color }) => (
                      <div key={key} className={`text-center p-2 bg-${color}-50 rounded`}><p className={`text-xs text-${color}-600`}>Phase {phase}</p><p className={`font-mono font-bold text-${color}-700`}>{detailsMeter[key] && detailsMeter[key] !== '--' ? detailsMeter[key] : '--'}</p></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground">Total Energy</p><p className="font-mono text-lg font-bold text-primary">{detailsMeter.epi ? `${parseFloat(detailsMeter.epi).toFixed(2)} kWh` : '-- kWh'}</p></div>
                <div className="p-3 border rounded-lg"><p className="text-xs text-muted-foreground">Balance</p><p className="font-mono text-lg font-bold text-green-600">₦{detailsMeter.balance ? parseFloat(detailsMeter.balance).toLocaleString() : '0'}</p></div>
              </div>
              <div className="p-3 border rounded-lg">
                <p className="text-sm font-medium text-muted-foreground mb-2">Energy Price (₦/kWh)</p>
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  {[{ label: 'Sharp', key: 'priceSharp' }, { label: 'Peak', key: 'pricePeak' }, { label: 'Flat', key: 'priceFlat' }, { label: 'Valley', key: 'priceValley' }].map(({ label, key }) => (
                    <div key={key}><p className="text-muted-foreground">{label}</p><p className="font-mono font-medium">{detailsMeter[key] || '-'}</p></div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter><Button variant="outline" onClick={() => setDetailsDialogOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
