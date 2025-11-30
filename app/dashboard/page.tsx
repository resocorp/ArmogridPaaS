'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Activity, TrendingUp, CreditCard, LayoutGrid, List } from 'lucide-react';
import { formatNaira } from '@/lib/utils';
import { MeterCard } from '@/components/meter-card';
import { MeterListItem } from '@/components/meter-list-item';
import type { UserMeter } from '@/types/iot';
import { toast } from 'sonner';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable wrapper for card view
function SortableMeterCard({ meter, onMeterUpdate }: { meter: UserMeter; onMeterUpdate: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: meter.meterId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MeterCard meter={meter} className="cursor-move" onMeterUpdate={onMeterUpdate} />
    </div>
  );
}

// Sortable wrapper for list view
function SortableMeterListItem({ meter, onMeterUpdate }: { meter: UserMeter; onMeterUpdate: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: meter.meterId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <MeterListItem meter={meter} className="cursor-move" onMeterUpdate={onMeterUpdate} />
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [meters, setMeters] = useState<UserMeter[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    fetchMeters();
    // Load saved view mode
    const savedViewMode = localStorage.getItem('meterViewMode') as 'card' | 'list';
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
    // Load saved meter order
    const savedOrder = localStorage.getItem('meterOrder');
    if (savedOrder) {
      try {
        const orderArray = JSON.parse(savedOrder);
        // Will be used to sort meters after fetch
        sessionStorage.setItem('pendingMeterOrder', savedOrder);
      } catch (e) {
        console.error('Failed to parse saved meter order');
      }
    }
  }, []);

  const fetchMeters = async () => {
    try {
      const response = await fetch('/api/meters');
      const data = await response.json();
      
      if (response.status === 401 && data.tokenExpired) {
        toast.error('Session expired. Please login again.');
        router.push('/login');
        return;
      }
      
      if (data.success) {
        let fetchedMeters = data.data;
        
        // Apply saved order if exists
        const savedOrder = sessionStorage.getItem('pendingMeterOrder');
        if (savedOrder) {
          try {
            const orderArray = JSON.parse(savedOrder);
            fetchedMeters = orderArray
              .map((id: string) => fetchedMeters.find((m: UserMeter) => m.meterId === id))
              .filter(Boolean)
              .concat(fetchedMeters.filter((m: UserMeter) => !orderArray.includes(m.meterId)));
            sessionStorage.removeItem('pendingMeterOrder');
          } catch (e) {
            console.error('Failed to apply saved order');
          }
        }
        
        setMeters(fetchedMeters);
      } else {
        toast.error(data.error || 'Failed to fetch meters');
      }
    } catch (error) {
      console.error('Failed to fetch meters:', error);
      toast.error('Failed to load meters');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setMeters((items) => {
        const oldIndex = items.findIndex((item) => item.meterId === active.id);
        const newIndex = items.findIndex((item) => item.meterId === over.id);
        const newOrder = arrayMove(items, oldIndex, newIndex);
        
        // Save order to localStorage
        localStorage.setItem('meterOrder', JSON.stringify(newOrder.map((m: UserMeter) => m.meterId)));
        
        return newOrder;
      });
    }
  };

  const handleViewModeChange = (mode: 'card' | 'list') => {
    setViewMode(mode);
    localStorage.setItem('meterViewMode', mode);
  };

  const totalBalance = meters.reduce((sum, meter) => sum + (parseFloat(meter.balance) || 0), 0);
  const activeMeters = meters.filter((m) => m.switchSta === 1).length;
  const onlineMeters = meters.filter((m) => m.unConnect === 0).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back! Here's your overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Meters</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{meters.length}</div>
            <p className="text-xs text-muted-foreground">
              {onlineMeters} online
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatNaira(totalBalance * 100)}</div>
            <p className="text-xs text-muted-foreground">
              Across all meters
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Meters</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMeters}</div>
            <p className="text-xs text-muted-foreground">
              Power connected
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Balance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {meters.length > 0 ? formatNaira((totalBalance / meters.length) * 100) : '₦0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              Per meter
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Meters Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Your Meters</CardTitle>
            <div className="flex gap-2">
              <Button
                variant={viewMode === 'card' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('card')}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                Cards
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleViewModeChange('list')}
              >
                <List className="h-4 w-4 mr-2" />
                List
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading meters...</div>
          ) : meters.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No meters found. Contact your administrator.
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={meters.map(m => m.meterId)}
                strategy={viewMode === 'card' ? rectSortingStrategy : verticalListSortingStrategy}
              >
                {viewMode === 'card' ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {meters.map((meter) => (
                      <SortableMeterCard key={meter.meterId} meter={meter} onMeterUpdate={fetchMeters} />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {meters.map((meter) => (
                      <SortableMeterListItem key={meter.meterId} meter={meter} onMeterUpdate={fetchMeters} />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
