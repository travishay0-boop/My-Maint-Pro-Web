import { useAuth } from '@/hooks/use-auth';
import { useQuery } from '@tanstack/react-query';
import { authenticatedApiRequest } from '@/lib/api';
import { useLocation, Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Home, Bell, ChevronDown, LogOut, Settings, User, HelpCircle } from 'lucide-react';

interface HeaderProps {
  onRestartOnboarding?: () => void;
}

interface DueInspectionsCount {
  dueToday: number;
  overdue: number;
  total: number;
}

export default function Header({ onRestartOnboarding }: HeaderProps) {
  const { user, logout } = useAuth();
  const [, setLocation] = useLocation();

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

  if (!user) return null;

  const userInitials = user.firstName && user.lastName 
    ? `${user.firstName[0]}${user.lastName[0]}`
    : user.username.substring(0, 2).toUpperCase();

  return (
    <header className="bg-white border-b border-gray-200 fixed w-full top-0 z-50">
      <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex-shrink-0">
              <Link href="/dashboard">
                <div className="flex items-center space-x-2 cursor-pointer hover:opacity-80 transition-opacity" data-testid="logo-home-link">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <Home className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xl font-bold text-gray-900">My Maintenance Pro</span>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Right Navigation */}
          <div className="flex items-center space-x-4">
            {/* Notifications Bell */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="relative p-2 text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-lg"
                  onClick={() => setLocation('/calendar')}
                  data-testid="button-notifications"
                >
                  <Bell className="w-6 h-6" />
                  {totalNotifications > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 text-xs p-0 flex items-center justify-center"
                    >
                      {totalNotifications > 99 ? '99+' : totalNotifications}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                {totalNotifications === 0 ? (
                  <p>No inspections due</p>
                ) : (
                  <div className="text-sm">
                    {dueInspections?.overdue && dueInspections.overdue > 0 && (
                      <p className="text-red-400">{dueInspections.overdue} overdue inspection{dueInspections.overdue !== 1 ? 's' : ''}</p>
                    )}
                    {dueInspections?.dueToday && dueInspections.dueToday > 0 && (
                      <p className="text-orange-400">{dueInspections.dueToday} due today</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Click to view calendar</p>
                  </div>
                )}
              </TooltipContent>
            </Tooltip>
            
            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{userInitials}</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <span className="text-sm font-medium">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : user.username
                      }
                    </span>
                    <div className="text-xs text-gray-500">
                      {user.userType === 'private' && 'Private User'}
                      {user.userType === 'maintenance_company' && 'Maintenance Company'}
                      {user.userType === 'agency' && 'Real Estate Agency'}
                    </div>
                  </div>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => setLocation('/profile')} data-testid="menu-profile">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setLocation('/settings')} data-testid="menu-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                {onRestartOnboarding && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={onRestartOnboarding} data-testid="menu-restart-tour">
                      <HelpCircle className="w-4 h-4 mr-2" />
                      Restart Tour
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} data-testid="menu-sign-out">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
