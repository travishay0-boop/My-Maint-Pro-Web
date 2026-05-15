import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Calendar as CalendarIcon, Clock, MapPin, AlertTriangle, ChevronRight,
  Info, CheckCircle, ChevronLeft, LayoutList, Grid3X3, Building2
} from 'lucide-react';
import { format, parseISO, isBefore, startOfDay, differenceInDays, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';
import { Link, useLocation } from 'wouter';

interface UpcomingInspection {
  id: number;
  itemName: string;
  nextInspectionDate: string;
  lastInspectedDate: string | null;
  inspectionIntervalMonths: number;
  visualInspectionInterval: string;
  professionalServiceInterval: string | null;
  legalRequirement: string | null;
  roomId: number;
  roomName: string;
  roomType: string;
  propertyId: number;
  propertyName: string;
  propertyAddress: string;
  propertyNextInspectionDate: string | null;
  isCompleted?: boolean;
}

type TierId = 'overdue' | 'act_now' | 'due_soon' | 'coming_up' | 'scheduled';
type ViewMode = 'month' | 'list';

interface Tier {
  id: TierId;
  label: string;
  daysLabel: string;
  headerClass: string;
  labelClass: string;
  borderClass: string;
  badgeClass: string;
  countClass: string;
  dotClass: string;
  icon: (size?: string) => JSX.Element;
}

const TIERS: Tier[] = [
  {
    id: 'overdue',
    label: 'Time to Act',
    daysLabel: 'Past due',
    headerClass: 'bg-red-50 border-b border-red-200',
    labelClass: 'text-red-700',
    borderClass: 'border-l-4 border-red-500',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
    countClass: 'text-red-600',
    dotClass: 'bg-red-500',
    icon: (size = 'h-5 w-5') => <AlertTriangle className={`${size} text-red-600`} />,
  },
  {
    id: 'act_now',
    label: 'This Week',
    daysLabel: '0–7 days',
    headerClass: 'bg-orange-50 border-b border-orange-200',
    labelClass: 'text-orange-700',
    borderClass: 'border-l-4 border-orange-500',
    badgeClass: 'bg-orange-100 text-orange-800 border border-orange-300',
    countClass: 'text-orange-600',
    dotClass: 'bg-orange-400',
    icon: (size = 'h-5 w-5') => <AlertTriangle className={`${size} text-orange-500`} />,
  },
  {
    id: 'due_soon',
    label: 'Due Soon',
    daysLabel: '7–14 days',
    headerClass: 'bg-amber-50 border-b border-amber-200',
    labelClass: 'text-amber-700',
    borderClass: 'border-l-4 border-amber-400',
    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',
    countClass: 'text-amber-600',
    dotClass: 'bg-amber-400',
    icon: (size = 'h-5 w-5') => <Clock className={`${size} text-amber-500`} />,
  },
  {
    id: 'coming_up',
    label: 'Coming Up',
    daysLabel: '14–30 days',
    headerClass: 'bg-green-50 border-b border-green-200',
    labelClass: 'text-green-700',
    borderClass: 'border-l-4 border-green-400',
    badgeClass: 'bg-green-100 text-green-800 border border-green-300',
    countClass: 'text-green-600',
    dotClass: 'bg-green-500',
    icon: (size = 'h-5 w-5') => <Clock className={`${size} text-green-500`} />,
  },
  {
    id: 'scheduled',
    label: 'All Clear',
    daysLabel: '30+ days',
    headerClass: 'bg-gray-50 border-b border-gray-200',
    labelClass: 'text-gray-600',
    borderClass: 'border-l-4 border-gray-300',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300',
    countClass: 'text-gray-500',
    dotClass: 'bg-gray-400',
    icon: (size = 'h-5 w-5') => <CheckCircle className={`${size} text-gray-400`} />,
  },
];

const TIER_BY_ID: Record<TierId, Tier> = Object.fromEntries(TIERS.map(t => [t.id, t])) as Record<TierId, Tier>;

function getItemTier(item: UpcomingInspection): TierId {
  const today = startOfDay(new Date());
  if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) return 'overdue';
  if (
    !item.isCompleted &&
    item.propertyNextInspectionDate &&
    isBefore(parseISO(item.propertyNextInspectionDate), today)
  ) {
    const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
    if (!lastInsp || lastInsp < new Date(item.propertyNextInspectionDate)) return 'overdue';
  }
  if (!item.nextInspectionDate) return 'scheduled';
  const days = differenceInDays(parseISO(item.nextInspectionDate), today);
  if (days <= 7)  return 'act_now';
  if (days <= 14) return 'due_soon';
  if (days <= 30) return 'coming_up';
  return 'scheduled';
}

function getDaysLabel(item: UpcomingInspection): string {
  if (!item.nextInspectionDate) return '';
  const today = startOfDay(new Date());
  const days = differenceInDays(parseISO(item.nextInspectionDate), today);
  if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `In ${days} day${days === 1 ? '' : 's'}`;
}

// Urgency priority — lower = more urgent (for picking dot colour when multiple items on one day)
const TIER_PRIORITY: Record<TierId, number> = { overdue: 0, act_now: 1, due_soon: 2, coming_up: 3, scheduled: 4 };

export default function Calendar() {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewMode>('list');
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDateKey, setSelectedDateKey] = useState<string | null>(null);

  const { data: inspections, isLoading } = useQuery<UpcomingInspection[]>({
    queryKey: ['/api/inspections/upcoming'],
  });

  // Derive unique properties from inspection data
  const properties = useMemo(() => {
    if (!inspections) return [];
    const seen = new Map<number, string>();
    for (const i of inspections) {
      if (!seen.has(i.propertyId)) seen.set(i.propertyId, i.propertyAddress);
    }
    return Array.from(seen.entries()).map(([id, address]) => ({ id, address }));
  }, [inspections]);

  // Apply property filter
  const filteredItems = useMemo(() => {
    const base = inspections?.filter(i => i.nextInspectionDate) ?? [];
    if (selectedPropertyId === 'all') return base;
    return base.filter(i => String(i.propertyId) === selectedPropertyId);
  }, [inspections, selectedPropertyId]);

  // Tier buckets (for list view)
  const tieredInspections = useMemo(() =>
    TIERS.reduce<Record<TierId, UpcomingInspection[]>>(
      (acc, tier) => {
        acc[tier.id] = filteredItems
          .filter(i => getItemTier(i) === tier.id)
          .sort((a, b) => new Date(a.nextInspectionDate).getTime() - new Date(b.nextInspectionDate).getTime());
        return acc;
      },
      { overdue: [], act_now: [], due_soon: [], coming_up: [], scheduled: [] }
    ),
  [filteredItems]);

  // Month grid data
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = getDay(monthStart); // 0 = Sunday

  // Build date → items map for current month view (all items, not just current month, for overdue dots)
  const eventsByDateKey = useMemo(() => {
    const map: Record<string, UpcomingInspection[]> = {};
    for (const item of filteredItems) {
      const key = item.nextInspectionDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(item);
    }
    return map;
  }, [filteredItems]);

  // Also include overdue items (past dates) — they still appear as red dots on their due date
  const selectedDayItems = selectedDateKey ? (eventsByDateKey[selectedDateKey] ?? []) : [];

  const navigateMonth = (dir: 'prev' | 'next') => {
    setSelectedDateKey(null);
    setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + (dir === 'next' ? 1 : -1), 1));
  };

  const today = startOfDay(new Date());
  const todayKey = format(today, 'yyyy-MM-dd');

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const totalFiltered = filteredItems.length;

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-1 flex items-center gap-3">
          <CalendarIcon className="h-8 w-8" />
          Inspection Calendar
        </h1>
        <p className="text-muted-foreground">
          Upcoming inspections grouped by urgency — condition-adjusted and compliance-aware
        </p>
      </div>

      {/* Controls: view toggle + property filter */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        {/* View toggle */}
        <div className="flex items-center bg-muted rounded-lg p-1 gap-1">
          <Button
            variant={view === 'list' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => setView('list')}
          >
            <LayoutList className="h-4 w-4" />
            List
          </Button>
          <Button
            variant={view === 'month' ? 'default' : 'ghost'}
            size="sm"
            className="gap-2"
            onClick={() => { setView('month'); setSelectedDateKey(null); }}
          >
            <Grid3X3 className="h-4 w-4" />
            Month
          </Button>
        </div>

        {/* Property filter */}
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 text-muted-foreground" />
          <Select value={selectedPropertyId} onValueChange={(v) => { setSelectedPropertyId(v); setSelectedDateKey(null); }}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties ({inspections?.filter(i => i.nextInspectionDate).length ?? 0} items)</SelectItem>
              {properties.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>
                  {p.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {totalFiltered === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Upcoming Inspections</h3>
            <p className="text-muted-foreground mb-4">
              {selectedPropertyId !== 'all'
                ? 'No scheduled items for this property.'
                : 'Complete inspection items to automatically schedule future inspections.'}
            </p>
            <Link href="/properties">
              <a className="text-primary hover:underline">View Properties →</a>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 5-tier summary cards — always visible, reflects filter */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {TIERS.map(tier => (
              <Card key={tier.id} className={view === 'list' ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}>
                <CardContent className="pt-5 pb-4">
                  <div className={`text-2xl font-bold ${tier.countClass}`}>
                    {tieredInspections[tier.id].length}
                  </div>
                  <div className={`text-sm font-medium ${tier.labelClass}`}>{tier.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{tier.daysLabel}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* ─── MONTH VIEW ─── */}
          {view === 'month' && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <span className="text-base font-semibold">
                    {format(currentMonth, 'MMMM yyyy')}
                  </span>
                  <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                {/* Day headers */}
                <div className="grid grid-cols-7 mb-1">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                    <div key={d} className="py-2 text-center text-xs font-medium text-muted-foreground">
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden border">
                  {/* Leading blank cells */}
                  {Array.from({ length: leadingBlanks }).map((_, i) => (
                    <div key={`blank-${i}`} className="bg-muted/30 min-h-[80px] md:min-h-[100px]" />
                  ))}

                  {/* Day cells */}
                  {daysInMonth.map(day => {
                    const dateKey = format(day, 'yyyy-MM-dd');
                    const items = eventsByDateKey[dateKey] ?? [];
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedDateKey;
                    const hasItems = items.length > 0;

                    // Determine highest-priority dot colour
                    let bestTier: TierId | null = null;
                    for (const item of items) {
                      const tier = getItemTier(item);
                      if (bestTier === null || TIER_PRIORITY[tier] < TIER_PRIORITY[bestTier]) {
                        bestTier = tier;
                      }
                    }

                    // Group dots by tier (up to 3 shown)
                    const tierGroups = new Map<TierId, number>();
                    for (const item of items) {
                      const t = getItemTier(item);
                      tierGroups.set(t, (tierGroups.get(t) ?? 0) + 1);
                    }
                    const dotTiers = Array.from(tierGroups.keys()).sort((a, b) => TIER_PRIORITY[a] - TIER_PRIORITY[b]).slice(0, 3);

                    return (
                      <div
                        key={dateKey}
                        onClick={() => hasItems && setSelectedDateKey(isSelected ? null : dateKey)}
                        className={[
                          'bg-background min-h-[80px] md:min-h-[100px] p-2 flex flex-col transition-colors relative',
                          hasItems ? 'cursor-pointer hover:bg-primary/5' : '',
                          isSelected ? 'ring-2 ring-inset ring-primary' : '',
                        ].join(' ')}
                      >
                        {/* Day number */}
                        <span className={[
                          'text-sm font-medium w-7 h-7 flex items-center justify-center rounded-full',
                          isToday ? 'bg-primary text-primary-foreground' : 'text-foreground',
                        ].join(' ')}>
                          {format(day, 'd')}
                        </span>

                        {/* Dots */}
                        {dotTiers.length > 0 && (
                          <div className="mt-auto flex items-center gap-1 pt-1 flex-wrap">
                            {dotTiers.map(tierId => (
                              <span
                                key={tierId}
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${TIER_BY_ID[tierId].dotClass}`}
                                title={`${tierGroups.get(tierId)} ${TIER_BY_ID[tierId].label}`}
                              />
                            ))}
                            {items.length > dotTiers.length && (
                              <span className="text-xs text-muted-foreground leading-none">
                                +{items.length - dotTiers.length}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  {TIERS.filter(t => t.id !== 'scheduled').map(t => (
                    <div key={t.id} className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${t.dotClass}`} />
                      {t.label}
                    </div>
                  ))}
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    All Clear
                  </div>
                </div>

                {/* Selected day panel */}
                {selectedDateKey && selectedDayItems.length > 0 && (
                  <div className="mt-4 border rounded-lg overflow-hidden">
                    <div className="px-4 py-3 bg-muted/50 border-b flex items-center justify-between">
                      <span className="font-medium text-sm">
                        {format(parseISO(selectedDateKey), 'EEEE, MMMM d')} — {selectedDayItems.length} item{selectedDayItems.length !== 1 ? 's' : ''}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7"
                        onClick={() => setView('list')}
                      >
                        View in list →
                      </Button>
                    </div>
                    <div className="divide-y max-h-72 overflow-y-auto">
                      {selectedDayItems
                        .sort((a, b) => TIER_PRIORITY[getItemTier(a)] - TIER_PRIORITY[getItemTier(b)])
                        .map(item => {
                          const tier = TIER_BY_ID[getItemTier(item)];
                          return (
                            <div
                              key={item.id}
                              className={`p-3 hover:bg-primary/5 cursor-pointer flex items-center gap-3 ${tier.borderClass}`}
                              onClick={() => setLocation(`/properties/${item.propertyId}?room=${item.roomId}&item=${item.id}`)}
                            >
                              {tier.icon('h-4 w-4 flex-shrink-0')}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{item.itemName}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {item.roomName} · {item.propertyAddress}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className={`text-xs font-semibold ${tier.labelClass}`}>{getDaysLabel(item)}</p>
                                {item.legalRequirement && (
                                  <p className="text-xs text-muted-foreground">Legal</p>
                                )}
                              </div>
                              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ─── LIST VIEW ─── */}
          {view === 'list' && (
            <div className="space-y-6">
              {TIERS.map(tier => {
                const items = tieredInspections[tier.id];
                if (items.length === 0) return null;
                return (
                  <Card key={tier.id} className="overflow-hidden">
                    <CardHeader className={`py-3 px-4 ${tier.headerClass}`}>
                      <CardTitle className="flex items-center justify-between text-base">
                        <div className="flex items-center gap-2">
                          {tier.icon('h-5 w-5')}
                          <span className={`font-semibold ${tier.labelClass}`}>{tier.label}</span>
                          <span className={`text-sm font-normal ${tier.labelClass} opacity-70`}>· {tier.daysLabel}</span>
                        </div>
                        <Badge className={`${tier.badgeClass} text-xs`}>
                          {items.length} item{items.length !== 1 ? 's' : ''}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="divide-y">
                        {items.map(inspection => (
                          <div
                            key={inspection.id}
                            className={`p-4 hover:bg-primary/5 transition-colors cursor-pointer ${tier.borderClass}`}
                            onClick={() => setLocation(`/properties/${inspection.propertyId}?room=${inspection.roomId}&item=${inspection.id}`)}
                            data-testid={`inspection-item-${inspection.id}`}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1.5">
                                <div className="flex items-start gap-3">
                                  {tier.icon('h-4 w-4 mt-1 flex-shrink-0')}
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-base leading-tight" data-testid={`text-item-name-${inspection.id}`}>
                                      {inspection.itemName}
                                    </h4>
                                    <p className="text-sm text-muted-foreground">{inspection.roomName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
                                  <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span data-testid={`text-property-${inspection.propertyId}`}>{inspection.propertyAddress}</span>
                                </div>
                                {inspection.legalRequirement && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
                                    <Info className="h-3.5 w-3.5 flex-shrink-0" />
                                    <span>{inspection.legalRequirement}</span>
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <p className="text-sm font-medium">
                                    {format(parseISO(inspection.nextInspectionDate), 'MMM d, yyyy')}
                                  </p>
                                  <p className={`text-xs font-semibold ${tier.labelClass}`}>{getDaysLabel(inspection)}</p>
                                  <Badge variant="outline" className="text-xs mt-1 whitespace-nowrap">
                                    Every {inspection.visualInspectionInterval}
                                  </Badge>
                                  {inspection.lastInspectedDate && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Last: {format(parseISO(inspection.lastInspectedDate), 'MMM d, yyyy')}
                                    </p>
                                  )}
                                </div>
                                <ChevronRight className="h-5 w-5 text-muted-foreground" />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          About Inspection Intervals
        </h3>
        <p className="text-sm text-muted-foreground">
          Inspection schedules are automatically calculated based on country-specific compliance standards
          when you mark inspection items as complete. Next due dates adjust based on condition rating —
          Average condition halves the interval, Poor condition sets a quarter of the interval.
          Compliance age deadlines (e.g. flexi hoses at 5 years, smoke detectors at 10 years) override
          condition-based dates when they fall sooner.
        </p>
      </div>
    </div>
  );
}
