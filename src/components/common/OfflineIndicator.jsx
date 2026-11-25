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
    <div role="status" className={cn(
      "fixed top-0 left-0 right-0 z-[100] px-4 py-1.5 pt-[max(0.375rem,env(safe-area-inset-top))]",
      "flex items-center justify-center gap-2 font-display text-sm font-bold uppercase tracking-wider",
      "animate-in slide-in-from-top duration-300",
      isOnline ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
    )}>
      {isOnline ? (
        <>
          <Wifi className="w-4 h-4" />
          <span>Back online · syncing</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4" />
          <span>Offline · showing saved scores &amp; maps</span>
        </>
      )}
    </div>
  );
}


