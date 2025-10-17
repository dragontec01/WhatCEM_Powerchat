import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Alert,
  AlertDescription,
  AlertTitle
} from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, AlertCircle, Check, Mail, Key } from "lucide-react";

interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
  senderEmail: string;
  senderName: string;
}

export function SmtpConfiguration() {
  const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
    host: '',
    port: 465,
    secure: false,
    auth: {
      user: '',
      pass: ''
    },
    senderEmail: '',
    senderName: ''
  });
  
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const { toast } = useToast();
  
  const { data: smtpData, isLoading } = useQuery<SmtpConfig>({
    queryKey: ['/api/smtp-config'],
    refetchOnWindowFocus: false
  });
  
  useEffect(() => {
    if (smtpData) {
      setSmtpConfig(smtpData);
    }
  }, [smtpData]);
  
  const updateSmtpConfig = useMutation({
    mutationFn: async (config: SmtpConfig) => {
      const res = await apiRequest('POST', '/api/smtp-config', config);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'SMTP Configuration Saved',
        description: 'Your email settings have been updated successfully',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/smtp-config'] });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to update SMTP configuration: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const testSmtpConfig = useMutation({
    mutationFn: async ({ config, testEmail }: { config: SmtpConfig; testEmail: string }) => {
      const res = await apiRequest('POST', '/api/smtp-config/test', { config, testEmail });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Test Email Sent',
        description: 'A test email has been sent successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: `Failed to send test email: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setSmtpConfig({
        ...smtpConfig,
        [parent]: {
          ...smtpConfig[parent as keyof SmtpConfig] as any,
          [child]: value
        }
      });
    } else if (name === 'port') {
      setSmtpConfig({
        ...smtpConfig,
        [name]: parseInt(value) || 0
      });
    } else {
      setSmtpConfig({
        ...smtpConfig,
        [name]: value
      });
    }
  };
  
  const handleToggleSecure = (checked: boolean) => {
    setSmtpConfig({
      ...smtpConfig,
      secure: checked,
      port: checked ? 465 : 465
    });
  };
  
  const handleSaveConfig = () => {
    if (!smtpConfig.host) {
      toast({
        title: 'Validation Error',
        description: 'SMTP host is required',
        variant: 'destructive',
      });
      return;
    }
    
    if (!smtpConfig.auth.user || !smtpConfig.auth.pass) {
      toast({
        title: 'Validation Error',
        description: 'SMTP username and password are required',
        variant: 'destructive',
      });
      return;
    }
    
    if (!smtpConfig.senderEmail) {
      toast({
        title: 'Validation Error',
        description: 'Sender email address is required',
        variant: 'destructive',
      });
      return;
    }
    
    updateSmtpConfig.mutate(smtpConfig);
  };
  
  const handleTestEmail = () => {
    if (!testEmailAddress) {
      toast({
        title: 'Validation Error',
        description: 'Please enter an email address to send the test email to',
        variant: 'destructive',
      });
      return;
    }
    
    if (!smtpConfig.host || !smtpConfig.auth.user || !smtpConfig.auth.pass || !smtpConfig.senderEmail) {
      toast({
        title: 'Validation Error',
        description: 'Please complete all required SMTP configuration fields first',
        variant: 'destructive',
      });
      return;
    }
    
    testSmtpConfig.mutate({ config: smtpConfig, testEmail: testEmailAddress });
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">SMTP Server Configuration</h3>
        <p className="text-sm text-gray-500 mb-4">
          Configure your email server settings to enable sending verification emails, notifications, and other communications.
        </p>
      </div>
      
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Important</AlertTitle>
        <AlertDescription>
          Email functionality is required for team member invitations and password reset features.
        </AlertDescription>
      </Alert>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="host">SMTP Host</Label>
            <Input
              id="host"
              name="host"
              value={smtpConfig.host}
              onChange={handleInputChange}
              placeholder="smtp.example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="port">SMTP Port</Label>
            <Input
              id="port"
              name="port"
              type="number"
              value={smtpConfig.port.toString()}
              onChange={handleInputChange}
              placeholder="465"
            />
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="secure">Use Secure Connection (SSL/TLS)</Label>
              <Switch 
                id="secure"
                checked={smtpConfig.secure}
                onCheckedChange={handleToggleSecure}
              />
            </div>
            <p className="text-xs text-gray-500">
              Enable for SSL/TLS connections. Usually port 465 for SSL and port 465 for TLS.
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="auth.user">SMTP Username</Label>
            <Input
              id="auth.user"
              name="auth.user"
              value={smtpConfig.auth.user}
              onChange={handleInputChange}
              placeholder="username@example.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="auth.pass">SMTP Password</Label>
            <div className="relative">
              <Input
                id="auth.pass"
                name="auth.pass"
                type={isPasswordVisible ? "text" : "password"}
                value={smtpConfig.auth.pass}
                onChange={handleInputChange}
                placeholder="••••••••"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 btn-brand-primary"
                onClick={() => setIsPasswordVisible(!isPasswordVisible)}
              >
                {isPasswordVisible ? "Hide" : "Show"}
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="senderEmail">Sender Email Address</Label>
            <Input
              id="senderEmail"
              name="senderEmail"
              value={smtpConfig.senderEmail}
              onChange={handleInputChange}
              placeholder="no-reply@yourcompany.com"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="senderName">Sender Name</Label>
            <Input
              id="senderName"
              name="senderName"
              value={smtpConfig.senderName}
              onChange={handleInputChange}
              placeholder="Your Company Name"
            />
          </div>
        </div>
      </div>
      
      <div className="border-t pt-6 space-y-4">
        <h4 className="font-medium">Test Email Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <Input
              value={testEmailAddress}
              onChange={(e) => setTestEmailAddress(e.target.value)}
              placeholder="Enter an email address to receive a test message"
            />
          </div>
          <Button onClick={handleTestEmail} disabled={testSmtpConfig.isPending} className="w-full btn-brand-primary">
            {testSmtpConfig.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Send Test Email
          </Button>
        </div>
      </div>
      
      <div className="flex justify-end space-x-2">
        <Button variant="brand">Cancel</Button>
        <Button className='btn-brand-primary' onClick={handleSaveConfig} disabled={updateSmtpConfig.isPending}>
          {updateSmtpConfig.isPending && (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          )}
          Save Configuration
        </Button>
      </div>
    </div>
  );
}