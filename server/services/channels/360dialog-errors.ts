/**
 * 360Dialog Error Handling System
 * Provides specific error codes and handling for 360Dialog integrations
 */

export enum Dialog360ErrorCode {

  INVALID_API_KEY = 'INVALID_API_KEY',
  EXPIRED_API_KEY = 'EXPIRED_API_KEY',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  

  WEBHOOK_SETUP_FAILED = 'WEBHOOK_SETUP_FAILED',
  PHONE_NUMBER_NOT_FOUND = 'PHONE_NUMBER_NOT_FOUND',
  PHONE_NUMBER_NOT_VERIFIED = 'PHONE_NUMBER_NOT_VERIFIED',
  INVALID_PHONE_NUMBER_FORMAT = 'INVALID_PHONE_NUMBER_FORMAT',
  

  CHANNEL_NOT_APPROVED = 'CHANNEL_NOT_APPROVED',
  CHANNEL_SUSPENDED = 'CHANNEL_SUSPENDED',
  CHANNEL_RATE_LIMITED = 'CHANNEL_RATE_LIMITED',
  CHANNEL_NOT_FOUND = 'CHANNEL_NOT_FOUND',
  

  MESSAGE_TEMPLATE_NOT_FOUND = 'MESSAGE_TEMPLATE_NOT_FOUND',
  MESSAGE_TEMPLATE_NOT_APPROVED = 'MESSAGE_TEMPLATE_NOT_APPROVED',
  RECIPIENT_NOT_OPTED_IN = 'RECIPIENT_NOT_OPTED_IN',
  MESSAGE_TOO_LONG = 'MESSAGE_TOO_LONG',
  UNSUPPORTED_MESSAGE_TYPE = 'UNSUPPORTED_MESSAGE_TYPE',
  

  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  DAILY_LIMIT_EXCEEDED = 'DAILY_LIMIT_EXCEEDED',
  

  API_TIMEOUT = 'API_TIMEOUT',
  API_UNAVAILABLE = 'API_UNAVAILABLE',
  NETWORK_ERROR = 'NETWORK_ERROR',
  

  PARTNER_NOT_CONFIGURED = 'PARTNER_NOT_CONFIGURED',
  CLIENT_NOT_FOUND = 'CLIENT_NOT_FOUND',
  ONBOARDING_INCOMPLETE = 'ONBOARDING_INCOMPLETE',
  

  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

export interface Dialog360Error {
  code: Dialog360ErrorCode;
  message: string;
  details?: any;
  retryable: boolean;
  userMessage: string;
  suggestedAction?: string;
}

/**
 * Error message mappings for different API responses
 */
const ERROR_MAPPINGS: Record<string, Dialog360ErrorCode> = {

  'Invalid API key': Dialog360ErrorCode.INVALID_API_KEY,
  'API key expired': Dialog360ErrorCode.EXPIRED_API_KEY,
  'Unauthorized': Dialog360ErrorCode.INVALID_API_KEY,
  'Forbidden': Dialog360ErrorCode.INSUFFICIENT_PERMISSIONS,
  

  'Phone number not found': Dialog360ErrorCode.PHONE_NUMBER_NOT_FOUND,
  'Phone number not verified': Dialog360ErrorCode.PHONE_NUMBER_NOT_VERIFIED,
  'Invalid phone number': Dialog360ErrorCode.INVALID_PHONE_NUMBER_FORMAT,
  

  'Channel not approved': Dialog360ErrorCode.CHANNEL_NOT_APPROVED,
  'Channel suspended': Dialog360ErrorCode.CHANNEL_SUSPENDED,
  'Channel not found': Dialog360ErrorCode.CHANNEL_NOT_FOUND,
  

  'Rate limit exceeded': Dialog360ErrorCode.RATE_LIMIT_EXCEEDED,
  'Too Many Requests': Dialog360ErrorCode.RATE_LIMIT_EXCEEDED,
  'Daily limit exceeded': Dialog360ErrorCode.DAILY_LIMIT_EXCEEDED,
  

  'timeout': Dialog360ErrorCode.API_TIMEOUT,
  'ECONNREFUSED': Dialog360ErrorCode.NETWORK_ERROR,
  'ENOTFOUND': Dialog360ErrorCode.NETWORK_ERROR,
  

  'Webhook configuration failed': Dialog360ErrorCode.WEBHOOK_SETUP_FAILED,
  'Invalid webhook URL': Dialog360ErrorCode.WEBHOOK_SETUP_FAILED
};

/**
 * User-friendly error messages and suggested actions
 */
const ERROR_DETAILS: Record<Dialog360ErrorCode, Omit<Dialog360Error, 'code' | 'details'>> = {
  [Dialog360ErrorCode.INVALID_API_KEY]: {
    message: 'Invalid 360Dialog API key',
    userMessage: 'The API key you provided is invalid or has been revoked.',
    suggestedAction: 'Please check your API key in the 360Dialog dashboard and update it.',
    retryable: false
  },
  
  [Dialog360ErrorCode.EXPIRED_API_KEY]: {
    message: 'Expired 360Dialog API key',
    userMessage: 'Your API key has expired and needs to be renewed.',
    suggestedAction: 'Generate a new API key in your 360Dialog dashboard.',
    retryable: false
  },

  [Dialog360ErrorCode.INSUFFICIENT_PERMISSIONS]: {
    message: 'Insufficient permissions',
    userMessage: 'Your API key does not have sufficient permissions for this operation.',
    suggestedAction: 'Check your API key permissions in the 360Dialog dashboard.',
    retryable: false
  },

  [Dialog360ErrorCode.PHONE_NUMBER_NOT_FOUND]: {
    message: 'Phone number not found in 360Dialog account',
    userMessage: 'The phone number is not associated with your 360Dialog account.',
    suggestedAction: 'Verify the phone number exists in your 360Dialog dashboard.',
    retryable: false
  },
  
  [Dialog360ErrorCode.PHONE_NUMBER_NOT_VERIFIED]: {
    message: 'Phone number not verified',
    userMessage: 'The phone number needs to be verified before it can be used.',
    suggestedAction: 'Complete the phone number verification process in 360Dialog.',
    retryable: false
  },

  [Dialog360ErrorCode.INVALID_PHONE_NUMBER_FORMAT]: {
    message: 'Invalid phone number format',
    userMessage: 'The phone number format is invalid.',
    suggestedAction: 'Please provide a valid phone number in international format (e.g., +1234567890).',
    retryable: false
  },

  [Dialog360ErrorCode.CHANNEL_NOT_APPROVED]: {
    message: 'WhatsApp Business Account not approved',
    userMessage: 'Your WhatsApp Business Account is pending approval from Meta.',
    suggestedAction: 'Wait for Meta approval or check your WhatsApp Business Account status.',
    retryable: true
  },
  
  [Dialog360ErrorCode.CHANNEL_SUSPENDED]: {
    message: 'WhatsApp channel suspended',
    userMessage: 'Your WhatsApp channel has been suspended due to policy violations.',
    suggestedAction: 'Contact 360Dialog support to resolve the suspension.',
    retryable: false
  },

  [Dialog360ErrorCode.CHANNEL_RATE_LIMITED]: {
    message: 'Channel rate limited',
    userMessage: 'Your WhatsApp channel has been rate limited.',
    suggestedAction: 'Reduce message frequency and wait before sending more messages.',
    retryable: true
  },

  [Dialog360ErrorCode.CHANNEL_NOT_FOUND]: {
    message: 'WhatsApp channel not found',
    userMessage: 'The specified WhatsApp channel could not be found.',
    suggestedAction: 'Verify the channel exists in your 360Dialog account.',
    retryable: false
  },

  [Dialog360ErrorCode.WEBHOOK_SETUP_FAILED]: {
    message: 'Failed to configure webhook',
    userMessage: 'Unable to set up the webhook URL for receiving messages.',
    suggestedAction: 'Check that your server is accessible and try again.',
    retryable: true
  },
  
  [Dialog360ErrorCode.RATE_LIMIT_EXCEEDED]: {
    message: 'API rate limit exceeded',
    userMessage: 'Too many requests sent to 360Dialog API.',
    suggestedAction: 'Wait a few minutes before trying again.',
    retryable: true
  },

  [Dialog360ErrorCode.DAILY_LIMIT_EXCEEDED]: {
    message: 'Daily message limit exceeded',
    userMessage: 'You have reached your daily message sending limit.',
    suggestedAction: 'Wait until tomorrow or upgrade your plan for higher limits.',
    retryable: true
  },

  [Dialog360ErrorCode.MESSAGE_TEMPLATE_NOT_FOUND]: {
    message: 'Message template not found',
    userMessage: 'The specified message template does not exist.',
    suggestedAction: 'Check your message template name and ensure it exists in your 360Dialog account.',
    retryable: false
  },

  [Dialog360ErrorCode.MESSAGE_TEMPLATE_NOT_APPROVED]: {
    message: 'Message template not approved',
    userMessage: 'The message template is not approved for use.',
    suggestedAction: 'Wait for template approval or use an approved template.',
    retryable: true
  },

  [Dialog360ErrorCode.RECIPIENT_NOT_OPTED_IN]: {
    message: 'Recipient not opted in',
    userMessage: 'The recipient has not opted in to receive messages.',
    suggestedAction: 'Ensure the recipient has initiated a conversation or opted in to receive messages.',
    retryable: false
  },

  [Dialog360ErrorCode.MESSAGE_TOO_LONG]: {
    message: 'Message too long',
    userMessage: 'The message exceeds the maximum allowed length.',
    suggestedAction: 'Shorten your message to fit within the character limit.',
    retryable: false
  },

  [Dialog360ErrorCode.UNSUPPORTED_MESSAGE_TYPE]: {
    message: 'Unsupported message type',
    userMessage: 'The message type is not supported.',
    suggestedAction: 'Use a supported message type (text, image, document, etc.).',
    retryable: false
  },

  [Dialog360ErrorCode.PARTNER_NOT_CONFIGURED]: {
    message: '360Dialog Partner API not configured',
    userMessage: 'The 360Dialog Partner integration is not properly configured.',
    suggestedAction: 'Contact your administrator to configure the Partner API settings.',
    retryable: false
  },
  
  [Dialog360ErrorCode.CLIENT_NOT_FOUND]: {
    message: '360Dialog client not found',
    userMessage: 'The client ID is not found in the 360Dialog Partner system.',
    suggestedAction: 'Complete the onboarding process or contact support.',
    retryable: false
  },

  [Dialog360ErrorCode.ONBOARDING_INCOMPLETE]: {
    message: 'Onboarding process incomplete',
    userMessage: 'The 360Dialog onboarding process is not complete.',
    suggestedAction: 'Complete the onboarding process in the 360Dialog dashboard.',
    retryable: false
  },

  [Dialog360ErrorCode.API_TIMEOUT]: {
    message: '360Dialog API timeout',
    userMessage: 'The request to 360Dialog timed out.',
    suggestedAction: 'Check your internet connection and try again.',
    retryable: true
  },

  [Dialog360ErrorCode.API_UNAVAILABLE]: {
    message: '360Dialog API unavailable',
    userMessage: 'The 360Dialog API is currently unavailable.',
    suggestedAction: 'Please try again later or check 360Dialog status page.',
    retryable: true
  },

  [Dialog360ErrorCode.NETWORK_ERROR]: {
    message: 'Network connection error',
    userMessage: 'Unable to connect to 360Dialog services.',
    suggestedAction: 'Check your internet connection and firewall settings.',
    retryable: true
  },
  
  [Dialog360ErrorCode.UNKNOWN_ERROR]: {
    message: 'Unknown error occurred',
    userMessage: 'An unexpected error occurred while connecting to 360Dialog.',
    suggestedAction: 'Please try again or contact support if the problem persists.',
    retryable: true
  },
  
  [Dialog360ErrorCode.VALIDATION_ERROR]: {
    message: 'Validation error',
    userMessage: 'The provided configuration is invalid.',
    suggestedAction: 'Please check all required fields and try again.',
    retryable: false
  }
};

/**
 * Parse error from API response or exception
 */
export function parseDialog360Error(error: any): Dialog360Error {
  let errorCode = Dialog360ErrorCode.UNKNOWN_ERROR;
  let details = error;
  

  if (error?.response?.data) {
    const responseData = error.response.data;
    

    if (responseData.meta?.developer_message) {
      const message = responseData.meta.developer_message;
      errorCode = findErrorCode(message) || Dialog360ErrorCode.UNKNOWN_ERROR;
      details = responseData;
    }

    else if (responseData.error) {
      errorCode = findErrorCode(responseData.error) || Dialog360ErrorCode.UNKNOWN_ERROR;
      details = responseData;
    }
  }

  else if (error?.message) {
    errorCode = findErrorCode(error.message) || Dialog360ErrorCode.UNKNOWN_ERROR;
  }

  else if (error?.response?.status) {
    switch (error.response.status) {
      case 401:
        errorCode = Dialog360ErrorCode.INVALID_API_KEY;
        break;
      case 403:
        errorCode = Dialog360ErrorCode.INSUFFICIENT_PERMISSIONS;
        break;
      case 404:
        errorCode = Dialog360ErrorCode.PHONE_NUMBER_NOT_FOUND;
        break;
      case 429:
        errorCode = Dialog360ErrorCode.RATE_LIMIT_EXCEEDED;
        break;
      default:
        errorCode = Dialog360ErrorCode.UNKNOWN_ERROR;
    }
  }
  
  const errorDetails = ERROR_DETAILS[errorCode];
  
  return {
    code: errorCode,
    details,
    ...errorDetails
  };
}

/**
 * Find error code from error message
 */
function findErrorCode(message: string): Dialog360ErrorCode | null {
  const lowerMessage = message.toLowerCase();
  
  for (const [pattern, code] of Object.entries(ERROR_MAPPINGS)) {
    if (lowerMessage.includes(pattern.toLowerCase())) {
      return code;
    }
  }
  
  return null;
}

/**
 * Create a standardized error response
 */
export function createErrorResponse(error: Dialog360Error) {
  return {
    success: false,
    error: {
      code: error.code,
      message: error.userMessage,
      details: error.details,
      retryable: error.retryable,
      suggestedAction: error.suggestedAction
    }
  };
}

/**
 * Log error with proper categorization
 */
export function logDialog360Error(context: string, error: Dialog360Error, connectionId?: number) {
  const logData = {
    context,
    connectionId,
    errorCode: error.code,
    message: error.message,
    retryable: error.retryable,
    details: error.details
  };
  
  if (error.retryable) {
    console.warn(`360Dialog Warning [${context}]:`, logData);
  } else {
    console.error(`360Dialog Error [${context}]:`, logData);
  }
}
