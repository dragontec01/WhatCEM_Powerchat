import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollableTabs } from "@/components/ui/scrollable-tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from '@/hooks/use-translation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useAvailablePlans, Plan } from "@/hooks/use-available-plans";
import { usePaymentMethods } from "@/hooks/use-payment-methods";
import { PlanCard } from "@/components/settings/PlanCard";
import { CheckoutDialog } from "@/components/settings/CheckoutDialog";
import { SubscriptionManagement } from "@/components/settings/SubscriptionManagement";
import { AffiliateEarningsCard } from "@/components/settings/AffiliateEarningsCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Loader2,
  RefreshCw,
  Calendar,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Copy,
  AlertTriangle,
  Settings2,
  Key
} from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { WhatsAppEmbeddedSignup } from '@/components/settings/WhatsAppEmbeddedSignup';
import { WhatsAppBusinessApiForm } from '@/components/settings/WhatsAppBusinessApiForm';
import { MetaWhatsAppIntegratedOnboarding } from '@/components/settings/MetaWhatsAppIntegratedOnboarding';
import { ApiAccessTab } from '@/components/settings/ApiAccessTab';
import { WhatsAppTwilioForm } from '@/components/settings/WhatsAppTwilioForm';
import { Unified360DialogSetup } from '@/components/settings/Unified360DialogSetup';
import { InstagramConnectionForm } from '@/components/settings/InstagramConnectionForm';
import { EnhancedInstagramConnectionForm } from '@/components/settings/EnhancedInstagramConnectionForm';
import { MessengerConnectionForm } from '@/components/settings/MessengerConnectionForm';
import { TikTokConnectionForm } from '@/components/settings/TikTokConnectionForm';
import { TelegramConnectionForm } from '@/components/settings/TelegramConnectionForm';
import { TeamMembersList } from '@/components/settings/TeamMembersList';
import { RolesAndPermissions } from '@/components/settings/RolesAndPermissions';
import { SmtpConfiguration } from '@/components/settings/SmtpConfiguration';
import { PartnerConfigurationForm } from '@/components/settings/PartnerConfigurationForm';
import { TikTokPlatformConfigForm } from '@/components/settings/TikTokPlatformConfigForm';
import { WhatsAppBehaviorSettings } from '@/components/settings/WhatsAppBehaviorSettings';
import { InboxSettings } from '@/components/settings/InboxSettings';
import { EmailChannelForm } from '@/components/settings/EmailChannelForm';
import { EditEmailChannelForm } from '@/components/settings/EditEmailChannelForm';
import { EditWhatsAppBusinessApiForm } from '@/components/settings/EditWhatsAppBusinessApiForm';
import { EditMessengerConnectionForm } from '@/components/settings/EditMessengerConnectionForm';
import { EditTikTokConnectionForm } from '@/components/settings/EditTikTokConnectionForm';
import ConnectionControl from '@/components/whatsapp/ConnectionControl';
import CompanyAiCredentialsTab from '@/components/settings/CompanyAiCredentialsTab';
import AiUsageAnalytics from '@/components/settings/AiUsageAnalytics';

interface User {
  id: number;
  username: string;
  fullName: string;
  email: string;
  role: string;
  isSuperAdmin: boolean;
  companyId: number;
  company?: {
    id: number;
    name: string;
    plan: string;
    planId: number;
    subscriptionStatus: string;
    subscriptionEndDate?: string;
  };
}

interface ChannelConnection {
  id: number;
  userId: number;
  channelType: string;
  accountId: string;
  accountName: string;
  connectionData: any;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function Settings() {
  const [location] = useLocation();
  const { t } = useTranslation();

  const getActiveTab = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    return tab || 'channels';
  };

  const [activeTab, setActiveTab] = useState(getActiveTab());

  useEffect(() => {
    setActiveTab(getActiveTab());
  }, [location]);

  const [apiKey, setApiKey] = useState('');
  const [apiKeyVisible, setApiKeyVisible] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showBusinessApiModal, setShowBusinessApiModal] = useState(false);
  const [showEmbeddedSignupModal, setShowEmbeddedSignupModal] = useState(false);
  const [showMetaIntegratedOnboardingModal, setShowMetaIntegratedOnboardingModal] = useState(false);
  const [showTwilioModal, setShowTwilioModal] = useState(false);
  const [showUnified360DialogSetup, setShowUnified360DialogSetup] = useState(false);
  const [showInstagramModal, setShowInstagramModal] = useState(false);
  const [showEnhancedInstagramModal, setShowEnhancedInstagramModal] = useState(false);
  const [showMessengerModal, setShowMessengerModal] = useState(false);
  const [showTikTokModal, setShowTikTokModal] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPartnerConfigModal, setShowPartnerConfigModal] = useState(false);
  const [showTikTokPlatformConfigModal, setShowTikTokPlatformConfigModal] = useState(false);
  const [isUpdatingCredentials, setIsUpdatingCredentials] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [isCheckoutDialogOpen, setIsCheckoutDialogOpen] = useState(false);
  const { toast } = useToast();

  const { plans, isLoading: isLoadingPlans } = useAvailablePlans();

  const { paymentMethods, isLoading: isLoadingPaymentMethods } = usePaymentMethods();

  const { data: planInfo, isLoading: isLoadingPlanInfo } = useQuery({
    queryKey: ['/api/user/plan-info'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/user/plan-info');
      if (!res.ok) throw new Error('Failed to fetch plan info');
      return res.json();
    },
  });

  const credentialsForm = useForm({
    defaultValues: {
      clientId: '',
      clientSecret: '',
      redirectUri: window.location.origin + '/api/google/callback'
    }
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/user'],
    refetchOnWindowFocus: false
  });

  const {
    data: fetchedConnections = [],
    refetch: refetchConnections
  } = useQuery<ChannelConnection[]>({
    queryKey: ['/api/channel-connections'],
    refetchOnWindowFocus: false
  });

  const {
    data: googleCalendarStatus,
    refetch: refetchGoogleCalendarStatus
  } = useQuery<{ connected: boolean; message: string }>({
    queryKey: ['/api/google/calendar/status'],
    refetchOnWindowFocus: false
  });

  const {
    data: googleCalendarCredentials,
    refetch: refetchGoogleCalendarCredentials
  } = useQuery<{ configured: boolean; clientId: string; clientSecret: string; redirectUri: string }>({
    queryKey: ['/api/google/credentials'],
    refetchOnWindowFocus: false,
    enabled: currentUser?.role === 'admin' || currentUser?.isSuperAdmin
  });

  useEffect(() => {
    if (googleCalendarCredentials) {
      credentialsForm.reset({
        clientId: googleCalendarCredentials.clientId || '',
        clientSecret: '',
        redirectUri: googleCalendarCredentials.redirectUri || window.location.origin + '/api/google/callback'
      });
    }
  }, [googleCalendarCredentials, credentialsForm]);

  const { data: googleCalendarAuthData } = useQuery<{ authUrl: string }>({
    queryKey: ['/api/google/auth'],
    refetchOnWindowFocus: false,
    enabled: googleCalendarCredentials?.configured === true
  });

  const disconnectGoogleCalendarMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/google/calendar/disconnect');
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.google_calendar_disconnected', 'Google Calendar Disconnected'),
        description: t('settings.google_calendar_disconnect_success', 'Your Google Calendar account has been disconnected successfully.'),
      });
      refetchGoogleCalendarStatus();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.google_calendar_disconnect_error', 'Failed to disconnect Google Calendar: {{error}}', { error: error.message }),
        variant: 'destructive',
      });
    },
  });

  const updateGoogleCredentialsMutation = useMutation({
    mutationFn: async (credentials: { clientId: string; clientSecret: string; redirectUri: string }) => {
      const res = await apiRequest('POST', '/api/google/credentials', credentials);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: t('settings.google_calendar_credentials_updated', 'Google Calendar Credentials Updated'),
        description: t('settings.google_calendar_credentials_success', 'Your Google OAuth credentials have been updated successfully.'),
      });
      setShowCredentialsModal(false);
      refetchGoogleCalendarCredentials();
      disconnectGoogleCalendarMutation.mutate();
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.google_calendar_credentials_error', 'Failed to update Google Calendar credentials: {{error}}', { error: error.message }),
        variant: 'destructive',
      });
    },
  });

  const [channelConnections, setChannelConnections] = useState<ChannelConnection[]>([]);

  useEffect(() => {
    setChannelConnections(fetchedConnections);
  }, [fetchedConnections]);

  const handleConnectionSuccess = () => {
    refetchConnections();
    queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
  };

  const handleSaveAccount = () => {
    toast({
      title: t('settings.account_updated', 'Account Updated'),
      description: t('settings.account_updated_success', 'Your account settings have been saved successfully'),
    });
  };



  const handleSaveApiKey = () => {
    if (!apiKey.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('settings.api_key_empty_error', 'API key cannot be empty'),
        variant: "destructive"
      });
      return;
    }

    toast({
      title: t('settings.api_key_saved', 'API Key Saved'),
      description: t('settings.api_key_updated', 'Your API key has been updated'),
    });
    setApiKey('');
  };

  const handleSelectPlan = (plan: Plan) => {
    setSelectedPlan(plan);
    setIsCheckoutDialogOpen(true);
  };

  const handleCheckoutSuccess = () => {
    setIsCheckoutDialogOpen(false);
    toast({
      title: t('settings.subscription_updated', 'Subscription Updated'),
      description: t('settings.subscription_updated_success', 'Your subscription has been updated successfully'),
    });
    queryClient.invalidateQueries({ queryKey: ['/api/user'] });
  };

  const [showQrModal, setShowQrModal] = useState(false);
  const [activeConnectionId, setActiveConnectionId] = useState<number | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');

  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameConnectionId, setRenameConnectionId] = useState<number | null>(null);
  const [newChannelName, setNewChannelName] = useState('');

  const [showEditEmailModal, setShowEditEmailModal] = useState(false);
  const [editEmailConnectionId, setEditEmailConnectionId] = useState<number | null>(null);

  const [showEditWhatsAppModal, setShowEditWhatsAppModal] = useState(false);
  const [editWhatsAppConnectionId, setEditWhatsAppConnectionId] = useState<number | null>(null);

  const [showEditMessengerModal, setShowEditMessengerModal] = useState(false);
  const [editMessengerConnectionId, setEditMessengerConnectionId] = useState<number | null>(null);

  const [showEditTikTokModal, setShowEditTikTokModal] = useState(false);
  const [editTikTokConnectionId, setEditTikTokConnectionId] = useState<number | null>(null);

  const [syncingChannels, setSyncingChannels] = useState<Set<number>>(new Set());

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}/ws`);

    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;
    const reconnectInterval = 2000;
    const socketRef = { current: socket };

    const reconnect = () => {
      if (reconnectAttempts < maxReconnectAttempts) {
        reconnectAttempts++;
        if (socketRef.current.readyState === WebSocket.OPEN) {
          socketRef.current.close();
        }

        setTimeout(() => {
          const newSocket = new WebSocket(`${protocol}//${window.location.host}/ws`);

          newSocket.onopen = () => {
            reconnectAttempts = 0;

            if (currentUser?.id) {
              newSocket.send(JSON.stringify({
                type: 'authenticate',
                userId: currentUser.id
              }));
            }
          };

          newSocket.onmessage = (event) => {
            try {
              const data = JSON.parse(event.data);

              if (data.type === 'whatsappQrCode' && data.connectionId === activeConnectionId) {
                setQrCode(data.qrCode);
                setConnectionStatus('qr_code');
              }

              else if (data.type === 'whatsappConnectionStatus' && data.connectionId === activeConnectionId) {
                setConnectionStatus(data.status);

                if (data.status === 'connected') {
                  toast({
                    title: t('settings.whatsapp_connected', 'WhatsApp Connected'),
                    description: t('settings.whatsapp_connected_success', 'Your WhatsApp account has been connected successfully!'),
                  });
                  refetchConnections();
                  queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                  setTimeout(() => {
                    setShowQrModal(false);
                    setQrCode(null);
                  }, 2000);
                }
              }

              else if (data.type === 'whatsappConnectionError' && data.connectionId === activeConnectionId) {
                console.error('WhatsApp connection error:', data.error);
                setConnectionStatus('error');
                toast({
                  title: t('settings.connection_error', 'Connection Error'),
                  description: data.error,
                  variant: "destructive"
                });
              }
            } catch (error) {
              console.error('Error parsing WebSocket message:', error);
            }
          };

          newSocket.onerror = (error) => {
            console.error('WebSocket error:', error);
          };

          newSocket.onclose = () => {
            setTimeout(reconnect, reconnectInterval);
          };

          socketRef.current = newSocket;
        }, reconnectInterval);
      } else {
        console.error('Max reconnection attempts reached');

        setTimeout(() => {
          reconnectAttempts = 0;
        }, 60000);
      }
    };

    socket.onopen = () => {
      reconnectAttempts = 0;

      if (currentUser?.id) {
        socket.send(JSON.stringify({
          type: 'authenticate',
          userId: currentUser.id
        }));
      }
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === 'whatsappQrCode' && data.connectionId === activeConnectionId) {
          setQrCode(data.qrCode);
          setConnectionStatus('qr_code');
        }

        else if (data.type === 'whatsappConnectionStatus' && data.connectionId === activeConnectionId) {
          setConnectionStatus(data.status);

          if (data.status === 'connected') {
            toast({
              title: "WhatsApp Connected",
              description: "Your WhatsApp account has been connected successfully!",
            });
            refetchConnections();
            queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
            setTimeout(() => {
              setShowQrModal(false);
              setQrCode(null);
            }, 2000);
          }
        }

        else if (data.type === 'whatsappConnectionError' && data.connectionId === activeConnectionId) {
          console.error('WhatsApp connection error:', data.error);
          setConnectionStatus('error');
          toast({
            title: "Connection Error",
            description: data.error,
            variant: "destructive"
          });
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = () => {
      reconnect();
    };

    return () => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [currentUser?.id, activeConnectionId, refetchConnections]);


  const handleConnectChannel = async (channelType: string) => {
    try {
      if (channelType === 'WhatsApp Unofficial') {
        const response = await fetch('/api/channel-connections', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channelType: 'whatsapp_unofficial',
            accountId: `whatsapp-${Date.now()}`,
            accountName: 'WhatsApp Personal',
            connectionData: {}
          })
        });

        if (!response.ok) {
          throw new Error('Failed to create WhatsApp connection');
        }

        const connection = await response.json();
        setActiveConnectionId(connection.id);
        setConnectionStatus('connecting');
        setShowQrModal(true);

        toast({
          title: "WhatsApp Connection Initiated",
          description: "Preparing QR code for WhatsApp authentication...",
        });
      } else if (channelType === 'WhatsApp Business API') {
        setShowBusinessApiModal(true);
      } else if (channelType === 'WhatsApp Business Embedded') {
        setShowMetaIntegratedOnboardingModal(true);
      } else if (channelType === 'WhatsApp Business API (Twilio)') {
        setShowTwilioModal(true);
      } else if (channelType === 'WhatsApp Business API (360Dialog)') {
        setShowUnified360DialogSetup(true);
      } else if (channelType === 'Instagram') {
        setShowInstagramModal(true);
      } else if (channelType === 'Messenger') {
        setShowMessengerModal(true);
      } else if (channelType === 'TikTok') {
        setShowTikTokModal(true);
      } else if (channelType === 'Telegram') {

        setShowTelegramModal(true);
      } else if (channelType === 'Email') {
        setShowEmailModal(true);
      } else {
        toast({
          title: "Channel Connection Initiated",
          description: `Starting connection flow for ${channelType}`,
        });
      }
    } catch (error: any) {
      console.error('Error connecting to channel:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect to channel",
        variant: "destructive"
      });
    }
  };

  const handleDisconnectChannel = async (connectionId: number) => {
    try {
      const response = await fetch(`/api/whatsapp/disconnect/${connectionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Failed to disconnect channel');
      }

      refetchConnections();
      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

      toast({
        title: "Channel Disconnected",
        description: "The channel has been disconnected successfully",
      });
    } catch (error: any) {
      console.error('Error disconnecting channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect channel",
        variant: "destructive"
      });
    }
  };

  const handleDeleteChannel = async (connectionId: number) => {
    try {
      if (!window.confirm('Are you sure you want to delete this connection? This action cannot be undone.')) {
        return;
      }

      const response = await fetch(`/api/channel-connections/${connectionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Failed to delete channel connection');
      }

      refetchConnections();
      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

      toast({
        title: "Channel Deleted",
        description: "The channel connection has been permanently deleted",
      });
    } catch (error: any) {
      console.error('Error deleting channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete channel connection",
        variant: "destructive"
      });
    }
  };

  const handleReconnectChannel = async (connectionId: number) => {
    try {
      setActiveConnectionId(connectionId);
      setConnectionStatus('connecting');
      setQrCode(null);

      setShowQrModal(true);

      setChannelConnections((prev: ChannelConnection[]) => prev.map((conn: ChannelConnection) =>
        conn.id === connectionId ? { ...conn, status: 'reconnecting' } : conn
      ));

      const response = await fetch(`/api/whatsapp/reconnect/${connectionId}`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reconnect WhatsApp');
      }

      toast({
        title: "Reconnection Initiated",
        description: "Generating new QR code for WhatsApp connection...",
      });

      setTimeout(() => {
        refetchConnections();
        queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
      }, 3000);

    } catch (error) {
      console.error('Error reconnecting channel:', error);

      setShowQrModal(false);
      setActiveConnectionId(null);

      toast({
        title: "Reconnection Failed",
        description: error instanceof Error ? error.message : 'An error occurred while reconnecting',
        variant: "destructive"
      });

      refetchConnections();
      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
    }
  };

  const handleOpenRenameModal = (connectionId: number, currentName: string) => {
    setRenameConnectionId(connectionId);
    setNewChannelName(currentName);
    setShowRenameModal(true);
  };

  const handleOpenEditEmailModal = (connectionId: number) => {
    setEditEmailConnectionId(connectionId);
    setShowEditEmailModal(true);
  };

  const handleConnectEmailChannel = async (connectionId: number) => {
    try {
      const response = await fetch('/api/email/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          connectionId: connectionId
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email channel connected successfully!",
        });
        window.location.reload();
      } else {
        const errorData = await response.json();
        toast({
          title: "Connection Failed",
          description: errorData.message || "Failed to connect email channel",
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Error connecting email channel:', error);
      toast({
        title: "Connection Error",
        description: error.message || "Failed to connect email channel",
        variant: "destructive"
      });
    }
  };

  const handleSyncEmailChannel = async (connectionId: number) => {
    try {
      setSyncingChannels(prev => new Set(prev).add(connectionId));
      const response = await fetch(`/api/email/sync/${connectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include'
      });
      if (response.ok) {
        toast({ title: "Sync Started", description: "Email sync initiated successfully!" });
      } else {
        const errorData = await response.json();
        toast({ title: "Sync Failed", description: errorData.message || "Failed to sync", variant: "destructive" });
      }
    } catch (error: any) {
      toast({ title: "Sync Error", description: error.message || "Failed to sync", variant: "destructive" });
    } finally {
      setTimeout(() => setSyncingChannels(prev => { const newSet = new Set(prev); newSet.delete(connectionId); return newSet; }), 2000);
    }
  };

  const handleOpenEditWhatsAppModal = (connectionId: number) => {
    setEditWhatsAppConnectionId(connectionId);
    setShowEditWhatsAppModal(true);
  };

  const handleOpenEditMessengerModal = (connectionId: number) => {
    setEditMessengerConnectionId(connectionId);
    setShowEditMessengerModal(true);
  };

  const handleOpenEditTikTokModal = (connectionId: number) => {
    setEditTikTokConnectionId(connectionId);
    setShowEditTikTokModal(true);
  };

  const handleRenameChannel = async () => {
    if (!renameConnectionId || !newChannelName.trim()) {
      toast({
        title: "Validation Error",
        description: "Channel name cannot be empty",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/channel-connections/${renameConnectionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountName: newChannelName.trim()
        })
      });

      if (!response.ok) {
        throw new Error('Failed to rename channel connection');
      }

      refetchConnections();
      queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

      setShowRenameModal(false);
      setRenameConnectionId(null);
      setNewChannelName('');

      toast({
        title: "Channel Renamed",
        description: "The channel has been renamed successfully",
      });
    } catch (error: any) {
      console.error('Error renaming channel:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to rename channel",
        variant: "destructive"
      });
    }
  };

  const getChannelInfo = (channelType: string) => {
    switch (channelType) {
      case 'whatsapp_official':
        return { icon: 'ri-whatsapp-line', color: '#25D366', name: 'WhatsApp Business API' };
      case 'whatsapp_unofficial':
        return { icon: 'ri-whatsapp-line', color: '#F59E0B', name: 'WhatsApp (Unofficial)' };
      case 'messenger':
        return { icon: 'ri-messenger-line', color: '#1877F2', name: 'Facebook Messenger' };
      case 'instagram':
        return { icon: 'ri-instagram-line', color: '#E4405F', name: 'Instagram' };
      case 'tiktok':
        return { icon: 'ri-tiktok-line', color: '#000000', name: 'TikTok Business' };
      case 'telegram':
        return { icon: 'ri-telegram-line', color: '#0088CC', name: 'Telegram' };
      case 'email':
        return { icon: 'ri-mail-line', color: '#3B82F6', name: 'Email' };
      default:
        return { icon: 'ri-chat-1-line', color: '#333235', name: 'Chat' };
    }
  };

  const handleQrModalClose = async () => {
    setShowQrModal(false);

    if (activeConnectionId && connectionStatus !== 'connected') {
      try {
        const response = await fetch(`/api/channel-connections/${activeConnectionId}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          refetchConnections();
          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });

          toast({
            title: "Connection Cancelled",
            description: "WhatsApp connection has been cancelled and removed.",
          });
        } else {
          await fetch(`/api/whatsapp/disconnect/${activeConnectionId}`, {
            method: 'POST'
          });
          refetchConnections();
          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
        }
      } catch (error) {
        console.error('Error cleaning up WhatsApp connection:', error);
        try {
          await fetch(`/api/whatsapp/disconnect/${activeConnectionId}`, {
            method: 'POST'
          });
          refetchConnections();
          queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
        } catch (disconnectError) {
          console.error('Error disconnecting WhatsApp:', disconnectError);
        }
      }
    }

    setActiveConnectionId(null);
    setConnectionStatus('');
    setQrCode(null);
  };

  const handleSubmitCredentials = (data: any) => {
    setIsUpdatingCredentials(true);
    updateGoogleCredentialsMutation.mutate(data, {
      onSettled: () => {
        setIsUpdatingCredentials(false);
      }
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-gray-800">
      <Dialog open={showRenameModal} onOpenChange={setShowRenameModal}>
        <DialogContent className="w-[95vw] max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Rename Channel</DialogTitle>
            <DialogDescription className="text-sm">
              Enter a new name for this channel connection to help identify it better in your sidebar and conversations.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="channelName" className="mb-2 block text-sm">Channel Name</Label>
            <Input
              id="channelName"
              value={newChannelName}
              onChange={(e) => setNewChannelName(e.target.value)}
              placeholder="Enter new channel name"
              className="w-full"
            />
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowRenameModal(false);
                setRenameConnectionId(null);
                setNewChannelName('');
              }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="brand"
              className="btn-brand-primary w-full sm:w-auto"
              onClick={handleRenameChannel}
              disabled={!newChannelName.trim()}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showCredentialsModal} onOpenChange={setShowCredentialsModal}>
        <DialogContent className="w-[95vw] max-w-lg mx-auto max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">
              {googleCalendarCredentials?.configured ? 'Update' : 'Configure'} Google Calendar API Credentials
            </DialogTitle>
            <DialogDescription className="text-sm">
              Enter your company's Google Cloud OAuth credentials to enable Google Calendar integration.
              These credentials will be used for all users in your company.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Form {...credentialsForm}>
              <form onSubmit={credentialsForm.handleSubmit(handleSubmitCredentials)} className="space-y-4">
                <FormField
                  control={credentialsForm.control}
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client ID</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Your Google OAuth Client ID"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        Client ID from Google Cloud Console OAuth credentials
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialsForm.control}
                  name="clientSecret"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Client Secret</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="password"
                          placeholder="Your Google OAuth Client Secret"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        Client Secret from Google Cloud Console OAuth credentials
                      </p>
                    </FormItem>
                  )}
                />

                <FormField
                  control={credentialsForm.control}
                  name="redirectUri"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Redirect URI</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="https://your-app-url.com/api/google/callback"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-gray-500 mt-1">
                        This should match the authorized redirect URI in your Google Cloud Console
                      </p>
                    </FormItem>
                  )}
                />

                <div className="pt-2 border-t border-gray-100">
                  <Alert className="mb-4 bg-amber-50 border-amber-200">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Important</AlertTitle>
                    <AlertDescription className="text-xs">
                      After updating these credentials, you will need to reconnect your Google account.
                      All previous Google Calendar connections will be invalidated.
                    </AlertDescription>
                  </Alert>

                  <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between mt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowCredentialsModal(false);
                        credentialsForm.reset();
                      }}
                      className="w-full sm:w-auto"
                    >
                      Cancel
                    </Button>

                    <Button
                      variant={'brand'}
                      type="submit"
                      disabled={isUpdatingCredentials}
                      className="w-full sm:w-auto"
                    >
                      {isUpdatingCredentials && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isUpdatingCredentials
                        ? 'Saving...'
                        : googleCalendarCredentials?.configured
                          ? 'Update Credentials'
                          : 'Save Credentials'
                      }
                    </Button>
                  </DialogFooter>
                </div>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Header />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar />

        <div className="flex-1 overflow-y-auto p-3 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h1 className="text-2xl">Settings</h1>
              <p className="text-muted-foreground text-sm sm:text-base mt-1">
                Manage your account, channels, integrations, and team settings
              </p>
            </div>
          </div>

          {/* WhatsApp QR Code Modal */}
          <Dialog open={showQrModal} onOpenChange={(open) => {
            if (!open) {
              handleQrModalClose();
            }
          }}>
            <DialogContent className="w-[95vw] max-w-[330px] sm:max-w-md md:max-w-md rounded-lg">
              <DialogHeader>
                <DialogTitle>Connect to WhatsApp</DialogTitle>
                <DialogDescription>
                  Scan this QR code with your WhatsApp app to connect your account
                </DialogDescription>
              </DialogHeader>

              <div className="flex justify-center items-center py-4">
                {connectionStatus === 'connecting' && (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                    <p>Preparing WhatsApp connection...</p>
                  </div>
                )}

                {connectionStatus === 'qr_code' && qrCode && (
                  <div className="text-center py-4">
                    <div className="border-8 border-white inline-block rounded-lg shadow-md">
                      {/* Responsive QR code that adjusts based on screen size */}
                      <div className="w-full max-w-[256px] mx-auto">
                        {/* For small screens, reduce QR code size */}
                        <div className="block sm:hidden">
                          <QRCodeSVG value={qrCode} size={180} />
                        </div>
                        {/* For medium screens, standard size */}
                        <div className="hidden sm:block md:hidden">
                          <QRCodeSVG value={qrCode} size={220} />
                        </div>
                        {/* For large screens, full size */}
                        <div className="hidden md:block">
                          <QRCodeSVG value={qrCode} size={256} />
                        </div>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-gray-500 px-2">
                      1. Open WhatsApp on your phone<br />
                      2. Tap Menu or Settings and select WhatsApp Web<br />
                      3. Point your phone to this screen to scan the code
                    </p>
                  </div>
                )}

                {connectionStatus === 'connected' && (
                  <div className="text-center py-8 text-green-600">
                    <svg className="h-16 w-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <p className="text-lg font-medium">Connected Successfully!</p>
                  </div>
                )}

                {connectionStatus === 'error' && (
                  <div className="text-center py-8 text-red-600">
                    <svg className="h-16 w-16 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <p className="text-lg font-medium">Connection Failed</p>
                    <p className="mt-1 text-sm">There was an error connecting to WhatsApp. Please try again.</p>
                  </div>
                )}
              </div>

              <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleQrModalClose}
                  className="w-full sm:w-auto"
                >
                  Cancel
                </Button>

                {connectionStatus === 'qr_code' && (
                  <Button
                    type="button"
                    variant="brand"
                    onClick={() => {
                      setConnectionStatus('connecting');
                      setQrCode(null);
                      setTimeout(() => {
                        handleConnectChannel('WhatsApp Unofficial');
                      }, 500);
                    }}
                    className="w-full sm:w-auto text-sm"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">
                      Refresh QR Code
                    </span>
                    <span className="sm:hidden">
                      Refresh
                    </span>
                  </Button>
                )}

                {connectionStatus === 'error' && (
                  <Button
                    type="button"
                    onClick={() => handleConnectChannel('WhatsApp Unofficial')}
                    className="w-full sm:w-auto"
                  >
                    Try Again
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* WhatsApp Business API Connection Modal */}
          <WhatsAppBusinessApiForm
            isOpen={showBusinessApiModal}
            onClose={() => setShowBusinessApiModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* WhatsApp Business API Embedded Signup Modal */}
          <WhatsAppEmbeddedSignup
            isOpen={showEmbeddedSignupModal}
            onClose={() => setShowEmbeddedSignupModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Meta WhatsApp Integrated Onboarding Modal */}
          <MetaWhatsAppIntegratedOnboarding
            isOpen={showMetaIntegratedOnboardingModal}
            onClose={() => setShowMetaIntegratedOnboardingModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* WhatsApp Twilio Modal */}
          <WhatsAppTwilioForm
            isOpen={showTwilioModal}
            onClose={() => setShowTwilioModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Unified 360Dialog Setup Modal */}
          <Unified360DialogSetup
            isOpen={showUnified360DialogSetup}
            onClose={() => setShowUnified360DialogSetup(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Partner Configuration Modal - Super Admin Only */}
          {currentUser?.isSuperAdmin && (
            <>
              <PartnerConfigurationForm
                isOpen={showPartnerConfigModal}
                onClose={() => setShowPartnerConfigModal(false)}
                onSuccess={() => {

                  toast({
                    title: "Success",
                    description: "Partner configuration updated successfully",
                  });
                }}
                provider="360dialog"
              />

              <TikTokPlatformConfigForm
                isOpen={showTikTokPlatformConfigModal}
                onClose={() => setShowTikTokPlatformConfigModal(false)}
                onSuccess={() => {
                  toast({
                    title: "Success",
                    description: "TikTok platform configuration updated successfully",
                  });
                }}
              />
            </>
          )}

          {/* Instagram Connection Modal */}
          <InstagramConnectionForm
            isOpen={showInstagramModal}
            onClose={() => setShowInstagramModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Enhanced Instagram Connection Modal */}
          <EnhancedInstagramConnectionForm
            isOpen={showEnhancedInstagramModal}
            onClose={() => setShowEnhancedInstagramModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Messenger Connection Modal */}
          <MessengerConnectionForm
            isOpen={showMessengerModal}
            onClose={() => setShowMessengerModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* TikTok Connection Modal */}
          <TikTokConnectionForm
            isOpen={showTikTokModal}
            onClose={() => setShowTikTokModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Telegram Connection Modal */}
          <TelegramConnectionForm
            isOpen={showTelegramModal}
            onClose={() => setShowTelegramModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Email Channel Connection Modal */}
          <EmailChannelForm
            isOpen={showEmailModal}
            onClose={() => setShowEmailModal(false)}
            onSuccess={handleConnectionSuccess}
          />

          {/* Edit Email Channel Modal */}
          {editEmailConnectionId && (
            <EditEmailChannelForm
              isOpen={showEditEmailModal}
              onClose={() => {
                setShowEditEmailModal(false);
                setEditEmailConnectionId(null);
              }}
              onSuccess={() => {
                refetchConnections();
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                toast({
                  title: "Email Channel Updated",
                  description: "Your email channel has been updated successfully",
                });
              }}
              connectionId={editEmailConnectionId}
            />
          )}

          {/* Edit WhatsApp Business API Modal */}
          {editWhatsAppConnectionId && (
            <EditWhatsAppBusinessApiForm
              isOpen={showEditWhatsAppModal}
              onClose={() => {
                setShowEditWhatsAppModal(false);
                setEditWhatsAppConnectionId(null);
              }}
              onSuccess={() => {
                refetchConnections();
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                toast({
                  title: "WhatsApp Business API Updated",
                  description: "Your WhatsApp Business API connection has been updated successfully",
                });
              }}
              connectionId={editWhatsAppConnectionId}
            />
          )}

          {/* Edit Messenger Connection Modal */}
          {editMessengerConnectionId && (
            <EditMessengerConnectionForm
              isOpen={showEditMessengerModal}
              onClose={() => {
                setShowEditMessengerModal(false);
                setEditMessengerConnectionId(null);
              }}
              onSuccess={() => {
                refetchConnections();
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditMessengerModal(false);
                setEditMessengerConnectionId(null);
              }}
              connectionId={editMessengerConnectionId}
            />
          )}

          {/* Edit TikTok Connection Modal */}
          {editTikTokConnectionId && (
            <EditTikTokConnectionForm
              isOpen={showEditTikTokModal}
              onClose={() => {
                setShowEditTikTokModal(false);
                setEditTikTokConnectionId(null);
              }}
              onSuccess={() => {
                refetchConnections();
                queryClient.invalidateQueries({ queryKey: ['/api/channel-connections'] });
                setShowEditTikTokModal(false);
                setEditTikTokConnectionId(null);
              }}
              connectionId={editTikTokConnectionId}
            />
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-6">
              <ScrollableTabs>
                <TabsList className="inline-flex h-10 items-center justify-start rounded-md bg-muted p-1 text-muted-foreground min-w-max gap-1 flex-nowrap">
                  <TabsTrigger value="channels" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.channel_connections', 'Channel Connections')}</span>
                    <span className="sm:hidden">{t('settings.tabs.channels', 'Channels')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="inbox" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.inbox_settings', 'Inbox Settings')}</span>
                    <span className="sm:hidden">{t('settings.tabs.inbox', 'Inbox')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="whatsapp-behavior" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.whatsapp_behavior', 'WhatsApp Behavior')}</span>
                    <span className="sm:hidden">{t('settings.tabs.whatsapp', 'WhatsApp')}</span>
                  </TabsTrigger>


                  <TabsTrigger value="billing" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.billing', 'Billing')}</span>
                    <span className="sm:hidden">{t('settings.tabs.billing', 'Billing')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="team" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.team_members', 'Team Members')}</span>
                    <span className="sm:hidden">{t('settings.tabs.team', 'Team')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="api" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.api_access', 'API Access')}</span>
                    <span className="sm:hidden">{t('settings.tabs.api', 'API')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-credentials" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.ai_credentials', 'AI Credentials')}</span>
                    <span className="sm:hidden">{t('settings.tabs.ai_keys', 'AI Keys')}</span>
                  </TabsTrigger>
                  <TabsTrigger value="ai-usage" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                    <span className="hidden sm:inline">{t('settings.tabs.ai_usage', 'AI Usage')}</span>
                    <span className="sm:hidden">{t('settings.tabs.usage', 'Usage')}</span>
                  </TabsTrigger>
                  {currentUser?.isSuperAdmin && (
                    <TabsTrigger value="platform" className="text-xs sm:text-sm whitespace-nowrap px-2 sm:px-3 flex-shrink-0">
                      <span className="hidden sm:inline">{t('settings.tabs.platform', 'Platform')}</span>
                      <span className="sm:hidden">{t('settings.tabs.platform', 'Platform')}</span>
                    </TabsTrigger>
                  )}
                </TabsList>
              </ScrollableTabs>
            </div>



            <TabsContent value="channels">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.channel_connections.title', 'Channel Connections')}</CardTitle>
                  <CardDescription>
                    {t('settings.channel_connections.description', 'Connect and manage your communication channels')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Connected Channels */}
                    <div>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Connected Channels</h3>
                      <div className="space-y-4">
                        {channelConnections.map((connection: any) => {
                          const channelInfo = getChannelInfo(connection.channelType);

                          return (
                            <div key={connection.id} className="border border-gray-200 rounded-lg p-3 sm:p-4">
                              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                                <div className="flex items-center">
                                  <i
                                    className={channelInfo.icon + " text-xl sm:text-2xl mr-3"}
                                    style={{ color: channelInfo.color }}
                                  ></i>
                                  <div>
                                    <h4 className="font-medium text-sm sm:text-base">{connection.accountName}</h4>
                                    <p className="text-xs sm:text-sm text-gray-500">{channelInfo.name}</p>
                                    <p className="text-xs text-gray-500">{connection.accountId}</p>
                                    {connection.channelType === 'email' && connection.lastSyncAt && (
                                      <p className="text-xs text-gray-400">
                                        Last sync: {new Date(connection.lastSyncAt).toLocaleString()}
                                      </p>
                                    )}
                                    {connection.channelType === 'tiktok' && connection.connectionData && (
                                      <div className="mt-1 space-y-1">
                                        {connection.connectionData.displayName && (
                                          <p className="text-xs text-gray-600">
                                            {connection.connectionData.displayName}
                                            {connection.connectionData.isVerified && (
                                              <span className="ml-1 text-blue-500">✓</span>
                                            )}
                                          </p>
                                        )}
                                        {connection.connectionData.username && (
                                          <p className="text-xs text-gray-500">
                                            @{connection.connectionData.username}
                                          </p>
                                        )}
                                        {connection.connectionData.lastSyncAt && (
                                          <p className="text-xs text-gray-400">
                                            Last sync: {new Date(connection.connectionData.lastSyncAt).toLocaleString()}
                                          </p>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">

                                  <div className="flex flex-wrap gap-2 items-center">
                                    {(connection.channelType === 'whatsapp_unofficial' || connection.channelType === 'whatsapp_official' || connection.channelType === 'whatsapp_twilio' || connection.channelType === 'whatsapp_360dialog') && (() => {
                                      return (
                                        <ConnectionControl
                                          connectionId={connection.id}
                                          status={connection.status}
                                          channelType={connection.channelType}
                                          onReconnectClick={() => {
                                            handleReconnectChannel(connection.id);
                                          }}
                                        />
                                      );
                                    })()}

                                    {/* Edit button for email channels */}
                                    {connection.channelType === 'email' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditEmailModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Sync button for email channels */}
                                    {connection.channelType === 'email' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-purple-500 hover:text-purple-700 text-xs sm:text-sm"
                                        onClick={() => handleSyncEmailChannel(connection.id)}
                                        disabled={syncingChannels.has(connection.id)}
                                      >
                                        {syncingChannels.has(connection.id) ? (
                                          <>
                                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                            <span className="hidden sm:inline">Syncing...</span>
                                            <span className="sm:hidden">Sync...</span>
                                          </>
                                        ) : (
                                          <>
                                            <RefreshCw className="h-3 w-3 mr-1" />
                                            <span className="hidden sm:inline">Sync</span>
                                            <span className="sm:hidden">Sync</span>
                                          </>
                                        )}
                                      </Button>
                                    )}

                                    {/* Edit button for WhatsApp Business API channels */}
                                    {connection.channelType === 'whatsapp_official' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditWhatsAppModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Edit button for Messenger channels */}
                                    {connection.channelType === 'messenger' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditMessengerModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Edit</span>
                                        <span className="sm:hidden">Edit</span>
                                      </Button>
                                    )}

                                    {/* Edit button for TikTok channels */}
                                    {connection.channelType === 'tiktok' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-green-500 hover:text-green-700 text-xs sm:text-sm"
                                        onClick={() => handleOpenEditTikTokModal(connection.id)}
                                      >
                                        <span className="hidden sm:inline">View Details</span>
                                        <span className="sm:hidden">Details</span>
                                      </Button>
                                    )}

                                    {/* Status badge for TikTok channels */}
                                    {connection.channelType === 'tiktok' && (
                                      <div className="flex items-center gap-2">
                                        {connection.status === 'active' && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                            <span className="w-2 h-2 mr-1 bg-green-500 rounded-full"></span>
                                            Active
                                          </span>
                                        )}
                                        {connection.status === 'error' && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                            <span className="w-2 h-2 mr-1 bg-red-500 rounded-full"></span>
                                            Error
                                          </span>
                                        )}
                                        {connection.status === 'disconnected' && (
                                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                            <span className="w-2 h-2 mr-1 bg-gray-500 rounded-full"></span>
                                            Disconnected
                                          </span>
                                        )}
                                      </div>
                                    )}

                                    <Button
                                      variant="brand"
                                      size="sm"
                                      className="btn-brand-primary text-blue-500 hover:text-blue-700 text-xs sm:text-sm"
                                      onClick={() => handleOpenRenameModal(connection.id, connection.accountName)}
                                    >
                                      <span className="hidden sm:inline">Rename</span>
                                      <span className="sm:hidden">Rename</span>
                                    </Button>

                                    {/* Legacy disconnect button for non-WhatsApp connections */}
                                    {connection.channelType !== 'whatsapp_unofficial' && connection.channelType !== 'whatsapp_official' && connection.channelType !== 'whatsapp_twilio' && connection.channelType !== 'whatsapp_360dialog' && (
                                      <Button
                                        variant="brand"
                                        size="sm"
                                        className="btn-brand-primary text-orange-500 hover:text-orange-700 text-xs sm:text-sm"
                                        onClick={() => handleDisconnectChannel(connection.id)}
                                      >
                                        <span className="hidden sm:inline">Disconnect</span>
                                        <span className="sm:hidden">Disconnect</span>
                                      </Button>
                                    )}

                                    <Button
                                      variant="brand"
                                      size="sm"
                                      className="btn-brand-primary text-red-500 hover:text-red-700 text-xs sm:text-sm"
                                      onClick={() => handleDeleteChannel(connection.id)}
                                    >
                                      <span className="hidden sm:inline">Delete</span>
                                      <span className="sm:hidden">Delete</span>
                                    </Button>
                                  </div>
                                </div>
                              </div>

                              {connection.channelType === 'whatsapp_unofficial' && (
                                <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-error-warning-line text-yellow-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-yellow-700 font-medium">Unofficial Connection</p>
                                      <p className="text-xs text-yellow-600">
                                        This connection is not using the official WhatsApp Business API.
                                        It may have limitations and could be subject to blocking by WhatsApp.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {connection.channelType === 'whatsapp_official' && (
                                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-check-line text-green-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-green-700 font-medium">Official WhatsApp Business API (Meta)</p>
                                      <p className="text-xs text-green-600">
                                        This connection uses the official WhatsApp Business API from Meta.
                                        It provides reliable messaging with advanced features and compliance.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* {connection.channelType === 'whatsapp_twilio' && (
                                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-check-line text-blue-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-blue-700 font-medium">Official WhatsApp Business API (Twilio)</p>
                                      <p className="text-xs text-blue-600">
                                        This connection uses Twilio's WhatsApp Business API integration.
                                        It provides reliable messaging through Twilio's Conversations platform.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )} */}

                              {connection.channelType === 'whatsapp_360dialog' && (
                                <div className="mt-3 p-3 bg-purple-50 border border-purple-200 rounded-md">
                                  <div className="flex items-start">
                                    <i className="ri-check-line text-purple-500 mr-2 mt-0.5"></i>
                                    <div>
                                      <p className="text-sm text-purple-700 font-medium">Official WhatsApp Business API (360Dialog Partner)</p>
                                      <p className="text-xs text-purple-600">
                                        This connection uses 360Dialog's Partner API with Integrated Onboarding.
                                        It provides enterprise-grade WhatsApp Business API access with streamlined setup.
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Add New Channel</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Business API')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp Business API (Meta)</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Official Meta WhatsApp Business API</p>
                          <Button className="mt-3 w-full text-xs py-1" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            handleConnectChannel('WhatsApp Business Embedded');
                          }}>
                            Easy Setup
                          </Button>
                        </div>

                        {/* <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Business API (Twilio)')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp Business API (Twilio)</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Twilio Conversations WhatsApp API</p>
                        </div> */}

                        {/* <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Business API (360Dialog)')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp Business API (360Dialog)</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Integrated Onboarding via 360Dialog</p>
                        </div> */}

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('WhatsApp Unofficial')}>
                          <i className="ri-whatsapp-line text-2xl sm:text-3xl mb-2" style={{ color: '#25D366' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">WhatsApp QR Code</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">
                            <i className="ri-error-warning-line mr-1"></i>
                            Non-official connection
                          </p>
                        </div>
                        
                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Messenger')}>
                          <i className="ri-messenger-line text-2xl sm:text-3xl mb-2" style={{ color: '#1877F2' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Facebook Messenger</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Via Facebook Pages</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Instagram')}>
                          <i className="ri-instagram-line text-2xl sm:text-3xl mb-2" style={{ color: '#E4405F' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Instagram</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Business Account Integration</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('TikTok')}>
                          <i className="ri-tiktok-line text-2xl sm:text-3xl mb-2"></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">TikTok</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Business Messaging</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Telegram')}>
                          <i className="ri-telegram-line text-2xl sm:text-3xl mb-2" style={{ color: '#0088CC' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Telegram</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Bot Integration</p>
                        </div>

                        <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Email')}>
                          <i className="ri-mail-line text-2xl sm:text-3xl mb-2" style={{ color: '#3B82F6' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Email</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">IMAP/SMTP Email Integration</p>
                        </div>

                        {/* <div className="border border-gray-200 rounded-lg p-3 sm:p-4 flex flex-col items-center hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => handleConnectChannel('Messenger')}>
                          <i className="ri-messenger-line text-2xl sm:text-3xl mb-2" style={{ color: '#0084FF' }}></i>
                          <h4 className="font-medium text-sm sm:text-base text-center">Facebook Messenger</h4>
                          <p className="text-xs text-gray-500 text-center mt-1">Facebook Messenger Business Integration</p>
                        </div> */}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="inbox">
              <InboxSettings />
            </TabsContent>

            <TabsContent value="whatsapp-behavior">
              <WhatsAppBehaviorSettings />
            </TabsContent>




            <TabsContent value="billing">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.billing.title', 'Billing & Subscription')}</CardTitle>
                  <CardDescription>
                    {t('settings.billing.description', 'Manage your subscription plan and payment methods')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <SubscriptionManagement />

                    <Separator />

                    <AffiliateEarningsCard />

                    <Separator />



                    <div id="available-plans">
                      <h3 className="text-base sm:text-lg font-medium mb-4">Available Plans</h3>
                      {isLoadingPlans ? (
                        <div className="flex justify-center py-8">
                          <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-primary"></div>
                        </div>
                      ) : plans && plans.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                          {plans.map((plan) => {
                            const isCurrentPlan = planInfo?.plan?.id === plan.id || planInfo?.plan?.name === plan.name;

                            return (
                              <PlanCard
                                key={plan.id}
                                plan={plan}
                                isCurrentPlan={isCurrentPlan}
                                onSelectPlan={handleSelectPlan}
                              />
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-gray-500 text-sm sm:text-base">
                          No plans available at the moment
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="text-base sm:text-lg font-medium mb-4">Payment History</h3>

                      {(() => {
                        const { data: transactions, isLoading } = useQuery({
                          queryKey: ['/api/payment/transactions'],
                          queryFn: async () => {
                            const res = await apiRequest('GET', '/api/payment/transactions');
                            if (!res.ok) throw new Error('Failed to fetch payment history');
                            return res.json();
                          }
                        });

                        if (isLoading) {
                          return (
                            <div className="flex justify-center py-4">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          );
                        }

                        if (!transactions || transactions.length === 0) {
                          return (
                            <div className="text-center py-4 text-gray-500 text-sm sm:text-base">
                              No payment history available
                            </div>
                          );
                        }

                        return (
                          <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <div className="overflow-x-auto">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                  <tr>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Date
                                    </th>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Description
                                    </th>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Amount
                                    </th>
                                    <th scope="col" className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                      Status
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                  {transactions.map((transaction: any) => (
                                    <tr key={transaction.id}>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500">
                                        {new Date(transaction.createdAt).toLocaleDateString()}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm font-medium text-gray-900">
                                        {transaction.planName || 'Subscription Payment'}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 font-medium">
                                        ${transaction.amount.toFixed(2)}
                                      </td>
                                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded-full ${transaction.status === 'completed'
                                            ? 'bg-green-100 text-green-800'
                                            : transaction.status === 'pending'
                                              ? 'bg-yellow-100 text-yellow-800'
                                              : 'bg-red-100 text-red-800'
                                          }`}>
                                          {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                                        </span>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <CheckoutDialog
                isOpen={isCheckoutDialogOpen}
                onClose={() => setIsCheckoutDialogOpen(false)}
                plan={selectedPlan}
                paymentMethods={paymentMethods || []}
                onSuccess={handleCheckoutSuccess}
              />
            </TabsContent>

            <TabsContent value="team">
              <Card>
                <CardHeader>
                  <CardTitle>{t('settings.team.title', 'Team Members')}</CardTitle>
                  <CardDescription>
                    {t('settings.team.description', 'Manage team members and their permissions')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8">
                    <TeamMembersList />

                    <div className="border-t pt-6">
                      <RolesAndPermissions />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="api">
              <ApiAccessTab />
            </TabsContent>

            <TabsContent value="ai-credentials">
              <CompanyAiCredentialsTab />
            </TabsContent>

            <TabsContent value="ai-usage">
              <AiUsageAnalytics />
            </TabsContent>

            {currentUser?.isSuperAdmin && (
              <TabsContent value="platform">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('settings.platform.title', 'Platform Configuration')}</CardTitle>
                    <CardDescription>
                      {t('settings.platform.description', 'Configure platform-wide integrations and partner API settings')}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium">360Dialog Partner API</h3>
                            <p className="text-sm text-gray-500">
                              Configure 360Dialog Partner credentials for company onboarding
                            </p>
                          </div>
                          <Button
                            onClick={() => setShowPartnerConfigModal(true)}
                            variant="outline"
                            className="btn-brand-primary"
                          >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>• Platform-wide Partner API integration</p>
                          <p>• Enables Integrated Onboarding for companies</p>
                          <p>• Manages client WhatsApp Business accounts</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <i className="ri-tiktok-line text-2xl"></i>
                            <div>
                              <h3 className="text-lg font-medium">TikTok Business Messaging API</h3>
                              <p className="text-sm text-gray-500">
                                Configure TikTok Partner credentials for company messaging
                              </p>
                            </div>
                          </div>
                          <Button
                            onClick={() => setShowTikTokPlatformConfigModal(true)}
                            variant="outline"
                            className="btn-brand-primary"
                          >
                            <Settings2 className="w-4 h-4 mr-2" />
                            Configure
                          </Button>
                        </div>

                        <div className="text-sm text-gray-600">
                          <p>• Platform-wide TikTok Business API integration</p>
                          <p>• Enables TikTok messaging for companies</p>
                          <p>• Requires TikTok Messaging Partner approval</p>
                        </div>
                      </div>

                      <div className="border rounded-lg p-4 opacity-50">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="text-lg font-medium">Additional Integrations</h3>
                            <p className="text-sm text-gray-500">
                              More platform-wide integrations coming soon
                            </p>
                          </div>
                          <Button variant="outline" disabled>
                            <Settings2 className="w-4 h-4 mr-2" />
                            Coming Soon
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>
    </div>
  );
}
