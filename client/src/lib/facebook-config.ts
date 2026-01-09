
export const FACEBOOK_APP_CONFIG = {
  appId: import.meta.env.VITE_FACEBOOK_APP_ID || 'YOUR_FB_APP_ID',

  whatsAppConfigId: import.meta.env.VITE_WHATSAPP_CONFIG_ID || 'YOUR_WHATSAPP_CONFIG_ID',

  apiVersion: 'v22.0', // Use v22.0 for consistency with backend
};

console.log({FACEBOOK_APP_CONFIG});
export function validateFacebookConfig(): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  if (!FACEBOOK_APP_CONFIG.appId || FACEBOOK_APP_CONFIG.appId === 'YOUR_FB_APP_ID') {
    missingFields.push('VITE_FACEBOOK_APP_ID');
  }

  if (!FACEBOOK_APP_CONFIG.whatsAppConfigId || FACEBOOK_APP_CONFIG.whatsAppConfigId === 'YOUR_WHATSAPP_CONFIG_ID') {
    missingFields.push('VITE_WHATSAPP_CONFIG_ID');
  }

  return {
    isValid: missingFields.length === 0,
    missingFields
  };
}