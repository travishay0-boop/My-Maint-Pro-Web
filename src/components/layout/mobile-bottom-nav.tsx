import { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Home, Building2, Calendar, User, Menu, Wrench, BarChart3, HelpCircle, Settings } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

export default function MobileBottomNav() {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  if (!user) return null;

  const navItems = [
    { path: '/dashboard', label: 'Home', icon: Home },
    { path: '/properties', label: 'Properties', icon: Building2 },
    { path: '/calendar', label: 'Calendar', icon: Calendar },
  ];

  const moreItems = [
    { path: '/contractors', label: 'Contractors', icon: Wrench },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
    { path: '/help', label: 'Help', icon: HelpCircle },
    { path: '/profile', label: 'Profile', icon: User },
  ];

  const isMoreActive = moreItems.some(item => 
    location === item.path || location.startsWith(item.path + '/')
  );

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      data-testid="nav-mobile-bottom"
    >
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = location === item.path || 
            (item.path === '/properties' && location.startsWith('/properties'));
          
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 py-2 transition-colors ${
                isActive 
                  ? 'text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid={`button-nav-${item.label.toLowerCase()}`}
            >
              <item.icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          );
        })}

        {/* More Menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 py-2 transition-colors ${
                isMoreActive 
                  ? 'text-primary' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              data-testid="button-nav-more"
            >
              <Menu className={`w-6 h-6 ${isMoreActive ? 'stroke-[2.5]' : ''}`} />
              <span className={`text-xs mt-1 ${isMoreActive ? 'font-semibold' : 'font-medium'}`}>
                More
              </span>
              {isMoreActive && (
                <div className="absolute bottom-0 w-12 h-0.5 bg-primary rounded-t-full" />
              )}
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-auto max-h-[70vh] rounded-t-xl">
            <SheetHeader className="pb-4">
              <SheetTitle>More Options</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-4 pb-6">
              {moreItems.map((item) => {
                const isActive = location === item.path || location.startsWith(item.path + '/');
                
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      setLocation(item.path);
                      setMoreOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-primary/10 text-primary' 
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                    data-testid={`button-more-${item.label.toLowerCase()}`}
                  >
                    <item.icon className={`w-7 h-7 mb-2 ${isActive ? 'stroke-[2]' : ''}`} />
                    <span className={`text-sm ${isActive ? 'font-semibold' : 'font-medium'}`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
