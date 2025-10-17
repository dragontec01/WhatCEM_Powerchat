
declare global {
  interface Window {
    fbAsyncInit: () => void;
    FB: {
      init: (options: {
        appId: string;
        autoLogAppEvents: boolean;
        xfbml: boolean;
        version: string;
      }) => void;
      login: (
        callback: (response: any) => void,
        options: {
          config_id: string;
          response_type: string;
          override_default_response_type: boolean;
          extras: {
            setup: Record<string, any>;
            featureType: string;
            sessionInfoVersion: string;
          }
        }
      ) => void;
    };
  }
}

/**
 * Type definitions for response objects
 */
interface AuthResponse {
  accessToken: string;
  userID: string;
  expiresIn: number;
  signedRequest: string;
  code?: string;
}

export interface FacebookLoginResponse {
  authResponse: AuthResponse | null;
  status: 'connected' | 'not_authorized' | 'unknown';
}

interface WhatsAppSignupData {
  type: 'WA_EMBEDDED_SIGNUP';
  wabaId?: string;
  phoneNumberId?: string;
  screen?: string;
}

/**
 * Initialize Facebook SDK
 * @param appId Your Facebook App ID
 * @param version Graph API version (e.g., 'v22.0')
 */
export function initFacebookSDK(appId: string, version = 'v22.0'): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById('facebook-jssdk')) {
      resolve();
      return;
    }

    window.fbAsyncInit = function() {
      window.FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: version
      });
      resolve();
    };

    const script = document.createElement('script');
    script.id = 'facebook-jssdk';
    script.src = 'https://connect.facebook.net/en_US/sdk.js';
    script.async = true;
    script.defer = true;
    script.crossOrigin = 'anonymous';
    document.head.appendChild(script);
  });
}

/**
 * Setup event listener for WhatsApp signup events
 * @param callback Function to call when a WhatsApp signup event is received
 */
export function setupWhatsAppSignupListener(callback: (data: WhatsAppSignupData) => void) {
  window.addEventListener('message', (event) => {
    if (event.origin !== "https://www.facebook.com" && event.origin !== "https://web.facebook.com") return;
    
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'WA_EMBEDDED_SIGNUP') {
        callback(data);
      }
    } catch {

    }
  });
}

/**
 * Launch WhatsApp Business signup flow
 * @param configId Your WhatsApp Business configuration ID
 * @param callback Callback function to handle the login response
 */
export function launchWhatsAppSignup(
  configId: string, 
  callback: (response: FacebookLoginResponse) => void
) {
  if (!window.FB) {
    console.error('Facebook SDK not initialized. Call initFacebookSDK first.');
    return;
  }

  window.FB.login(callback, {
    config_id: configId,
    response_type: 'code',
    override_default_response_type: true,
    extras: {
      setup: {},
      featureType: '',
      sessionInfoVersion: '3',
    }
  });
}