import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isBefore, startOfDay, differenceInDays, parseISO } from 'date-fns';

interface UpcomingInspection {
  id: number;
  itemName: string;
  nextInspectionDate: string;
  propertyId: number;
  propertyAddress: string;
  roomId: number;
  roomName: string;
}

type DotColor = 'bg-red-500' | 'bg-orange-400' | 'bg-amber-400' | 'bg-green-400' | 'bg-gray-300';

function getUrgencyColor(dateStr: string): DotColor {
  const today = startOfDay(new Date());
  const date = parseISO(dateStr);
  if (isBefore(date, today)) return 'bg-red-500';
  const days = differenceInDays(date, today);
  if (days <= 7)  return 'bg-orange-400';
  if (days <= 14) return 'bg-amber-400';
  if (days <= 30) return 'bg-green-400';
  return 'bg-gray-300';
}

export default function MaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [, setLocation] = useLocation();

  const { data: inspections = [] } = useQuery<UpcomingInspection[]>({
    queryKey: ['/api/inspections/upcoming'],
  });

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const calendarDays: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) calendarDays.push(null);
  for (let day = 1; day <= daysInMonth; day++) calendarDays.push(day);

  const navigateMonth = (direction: 'prev' | 'next') => {
    setSelectedDay(null);
    setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
  };

  const formatDateKey = (day: number) =>
    `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;

  const isToday = (day: number) =>
    today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

  // Build a map of dateKey → inspections due that day
  const eventsByDate: Record<string, UpcomingInspection[]> = {};
  for (const insp of inspections) {
    if (!insp.nextInspectionDate) continue;
    const key = insp.nextInspectionDate.slice(0, 10);
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(insp);
  }

  const selectedDateKey = selectedDay !== null ? formatDateKey(selectedDay) : null;
  const selectedItems = selectedDateKey ? (eventsByDate[selectedDateKey] ?? []) : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Maintenance Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" onClick={() => navigateMonth('prev')}>
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button variant="ghost" size="sm" onClick={() => navigateMonth('next')}>
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}

          {calendarDays.map((day, index) => {
            if (day === null) return <div key={`empty-${index}`} className="p-2 h-20" />;

            const dateKey = formatDateKey(day);
            const events = eventsByDate[dateKey] ?? [];
            const todayClass = isToday(day);
            const isSelected = selectedDay === day;
            const hasEvents = events.length > 0;

            // Pick the most urgent color for the dot indicator
            const dotColor = hasEvents
              ? getUrgencyColor(events[0].nextInspectionDate)
              : null;

            return (
              <div
                key={`day-${index}-${day}`}
                onClick={() => {
                  if (hasEvents) {
                    setSelectedDay(isSelected ? null : day);
                  }
                }}
                className={`p-2 h-20 border rounded transition-colors relative
                  ${todayClass ? 'bg-blue-50 border-blue-200' : 'border-gray-100'}
                  ${hasEvents ? 'cursor-pointer hover:bg-primary/5' : 'cursor-default'}
                  ${isSelected ? 'ring-2 ring-primary ring-offset-1' : ''}
                `}
              >
                <span className={`text-sm font-medium ${todayClass ? 'text-blue-700' : 'text-gray-700'}`}>
                  {day}
                </span>
                {todayClass && (
                  <span className="absolute top-1 right-1 text-xs text-blue-600">Today</span>
                )}
                {dotColor && (
                  <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-0.5">
                    <span className={`w-2 h-2 rounded-full ${dotColor}`} title={`${events.length} item${events.length !== 1 ? 's' : ''} due`} />
                    {events.length > 1 && (
                      <span className="text-xs text-gray-500 leading-none">+{events.length - 1}</span>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Selected day items panel */}
        {selectedDay !== null && selectedItems.length > 0 && (
          <div className="mt-4 border rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">
                {monthNames[month]} {selectedDay} — {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} due
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => setLocation('/calendar')}
              >
                View all →
              </Button>
            </div>
            <div className="divide-y max-h-48 overflow-y-auto">
              {selectedItems.map(item => (
                <div
                  key={item.id}
                  className="px-3 py-2 hover:bg-primary/5 cursor-pointer flex items-center justify-between gap-2"
                  onClick={() =>
                    setLocation(`/properties/${item.propertyId}?room=${item.roomId}&item=${item.id}`)
                  }
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.itemName}</p>
                    <p className="text-xs text-gray-500 truncate">{item.propertyAddress} · {item.roomName}</p>
                  </div>
                  <span className={`flex-shrink-0 w-2 h-2 rounded-full ${getUrgencyColor(item.nextInspectionDate)}`} />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500" />Overdue</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-orange-400" />This week</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-amber-400" />Due soon</div>
          <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-green-400" />Coming up</div>
        </div>
      </CardContent>
    </Card>
  );
}
