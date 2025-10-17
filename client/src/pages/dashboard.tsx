import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from '@/hooks/use-translation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Dashboard() {
  const [_, setLocation] = useLocation();
  const { t } = useTranslation();

  useEffect(() => {
    setLocation('/inbox');
  }, [setLocation]);
  
  return (
    <div className="h-screen flex flex-col overflow-hidden font-sans text-gray-800">
      <Header />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        
        <div className="flex-1 overflow-y-auto p-6">
          <h1 className="text-2xl  mb-6">{t('nav.dashboard', 'Dashboard')}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.total_conversations', 'Total Conversations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">15</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.active_conversations', 'Active Conversations')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">8</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('dashboard.response_time', 'Response Time')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">5m</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
