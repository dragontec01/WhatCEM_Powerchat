import { storage } from '../storage';
import { logger } from '../utils/logger';

export interface DataCaptureRule {
  id: string;
  variableName: string;
  sourceType: 'message_content' | 'contact_field' | 'regex_extract' | 'user_input' | 'custom_prompt';
  sourceValue: string;
  dataType: 'string' | 'number' | 'boolean' | 'email' | 'phone' | 'date';
  required: boolean;
  defaultValue?: string;
  validationPattern?: string;
  description?: string;
}

export interface DataCaptureConfig {
  captureRules: DataCaptureRule[];
  storageScope: 'session' | 'flow' | 'global';
  overwriteExisting: boolean;
  enableValidation: boolean;
}

export interface CaptureContext {
  sessionId: string;
  messageContent: string;
  contact: {
    name?: string;
    phone?: string;
    email?: string;
    company?: string;
    [key: string]: any;
  };
  nodeId: string;
}

export interface CaptureResult {
  success: boolean;
  capturedVariables: Record<string, any>;
  errors: Array<{
    variableName: string;
    error: string;
  }>;
  skipped: Array<{
    variableName: string;
    reason: string;
  }>;
}

export class DataCaptureService {
  /**
   * Execute data capture based on configuration and context
   */
  async captureData(config: DataCaptureConfig, context: CaptureContext): Promise<CaptureResult> {
    const result: CaptureResult = {
      success: true,
      capturedVariables: {},
      errors: [],
      skipped: []
    };

    logger.info('DataCaptureService', `Starting data capture with ${config.captureRules.length} rules`, {
      sessionId: context.sessionId,
      nodeId: context.nodeId,
      scope: config.storageScope
    });

    for (const rule of config.captureRules) {
      try {

        if (!config.overwriteExisting) {
          const existingValue = await storage.getFlowVariable(context.sessionId, rule.variableName);
          if (existingValue !== undefined) {
            result.skipped.push({
              variableName: rule.variableName,
              reason: 'Variable already exists and overwrite is disabled'
            });
            continue;
          }
        }


        const extractedValue = await this.extractValue(rule, context);

        if (extractedValue === null || extractedValue === undefined) {
          if (rule.required) {
            result.errors.push({
              variableName: rule.variableName,
              error: 'Required field could not be extracted'
            });
            result.success = false;
            continue;
          } else if (rule.defaultValue) {

            const processedValue = this.processValue(rule.defaultValue, rule.dataType);
            if (config.enableValidation && !this.validateValue(processedValue, rule)) {
              result.errors.push({
                variableName: rule.variableName,
                error: 'Default value failed validation'
              });
              continue;
            }
            result.capturedVariables[rule.variableName] = processedValue;
          } else {
            result.skipped.push({
              variableName: rule.variableName,
              reason: 'No value found and not required'
            });
            continue;
          }
        } else {

          const processedValue = this.processValue(extractedValue, rule.dataType);
          
          if (config.enableValidation && !this.validateValue(processedValue, rule)) {
            result.errors.push({
              variableName: rule.variableName,
              error: `Value "${processedValue}" failed validation for type ${rule.dataType}`
            });
            if (rule.required) {
              result.success = false;
            }
            continue;
          }

          result.capturedVariables[rule.variableName] = processedValue;
        }


        await storage.setFlowVariable({
          sessionId: context.sessionId,
          variableKey: rule.variableName,
          variableValue: result.capturedVariables[rule.variableName],
          variableType: rule.dataType === 'boolean' ? 'boolean' : 
                       rule.dataType === 'number' ? 'number' : 'string',
          scope: config.storageScope,
          nodeId: context.nodeId
        });

        logger.debug('DataCaptureService', `Captured variable: ${rule.variableName}`, {
          value: result.capturedVariables[rule.variableName],
          type: rule.dataType,
          scope: config.storageScope
        });

      } catch (error) {
        logger.error('DataCaptureService', `Error capturing variable ${rule.variableName}`, error);
        result.errors.push({
          variableName: rule.variableName,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        if (rule.required) {
          result.success = false;
        }
      }
    }

    logger.info('DataCaptureService', 'Data capture completed', {
      success: result.success,
      capturedCount: Object.keys(result.capturedVariables).length,
      errorCount: result.errors.length,
      skippedCount: result.skipped.length
    });

    return result;
  }

  /**
   * Extract value based on source type and configuration
   */
  private async extractValue(rule: DataCaptureRule, context: CaptureContext): Promise<string | null> {
    switch (rule.sourceType) {
      case 'message_content':
        return context.messageContent || null;

      case 'contact_field':
        return this.extractContactField(rule.sourceValue, context.contact);

      case 'regex_extract':
        return this.extractWithRegex(rule.sourceValue, context.messageContent);

      case 'user_input':

        return context.messageContent || null;

      case 'custom_prompt':


        return context.messageContent || null;

      default:
        logger.warn('DataCaptureService', `Unknown source type: ${rule.sourceType}`);
        return null;
    }
  }

  /**
   * Extract value from contact field
   */
  private extractContactField(fieldPath: string, contact: any): string | null {
    try {
      const parts = fieldPath.split('.');
      let value = contact;
      
      for (const part of parts) {
        if (value && typeof value === 'object' && part in value) {
          value = value[part];
        } else {
          return null;
        }
      }
      
      return value ? String(value) : null;
    } catch (error) {
      logger.error('DataCaptureService', `Error extracting contact field ${fieldPath}`, error);
      return null;
    }
  }

  /**
   * Extract value using regex pattern
   */
  private extractWithRegex(pattern: string, text: string): string | null {
    try {
      const regex = new RegExp(pattern, 'i'); // Case insensitive by default
      const match = text.match(regex);
      return match && match[1] ? match[1].trim() : null;
    } catch (error) {
      logger.error('DataCaptureService', `Error with regex pattern ${pattern}`, error);
      return null;
    }
  }

  /**
   * Process and convert value to appropriate type
   */
  private processValue(value: string, dataType: string): any {
    if (!value) return value;

    switch (dataType) {
      case 'number':
        const num = parseFloat(value);
        return isNaN(num) ? value : num;

      case 'boolean':
        const lower = value.toLowerCase().trim();
        return ['true', 'yes', '1', 'on', 'enabled'].includes(lower);

      case 'email':
      case 'phone':
      case 'date':
      case 'string':
      default:
        return value.trim();
    }
  }

  /**
   * Validate value against data type and rules
   */
  private validateValue(value: any, rule: DataCaptureRule): boolean {
    if (value === null || value === undefined) {
      return !rule.required;
    }

    switch (rule.dataType) {
      case 'email':
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(String(value));

      case 'phone':

        const phoneRegex = /^[\+]?[\d\s\-\(\)]{7,15}$/;
        return phoneRegex.test(String(value).replace(/\s/g, ''));

      case 'number':
        return !isNaN(Number(value));

      case 'boolean':
        return typeof value === 'boolean';

      case 'date':
        return !isNaN(Date.parse(String(value)));

      case 'string':
      default:

        if (rule.validationPattern) {
          try {
            const regex = new RegExp(rule.validationPattern);
            return regex.test(String(value));
          } catch (error) {
            logger.error('DataCaptureService', `Invalid validation pattern: ${rule.validationPattern}`, error);
            return true; // If pattern is invalid, skip validation
          }
        }
        return true;
    }
  }

  /**
   * Get all captured variables for a session
   */
  async getCapturedVariables(sessionId: string, scope?: string): Promise<Record<string, any>> {
    try {
      return await storage.getFlowVariables(sessionId, scope);
    } catch (error) {
      logger.error('DataCaptureService', `Error getting captured variables for session ${sessionId}`, error);
      return {};
    }
  }

  /**
   * Clear captured variables for a session
   */
  async clearCapturedVariables(sessionId: string, scope?: string): Promise<void> {
    try {
      await storage.clearFlowVariables(sessionId, scope);
      logger.info('DataCaptureService', `Cleared variables for session ${sessionId}`, { scope });
    } catch (error) {
      logger.error('DataCaptureService', `Error clearing variables for session ${sessionId}`, error);
      throw error;
    }
  }
}

export const dataCaptureService = new DataCaptureService();
