import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { calculateComplianceStatus } from '@/lib/compliance-utils';
import { InspectionItem } from '@shared/schema';

interface ComplianceDateSectionProps {
  item: InspectionItem;
  onUpdate: (data: { lastReplacementDate?: Date; nextReplacementDue?: Date }) => void;
}

export function ComplianceDateSection({ item, onUpdate }: ComplianceDateSectionProps) {
  if (!item.complianceStandard || !item.complianceYears) {
    return null;
  }

  const statusInfo = calculateComplianceStatus(item);
  const [lastDate, setLastDate] = useState(
    item.lastReplacementDate ? format(new Date(item.lastReplacementDate), 'yyyy-MM-dd') : ''
  );
  const [dueDate, setDueDate] = useState(
    item.nextReplacementDue ? format(new Date(item.nextReplacementDue), 'yyyy-MM-dd') : ''
  );

  const handleLastDateChange = (value: string) => {
    setLastDate(value);
    if (value) {
      onUpdate({ lastReplacementDate: new Date(value) });
    }
  };

  const handleDueDateChange = (value: string) => {
    setDueDate(value);
    if (value) {
      onUpdate({ nextReplacementDue: new Date(value) });
    }
  };

  return (
    <Card className="mt-3 bg-blue-50 border-blue-200">
      <CardContent className="p-4">
        <div className="flex items-center mb-3">
          <Calendar className="w-5 h-5 mr-2 text-blue-600" />
          <h5 className="font-medium text-blue-900">Compliance Date Tracking</h5>
        </div>
        
        <div className="space-y-3">
          <div className="text-sm text-blue-800 bg-blue-100 p-2 rounded">
            <strong>{item.complianceStandard}</strong>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <Label htmlFor={`last-date-${item.id}`} className="text-sm font-medium text-gray-700">
                Last Replacement/Service Date
              </Label>
              <Input
                id={`last-date-${item.id}`}
                type="date"
                value={lastDate}
                onChange={(e) => handleLastDateChange(e.target.value)}
                className="mt-1"
                data-testid={`input-last-replacement-${item.id}`}
              />
            </div>
            
            <div>
              <Label htmlFor={`due-date-${item.id}`} className="text-sm font-medium text-gray-700">
                Next Due Date
              </Label>
              <Input
                id={`due-date-${item.id}`}
                type="date"
                value={dueDate}
                onChange={(e) => handleDueDateChange(e.target.value)}
                className="mt-1"
                data-testid={`input-next-due-${item.id}`}
              />
            </div>
          </div>
          
          {statusInfo.nextDueDate && (
            <div className="flex items-center text-sm text-gray-600 bg-white p-2 rounded">
              <Clock className="w-4 h-4 mr-2" />
              <span>{statusInfo.message}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
