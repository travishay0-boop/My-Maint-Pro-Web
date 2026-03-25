import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function MaintenanceCalendar() {
  const [currentDate, setCurrentDate] = useState(new Date());

  // Mock calendar data - in a real app, this would come from an API
  const calendarEvents: Record<string, Array<{ type: string; title: string; color: string }>> = {
    '2024-12-02': [{ type: 'inspection', title: 'Roof Inspection', color: 'bg-blue-400' }],
    '2024-12-04': [
      { type: 'cleaning', title: 'Gutter Cleaning', color: 'bg-orange-400' },
      { type: 'hvac', title: 'HVAC Service', color: 'bg-green-400' }
    ],
    '2024-12-07': [{ type: 'plumbing', title: 'Plumbing Inspection', color: 'bg-red-400' }],
    '2024-12-10': [{ type: 'safety', title: 'Fire Safety Check', color: 'bg-purple-400' }],
    '2024-12-11': [{ type: 'cleaning', title: 'Window Cleaning', color: 'bg-yellow-400' }],
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const today = new Date();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  
  // Generate calendar days
  const calendarDays = [];
  
  // Empty cells for days before month starts
  for (let i = 0; i < firstDay; i++) {
    calendarDays.push(null);
  }
  
  // Days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(new Date(year, month + (direction === 'next' ? 1 : -1), 1));
  };

  const formatDateKey = (day: number) => {
    return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  };

  const isToday = (day: number) => {
    return today.getDate() === day && 
           today.getMonth() === month && 
           today.getFullYear() === year;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Maintenance Calendar</CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigateMonth('prev')}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <span className="text-sm font-medium min-w-[120px] text-center">
              {monthNames[month]} {year}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigateMonth('next')}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {/* Day Headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar Days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="p-2 h-20" />;
            }

            const dateKey = formatDateKey(day);
            const events = calendarEvents[dateKey] || [];
            const todayClass = isToday(day);

            return (
              <div
                key={`day-${index}-${day}`}
                className={`p-2 h-20 border border-gray-100 hover:bg-gray-50 cursor-pointer relative ${
                  todayClass ? 'bg-blue-50 border-blue-200' : ''
                }`}
              >
                <span className={`text-sm ${todayClass ? 'text-blue-700 font-medium' : 'text-gray-700'}`}>
                  {day}
                </span>
                {todayClass && (
                  <span className="absolute top-1 right-1 text-xs text-blue-600">Today</span>
                )}
                <div className="absolute bottom-1 left-1 right-1">
                  {events.slice(0, 2).map((event: { type: string; title: string; color: string }, eventIndex: number) => (
                    <div
                      key={`${day}-event-${eventIndex}`}
                      className={`h-1 ${event.color} rounded-full mb-1`}
                      title={event.title}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-blue-400 rounded-full" />
            <span className="text-gray-600">Roof Inspection</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-orange-400 rounded-full" />
            <span className="text-gray-600">Gutter Cleaning</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-green-400 rounded-full" />
            <span className="text-gray-600">HVAC Service</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-1 bg-red-400 rounded-full" />
            <span className="text-gray-600">Plumbing</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
