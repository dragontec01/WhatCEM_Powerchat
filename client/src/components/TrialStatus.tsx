import { useAuth } from '@/hooks/use-auth';
import { useTranslation } from '@/hooks/use-translation';
import { useSubscriptionStatus } from '@/hooks/use-subscription-status';
import { Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface TrialStatusProps {
  isCollapsed?: boolean;
}

export default function TrialStatus({ isCollapsed = false }: TrialStatusProps) {
  const { company } = useAuth();
  const { t } = useTranslation();
  const { refreshSubscriptionStatus } = useSubscriptionStatus();




  if (!company?.isInTrial || !company?.trialEndDate) {
    return null;
  }

  const now = new Date();
  const trialEndDate = new Date(company.trialEndDate);
  const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  

  if (daysRemaining <= 0) {
    return null;
  }

  const isExpiringSoon = daysRemaining <= 3;

  if (isCollapsed) {
    return (
      <div className="px-2 py-2 space-y-2">
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isExpiringSoon ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
        }`}>
          {isExpiringSoon ? (
            <AlertTriangle className="h-5 w-5" />
          ) : (
            <Clock className="h-5 w-5" />
          )}
        </div>
        {/* Debug refresh button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-12 h-6 p-0"
          onClick={refreshSubscriptionStatus}
          title="Refresh subscription status"
        >
          <RefreshCw className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="px-2 py-2">
      <Alert className={`${
        isExpiringSoon 
          ? 'border-red-200 bg-red-50 text-red-800' 
          : 'border-blue-200 bg-blue-50 text-blue-800'
      }`}>
        <div className="flex items-center gap-2">
          {isExpiringSoon ? (
            <AlertTriangle className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
          <div className="flex-1">
            <div className="font-medium text-sm">
              {t('trial.status_title', 'Trial Period')}
            </div>
            <AlertDescription className="text-xs mt-1">
              {daysRemaining === 1
                ? t('trial.expires_today', 'Expires today')
                : t('trial.days_remaining', '{{days}} days remaining', { days: daysRemaining })
              }
            </AlertDescription>
          </div>
        </div>
      </Alert>
    </div>
  );
}
