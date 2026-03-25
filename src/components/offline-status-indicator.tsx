// Offline Status Indicator Component
// Shows connection status and pending sync count
import { Wifi, WifiOff, RefreshCw, Cloud, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useOfflineDrafts } from '@/hooks/use-offline-drafts';

interface OfflineStatusIndicatorProps {
  compact?: boolean;
}

export function OfflineStatusIndicator({ compact = false }: OfflineStatusIndicatorProps) {
  const { online, pendingCount, syncing, triggerSync } = useOfflineDrafts();

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1">
              {online ? (
                <Wifi className="w-4 h-4 text-green-500" />
              ) : (
                <WifiOff className="w-4 h-4 text-red-500" />
              )}
              {pendingCount > 0 && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  {pendingCount}
                </Badge>
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{online ? 'Online' : 'Offline'}</p>
            {pendingCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {pendingCount} change{pendingCount > 1 ? 's' : ''} pending sync
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div 
      className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
        online 
          ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
          : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
      }`}
      data-testid="offline-status-indicator"
    >
      {online ? (
        <>
          <Cloud className="w-4 h-4 text-green-600 dark:text-green-400" />
          <span className="text-sm text-green-700 dark:text-green-300">Online</span>
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">Offline</span>
        </>
      )}
      
      {pendingCount > 0 && (
        <>
          <span className="text-muted-foreground">|</span>
          <Badge 
            variant={online ? 'secondary' : 'destructive'} 
            className="text-xs"
            data-testid="pending-sync-badge"
          >
            {pendingCount} pending
          </Badge>
          {online && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 px-2"
              onClick={triggerSync}
              disabled={syncing}
              data-testid="button-sync-now"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing...' : 'Sync'}
            </Button>
          )}
        </>
      )}
    </div>
  );
}
