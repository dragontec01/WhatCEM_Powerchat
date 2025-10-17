import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route, useLocation } from "wouter";
import { useEffect } from "react";

type AdminProtectedRouteProps = {
  path: string;
  component: React.ComponentType;
};

export function AdminProtectedRoute({ path, component: Component }: AdminProtectedRouteProps) {
  const { user, isLoading, isMaintenanceMode, isLoadingMaintenance } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    if (!isLoading && !isLoadingMaintenance) {
      if (!user) {
        navigate("/admin");
      } else if (!user.isSuperAdmin) {
        navigate("/");
      }
    }
  }, [user, isLoading, isLoadingMaintenance, navigate]);

  return (
    <Route path={path}>
      {() => {
        if (isLoading || isLoadingMaintenance) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }




        if (!user || !user.isSuperAdmin) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        return <Component />;
      }}
    </Route>
  );
}
