import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ShieldCheck,
  ShieldX,
  History,
  Ban,
  Play,
  ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays, isPast } from 'date-fns';

interface InspectionItem {
  id: number;
  name?: string;
  itemName?: string;
  lastInspectedDate: string | Date | null;
  nextInspectionDate: string | Date | null;
  condition: string | null;
  isNotApplicable: boolean;
  isCompleted?: boolean;
  roomId: number;
}

interface RoomInfo {
  id: number;
  roomName: string;
}

interface InspectionStatusCardsProps {
  inspectionItems: InspectionItem[];
  onMarkAllAsBaseline: () => void;
  onStartFirstInspection: () => void;
  isMarkingBaseline?: boolean;
  propertyNextInspectionDate?: string | Date | null;
  rooms?: RoomInfo[];
  onRoomClick?: (roomId: number) => void;
  onOverdueClick?: () => void;
}

export default function InspectionStatusCards({
  inspectionItems,
  onMarkAllAsBaseline,
  onStartFirstInspection,
  isMarkingBaseline = false,
  propertyNextInspectionDate,
  rooms = [],
  onRoomClick,
  onOverdueClick
}: InspectionStatusCardsProps) {
  const [showBaselineConfirm, setShowBaselineConfirm] = useState(false);
  
  const now = new Date();
  
  const applicableItems = inspectionItems.filter(item => !item.isNotApplicable);
  const naItems = inspectionItems.filter(item => item.isNotApplicable);
  
  const inspectedItems = applicableItems.filter(item => item.lastInspectedDate);
  const neverInspectedItems = applicableItems.filter(item => !item.lastInspectedDate);
  
  const lastInspectedItem = inspectedItems.length > 0
    ? inspectedItems.reduce((latest, item) => {
        const latestDate = latest.lastInspectedDate ? new Date(latest.lastInspectedDate) : new Date(0);
        const itemDate = item.lastInspectedDate ? new Date(item.lastInspectedDate) : new Date(0);
        return itemDate > latestDate ? item : latest;
      })
    : null;
  
  const upcomingItems = applicableItems
    .filter(item => item.nextInspectionDate)
    .sort((a, b) => {
      const dateA = new Date(a.nextInspectionDate!);
      const dateB = new Date(b.nextInspectionDate!);
      return dateA.getTime() - dateB.getTime();
    });
  
  const nextDueItem = upcomingItems.length > 0 ? upcomingItems[0] : null;
  
  const propertyIsOverdue = propertyNextInspectionDate && isPast(new Date(propertyNextInspectionDate));
  const propNextDate = propertyNextInspectionDate ? new Date(propertyNextInspectionDate) : null;
  
  const itemLevelOverdue = upcomingItems.filter(item => 
    item.nextInspectionDate && isPast(new Date(item.nextInspectionDate))
  );
  
  const propertyLevelOverdue = propertyIsOverdue && propNextDate
    ? applicableItems.filter(item => {
        if (item.nextInspectionDate && isPast(new Date(item.nextInspectionDate))) return false;
        if (item.isCompleted) return false;
        const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
        return !lastInsp || lastInsp < propNextDate;
      })
    : [];

  const overdueItems = [...itemLevelOverdue, ...propertyLevelOverdue];
  
  const conditionCounts = {
    good: inspectedItems.filter(i => i.condition === 'good').length,
    average: inspectedItems.filter(i => i.condition === 'average').length,
    poor: inspectedItems.filter(i => i.condition === 'poor').length,
  };
  
  const recentInspections = inspectedItems
    .sort((a, b) => {
      const dateA = a.lastInspectedDate ? new Date(a.lastInspectedDate) : new Date(0);
      const dateB = b.lastInspectedDate ? new Date(b.lastInspectedDate) : new Date(0);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 5);

  const hasNoPreviousInspection = inspectedItems.length === 0 && applicableItems.length > 0;

  const handleMarkAsBaseline = () => {
    setShowBaselineConfirm(false);
    onMarkAllAsBaseline();
  };

  if (applicableItems.length === 0 && naItems.length === 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <ShieldCheck className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">No inspection items yet</p>
        <p className="text-xs text-gray-500 mt-1">Add rooms and items to start tracking inspections</p>
      </div>
    );
  }

  if (applicableItems.length === 0 && naItems.length > 0) {
    return (
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-center">
        <Ban className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600">All {naItems.length} items marked as N/A</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {hasNoPreviousInspection ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium text-amber-900">No Previous Inspections</h4>
                <p className="text-sm text-amber-700 mt-1">
                  This property has {applicableItems.length} item{applicableItems.length > 1 ? 's' : ''} that {applicableItems.length > 1 ? 'have' : 'has'} never been inspected.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <Button
                    size="sm"
                    onClick={onStartFirstInspection}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Start First Inspection
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowBaselineConfirm(true)}
                    disabled={isMarkingBaseline}
                    className="border-amber-300 text-amber-700 hover:bg-amber-100"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" />
                    {isMarkingBaseline ? 'Marking...' : 'Mark All as Baseline'}
                  </Button>
                </div>
                <p className="text-xs text-amber-600 mt-2">
                  "Mark as Baseline" sets today as the initial inspection date with "Good" condition
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1.5 bg-green-100 rounded">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                </div>
                <h4 className="font-medium text-sm">Last Inspection</h4>
              </div>
              
              {lastInspectedItem && lastInspectedItem.lastInspectedDate ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {format(new Date(lastInspectedItem.lastInspectedDate), 'MMM d')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(lastInspectedItem.lastInspectedDate), 'yyyy')}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {formatDistanceToNow(new Date(lastInspectedItem.lastInspectedDate), { addSuffix: true })}
                  </p>
                  <Separator className="my-2" />
                  <div className="flex gap-1 text-xs flex-wrap">
                    <Badge variant="secondary" className="bg-green-100 text-green-700 px-1.5 py-0.5 text-[10px]">
                      {conditionCounts.good} Good
                    </Badge>
                    <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 px-1.5 py-0.5 text-[10px]">
                      {conditionCounts.average} Fair
                    </Badge>
                    <Badge variant="secondary" className="bg-red-100 text-red-700 px-1.5 py-0.5 text-[10px]">
                      {conditionCounts.poor} Poor
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No inspections recorded</p>
              )}
            </CardContent>
          </Card>

          <Card 
            className={`${overdueItems.length > 0 ? 'border-red-200' : ''} ${overdueItems.length > 0 && onOverdueClick ? 'cursor-pointer hover:bg-red-50 transition-colors' : ''}`}
            onClick={overdueItems.length > 0 && onOverdueClick ? onOverdueClick : undefined}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-1.5 rounded ${overdueItems.length > 0 ? 'bg-red-100' : 'bg-blue-100'}`}>
                  <Calendar className={`w-4 h-4 ${overdueItems.length > 0 ? 'text-red-600' : 'text-blue-600'}`} />
                </div>
                <h4 className="font-medium text-sm">
                  {overdueItems.length > 0 ? 'Overdue Inspections' : 'Upcoming Inspection'}
                </h4>
              </div>
              
              {overdueItems.length > 0 ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-red-600">
                      {overdueItems.length}
                    </span>
                    <Badge variant="destructive" className="text-xs">
                      Overdue
                    </Badge>
                  </div>
                  <p className="text-xs text-red-600">
                    {overdueItems.length} item{overdueItems.length > 1 ? 's' : ''} past due date
                  </p>
                  {onOverdueClick && (
                    <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                      Tap to see affected rooms <ChevronRight className="w-3 h-3" />
                    </p>
                  )}
                </div>
              ) : nextDueItem && nextDueItem.nextInspectionDate ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold text-gray-900">
                      {format(new Date(nextDueItem.nextInspectionDate), 'MMM d')}
                    </span>
                    <span className="text-sm text-gray-500">
                      {format(new Date(nextDueItem.nextInspectionDate), 'yyyy')}
                    </span>
                  </div>
                  {(() => {
                    const daysUntil = differenceInDays(new Date(nextDueItem.nextInspectionDate), now);
                    return (
                      <p className={`text-xs ${daysUntil <= 7 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {daysUntil === 0 ? 'Due today' : 
                         daysUntil === 1 ? 'Due tomorrow' :
                         daysUntil < 0 ? `${Math.abs(daysUntil)} days overdue` :
                         `In ${daysUntil} days`}
                      </p>
                    );
                  })()}
                  <Separator className="my-2" />
                  <p className="text-xs text-gray-600 truncate" title={nextDueItem.itemName || nextDueItem.name}>
                    Next: {nextDueItem.itemName || nextDueItem.name}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">No upcoming inspections scheduled</p>
                  <p className="text-xs text-gray-400">
                    Complete an inspection to schedule the next one
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {neverInspectedItems.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="not-inspected" className="border border-amber-200 rounded-lg bg-amber-50">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-700">
                  {neverInspectedItems.length} item{neverInspectedItems.length > 1 ? 's' : ''} never inspected
                </span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-3">
                {(() => {
                  const roomMap = new Map(rooms.map(r => [r.id, r.roomName]));
                  const grouped = new Map<number, InspectionItem[]>();
                  neverInspectedItems.forEach(item => {
                    const list = grouped.get(item.roomId) || [];
                    list.push(item);
                    grouped.set(item.roomId, list);
                  });
                  return Array.from(grouped.entries()).map(([roomId, items]) => (
                    <div key={roomId}>
                      <div
                        className={`text-xs font-semibold text-amber-800 mb-1 ${onRoomClick ? 'cursor-pointer hover:underline' : ''}`}
                        onClick={() => onRoomClick?.(roomId)}
                      >
                        {roomMap.get(roomId) || `Room ${roomId}`} ({items.length})
                      </div>
                      <div className="space-y-1">
                        {items.map(item => (
                          <div
                            key={item.id}
                            className={`flex items-center justify-between p-2 bg-white rounded border border-amber-100 text-sm ${onRoomClick ? 'cursor-pointer hover:bg-amber-100 transition-colors' : ''}`}
                            onClick={() => onRoomClick?.(roomId)}
                          >
                            <span className="text-gray-700 truncate">{item.itemName || item.name}</span>
                            <Badge variant="outline" className="text-xs border-amber-300 text-amber-600 flex-shrink-0 ml-2">
                              Not inspected
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {recentInspections.length > 0 && (
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="history" className="border rounded-lg">
            <AccordionTrigger className="px-4 py-3 hover:no-underline">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium">Recent History</span>
                <Badge variant="secondary" className="ml-2 text-xs">
                  {inspectedItems.length} inspected
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              <div className="space-y-2">
                {recentInspections.map((item, index) => (
                  <div 
                    key={item.id}
                    className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        item.condition === 'good' ? 'bg-green-500' :
                        item.condition === 'average' ? 'bg-yellow-500' :
                        item.condition === 'poor' ? 'bg-red-500' :
                        'bg-gray-400'
                      }`} />
                      <span className="text-sm truncate">{item.itemName || item.name}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge 
                        variant="outline" 
                        className={`text-xs capitalize ${
                          item.condition === 'good' ? 'border-green-300 text-green-700' :
                          item.condition === 'average' ? 'border-yellow-300 text-yellow-700' :
                          item.condition === 'poor' ? 'border-red-300 text-red-700' :
                          ''
                        }`}
                      >
                        {item.condition || 'Unknown'}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {item.lastInspectedDate && format(new Date(item.lastInspectedDate), 'MMM d')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {naItems.length > 0 && (
        <div className="flex items-center p-2 bg-gray-50 border border-gray-200 rounded-lg text-sm">
          <Ban className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
          <span className="text-gray-600">
            {naItems.length} item{naItems.length > 1 ? 's' : ''} marked as N/A
          </span>
        </div>
      )}

      <AlertDialog open={showBaselineConfirm} onOpenChange={setShowBaselineConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark All Items as Baseline?</AlertDialogTitle>
            <AlertDialogDescription>
              This will set today's date as the initial inspection date for all {neverInspectedItems.length} uninspected items and mark their condition as "Good". 
              This is useful for new properties where you want to establish a starting point.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsBaseline}>
              Mark as Baseline
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
