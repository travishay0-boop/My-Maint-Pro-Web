import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  CheckCircle, 
  Bell, 
  Plus, 
  AlertTriangle, 
  Users 
} from 'lucide-react';

interface ActivityWithDetails {
  id: number;
  action: string;
  entityType: string;
  entityId: number;
  details: any;
  createdAt: string;
  user: {
    firstName: string;
    lastName: string;
  } | null;
}

export default function RecentActivity() {
  const { user } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['/api/activity', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/activity/${user.agencyId}?limit=5`);
      return response.json() as Promise<ActivityWithDetails[]>;
    },
    enabled: !!user?.agencyId,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Activity</CardTitle>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-start space-x-3">
                <Skeleton className="w-8 h-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getActivityIcon = (action: string, entityType: string) => {
    if (action === 'completed') return CheckCircle;
    if (action === 'created' && entityType === 'notification') return Bell;
    if (action === 'created') return Plus;
    if (entityType === 'task' && action === 'updated') return AlertTriangle;
    return Users;
  };

  const getActivityIconColor = (action: string, entityType: string) => {
    if (action === 'completed') return { bg: 'bg-green-100', text: 'text-green-600' };
    if (action === 'created' && entityType === 'notification') return { bg: 'bg-blue-100', text: 'text-blue-600' };
    if (action === 'created') return { bg: 'bg-yellow-100', text: 'text-yellow-600' };
    if (entityType === 'task' && action === 'updated') return { bg: 'bg-red-100', text: 'text-red-600' };
    return { bg: 'bg-purple-100', text: 'text-purple-600' };
  };

  const formatActivityMessage = (activity: ActivityWithDetails) => {
    const userName = activity.user 
      ? `${activity.user.firstName} ${activity.user.lastName}`
      : 'System';

    if (activity.action === 'completed' && activity.entityType === 'task') {
      return `${userName} completed maintenance task`;
    }
    
    if (activity.action === 'created' && activity.entityType === 'notification') {
      return `Maintenance reminder sent to property owner`;
    }
    
    if (activity.action === 'created' && activity.entityType === 'property') {
      const propertyName = activity.details?.propertyName || 'a property';
      return `${userName} added new property ${propertyName}`;
    }
    
    if (activity.action === 'updated' && activity.entityType === 'task') {
      return `Maintenance task requires attention`;
    }
    
    if (activity.action === 'created' && activity.entityType === 'user') {
      return `New property manager ${userName} assigned`;
    }

    return `${userName} ${activity.action} ${activity.entityType}`;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 60) {
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} ${diffInHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} ${diffInDays === 1 ? 'day' : 'days'} ago`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Recent Activity</CardTitle>
          <Button variant="ghost" size="sm">
            View All
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {!activities || activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No recent activity
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.action, activity.entityType);
              const colors = getActivityIconColor(activity.action, activity.entityType);
              
              return (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    <div className={`w-8 h-8 ${colors.bg} rounded-full flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 ${colors.text}`} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      {formatActivityMessage(activity)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatTimeAgo(activity.createdAt)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
