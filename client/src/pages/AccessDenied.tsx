import React from 'react';
import { Link } from 'wouter';
import { Shield, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';

export default function AccessDenied() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-6">
              <Shield className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="text-2xl text-gray-900 mb-2">
              Access Denied
            </h1>

            <p className="text-gray-600 mb-6">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>

            {/* User Info */}
            {user && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Logged in as:</span> {user.fullName}
                </p>
                <p className="text-sm text-gray-700">
                  <span className="font-medium">Role:</span> {user.role}
                </p>
                {user.companyId && (
                  <p className="text-sm text-gray-700">
                    <span className="font-medium">Company ID:</span> {user.companyId}
                  </p>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3">
              <Link href="/inbox">
                <Button className="w-full flex items-center justify-center space-x-2">
                  <Home className="h-4 w-4" />
                  <span>Go to Inbox</span>
                </Button>
              </Link>

              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center space-x-2"
                onClick={() => window.history.back()}
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Go Back</span>
              </Button>
            </div>

            {/* Help Text */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                If you need access to this feature, please contact your system administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
