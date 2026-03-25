import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Home, ClipboardList, Users, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { useLocation } from 'wouter';

interface DashboardMetrics {
  totalProperties: number;
  activeTasks: number;
  overdueTasks: number;
  managers: number;
  complianceRate: number;
  overdueInspections: number;
  upcomingInspections: number;
}

export default function MetricsGrid() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: metrics, isLoading } = useQuery({
    queryKey: ['/api/dashboard/metrics', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/dashboard/metrics/${user.agencyId}`);
      return response.json() as Promise<DashboardMetrics>;
    },
    enabled: !!user?.agencyId,
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-12 w-12 rounded-lg" />
            </div>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="p-6">
          <div className="text-center text-gray-500">
            Failed to load metrics
          </div>
        </Card>
      </div>
    );
  }

  const metricCards = [
    {
      title: 'Total Properties',
      value: metrics.totalProperties,
      change: 'Click to view all',
      changeType: 'positive' as const,
      icon: Home,
      iconBg: 'bg-blue-50',
      iconColor: 'text-blue-600',
      clickable: true,
      onClick: () => setLocation('/properties'),
    },
    {
      title: 'Active Tasks',
      value: metrics.activeTasks,
      change: `${metrics.overdueTasks} overdue`,
      changeType: metrics.overdueTasks > 0 ? 'negative' : 'neutral' as const,
      icon: ClipboardList,
      iconBg: 'bg-orange-50',
      iconColor: 'text-orange-600',
      clickable: true,
      onClick: () => setLocation('/calendar'),
    },
    {
      title: 'Property Managers',
      value: metrics.managers,
      change: 'Click to view details',
      changeType: 'positive' as const,
      icon: Users,
      iconBg: 'bg-green-50',
      iconColor: 'text-green-600',
      clickable: true,
      onClick: () => setLocation('/admin'),
    },
    {
      title: 'Inspections Due',
      value: (metrics.overdueInspections || 0) + (metrics.upcomingInspections || 0),
      change: `${metrics.overdueInspections || 0} overdue`,
      changeType: (metrics.overdueInspections || 0) > 0 ? 'negative' : 'positive' as const,
      icon: Clock,
      iconBg: (metrics.overdueInspections || 0) > 0 ? 'bg-red-50' : 'bg-blue-50',
      iconColor: (metrics.overdueInspections || 0) > 0 ? 'text-red-600' : 'text-blue-600',
      clickable: true,
      onClick: () => setLocation('/properties'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metricCards.map((metric) => (
        <Card 
          key={metric.title} 
          className={`p-6 ${metric.clickable ? 'cursor-pointer hover:shadow-md transition-shadow card-hover' : 'card-hover'}`}
          onClick={metric.clickable ? metric.onClick : undefined}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{metric.title}</p>
              <p className="text-2xl font-bold text-gray-900">{metric.value}</p>
              <p
                className={`text-sm ${
                  metric.changeType === 'positive'
                    ? 'text-green-600'
                    : metric.changeType === 'negative'
                    ? 'text-red-600'
                    : 'text-gray-600'
                } ${metric.clickable ? 'font-medium' : ''}`}
              >
                <span className="font-medium">{metric.change}</span>
              </p>
            </div>
            <div className={`p-3 ${metric.iconBg} rounded-lg`}>
              <metric.icon className={`w-6 h-6 ${metric.iconColor}`} />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
