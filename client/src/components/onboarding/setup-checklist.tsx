import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/use-auth';
import type { Property, PropertyRoom, Agency } from '@shared/schema';
import { 
  CheckCircle2, 
  Circle, 
  Building2, 
  Home, 
  ClipboardCheck,
  Palette,
  ArrowRight,
  Sparkles
} from 'lucide-react';

interface SetupTask {
  id: string;
  title: string;
  description: string;
  icon: typeof Building2;
  completed: boolean;
  action: string;
  path: string;
}

export default function SetupChecklist() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  const { data: agency } = useQuery<Agency>({
    queryKey: ['/api/agencies', user?.agencyId],
    enabled: !!user?.agencyId,
  });
  
  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ['/api/properties', user?.agencyId],
    enabled: !!user?.agencyId,
  });
  
  const { data: rooms = [] } = useQuery<PropertyRoom[]>({
    queryKey: ['/api/rooms/agency', user?.agencyId],
    enabled: !!user?.agencyId && properties.length > 0,
  });

  const onboardingState = user?.onboardingState;
  
  // Calculate task completion based on actual data
  const hasAgencyBranding = !!(agency?.branding && (agency.branding as any)?.logo);
  const hasFirstProperty = properties.length > 0;
  const hasFirstRoom = rooms.length > 0;
  const hasCompletedInspection = properties.some(p => p.lastInspectionDate);
  
  const tasks: SetupTask[] = [
    {
      id: 'property',
      title: 'Add Your First Property',
      description: 'Your home, rental, or investment property',
      icon: Home,
      completed: hasFirstProperty,
      action: 'Add Property',
      path: '/properties',
    },
    {
      id: 'room',
      title: 'Create Rooms',
      description: 'Kitchen, bathroom, garage, etc.',
      icon: Building2,
      completed: hasFirstRoom,
      action: 'Add Rooms',
      path: hasFirstProperty ? `/properties/${properties[0]?.id}` : '/properties',
    },
    {
      id: 'inspection',
      title: 'Complete an Inspection',
      description: 'Rate each item Good, Average or Poor to mark it inspected',
      icon: ClipboardCheck,
      completed: hasCompletedInspection,
      action: 'Start',
      path: hasFirstProperty ? `/properties/${properties[0]?.id}` : '/properties',
    },
    {
      id: 'branding',
      title: 'Personalize Your Account',
      description: 'Add your logo for reports (optional)',
      icon: Palette,
      completed: hasAgencyBranding,
      action: 'Customize',
      path: '/settings',
    },
  ];

  const completedCount = tasks.filter(t => t.completed).length;
  const progress = (completedCount / tasks.length) * 100;
  const allComplete = completedCount === tasks.length;
  
  // Don't show if onboarding was completed or all tasks are done
  if (onboardingState?.completed && allComplete) {
    return null;
  }
  
  // Don't show if dismissed and all tasks are done
  if (onboardingState?.dismissed && allComplete) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent" data-testid="card-setup-checklist">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Get Started</CardTitle>
          </div>
          <span className="text-sm text-gray-500">
            {completedCount} of {tasks.length} complete
          </span>
        </div>
        <Progress value={progress} className="h-2 mt-2" />
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {tasks.map((task) => (
            <div 
              key={task.id}
              className={`flex items-center justify-between p-3 rounded-lg transition-colors ${
                task.completed 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-white border border-gray-200 hover:border-primary/50'
              }`}
              data-testid={`task-${task.id}`}
            >
              <div className="flex items-center gap-3">
                {task.completed ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-400 flex-shrink-0" />
                )}
                <div>
                  <h4 className={`font-medium text-sm ${task.completed ? 'text-green-900' : 'text-gray-900'}`}>
                    {task.title}
                  </h4>
                  <p className={`text-xs ${task.completed ? 'text-green-700' : 'text-gray-500'}`}>
                    {task.description}
                  </p>
                </div>
              </div>
              {!task.completed && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setLocation(task.path)}
                  className="flex-shrink-0"
                  data-testid={`button-task-${task.id}`}
                >
                  {task.action}
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              )}
            </div>
          ))}
        </div>
        
        {allComplete && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg text-center">
            <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
            <p className="font-medium text-green-900">Setup Complete!</p>
            <p className="text-sm text-green-700">You've completed all the getting started tasks.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
