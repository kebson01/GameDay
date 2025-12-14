import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

export default function OfflineIndicator() {
  const { isOnline, wasOffline } = useNetworkStatus();
  const [showReconnected, setShowReconnected] = React.useState(false);

  React.useEffect(() => {
    if (isOnline && wasOffline) {
      setShowReconnected(true);
      const timer = setTimeout(() => setShowReconnected(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isOnline, wasOffline]);

  if (isOnline && !showReconnected) return null;

  return (
    <div className={cn(
      "fixed top-0 left-0 right-0 z-[100] px-4 py-2",
      "flex items-center justify-center gap-2 text-sm font-medium",
      "animate-in slide-in-from-top duration-300",
      isOnline ? "bg-green-500 text-white" : "bg-amber-500 text-white"
    )}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Back online - syncing data...</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>You're offline - using cached data</span>
        </>
      )}
    </div>
  );
}


