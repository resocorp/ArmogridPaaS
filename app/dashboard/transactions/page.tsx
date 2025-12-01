'use client';

import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';
import { Receipt, Calendar, Filter, CheckCircle, XCircle, Copy, Check } from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import type { SaleRecord } from '@/types/iot';

type DatePreset = '7days' | '30days' | '90days' | 'thisMonth' | 'lastMonth' | 'custom';

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<SaleRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Date filters
  const [datePreset, setDatePreset] = useState<DatePreset>('30days');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  // Additional filters
  const [meterFilter, setMeterFilter] = useState<string>('all');
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<string>('all');

  // Calculate date range based on preset
  const getDateRange = () => {
    const today = new Date();
    switch (datePreset) {
      case '7days':
        return { start: format(subDays(today, 7), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case '30days':
        return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case '90days':
        return { start: format(subDays(today, 90), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
      case 'thisMonth':
        return { start: format(startOfMonth(today), 'yyyy-MM-dd'), end: format(endOfMonth(today), 'yyyy-MM-dd') };
      case 'lastMonth':
        const lastMonth = subMonths(today, 1);
        return { start: format(startOfMonth(lastMonth), 'yyyy-MM-dd'), end: format(endOfMonth(lastMonth), 'yyyy-MM-dd') };
      case 'custom':
        return { start: customStartDate, end: customEndDate };
      default:
        return { start: format(subDays(today, 30), 'yyyy-MM-dd'), end: format(today, 'yyyy-MM-dd') };
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    setIsLoading(true);
    try {
      const { start, end } = getDateRange();
      if (!start || !end) {
        toast.error('Please select both start and end dates');
        setIsLoading(false);
        return;
      }
      
      const response = await fetch(`/api/transactions?startDate=${start}&endDate=${end}`);
      const data = await response.json();
      if (data.success) {
        setTransactions(data.data || []);
      } else {
        toast.error(data.error || 'Failed to fetch transactions');
      }
    } catch (error) {
      toast.error('Failed to fetch transactions');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (datePreset !== 'custom' || (customStartDate && customEndDate)) {
      fetchTransactions();
    }
  }, [datePreset]);

  // Get unique meters for filter dropdown
  const uniqueMeters = useMemo(() => {
    const meters = new Set(transactions.map(txn => txn.roomNo));
    return Array.from(meters).sort();
  }, [transactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(txn => {
      if (meterFilter !== 'all' && txn.roomNo !== meterFilter) return false;
      if (paymentTypeFilter !== 'all' && txn.buyType !== paymentTypeFilter) return false;
      return true;
    });
  }, [transactions, meterFilter, paymentTypeFilter]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = filteredTransactions.reduce((sum, txn) => sum + parseFloat(txn.saleMoney || '0'), 0);
    const successful = filteredTransactions.filter(txn => txn.success === 1).length;
    const failed = filteredTransactions.filter(txn => txn.success !== 1).length;
    return {
      count: filteredTransactions.length,
      total,
      average: filteredTransactions.length > 0 ? total / filteredTransactions.length : 0,
      successful,
      failed
    };
  }, [filteredTransactions]);

  // Parse payment type
  const getPaymentTypeLabel = (buyType: string) => {
    switch (buyType) {
      case '1': return 'CASH';
      case '3': return 'WEB PURCHASE';
      default: return 'OTHER';
    }
  };

  // Parse remark (may be JSON or plain text)
  const parseRemark = (remark: string): string => {
    if (!remark) return '';
    try {
      const parsed = JSON.parse(remark);
      return parsed['en-US'] || remark;
    } catch {
      return remark;
    }
  };

  // Copy transaction ID
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  // Format amount in Naira (already in Naira, not kobo)
  const formatNairaAmount = (amount: string) => {
    const num = parseFloat(amount || '0');
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(num);
  };

  // Get preset label
  const getPresetLabel = () => {
    switch (datePreset) {
      case '7days': return 'Last 7 days';
      case '30days': return 'Last 30 days';
      case '90days': return 'Last 90 days';
      case 'thisMonth': return 'This month';
      case 'lastMonth': return 'Last month';
      case 'custom': return 'Custom range';
      default: return '';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Transactions</h1>
        <p className="text-muted-foreground">View your purchase history</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Date Preset */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Date Range</label>
              <Select 
                value={datePreset} 
                onChange={(e) => setDatePreset(e.target.value as DatePreset)}
              >
                <option value="7days">Last 7 days</option>
                <option value="30days">Last 30 days</option>
                <option value="90days">Last 90 days</option>
                <option value="thisMonth">This month</option>
                <option value="lastMonth">Last month</option>
                <option value="custom">Custom range</option>
              </Select>
            </div>

            {/* Custom Date Range */}
            {datePreset === 'custom' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2 flex items-end">
                  <Button onClick={fetchTransactions} disabled={!customStartDate || !customEndDate}>
                    <Calendar className="w-4 h-4 mr-2" />
                    Apply
                  </Button>
                </div>
              </>
            )}

            {/* Meter Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Meter</label>
              <Select 
                value={meterFilter} 
                onChange={(e) => setMeterFilter(e.target.value)}
              >
                <option value="all">All Meters</option>
                {uniqueMeters.map(meter => (
                  <option key={meter} value={meter}>{meter}</option>
                ))}
              </Select>
            </div>

            {/* Payment Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Payment Type</label>
              <Select 
                value={paymentTypeFilter} 
                onChange={(e) => setPaymentTypeFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="1">Cash</option>
                <option value="3">Web Purchase</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.count}</div>
            <p className="text-xs text-muted-foreground">{getPresetLabel()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Recharged</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNairaAmount(stats.total.toString())}</div>
            <p className="text-xs text-muted-foreground">Amount credited</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNairaAmount(stats.average.toFixed(2))}</div>
            <p className="text-xs text-muted-foreground">Per transaction</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-green-600">{stats.successful}</span>
              {stats.failed > 0 && (
                <span className="text-lg text-red-500">/ {stats.failed} failed</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Successful transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Transactions List */}
      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {transactions.length === 0 
                  ? 'No transactions found for this period' 
                  : 'No transactions match your filters'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Date</th>
                      <th className="text-left py-3 px-4 font-medium">Meter</th>
                      <th className="text-left py-3 px-4 font-medium">Amount</th>
                      <th className="text-left py-3 px-4 font-medium">Type</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                      <th className="text-left py-3 px-4 font-medium">Remark</th>
                      <th className="text-left py-3 px-4 font-medium">Transaction ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((txn, index) => (
                      <tr key={txn.saleNo || index} className="border-b hover:bg-accent/50">
                        <td className="py-3 px-4 text-sm">
                          {formatDate(txn.createTime)}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                            {txn.roomNo}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-semibold text-green-600">
                          {formatNairaAmount(txn.saleMoney)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={txn.buyType === '3' ? 'default' : 'secondary'}>
                            {getPaymentTypeLabel(txn.buyType)}
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          {txn.success === 1 ? (
                            <span className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="w-4 h-4" />
                              <span className="text-xs">Success</span>
                            </span>
                          ) : (
                            <span className="flex items-center gap-1 text-red-500">
                              <XCircle className="w-4 h-4" />
                              <span className="text-xs">Failed</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground max-w-[200px] truncate">
                          {parseRemark(txn.remark) || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[100px]">
                              {txn.saleNo}
                            </span>
                            <button
                              onClick={() => copyToClipboard(txn.saleNo)}
                              className="p-1 hover:bg-accent rounded"
                              title="Copy ID"
                            >
                              {copiedId === txn.saleNo ? (
                                <Check className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3 text-muted-foreground" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-4">
                {filteredTransactions.map((txn, index) => (
                  <div key={txn.saleNo || index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="font-mono text-sm bg-muted px-2 py-1 rounded">
                          {txn.roomNo}
                        </span>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatDate(txn.createTime)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">
                          {formatNairaAmount(txn.saleMoney)}
                        </p>
                        {txn.success === 1 ? (
                          <span className="flex items-center gap-1 text-green-600 justify-end">
                            <CheckCircle className="w-3 h-3" />
                            <span className="text-xs">Success</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-500 justify-end">
                            <XCircle className="w-3 h-3" />
                            <span className="text-xs">Failed</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t">
                      <Badge variant={txn.buyType === '3' ? 'default' : 'secondary'}>
                        {getPaymentTypeLabel(txn.buyType)}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-xs text-muted-foreground">
                          ID: {txn.saleNo.slice(-8)}
                        </span>
                        <button
                          onClick={() => copyToClipboard(txn.saleNo)}
                          className="p-1 hover:bg-accent rounded"
                        >
                          {copiedId === txn.saleNo ? (
                            <Check className="w-3 h-3 text-green-600" />
                          ) : (
                            <Copy className="w-3 h-3 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>
                    {parseRemark(txn.remark) && (
                      <p className="text-xs text-muted-foreground italic">
                        {parseRemark(txn.remark)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
