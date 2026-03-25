import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PWAUpdateNotification() {
  const [showUpdate, setShowUpdate] = useState(false);

  useEffect(() => {
    const handleUpdate = () => {
      setShowUpdate(true);
    };

    window.addEventListener('sw-update-available', handleUpdate);
    return () => {
      window.removeEventListener('sw-update-available', handleUpdate);
    };
  }, []);

  const handleRefresh = () => {
    window.location.reload();
  };

  if (!showUpdate) return null;

  return (
    <div className="fixed top-4 left-4 right-4 md:left-auto md:right-6 md:w-96 z-[60] animate-in slide-in-from-top-4 duration-300">
      <div className="bg-blue-600 text-white rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-3">
          <RefreshCw className="w-5 h-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">Update available</p>
            <p className="text-xs text-blue-100 mt-0.5">A new version is ready</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={handleRefresh}
            className="h-8 text-xs bg-white text-blue-600 hover:bg-blue-50"
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
}
