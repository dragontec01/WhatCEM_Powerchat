import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "./use-auth";
import useSocket from "./useSocket";

export interface GeneralSettings {
  defaultCurrency: string;
  dateFormat: string;
  timeFormat: string;
  subdomainAuthentication: boolean;
  frontendWebsiteEnabled: boolean;
  planRenewalEnabled: boolean;
  helpSupportUrl: string;
}

export function useGeneralSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { onMessage } = useSocket('/ws');

  const { data: settings, isLoading, error, refetch } = useQuery<GeneralSettings>({
    queryKey: ['/api/public/general-settings'],
    queryFn: async () => {
      const res = await fetch("/api/public/general-settings");
      if (!res.ok) {

        return {
          defaultCurrency: 'USD',
          dateFormat: 'MM/DD/YYYY',
          timeFormat: '12h',
          subdomainAuthentication: false,
          frontendWebsiteEnabled: false,
          planRenewalEnabled: true, // Default to enabled for safety
          helpSupportUrl: ''
        };
      }
      return res.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    retry: 1,
  });


  useEffect(() => {
    if (!onMessage) return;

    const handleSettingsUpdate = (message: any) => {
      if (message.key === 'general_settings') {

        queryClient.invalidateQueries({ queryKey: ['general-settings'] });
      }
    };

    const cleanup = onMessage('settingsUpdated', handleSettingsUpdate);

    return cleanup;
  }, [onMessage, queryClient]);

  return {
    settings: settings || {
      defaultCurrency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12h',
      subdomainAuthentication: false,
      frontendWebsiteEnabled: false,
      planRenewalEnabled: true,
      helpSupportUrl: ''
    },
    isLoading,
    error,
    refetch
  };
}
