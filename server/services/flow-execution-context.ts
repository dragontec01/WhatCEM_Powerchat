/**
 * Flow Execution Context
 * Manages variables and data during flow execution
 */
export class FlowExecutionContext {
  private variables: Map<string, any> = new Map();
  private nodeData: Map<string, any> = new Map();
  private readonly startTime: Date;

  constructor(initialData?: any) {
    this.startTime = new Date();

    if (initialData) {
      Object.entries(initialData).forEach(([key, value]) => {
        this.variables.set(key, value);
      });
    }

    this.setSystemVariables();
  }

  /**
   * Set a variable value
   */
  setVariable(key: string, value: any): void {
    this.variables.set(key, value);

  }

  /**
   * Set variables from a session with proper scoping to prevent pollution
   */
  setSessionVariables(sessionVariables: Map<string, any>, sessionId: string): void {
    sessionVariables.forEach((value, key) => {

      if (key.startsWith('session.') || key.startsWith('flow.') || key.startsWith('user.') || key.startsWith('contact.') || key.startsWith('message.')) {
        this.variables.set(key, value);
      }

      else if (!key.startsWith('system.')) {
        this.variables.set(`session.${sessionId}.${key}`, value);

        this.variables.set(key, value);
      }
    });
  }

  /**
   * Get a variable value
   */
  getVariable(key: string): any {
    return this.variables.get(key);
  }

  /**
   * Check if variable exists
   */
  hasVariable(key: string): boolean {
    return this.variables.has(key);
  }

  /**
   * Get all variables
   */
  getAllVariables(): Record<string, any> {
    const result: Record<string, any> = {};
    this.variables.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Load captured variables from storage into context
   */
  async loadCapturedVariables(sessionId: string, scope?: string): Promise<void> {
    try {
      const { storage } = await import('../storage');
      const capturedVars = await storage.getFlowVariables(sessionId, scope);

      Object.entries(capturedVars).forEach(([key, value]) => {
        this.setVariable(key, value);
      });


    } catch (error) {
      console.error('Error loading captured variables:', error);
    }
  }

  /**
   * Get captured variables with a specific prefix
   */
  getCapturedVariables(prefix?: string): Record<string, any> {
    const result: Record<string, any> = {};

    this.variables.forEach((value, key) => {
      if (!prefix || key.startsWith(prefix)) {

        if (!key.startsWith('current.') && !key.startsWith('flow.') &&
            !key.startsWith('session.') && !key.startsWith('message.') &&
            !key.startsWith('contact.')) {
          result[key] = value;
        }
      }
    });

    return result;
  }

  /**
   * Set node execution data
   */
  setNodeData(nodeId: string, data: any): void {
    this.nodeData.set(nodeId, data);
    
  }

  /**
   * Get node execution data
   */
  getNodeData(nodeId: string): any {
    return this.nodeData.get(nodeId);
  }

  /**
   * Replace variables in a template string with proper error handling and sanitization
   */
  replaceVariables(template: string): string {
    if (!template) return '';

    try {
      let result = template;

      this.variables.forEach((value, key) => {
        try {
          if (!/^[a-zA-Z0-9_.-]+$/.test(key)) {

            return;
          }

          const regex = new RegExp(`{{${this.escapeRegex(key)}}}`, 'g');
          const stringValue = this.formatVariableValue(value);
          const sanitizedValue = this.sanitizeVariableValue(stringValue);


          if (key.startsWith('google_sheets')) {




          }

          result = result.replace(regex, sanitizedValue);
        } catch (error) {
          console.error(`Flow context: Error replacing variable "${key}":`, error);
        }
      });

      const nestedMatches = result.match(/{{([^}]+)}}/g);
      if (nestedMatches) {

        nestedMatches.forEach(match => {
          try {
            const variablePath = match.slice(2, -2);


            if (!/^[a-zA-Z0-9_.-]+$/.test(variablePath)) {

              return;
            }

            const value = this.getNestedVariable(variablePath);

            if (value !== undefined) {
              const sanitizedValue = this.sanitizeVariableValue(this.formatVariableValue(value));
              result = result.replace(match, sanitizedValue);

            } else {

            }
          } catch (error) {
            console.error(`Flow context: Error replacing nested variable "${match}":`, error);
          }
        });
      }

      return result;
    } catch (error) {
      console.error('Flow context: Critical error in variable replacement:', error);
      return template;
    }
  }

  /**
   * Get nested variable value (e.g., contact.name)
   */
  private getNestedVariable(path: string): any {
    const parts = path.split('.');
    let current = this.getAllVariables();

    for (const part of parts) {
      if (current && typeof current === 'object' && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  /**
   * Format variable value for string replacement
   */
  private formatVariableValue(value: any): string {
    if (value === null || value === undefined) {
      return '';
    }


    if (Array.isArray(value)) {
      const firstValue = value.find(item => item !== null && item !== undefined && item !== '');
      return firstValue ? String(firstValue) : '';
    }

    if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  }

  /**
   * Sanitize variable value to prevent XSS and injection attacks
   * For WhatsApp messages, we don't need HTML encoding since it's plain text
   */
  private sanitizeVariableValue(value: string): string {
    if (!value) return '';



    return value;
  }

  /**
   * Escape special regex characters in variable keys
   */
  private escapeRegex(str: string): string {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  /**
   * Set system variables
   */
   private setSystemVariables(): void {
    const now = new Date();

    this.setVariable('date.today', now.toLocaleDateString());
    this.setVariable('date.now', now.toISOString());
    this.setVariable('time.now', now.toLocaleTimeString());
    this.setVariable('timestamp', now.getTime());
    this.setVariable('current.timestamp', now.toISOString());
    this.setVariable('current.date', now.toLocaleDateString());
    this.setVariable('current.time', now.toLocaleTimeString());
    this.setVariable('execution.startTime', this.startTime.toISOString());
  }

  /**
   * Update current time variables to reflect the current moment
   */
  updateCurrentTimeVariables(): void {
    const now = new Date();

    this.setVariable('date.today', now.toLocaleDateString());
    this.setVariable('date.now', now.toISOString());
    this.setVariable('time.now', now.toLocaleTimeString());
    this.setVariable('timestamp', now.getTime());
    this.setVariable('current.timestamp', now.toISOString());
    this.setVariable('current.date', now.toLocaleDateString());
    this.setVariable('current.time', now.toLocaleTimeString());
  }

  /**
   * Update contact variables
   */
  setContactVariables(contact: any): void {
    this.setVariable('contact.id', contact.id);
    this.setVariable('contact.name', contact.name || '');
    this.setVariable('contact.identifier', contact.identifier || '');
    this.setVariable('contact.phone', contact.phone || '');
    this.setVariable('contact.email', contact.email || '');
    this.setVariable('contact', contact);
  }

  /**
   * Update message variables with enhanced contextual data
   */
  setMessageVariables(message: any): void {
    this.setVariable('message.id', message.id);
    this.setVariable('message.content', message.content || '');
    this.setVariable('message.type', message.type || '');
    this.setVariable('message.timestamp', message.timestamp);
    this.setVariable('message.direction', message.direction || '');
    this.setVariable('message.mediaUrl', message.mediaUrl || message.media_url || '');
    this.setVariable('message.metadata', message.metadata || '');
    this.setVariable('message', message);


    if (message.direction === 'inbound') {

      this.setVariable('sender.phone', this.getVariable('contact.phone') || '');

    } else if (message.direction === 'outbound') {

      this.setVariable('receiver.phone', this.getVariable('contact.phone') || '');

    }
  }

  /**
   * Update conversation variables
   */
  setConversationVariables(conversation: any): void {
    this.setVariable('conversation.id', conversation.id);
    this.setVariable('conversation.status', conversation.status || '');
    this.setVariable('conversation', conversation);
  }

  /**
   * Set availability data from calendar nodes
   */
  setAvailabilityData(availabilityData: string): void {
    this.setVariable('availability', availabilityData);
    this.setVariable('calendar.availability', availabilityData);
  }

  /**
   * Set AI response data
   */
  setAIResponse(response: string, metadata?: any): void {
    this.setVariable('ai.response', response);
    this.setVariable('ai.lastResponse', response);

    if (metadata) {
      this.setVariable('ai.metadata', metadata);
    }
  }

  /**
   * Set user input from quick reply or text input
   */
  setUserInput(input: string, inputType: 'text' | 'quickreply' = 'text'): void {
    this.setVariable('user.input', input);
    this.setVariable('user.lastInput', input);
    this.setVariable('user.inputType', inputType);
  }

  /**
   * Set webhook response data
   */
  setWebhookResponse(response: any): void {
    this.setVariable('webhook.response', response);
    this.setVariable('webhook.lastResponse', response);
  }

  /**
   * Set HTTP request response data
   */
  setHttpResponse(response: any): void {
    this.setVariable('http.response', response);
    this.setVariable('http.lastResponse', response);
  }

  /**
   * Merge context from another execution context
   */
  mergeContext(otherContext: FlowExecutionContext): void {
    const otherVariables = otherContext.getAllVariables();
    Object.entries(otherVariables).forEach(([key, value]) => {
      if (!key.startsWith('date.') && !key.startsWith('time.') && !key.startsWith('execution.')) {
        this.setVariable(key, value);
      }
    });
  }

  /**
   * Clear all variables except system variables
   */
  clearUserVariables(): void {
    const systemKeys = Array.from(this.variables.keys()).filter(key =>
      key.startsWith('date.') ||
      key.startsWith('time.') ||
      key.startsWith('execution.')
    );

    this.variables.clear();

    systemKeys.forEach(key => {
      this.setSystemVariables();
    });
  }

  /**
   * Get context summary for debugging
   */
  getSummary(): any {
    return {
      variableCount: this.variables.size,
      nodeDataCount: this.nodeData.size,
      startTime: this.startTime,
      variables: this.getAllVariables()
    };
  }

  /**
   * Clone the context
   */
  clone(): FlowExecutionContext {
    const newContext = new FlowExecutionContext();

    this.variables.forEach((value, key) => {
      newContext.setVariable(key, value);
    });

    this.nodeData.forEach((value, key) => {
      newContext.setNodeData(key, value);
    });

    return newContext;
  }
}
