import { useQuery } from '@tanstack/react-query';
import { useNetworkStatus } from './useNetworkStatus';

export function useOfflineQuery({
  queryKey,
  queryFn,
  offlineGetter,
  offlineSetter,
  ...options
}) {
  const { isOnline } = useNetworkStatus();

  return useQuery({
    queryKey,
    queryFn: async () => {
      try {
        const data = await queryFn();
        
        if (offlineSetter && data) {
          await offlineSetter(data);
        }
        
        return data;
      } catch (error) {
        if (!isOnline || error.message?.includes('network') || error.message?.includes('fetch')) {
          const cachedData = await offlineGetter?.();
          if (cachedData && (Array.isArray(cachedData) ? cachedData.length > 0 : cachedData)) {
            return cachedData;
          }
        }
        throw error;
      }
    },
    staleTime: isOnline ? options.staleTime : Infinity,
    enabled: options.enabled !== false,
    retry: isOnline ? 3 : 0,
    ...options,
  });
}

export default useOfflineQuery;


