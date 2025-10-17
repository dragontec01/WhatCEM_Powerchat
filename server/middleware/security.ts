import { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';

/**
 * Security middleware for production
 */
export function setupSecurityMiddleware(app: any) {

  const disableCSP = true; // process.env.DISABLE_CSP === 'true';

  
  
  
  
  
  


  app.use(helmet({
    contentSecurityPolicy: disableCSP ? false : {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https:"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https:",
          "data:"
        ],
        imgSrc: ["'self'", "data:", "https:", "blob:"],
        connectSrc: ["'self'", "https:", "wss:", "ws:"],
        fontSrc: [
          "'self'",
          "https:",
          "data:"
        ],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'", "https:", "data:"],
        frameSrc: ["'self'", "https:"],
        childSrc: ["'self'", "https:"],
        workerSrc: ["'self'", "blob:"],
        manifestSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false, // Disable for compatibility
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    }
  }));





  app.use((req: Request, res: Response, next: NextFunction) => {

    res.removeHeader('X-Powered-By');


    res.setHeader('X-Content-Type-Options', 'nosniff');


    if (req.query.embed === 'true') {
      res.setHeader('X-Frame-Options', 'ALLOWALL');

      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('X-Frame-Options', 'DENY');
    }

    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');


    if (!disableCSP) {
      res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(self), camera=(self)');
    }


    if (req.path.includes('/api/')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }

    next();
  });


  app.use((req: Request, res: Response, next: NextFunction) => {

    const suspiciousPatterns = [
      /\.\.\//g, // Directory traversal
      /<script/gi, // XSS attempts
      /union.*select/gi, // SQL injection
      /javascript:/gi, // JavaScript injection
      /vbscript:/gi, // VBScript injection
    ];

    const checkString = (str: string): boolean => {
      return suspiciousPatterns.some(pattern => pattern.test(str));
    };


    if (checkString(req.url)) {
      
      return res.status(400).json({ error: 'Invalid request' });
    }


    for (const [key, value] of Object.entries(req.query)) {
      if (typeof value === 'string' && checkString(value)) {
        
        return res.status(400).json({ error: 'Invalid request' });
      }
    }


    if (req.body && typeof req.body === 'object') {
      const bodyStr = JSON.stringify(req.body);
      if (checkString(bodyStr)) {
        
        return res.status(400).json({ error: 'Invalid request' });
      }
    }

    next();
  });


  app.use('/api/', (req: Request, res: Response, next: NextFunction) => {

    if (process.env.NODE_ENV === 'production') {
      
    }
    

    if (!req.headers['user-agent']) {
      return res.status(400).json({ error: 'Missing required headers' });
    }
    
    next();
  });
}

/**
 * Security event reporting endpoint
 */
export function setupSecurityReporting(app: any) {
  app.post('/api/security/report', (req: Request, res: Response) => {
    const { reason, timestamp, userAgent, url } = req.body;
    

    console.warn('🚨 Client Security Event:', {
      reason,
      timestamp,
      userAgent,
      url,
      ip: req.ip,
      headers: req.headers
    });
    


    res.status(200).json({ status: 'reported' });
  });


  app.get('/security-violation', (req: Request, res: Response) => {
    res.status(403).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Security Violation</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
          .error { color: #d32f2f; font-size: 24px; margin-bottom: 20px; }
          .message { color: #666; font-size: 16px; }
        </style>
      </head>
      <body>
        <div class="error">🚨 Security Violation Detected</div>
        <div class="message">
          Your session has been terminated due to suspicious activity.<br>
          If you believe this is an error, please contact support.
        </div>
      </body>
      </html>
    `);
  });
}
