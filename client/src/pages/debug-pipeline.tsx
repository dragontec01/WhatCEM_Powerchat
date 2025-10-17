import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Redirect } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function DebugPipeline() {
  const { user, isLoading } = useAuth();
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Redirect to="/login" />;
  }

  const fetchDebugData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('GET', '/api/debug/pipeline-stages');
      const data = await response.json();
      setDebugData(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fixUserCompany = async () => {
    setLoading(true);
    setError(null);
    try {
      const firstCompanyId = debugData?.allCompanies?.[0]?.id;
      if (!firstCompanyId) {
        setError('No companies available to associate with');
        return;
      }

      const response = await apiRequest('POST', '/api/debug/fix-user-company', {
        companyId: firstCompanyId
      });
      const data = await response.json();
      await fetchDebugData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultStages = async () => {
    setLoading(true);
    setError(null);
    try {
      const companyId = debugData?.user?.companyId || debugData?.allCompanies?.[0]?.id;

      const response = await apiRequest('POST', '/api/debug/create-default-stages', {
        companyId
      });
      const data = await response.json();
      await fetchDebugData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const testStageCreation = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiRequest('POST', '/api/pipeline/stages', {
        name: 'Test Stage',
        color: '#FF5733',
        order: 1
      });
      const data = await response.json();
      await fetchDebugData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Pipeline Debug Page</h1>
      
      <div className="grid gap-4 mb-6">
        <Button onClick={fetchDebugData} disabled={loading}>
          {loading ? 'Loading...' : 'Fetch Debug Data'}
        </Button>

        {debugData?.user?.companyId === null && (
          <Button onClick={fixUserCompany} disabled={loading} variant="destructive">
            Fix User Company Association
          </Button>
        )}

        <Button onClick={createDefaultStages} disabled={loading} variant="outline">
          Create Default Stages
        </Button>

        <Button onClick={testStageCreation} disabled={loading} variant="secondary">
          Test Stage Creation
        </Button>
      </div>

      {error && (
        <Card className="mb-6 border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {debugData && (
        <Card>
          <CardHeader>
            <CardTitle>Debug Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold">Current User (Session):</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(debugData.user, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">Database User:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(debugData.dbUser, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">User's Company:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(debugData.company, null, 2)}
                </pre>
              </div>

              <div>
                <h3 className="font-semibold">All Companies:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(debugData.allCompanies, null, 2)}
                </pre>
              </div>
              
              <div>
                <h3 className="font-semibold">Statistics:</h3>
                <p>All stages in DB: {debugData.allStages}</p>
                <p>Company stages: {debugData.companyStages}</p>
              </div>
              
              <div>
                <h3 className="font-semibold">Company Pipeline Stages:</h3>
                <pre className="bg-gray-100 p-2 rounded text-sm">
                  {JSON.stringify(debugData.stages, null, 2)}
                </pre>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
