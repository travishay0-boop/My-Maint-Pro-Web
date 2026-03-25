import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocation } from 'wouter';
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  Home,
  Shield,
  TrendingUp,
  Calendar,
  EyeOff
} from 'lucide-react';

interface PropertyCompliance {
  id: number;
  name: string;
  address: string;
  status: 'overdue' | 'due_soon' | 'compliant';
  nextInspectionDate: string | null;
  completionRate: number;
  overdueItems: number;
  totalItems: number;
  notInspectedItems: number;
}

interface PortfolioData {
  totalItems: number;
  completedItems: number;
  overdueItems: number;
  dueSoonItems: number;
  compliantItems: number;
  notApplicableItems: number;
  notInspectedItems: number;
}

interface ComplianceInsightsData {
  overdue: PropertyCompliance[];
  dueSoon: PropertyCompliance[];
  compliant: PropertyCompliance[];
  totalProperties: number;
  overallComplianceRate: number;
  portfolio: PortfolioData;
}

export default function ComplianceInsights() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data, isLoading } = useQuery({
    queryKey: ['/api/dashboard/compliance-insights', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/dashboard/compliance-insights/${user.agencyId}`);
      return response.json() as Promise<ComplianceInsightsData>;
    },
    enabled: !!user?.agencyId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Compliance Overview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500 text-sm">No compliance data available</p>
        </CardContent>
      </Card>
    );
  }

  // Portfolio data with fallback for cached responses
  const portfolio = data.portfolio || {
    totalItems: 0,
    completedItems: 0,
    overdueItems: 0,
    dueSoonItems: 0,
    compliantItems: 0,
    notApplicableItems: 0,
    notInspectedItems: 0,
  };
  
  // Portfolio-level inspection item counts (aggregated across ALL properties)
  const itemStatusData = [
    {
      label: 'Overdue Items',
      count: portfolio.overdueItems,
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: AlertTriangle,
    },
    {
      label: 'Not Inspected',
      count: portfolio.notInspectedItems,
      color: 'bg-slate-500',
      textColor: 'text-slate-700',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-200',
      icon: EyeOff,
    },
    {
      label: 'Due Soon',
      count: portfolio.dueSoonItems,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: Clock,
    },
    {
      label: 'Compliant',
      count: portfolio.compliantItems,
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
    },
  ];
  
  // Property-level status for detailed view
  const funnelData = [
    {
      label: 'Overdue',
      count: data.overdue.length,
      color: 'bg-red-500',
      textColor: 'text-red-700',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      icon: AlertTriangle,
      properties: data.overdue,
    },
    {
      label: 'Due This Week',
      count: data.dueSoon.length,
      color: 'bg-amber-500',
      textColor: 'text-amber-700',
      bgColor: 'bg-amber-50',
      borderColor: 'border-amber-200',
      icon: Clock,
      properties: data.dueSoon,
    },
    {
      label: 'Compliant',
      count: data.compliant.length,
      color: 'bg-green-500',
      textColor: 'text-green-700',
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      icon: CheckCircle2,
      properties: data.compliant,
    },
  ];

  return (
    <Card className="overflow-hidden" data-testid="card-compliance-insights">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Compliance Overview
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-primary"
            onClick={() => setLocation('/calendar')}
            data-testid="button-view-calendar"
          >
            View Calendar
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Portfolio Compliance Rate - Based on actual inspection items */}
        <div className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-gray-700">Portfolio Compliance Rate</span>
            </div>
            <span className="text-2xl font-bold text-primary" data-testid="text-compliance-rate">
              {data.overallComplianceRate}%
            </span>
          </div>
          <Progress value={data.overallComplianceRate} className="h-2" />
          <p className="text-xs text-gray-500 mt-2">
            {portfolio.completedItems} of {portfolio.totalItems - portfolio.notApplicableItems} inspection items completed across {data.totalProperties} {data.totalProperties === 1 ? 'property' : 'properties'}
          </p>
        </div>

        {/* Portfolio-Level Inspection Items Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Inspection Items Status
          </h4>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {itemStatusData.map((item) => (
              <div
                key={item.label}
                className={`p-3 rounded-lg border ${item.bgColor} ${item.borderColor}`}
                data-testid={`card-items-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={`w-4 h-4 ${item.textColor}`} />
                  <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
                </div>
                <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
                <p className="text-xs text-gray-500">
                  {item.count === 1 ? 'item' : 'items'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Property-Level Status */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
            <Home className="w-4 h-4" />
            Properties by Status
          </h4>
          
          <div className="grid grid-cols-3 gap-3">
            {funnelData.map((item) => (
              <div
                key={item.label}
                className={`p-3 rounded-lg border ${item.bgColor} ${item.borderColor} cursor-pointer hover:shadow-md transition-all`}
                onClick={() => {
                  if (item.count > 0 && item.properties[0]) {
                    setLocation(`/properties/${item.properties[0].id}`);
                  }
                }}
                data-testid={`card-status-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <item.icon className={`w-4 h-4 ${item.textColor}`} />
                  <span className={`text-xs font-medium ${item.textColor}`}>{item.label}</span>
                </div>
                <p className={`text-2xl font-bold ${item.textColor}`}>{item.count}</p>
                <p className="text-xs text-gray-500">
                  {item.count === 1 ? 'property' : 'properties'}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Properties Needing Attention */}
        {data.overdue.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Needs Immediate Attention
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {data.overdue.slice(0, 5).map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-3 bg-red-50 border border-red-100 rounded-lg cursor-pointer hover:bg-red-100 transition-colors"
                  onClick={() => setLocation(`/properties/${property.id}`)}
                  data-testid={`card-property-overdue-${property.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <Home className="w-4 h-4 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{property.name}</p>
                      <p className="text-xs text-gray-500">{property.address}</p>
                    </div>
                  </div>
                  <div className="text-right space-y-1">
                    <Badge variant="destructive" className="text-xs">
                      {property.overdueItems} overdue
                    </Badge>
                    {property.notInspectedItems > 0 && (
                      <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-700 block">
                        {property.notInspectedItems} not inspected
                      </Badge>
                    )}
                    <p className="text-xs text-gray-500">
                      {property.completionRate}% complete
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {data.overdue.length > 5 && (
              <Button 
                variant="link" 
                size="sm" 
                className="text-red-600 p-0"
                onClick={() => setLocation('/properties?filter=overdue')}
              >
                View all {data.overdue.length} overdue properties
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </div>
        )}

        {/* Due Soon Section */}
        {data.dueSoon.length > 0 && data.overdue.length === 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Due This Week
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {data.dueSoon.slice(0, 3).map((property) => (
                <div
                  key={property.id}
                  className="flex items-center justify-between p-3 bg-amber-50 border border-amber-100 rounded-lg cursor-pointer hover:bg-amber-100 transition-colors"
                  onClick={() => setLocation(`/properties/${property.id}`)}
                  data-testid={`card-property-due-soon-${property.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 rounded-lg">
                      <Home className="w-4 h-4 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{property.name}</p>
                      <p className="text-xs text-gray-500">
                        Due: {property.nextInspectionDate ? new Date(property.nextInspectionDate).toLocaleDateString() : 'N/A'}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* All Compliant Message */}
        {data.overdue.length === 0 && data.dueSoon.length === 0 && data.compliant.length > 0 && (
          <div className="p-4 bg-green-50 border border-green-100 rounded-lg text-center">
            <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">All Properties Compliant!</p>
            <p className="text-xs text-green-600">Great job keeping up with inspections</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
