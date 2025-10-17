import { useState } from "react";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { apiRequest } from "@/lib/queryClient";

interface ForgotPasswordResponse {
  success: boolean;
  message: string;
  error?: string;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const forgotPasswordMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/auth/forgot-password", { email });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || t('auth.failed_send_reset', 'Failed to send reset email'));
      }
      return await res.json() as ForgotPasswordResponse;
    },
    onSuccess: (data) => {
      setIsSubmitted(true);
      toast({
        title: t('auth.reset_email_sent', 'Reset email sent'),
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error', 'Error'),
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      toast({
        title: t('common.error', 'Error'),
        description: t('auth.enter_email_error', 'Please enter your email address'),
        variant: "destructive",
      });
      return;
    }
    forgotPasswordMutation.mutate(email.trim());
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <CardTitle className="mt-4">{t('auth.check_email_title', 'Check your email')}</CardTitle>
              <CardDescription>
                {t('auth.check_email_description', "We've sent a password reset link to your email address.")}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription>
                  {t('auth.reset_email_sent_message', "If you don't see the email in your inbox, please check your spam folder. The reset link will expire in 1 hour for security reasons.")}
                </AlertDescription>
              </Alert>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  {t('auth.didnt_receive_email', "Didn't receive the email?")}
                </p>
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSubmitted(false);
                    forgotPasswordMutation.mutate(email);
                  }}
                  disabled={forgotPasswordMutation.isPending}
                >
                  {forgotPasswordMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {t('auth.resend_email', 'Resend email')}
                </Button>
              </div>

              <div className="text-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
                >
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  {t('auth.back_to_login', 'Back to login')}
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{t('auth.forgot_password_title', 'Forgot your password?')}</CardTitle>
            <CardDescription>
              {t('auth.forgot_password_description', "Enter your email address and we'll send you a link to reset your password.")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.email_address', 'Email address')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.email_address_placeholder', 'Enter your email address')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={forgotPasswordMutation.isPending}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={forgotPasswordMutation.isPending}
              >
                {forgotPasswordMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('auth.send_reset_link', 'Send reset link')}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <Link
                to="/auth"
                className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500"
              >
                <ArrowLeft className="mr-1 h-4 w-4" />
                {t('auth.back_to_login', 'Back to login')}
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
