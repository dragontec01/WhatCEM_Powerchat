import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscriptionStatus } from "@/hooks/use-subscription-status";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Clock, 
  CheckCircle, 
  Loader2,
  RefreshCw,
  CreditCard,
  Calendar,
  User,
  Building
} from "lucide-react";

export default function TestPlanExpirationPage() {
  const { user, company } = useAuth();
  const { toast } = useToast();
  const { refreshSubscriptionStatus } = useSubscriptionStatus();


  const { data: renewalStatus, isLoading, error, refetch } = useQuery({
    queryKey: ['/api/plan-renewal/status'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/plan-renewal/status');
      if (!res.ok) {
        throw new Error('Failed to fetch renewal status');
      }
      return res.json();
    },
    enabled: !!user && !!company,
  });


  const activateMutation = useMutation({
    mutationFn: async ({ planId, duration }: { planId: number; duration: number }) => {
      const res = await apiRequest('POST', '/api/plan-renewal/activate', {
        planId,
        duration
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to activate subscription');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Subscription activated successfully!",
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const clearTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/plan-renewal/clear-trial');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to clear trial status');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Trial status cleared successfully!",
      });

      refetch();
      refreshSubscriptionStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });


  const forceClearTrialMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/plan-renewal/force-clear-trial');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to force clear trial status');
      }
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Trial status force cleared successfully!",
      });

      refetch();
      refreshSubscriptionStatus();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleActivate = (duration: number) => {
    if (!renewalStatus?.plan?.id) {
      toast({
        title: "Error",
        description: "No plan found to activate",
        variant: "destructive",
      });
      return;
    }
    activateMutation.mutate({ planId: renewalStatus.plan.id, duration });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'trial':
        return <Clock className="h-5 w-5 text-blue-500" />;
      case 'grace_period':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'expired':
      case 'inactive':
        return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'trial':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'grace_period':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'expired':
      case 'inactive':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading plan status...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            Failed to load plan status: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Plan Expiration Test</h1>
        <div className="flex gap-2">
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh API
          </Button>
          <Button onClick={refreshSubscriptionStatus} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Cache
          </Button>
        </div>
      </div>

      {/* Company Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="h-5 w-5" />
            Company Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="font-medium">Company:</span>
              <p>{company?.name}</p>
            </div>
            <div>
              <span className="font-medium">User:</span>
              <p>{user?.fullName} ({user?.role})</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plan Status */}
      {renewalStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Subscription Status
            </CardTitle>
            <CardDescription>
              Current plan and expiration details
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Access Status */}
              <Alert className={getStatusColor(renewalStatus.expirationStatus.subscriptionStatus)}>
                {getStatusIcon(renewalStatus.expirationStatus.subscriptionStatus)}
                <AlertTitle>
                  Access {renewalStatus.accessAllowed ? 'Allowed' : 'Blocked'}
                </AlertTitle>
                <AlertDescription>
                  {renewalStatus.reason || 'Subscription is active'}
                </AlertDescription>
              </Alert>

              {/* Plan Details */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Plan:</span>
                  <p>{renewalStatus.plan?.name || 'No plan'}</p>
                </div>
                <div>
                  <span className="font-medium">Status:</span>
                  <Badge className={getStatusColor(renewalStatus.expirationStatus.subscriptionStatus)}>
                    {renewalStatus.expirationStatus.subscriptionStatus}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Days Until Expiry:</span>
                  <p>{renewalStatus.expirationStatus.daysUntilExpiry === Infinity ? 'Never' : renewalStatus.expirationStatus.daysUntilExpiry}</p>
                </div>
                <div>
                  <span className="font-medium">Grace Period Days:</span>
                  <p>{renewalStatus.expirationStatus.gracePeriodDaysRemaining}</p>
                </div>
                <div>
                  <span className="font-medium">Is Expired:</span>
                  <p>{renewalStatus.expirationStatus.isExpired ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="font-medium">In Grace Period:</span>
                  <p>{renewalStatus.expirationStatus.isInGracePeriod ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="font-medium">Renewal Required:</span>
                  <p>{renewalStatus.expirationStatus.renewalRequired ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <span className="font-medium">Next Billing Date:</span>
                  <p>{renewalStatus.expirationStatus.nextBillingDate ? 
                    new Date(renewalStatus.expirationStatus.nextBillingDate).toLocaleDateString() : 
                    'Not set'
                  }</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
          <CardDescription>
            Use these buttons to test different subscription scenarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => handleActivate(30)}
              disabled={activateMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {activateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              Activate 30 Days
            </Button>
            
            <Button 
              onClick={() => handleActivate(7)}
              disabled={activateMutation.isPending}
              className="bg-yellow-600 hover:bg-yellow-700"
            >
              <Clock className="h-4 w-4 mr-2" />
              Activate 7 Days
            </Button>
            
            <Button 
              onClick={() => handleActivate(1)}
              disabled={activateMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Activate 1 Day
            </Button>
            
            <Button
              onClick={() => handleActivate(0)}
              disabled={activateMutation.isPending}
              variant="destructive"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Expire Now
            </Button>

            <Button
              onClick={() => clearTrialMutation.mutate()}
              disabled={clearTrialMutation.isPending}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {clearTrialMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <User className="h-4 w-4 mr-2" />
              )}
              Clear Trial Status
            </Button>

            <Button
              onClick={() => forceClearTrialMutation.mutate()}
              disabled={forceClearTrialMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {forceClearTrialMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <AlertTriangle className="h-4 w-4 mr-2" />
              )}
              Force Clear (SQL)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Raw Data */}
      <Card>
        <CardHeader>
          <CardTitle>Raw Data (Debug)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-100 p-4 rounded-md text-sm overflow-auto">
            {JSON.stringify(renewalStatus, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
