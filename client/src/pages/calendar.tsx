import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Clock, MapPin, AlertTriangle, ChevronRight, Info, CheckCircle } from 'lucide-react';
import { format, parseISO, isBefore, addDays, startOfDay, differenceInDays } from 'date-fns';
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

interface Tier {
  id: TierId;
  label: string;
  daysLabel: string;
  headerClass: string;
  labelClass: string;
  borderClass: string;
  badgeClass: string;
  countClass: string;
  icon: (size?: string) => JSX.Element;
}

const TIERS: Tier[] = [
  {
    id: 'overdue',
    label: 'Overdue',
    daysLabel: 'Past due',
    headerClass: 'bg-red-50 border-b border-red-200',
    labelClass: 'text-red-700',
    borderClass: 'border-l-4 border-red-500',
    badgeClass: 'bg-red-100 text-red-800 border border-red-300',
    countClass: 'text-red-600',
    icon: (size = 'h-5 w-5') => <AlertTriangle className={`${size} text-red-600`} />,
  },
  {
    id: 'act_now',
    label: 'Act Now',
    daysLabel: '0–7 days',
    headerClass: 'bg-orange-50 border-b border-orange-200',
    labelClass: 'text-orange-700',
    borderClass: 'border-l-4 border-orange-500',
    badgeClass: 'bg-orange-100 text-orange-800 border border-orange-300',
    countClass: 'text-orange-600',
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
    icon: (size = 'h-5 w-5') => <Clock className={`${size} text-green-500`} />,
  },
  {
    id: 'scheduled',
    label: 'Scheduled',
    daysLabel: '30+ days',
    headerClass: 'bg-gray-50 border-b border-gray-200',
    labelClass: 'text-gray-600',
    borderClass: 'border-l-4 border-gray-300',
    badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300',
    countClass: 'text-gray-500',
    icon: (size = 'h-5 w-5') => <CheckCircle className={`${size} text-gray-400`} />,
  },
];

function getItemTier(item: UpcomingInspection): TierId {
  const today = startOfDay(new Date());

  // Check overdue: item's own nextInspectionDate is past, OR property-level date is past and item uninspected
  if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) {
    return 'overdue';
  }
  if (
    !item.isCompleted &&
    item.propertyNextInspectionDate &&
    isBefore(parseISO(item.propertyNextInspectionDate), today)
  ) {
    const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
    if (!lastInsp || lastInsp < new Date(item.propertyNextInspectionDate)) {
      return 'overdue';
    }
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
  const date = parseISO(item.nextInspectionDate);
  const days = differenceInDays(date, today);
  if (days < 0)  return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `In ${days} day${days === 1 ? '' : 's'}`;
}

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { data: inspections, isLoading } = useQuery<UpcomingInspection[]>({
    queryKey: ['/api/inspections/upcoming']
  });

  // Only work with items that have a scheduled date
  const scheduledItems = inspections?.filter(i => i.nextInspectionDate) ?? [];

  // Bucket items into tiers, sorted by date ascending within each tier
  const tieredInspections = TIERS.reduce<Record<TierId, UpcomingInspection[]>>(
    (acc, tier) => {
      acc[tier.id] = scheduledItems
        .filter(i => getItemTier(i) === tier.id)
        .sort((a, b) =>
          new Date(a.nextInspectionDate).getTime() - new Date(b.nextInspectionDate).getTime()
        );
      return acc;
    },
    { overdue: [], act_now: [], due_soon: [], coming_up: [], scheduled: [] }
  );

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
        <div className="space-y-6">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CalendarIcon className="h-8 w-8" />
          Inspection Calendar
        </h1>
        <p className="text-muted-foreground">
          Upcoming inspections grouped by urgency — condition-adjusted and compliance-aware
        </p>
      </div>

      {scheduledItems.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">No Scheduled Inspections</h3>
            <p className="text-muted-foreground mb-4">
              Complete inspection items to automatically schedule future inspections based on country-specific intervals.
            </p>
            <Link href="/properties">
              <a className="text-primary hover:underline" data-testid="link-view-properties">
                View Properties →
              </a>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* 5-tier summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-8">
            {TIERS.map(tier => (
              <Card key={tier.id}>
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

          {/* Tier sections — only render tiers that have items */}
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
                        <span className={`text-sm font-normal ${tier.labelClass} opacity-70`}>
                          · {tier.daysLabel}
                        </span>
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
                          onClick={() =>
                            setLocation(
                              `/properties/${inspection.propertyId}?room=${inspection.roomId}&item=${inspection.id}`
                            )
                          }
                          data-testid={`inspection-item-${inspection.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-1.5">
                              {/* Item name + room */}
                              <div className="flex items-start gap-3">
                                {tier.icon('h-4 w-4 mt-1 flex-shrink-0')}
                                <div className="flex-1">
                                  <h4
                                    className="font-semibold text-base leading-tight"
                                    data-testid={`text-item-name-${inspection.id}`}
                                  >
                                    {inspection.itemName}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.roomName}
                                  </p>
                                </div>
                              </div>

                              {/* Property address */}
                              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
                                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                                <span data-testid={`text-property-${inspection.propertyId}`}>
                                  {inspection.propertyAddress}
                                </span>
                              </div>

                              {/* Legal requirement */}
                              {inspection.legalRequirement && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-7">
                                  <Info className="h-3.5 w-3.5 flex-shrink-0" />
                                  <span>{inspection.legalRequirement}</span>
                                </div>
                              )}
                            </div>

                            {/* Right column: date info */}
                            <div className="flex items-center gap-3 flex-shrink-0">
                              <div className="text-right">
                                {/* Due date */}
                                <p className="text-sm font-medium">
                                  {format(parseISO(inspection.nextInspectionDate), 'MMM d, yyyy')}
                                </p>
                                {/* Days countdown */}
                                <p className={`text-xs font-semibold ${tier.labelClass}`}>
                                  {getDaysLabel(inspection)}
                                </p>
                                {/* Interval badge */}
                                <Badge variant="outline" className="text-xs mt-1 whitespace-nowrap">
                                  Every {inspection.visualInspectionInterval}
                                </Badge>
                                {/* Last inspected */}
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
