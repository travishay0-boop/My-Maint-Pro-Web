import { useMemo } from 'react';
import { AlertTriangle, Clock, CheckCircle, Camera } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { calculateComplianceStatus } from '@/lib/compliance-utils';
import { InspectionItem } from '@shared/schema';

interface ComplianceSummaryPanelProps {
  allItems: InspectionItem[];
}

export function ComplianceSummaryPanel({ allItems }: ComplianceSummaryPanelProps) {
  const complianceSummary = useMemo(() => {
    const complianceItems = allItems.filter(item => {
      if (!item.complianceStandard) return false;
      const status = calculateComplianceStatus(item);
      return status.status !== 'not_applicable';
    });

    const stats = {
      total: complianceItems.length,
      overdue: 0,
      dueSoon: 0,
      compliant: 0,
      pending: 0,
      photoRequired: 0,
      photosCaptured: 0
    };

    const upcomingItems: Array<{ item: InspectionItem; daysRemaining: number }> = [];

    complianceItems.forEach(item => {
      const status = calculateComplianceStatus(item);
      
      if (status.status === 'overdue') stats.overdue++;
      else if (status.status === 'due_soon') {
        stats.dueSoon++;
        if (status.daysRemaining !== null) {
          upcomingItems.push({ item, daysRemaining: status.daysRemaining });
        }
      }
      else if (status.status === 'compliant') stats.compliant++;
      else if (status.status === 'pending') stats.pending++;

      if (item.photoRequired) {
        stats.photoRequired++;
        if (item.photoUrl) stats.photosCaptured++;
      }
    });

    upcomingItems.sort((a, b) => a.daysRemaining - b.daysRemaining);

    return { stats, upcomingItems: upcomingItems.slice(0, 5) };
  }, [allItems]);

  if (complianceSummary.stats.total === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 flex items-center">
        <CheckCircle className="w-5 h-5 mr-2 text-blue-600" />
        Compliance Overview
      </h3>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className={complianceSummary.stats.overdue > 0 ? 'border-red-500 bg-red-50' : ''}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className={`w-6 h-6 ${complianceSummary.stats.overdue > 0 ? 'text-red-600' : 'text-gray-400'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{complianceSummary.stats.overdue}</div>
            <div className="text-xs text-gray-600 uppercase">Overdue</div>
          </CardContent>
        </Card>

        <Card className={complianceSummary.stats.dueSoon > 0 ? 'border-orange-500 bg-orange-50' : ''}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className={`w-6 h-6 ${complianceSummary.stats.dueSoon > 0 ? 'text-orange-600' : 'text-gray-400'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{complianceSummary.stats.dueSoon}</div>
            <div className="text-xs text-gray-600 uppercase">Due Soon (90d)</div>
          </CardContent>
        </Card>

        <Card className={complianceSummary.stats.compliant > 0 ? 'border-green-500 bg-green-50' : ''}>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className={`w-6 h-6 ${complianceSummary.stats.compliant > 0 ? 'text-green-600' : 'text-gray-400'}`} />
            </div>
            <div className="text-2xl font-bold text-gray-900">{complianceSummary.stats.compliant}</div>
            <div className="text-xs text-gray-600 uppercase">Compliant</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center mb-2">
              <Camera className="w-6 h-6 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {complianceSummary.stats.photosCaptured}/{complianceSummary.stats.photoRequired}
            </div>
            <div className="text-xs text-gray-600 uppercase">Photos Captured</div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Due Items */}
      {complianceSummary.upcomingItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Upcoming Compliance Items (Next 90 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {complianceSummary.upcomingItems.map(({ item, daysRemaining }) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{item.itemName}</div>
                    <div className="text-xs text-gray-500">{item.complianceStandard}</div>
                  </div>
                  <Badge variant="outline" className="bg-orange-50 text-orange-800">
                    {daysRemaining} days
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Separator />
    </div>
  );
}
