import { useMemo } from 'react';
import { useBranding } from '@/contexts/branding-context';

/**
 * A hook that returns style objects for branding colors
 * 
 * @returns An object with style objects for primary and secondary colors
 */
export function useBrandingStyles() {
  const { branding } = useBranding();
  
  return useMemo(() => {
    return {
      primaryStyle: {
        backgroundColor: branding.primaryColor,
        color: 'white',
      },
      secondaryStyle: {
        backgroundColor: branding.secondaryColor,
        color: 'white',
      },
      primaryTextStyle: {
        color: branding.primaryColor,
      },
      secondaryTextStyle: {
        color: branding.secondaryColor,
      },
      primaryBorderStyle: {
        borderColor: branding.primaryColor,
      },
      secondaryBorderStyle: {
        borderColor: branding.secondaryColor,
      },
    };
  }, [branding.primaryColor, branding.secondaryColor]);
}
