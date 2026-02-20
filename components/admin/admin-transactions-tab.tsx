'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CreditCard, RefreshCw, DollarSign, CheckCircle2, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { getStatusBadge } from './status-badges';
import type { Transaction } from './types';

interface TransactionSummary {
  totalTransactions: number;
  totalAmount: number;
  successfulAmount: number;
  successRate: number;
}

export function AdminTransactionsTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionSummary, setTransactionSummary] = useState<TransactionSummary | null>(null);
  const [transactionFilter, setTransactionFilter] = useState('all');

  const loadTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const res = await fetch('/api/admin/transactions?limit=100');
      const data = await res.json();
      if (data.success) {
        setTransactions(data.data);
        setTransactionSummary(data.summary);
      }
    } catch {
      toast.error('Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  const filteredTransactions = transactions.filter(
    tx => transactionFilter === 'all' || tx.paystack_status === transactionFilter
  );

  return (
    <div className="space-y-4">
      {transactionSummary && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Total Transactions</p><p className="text-2xl font-bold">{transactionSummary.totalTransactions}</p></div>
                <CreditCard className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Total Amount</p><p className="text-2xl font-bold">₦{transactionSummary.totalAmount?.toLocaleString()}</p></div>
                <DollarSign className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Successful Amount</p><p className="text-2xl font-bold text-green-500">₦{transactionSummary.successfulAmount?.toLocaleString()}</p></div>
                <CheckCircle2 className="w-8 h-8 text-green-500/50" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div><p className="text-sm text-muted-foreground">Success Rate</p><p className="text-2xl font-bold">{transactionSummary.successRate}%</p></div>
                <TrendingUp className="w-8 h-8 text-muted-foreground/50" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2"><CreditCard className="w-5 h-5" />Transaction History</CardTitle>
              <CardDescription>All payment transactions on the platform</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <select className="px-3 py-2 rounded-md border bg-background text-sm" value={transactionFilter} onChange={(e) => setTransactionFilter(e.target.value)}>
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
              </select>
              <Button variant="outline" size="icon" onClick={loadTransactions} disabled={transactionsLoading}>
                <RefreshCw className={`w-4 h-4 ${transactionsLoading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {transactionsLoading ? (
            <div className="flex items-center justify-center py-12"><RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" /></div>
          ) : transactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No transactions loaded</p>
              <p className="text-sm">Click refresh to load transactions</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CreditCard className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No transactions found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead>Meter ID</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions.map((tx) => (
                    <TableRow key={tx.id}>
                      <TableCell className="text-sm">{format(new Date(tx.created_at), 'MMM d, yyyy HH:mm')}</TableCell>
                      <TableCell className="font-mono text-xs">{tx.paystack_reference}</TableCell>
                      <TableCell className="font-mono text-sm">{tx.meter_id}</TableCell>
                      <TableCell className="font-medium">₦{(tx.amount_kobo / 100).toLocaleString()}</TableCell>
                      <TableCell>{getStatusBadge(tx.paystack_status)}</TableCell>
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
