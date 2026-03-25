import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Plus, 
  Bell, 
  BarChart3, 
  ChevronRight,
  Home
} from 'lucide-react';
import { useLocation } from 'wouter';

export default function QuickActions() {
  const [, setLocation] = useLocation();
  
  const actions = [
    {
      title: 'Add Property',
      description: 'Add new property to portfolio',
      icon: Home,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      onClick: () => setLocation('/properties?add=true'),
    },
    {
      title: 'Schedule Inspection',
      description: 'Book property inspection',
      icon: Calendar,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      onClick: () => setLocation('/calendar'),
    },
    {
      title: 'Add Maintenance Task',
      description: 'Create new task',
      icon: Plus,
      iconBg: 'bg-orange-100',
      iconColor: 'text-orange-600',
      onClick: () => console.log('Add task'),
    },
    {
      title: 'Generate Report',
      description: 'Create maintenance report',
      icon: BarChart3,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      onClick: () => console.log('Generate report'),
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {actions.map((action) => (
            <Button
              key={action.title}
              variant="ghost"
              className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors h-auto"
              onClick={action.onClick}
            >
              <div className="flex items-center space-x-3">
                <div className={`p-2 ${action.iconBg} rounded-lg`}>
                  <action.icon className={`w-5 h-5 ${action.iconColor}`} />
                </div>
                <div className="text-left">
                  <div className="font-medium text-gray-900">{action.title}</div>
                  <div className="text-sm text-gray-500">{action.description}</div>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
