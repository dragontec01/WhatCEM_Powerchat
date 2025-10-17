import { useQuery } from '@tanstack/react-query';
import { useAuth } from './use-auth';

interface SubscriptionStatus {
  isActive: boolean;
  status: string;
  daysUntilExpiry?: number;
  gracePeriodActive?: boolean;
  gracePeriodDaysRemaining?: number;
  nextBillingDate?: string;
  canRenew: boolean;
  canPause: boolean;
  canUpgrade: boolean;
  canDowngrade: boolean;
}

export function useSubscriptionStatus() {
  const { user } = useAuth();
  
  const query = useQuery<SubscriptionStatus>({
    queryKey: ['subscription-status'],
    queryFn: async () => {
      const response = await fetch('/api/enhanced-subscription/status', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch subscription status');
      }
      
      return response.json();
    },
    enabled: !!user, // Only run when user is authenticated
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });

  return query;
}
