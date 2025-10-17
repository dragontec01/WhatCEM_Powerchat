import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTranslation } from "@/hooks/use-translation";
import { useBranding } from "@/contexts/branding-context";
import { useSubdomain } from "@/contexts/subdomain-context";
import { Redirect } from "wouter";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Mail, Lock, Eye, EyeOff } from "lucide-react";

const loginSchema = z.object({
  username: z.string().min(2, "Username or email must be at least 2 characters"),
  password: z.string().min(1, "Password is required"),
});

type LoginData = z.infer<typeof loginSchema>;



export default function AuthPage() {
  const { user, isLoading, loginMutation } = useAuth();
  const { t } = useTranslation();
  const { branding } = useBranding();
  const { subdomainInfo } = useSubdomain();
  const [showPassword, setShowPassword] = useState(false);
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  useEffect(() => {

    if (isLoading && !hasInitiallyLoaded) {
      const timeoutId = setTimeout(() => {
        document.cookie = "connect.sid=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        window.location.reload();
      }, 3000);

      return () => clearTimeout(timeoutId);
    } else if (!isLoading) {

      setHasInitiallyLoaded(true);
    }
  }, [isLoading, hasInitiallyLoaded]);

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const onLoginSubmit = (data: LoginData) => {
    loginMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-100/30 rounded-full blur-3xl"></div>
      </div>



      {/* Main auth card */}
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
          {/* Logo icon */}
          <div className="flex justify-center mb-6">
            <div className="w-auto h-12 flex items-center justify-center">
              {branding.logoUrl ? (
                <img src={branding.logoUrl} alt={branding.appName} className="h-12 w-auto" />
              ) : (
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">{branding.appName.charAt(0)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Title and description */}
          <div className="text-center mb-8">
            {subdomainInfo?.isSubdomainMode && subdomainInfo?.company ? (
              <>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {t('auth.signin_company_title', 'Sign in to {{companyName}}', { companyName: subdomainInfo.company.name })}
                </h1>
                <p className="text-gray-500 text-sm">
                  {t('auth.signin_company_description', 'Access your company workspace on {{appName}}', { appName: branding.appName })}
                </p>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-semibold text-gray-900 mb-2">
                  {t('auth.signin_title', 'Access like a shadow')}
                </h1>
                <p className="text-gray-500 text-sm">
                  {t('auth.signin_description', 'Unite your customer conversations across all channels in one powerful CRM.')}
                </p>
              </>
            )}
          </div>

          {/* Login form */}
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          placeholder={t('auth.email_placeholder', 'Email')}
                          className="pl-10 h-12 bg-gray-50 border-gray-200 rounded-lg"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder={t('auth.password_placeholder', 'Password')}
                          className="pl-10 pr-10 h-12 bg-gray-50 border-gray-200 rounded-lg"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Forgot password link */}
              <div className="flex justify-end">
                <a href="/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                  {t('auth.forgot_password', 'Forgot password?')}
                </a>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 btn-brand-primary text-white rounded-lg font-medium"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('auth.logging_in', 'Logging in...')}
                  </>
                ) : (
                  t('auth.get_started', 'Login')
                )}
              </Button>
            </form>
          </Form>

          {/* Register link */}
          <div className="mt-4 text-center">
            <p className="text-sm text-gray-600">
              {t('auth.new_to_platform', 'New to the platform?')}{' '}
              <a
                href="/register"
                className="text-blue-600 hover:text-blue-800 font-medium hover:underline"
              >
                {t('auth.register_company', 'Register for a new Company')}
              </a>
            </p>
          </div>


        </div>
      </div>
    </div>
  );
}