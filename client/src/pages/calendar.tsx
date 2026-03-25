import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar as CalendarIcon, Clock, MapPin, AlertTriangle, Info, ChevronRight } from 'lucide-react';
import { format, parseISO, isBefore, addDays, startOfDay } from 'date-fns';
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

export default function Calendar() {
  const [, setLocation] = useLocation();
  const { data: inspections, isLoading } = useQuery<UpcomingInspection[]>({
    queryKey: ['/api/inspections/upcoming']
  });

  const isItemOverdue = (item: UpcomingInspection) => {
    const today = startOfDay(new Date());
    if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) return true;
    if (!item.isCompleted && item.propertyNextInspectionDate && isBefore(parseISO(item.propertyNextInspectionDate), today)) {
      const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
      if (!lastInsp || lastInsp < new Date(item.propertyNextInspectionDate)) return true;
    }
    return false;
  };

  const getInspectionStatus = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = startOfDay(new Date());
    const sevenDaysFromNow = addDays(today, 7);
    const thirtyDaysFromNow = addDays(today, 30);

    if (isBefore(date, today)) {
      return { label: "Overdue", variant: "destructive" as const, color: "text-red-600" };
    } else if (isBefore(date, sevenDaysFromNow)) {
      return { label: "Due This Week", variant: "destructive" as const, color: "text-orange-600" };
    } else if (isBefore(date, thirtyDaysFromNow)) {
      return { label: "Due This Month", variant: "secondary" as const, color: "text-yellow-600" };
    } else {
      return { label: "Scheduled", variant: "outline" as const, color: "text-green-600" };
    }
  };

  const groupedInspections = inspections?.filter(inspection => inspection.nextInspectionDate).reduce((acc, inspection) => {
    const date = format(parseISO(inspection.nextInspectionDate), 'yyyy-MM-dd');
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(inspection);
    return acc;
  }, {} as Record<string, UpcomingInspection[]>);

  const sortedDates = groupedInspections 
    ? Object.keys(groupedInspections).sort((a, b) => a.localeCompare(b))
    : [];

  if (isLoading) {
    return (
      <div className="container mx-auto p-6 max-w-6xl">
        <div className="mb-8">
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="space-y-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
          <CalendarIcon className="h-8 w-8" />
          Inspection Calendar
        </h1>
        <p className="text-muted-foreground">
          View and manage upcoming property inspections based on country-specific intervals
        </p>
      </div>

      {!inspections || inspections.length === 0 ? (
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
          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {inspections.filter(i => isItemOverdue(i)).length}
                </div>
                <div className="text-sm text-muted-foreground">Overdue</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-orange-600">
                  {inspections.filter(i => {
                    if (!i.nextInspectionDate) return false;
                    const date = parseISO(i.nextInspectionDate);
                    const today = startOfDay(new Date());
                    const sevenDays = addDays(today, 7);
                    return !isBefore(date, today) && isBefore(date, sevenDays);
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Due This Week</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {inspections.filter(i => {
                    if (!i.nextInspectionDate) return false;
                    const date = parseISO(i.nextInspectionDate);
                    const sevenDays = addDays(startOfDay(new Date()), 7);
                    const thirtyDays = addDays(startOfDay(new Date()), 30);
                    return !isBefore(date, sevenDays) && isBefore(date, thirtyDays);
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Due This Month</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-green-600">
                  {inspections.filter(i => {
                    if (!i.nextInspectionDate) return false;
                    const date = parseISO(i.nextInspectionDate);
                    const thirtyDays = addDays(startOfDay(new Date()), 30);
                    return !isBefore(date, thirtyDays);
                  }).length}
                </div>
                <div className="text-sm text-muted-foreground">Future</div>
              </CardContent>
            </Card>
          </div>

          {/* Grouped Inspections by Date */}
          <div className="space-y-6">
            {sortedDates.map((dateStr) => {
              const inspectionsForDate = groupedInspections![dateStr];
              const dateObj = parseISO(dateStr);
              const { label, color } = getInspectionStatus(dateStr);

              return (
                <Card key={dateStr} className="overflow-hidden" data-testid={`card-date-${dateStr}`}>
                  <CardHeader className="bg-muted/50">
                    <CardTitle className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5" />
                        <span>{format(dateObj, 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <Badge variant={getInspectionStatus(dateStr).variant} className={color}>
                        {label}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="divide-y">
                      {inspectionsForDate.map((inspection) => (
                        <div 
                          key={inspection.id} 
                          className="p-4 hover:bg-primary/5 transition-colors cursor-pointer border-l-4 border-transparent hover:border-primary"
                          onClick={() => setLocation(`/properties/${inspection.propertyId}?room=${inspection.roomId}&item=${inspection.id}`)}
                          data-testid={`inspection-item-${inspection.id}`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-2">
                              <div className="flex items-start gap-3">
                                <AlertTriangle className="h-5 w-5 text-orange-500 mt-0.5 flex-shrink-0" />
                                <div className="flex-1">
                                  <h4 className="font-semibold text-lg" data-testid={`text-item-name-${inspection.id}`}>
                                    {inspection.itemName}
                                  </h4>
                                  <p className="text-sm text-muted-foreground">
                                    {inspection.roomName}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground ml-8">
                                <MapPin className="h-4 w-4 flex-shrink-0" />
                                <span data-testid={`text-property-${inspection.propertyId}`}>
                                  {inspection.propertyAddress}
                                </span>
                              </div>
                              {inspection.legalRequirement && (
                                <div className="flex items-center gap-2 text-sm text-muted-foreground ml-8">
                                  <Info className="h-4 w-4 flex-shrink-0" />
                                  <span>{inspection.legalRequirement}</span>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right flex-shrink-0">
                                <Badge variant="outline" className="text-xs whitespace-nowrap">
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
        </>
      )}

      <div className="mt-8 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <CalendarIcon className="h-4 w-4" />
          About Inspection Intervals
        </h3>
        <p className="text-sm text-muted-foreground">
          Inspection schedules are automatically calculated based on country-specific compliance standards
          when you mark inspection items as complete. Intervals vary by country and item type (e.g., monthly
          for fire extinguishers, 12 months for flexi hoses, 6 months for roof gutters). The calendar displays
          all upcoming inspections sorted by date, helping you stay compliant with local regulations.
        </p>
      </div>
    </div>
  );
}
