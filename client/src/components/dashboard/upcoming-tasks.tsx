import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Clock, CheckCircle, MapPin } from 'lucide-react';
import { Link } from 'wouter';
import { format, parseISO, isBefore, differenceInDays, startOfDay } from 'date-fns';

interface UpcomingInspection {
  id: number;
  itemName: string;
  nextInspectionDate: string;
  lastInspectedDate: string | null;
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

function getItemTier(item: UpcomingInspection): TierId {
  const today = startOfDay(new Date());
  if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) return 'overdue';
  if (!item.nextInspectionDate) return 'scheduled';
  const days = differenceInDays(parseISO(item.nextInspectionDate), today);
  if (days <= 7)  return 'act_now';
  if (days <= 14) return 'due_soon';
  if (days <= 30) return 'coming_up';
  return 'scheduled';
}

const TIER_CONFIG: Record<TierId, { label: string; badgeClass: string; iconType: 'alert' | 'clock' | 'check' }> = {
  overdue:   { label: 'Time to Act', badgeClass: 'bg-red-100 text-red-800 border border-red-300',         iconType: 'alert' },
  act_now:   { label: 'This Week',   badgeClass: 'bg-orange-100 text-orange-800 border border-orange-300', iconType: 'alert' },
  due_soon:  { label: 'Due Soon',    badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300',    iconType: 'clock' },
  coming_up: { label: 'Coming Up',   badgeClass: 'bg-green-100 text-green-800 border border-green-300',    iconType: 'clock' },
  scheduled: { label: 'All Clear',   badgeClass: 'bg-gray-100 text-gray-700 border border-gray-300',       iconType: 'check' },
};

function TierIcon({ type }: { type: 'alert' | 'clock' | 'check' }) {
  if (type === 'alert') return <AlertTriangle className="h-3 w-3" />;
  if (type === 'clock') return <Clock className="h-3 w-3" />;
  return <CheckCircle className="h-3 w-3" />;
}

const TIER_ORDER: TierId[] = ['overdue', 'act_now', 'due_soon', 'coming_up', 'scheduled'];

function getDaysLabel(item: UpcomingInspection): string {
  if (!item.nextInspectionDate) return 'No date set';
  const today = startOfDay(new Date());
  const days = differenceInDays(parseISO(item.nextInspectionDate), today);
  if (days < 0)  return `${Math.abs(days)}d overdue`;
  if (days === 0) return 'Due today';
  return `In ${days} day${days === 1 ? '' : 's'}`;
}

const BORDER_CLASSES: Record<TierId, string> = {
  overdue:   'border-l-4 border-red-500',
  act_now:   'border-l-4 border-orange-500',
  due_soon:  'border-l-4 border-amber-400',
  coming_up: 'border-l-4 border-green-400',
  scheduled: 'border-l-4 border-gray-300',
};

export default function UpcomingTasks() {
  const { data: inspections, isLoading } = useQuery<UpcomingInspection[]>({
    queryKey: ['/api/inspections/upcoming'],
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Upcoming Maintenance Tasks</CardTitle>
            <Skeleton className="h-8 w-20" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center space-x-3 p-3 border rounded-lg">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Sort by urgency tier then by date, show top 8
  const sorted = (inspections ?? [])
    .slice()
    .sort((a, b) => {
      const tierDiff = TIER_ORDER.indexOf(getItemTier(a)) - TIER_ORDER.indexOf(getItemTier(b));
      if (tierDiff !== 0) return tierDiff;
      if (!a.nextInspectionDate) return 1;
      if (!b.nextInspectionDate) return -1;
      return parseISO(a.nextInspectionDate).getTime() - parseISO(b.nextInspectionDate).getTime();
    })
    .slice(0, 8);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Upcoming Maintenance Tasks</CardTitle>
          <Link href="/calendar">
            <Button variant="outline" size="sm">View All</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {sorted.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No upcoming maintenance tasks
          </div>
        ) : (
          <div className="space-y-2">
            {sorted.map((item) => {
              const tier = getItemTier(item);
              const config = TIER_CONFIG[tier];
              return (
                <Link key={item.id} href={`/properties/${item.propertyId}`}>
                  <div className={`flex items-center justify-between p-3 rounded-lg bg-white border hover:bg-gray-50 cursor-pointer transition-colors ${BORDER_CLASSES[tier]}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">
                          {item.itemName}
                        </span>
                        <Badge className={`flex items-center gap-1 text-xs px-1.5 py-0 ${config.badgeClass}`}>
                          <TierIcon type={config.iconType} />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500 truncate">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{item.propertyName} — {item.roomName}</span>
                      </div>
                    </div>
                    <div className="ml-3 text-xs text-gray-500 whitespace-nowrap flex-shrink-0">
                      {getDaysLabel(item)}
                    </div>
                  </div>
                </Link>
              );
            })}
            {(inspections?.length ?? 0) > 8 && (
              <Link href="/calendar">
                <div className="text-center py-2 text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
                  View {(inspections?.length ?? 0) - 8} more in Calendar →
                </div>
              </Link>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
