'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, RefreshCw, CheckCircle2, Clock, AlertCircle, Mail, Phone, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getStatusBadge } from './status-badges';
import type { Registration } from './types';

interface RegistrationCounts {
  total: number;
  pending: number;
  success: number;
  failed: number;
}

export function AdminRegistrationsTab() {
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [registrationsLoading, setRegistrationsLoading] = useState(false);
  const [registrationCounts, setRegistrationCounts] = useState<RegistrationCounts>({ total: 0, pending: 0, success: 0, failed: 0 });
  const [registrationFilter, setRegistrationFilter] = useState('all');

  const loadRegistrations = async () => {
    setRegistrationsLoading(true);
    try {
      const res = await fetch('/api/admin/registrations?limit=100');
      const data = await res.json();
      if (data.success) {
        setRegistrations(data.data);
        setRegistrationCounts(data.counts);
      }
    } catch {
      toast.error('Failed to load registrations');
    } finally {
      setRegistrationsLoading(false);
    }
  };

  const filteredRegistrations = registrations.filter(
    r => registrationFilter === 'all' || r.payment_status === registrationFilter
  );

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Total Registrations</p><p className="text-2xl font-bold">{registrationCounts.total}</p></div>
              <UserPlus className="w-8 h-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Successful</p><p className="text-2xl font-bold text-green-500">{registrationCounts.success}</p></div>
              <CheckCircle2 className="w-8 h-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Pending</p><p className="text-2xl font-bold text-yellow-500">{registrationCounts.pending}</p></div>
              <Clock className="w-8 h-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-muted-foreground">Failed</p><p className="text-2xl font-bold text-red-500">{registrationCounts.failed}</p></div>
              <AlertCircle className="w-8 h-8 text-red-500/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><UserPlus className="w-5 h-5" />Customer Registrations</CardTitle>
              <CardDescription>New customer sign-ups for prepaid electricity</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 rounded-md border bg-background text-sm" value={registrationFilter} onChange={(e) => setRegistrationFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="success">Successful</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline" size="icon" onClick={loadRegistrations} disabled={registrationsLoading}>
                <RefreshCw className={`w-4 h-4 ${registrationsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {registrationsLoading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : registrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No registrations loaded</p>
              <p className="text-sm">Click refresh to load registrations</p>
            </div>
          ) : filteredRegistrations.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <UserPlus className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No registrations found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Room / Location</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRegistrations.map((reg) => (
                    <TableRow key={reg.id}>
                      <TableCell className="text-sm">{format(new Date(reg.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell className="font-medium">{reg.name}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div className="flex items-center gap-1"><Mail className="w-3 h-3" />{reg.email}</div>
                          <div className="flex items-center gap-1 text-muted-foreground"><Phone className="w-3 h-3" />{reg.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{reg.room_number}</div>
                          <div className="text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{reg.location_name || reg.location_id}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">₦{(reg.amount_paid / 100).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(reg.payment_status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
