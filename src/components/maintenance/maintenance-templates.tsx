import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { 
  Settings, 
  Clock, 
  CheckCircle,
  Wrench,
  Home,
  Zap,
  Droplets,
  Wind,
  Shield
} from 'lucide-react';
import type { MaintenanceTemplate } from '@shared/schema';

export default function MaintenanceTemplates() {
  const { user } = useAuth();

  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/maintenance-templates', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/maintenance-templates/${user.agencyId}`);
      return response.json() as Promise<MaintenanceTemplate[]>;
    },
    enabled: !!user?.agencyId,
  });

  const getCategoryIcon = (category: string) => {
    const icons = {
      plumbing: Droplets,
      hvac: Wind,
      electrical: Zap,
      exterior: Home,
      safety: Shield,
      interior: Wrench,
    };
    return icons[category as keyof typeof icons] || Settings;
  };

  const getCategoryColor = (category: string) => {
    const colors = {
      plumbing: 'text-blue-600 bg-blue-50',
      hvac: 'text-green-600 bg-green-50',
      electrical: 'text-yellow-600 bg-yellow-50',
      exterior: 'text-purple-600 bg-purple-50',
      safety: 'text-red-600 bg-red-50',
      interior: 'text-gray-600 bg-gray-50',
    };
    return colors[category as keyof typeof colors] || 'text-gray-600 bg-gray-50';
  };

  const getFrequencyColor = (frequency: string) => {
    const colors = {
      monthly: 'bg-red-100 text-red-800',
      quarterly: 'bg-blue-100 text-blue-800',
      biannual: 'bg-green-100 text-green-800',
      annual: 'bg-orange-100 text-orange-800',
    };
    return colors[frequency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      low: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      high: 'bg-orange-100 text-orange-800',
      critical: 'bg-red-100 text-red-800',
    };
    return colors[priority as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Maintenance Templates</CardTitle>
            <Skeleton className="h-6 w-16" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="p-3 border border-gray-200 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-3 w-full" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!templates || templates.length === 0) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Maintenance Templates</CardTitle>
            <Button variant="ghost" size="sm">
              Manage
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Settings className="mx-auto h-8 w-8 text-gray-400 mb-2" />
            <p className="text-sm">No maintenance templates found</p>
            <Button variant="outline" size="sm" className="mt-3">
              Create Template
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Maintenance Templates</CardTitle>
          <Button variant="ghost" size="sm">
            Manage
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {templates.map((template) => {
            const CategoryIcon = getCategoryIcon(template.category);
            const categoryColors = getCategoryColor(template.category);
            
            return (
              <div
                key={template.id}
                className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <div className={cn('p-1 rounded', categoryColors)}>
                      <CategoryIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary">
                        {template.name}
                      </h4>
                      <p className="text-xs text-gray-500 capitalize">
                        {template.category.replace('_', ' ')} maintenance
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className={cn('text-xs capitalize', getFrequencyColor(template.frequency))}
                    >
                      {template.frequency}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className={cn('text-xs capitalize', getPriorityColor(template.priority))}
                    >
                      {template.priority}
                    </Badge>
                  </div>
                </div>
                
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-3">
                    {template.estimatedDuration && (
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3" />
                        <span>{formatDuration(template.estimatedDuration)}</span>
                      </div>
                    )}
                    
                    {template.checklistItems && Array.isArray(template.checklistItems) && (
                      <div className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{template.checklistItems.length} checks</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-400">
                    Every {template.frequencyDays} days
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 pt-3 border-t">
          <Button variant="outline" size="sm" className="w-full">
            <Settings className="w-4 h-4 mr-2" />
            Create Custom Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
