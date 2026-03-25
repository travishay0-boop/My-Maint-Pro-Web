import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import {
  LayoutDashboard,
  Home,
  Calendar,
  Wrench,
  BarChart3,
  Settings,
  HelpCircle,
  Shield
} from 'lucide-react';

interface DashboardMetrics {
  totalProperties: number;
  activeTasks: number;
  overdueTasks: number;
  managers: number;
  complianceRate: number;
  overdueInspections: number;
  upcomingInspections: number;
}

interface DueInspectionsCount {
  dueToday: number;
  overdue: number;
  total: number;
}

const secondaryNavigation = [
  { name: 'Settings', href: '/settings', icon: Settings },
  { name: 'Help & Support', href: '/help', icon: HelpCircle },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user } = useAuth();

  // Fetch dashboard metrics for real-time counts
  const { data: metrics } = useQuery({
    queryKey: ['/api/dashboard/metrics', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/dashboard/metrics/${user.agencyId}`);
      return response.json() as Promise<DashboardMetrics>;
    },
    enabled: !!user?.agencyId,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch due inspections count (same as header bell) for consistency
  const { data: dueInspections } = useQuery<DueInspectionsCount>({
    queryKey: ['/api/notifications/due-inspections', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) return { dueToday: 0, overdue: 0, total: 0 };
      const response = await authenticatedApiRequest('GET', `/api/notifications/due-inspections/${user.agencyId}`);
      return response.json();
    },
    enabled: !!user?.agencyId,
    refetchInterval: 30000,
  });

  const totalNotifications = dueInspections?.total || 0;

  // Build navigation with dynamic badges
  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, current: false },
    { 
      name: 'Properties', 
      href: '/properties', 
      icon: Home, 
      current: false, 
      badge: metrics?.totalProperties?.toString(),
      badgeVariant: 'default' as const 
    },
    { 
      name: 'Calendar', 
      href: '/calendar', 
      icon: Calendar, 
      current: false, 
      badge: totalNotifications > 0 ? totalNotifications.toString() : undefined,
      badgeVariant: 'destructive' as const 
    },
    { name: 'Contractors', href: '/contractors', icon: Wrench, current: false },
    { name: 'Reports', href: '/reports', icon: BarChart3, current: false },
  ];

  // Add admin link for super_admin users only
  if (user?.role === 'super_admin') {
    navigation.push({
      name: 'Admin',
      href: '/admin',
      icon: Shield,
      current: false,
    });
  }

  return (
    <aside className="hidden md:block w-64 bg-white sidebar-shadow">
      <nav className="h-full px-4 py-6 space-y-2">
        {/* Primary Navigation */}
        {navigation.map((item) => {
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5" />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <Badge 
                    variant={item.badgeVariant || 'secondary'}
                    className="ml-auto"
                  >
                    {item.badge}
                  </Badge>
                )}
              </div>
            </Link>
          );
        })}

        <hr className="my-4 border-gray-200" />

        {/* Secondary Navigation */}
        {secondaryNavigation.map((item) => {
          const isActive = location === item.href;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  'flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
