import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/use-translation";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function AdminLoginPage() {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [_, navigate] = useLocation();

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginFormValues) => {
      const res = await apiRequest("POST", "/api/admin/login", credentials);
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || "Invalid credentials");
      }
      return await res.json();
    },
    onSuccess: (user) => {
      toast({
        title: t('auth.login_success', 'Login successful'),
        description: t('auth.welcome_back', 'Welcome back, {{name}}!', { name: user.fullName }),
      });

      setTimeout(() => {
        window.location.href = "/admin/dashboard";
      }, 500);
    },
    onError: (error: Error) => {
      toast({
        title: t('auth.login_failed', 'Login failed'),
        description: error.message || t('auth.invalid_credentials', 'Invalid username or password'),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: LoginFormValues) => {
    loginMutation.mutate(values);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="w-full max-w-md p-4">
        <Card>
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center mb-4">
              <svg  viewBox="0 0 24 24" width={60} height={60} fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8.18164 10.7027C8.18164 10.7027 8.18168 8.13513 8.18164 6.59459C8.1816 4.74571 9.70861 3 11.9998 3C14.291 3 15.8179 4.74571 15.8179 6.59459C15.8179 8.13513 15.8179 10.7027 15.8179 10.7027" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              <path fill-rule="evenodd" clip-rule="evenodd" d="M4.50005 11.3932C4.50001 13.1319 4.49995 16.764 4.50007 19.1988C4.5002 21.8911 8.66375 22.5 12.0001 22.5C15.3364 22.5 19.5 21.8911 19.5 19.1988L19.5 11.3932C19.5 10.8409 19.0523 10.3957 18.5 10.3957H5.50004C4.94777 10.3957 4.50006 10.8409 4.50005 11.3932ZM10.5 16.0028C10.5 16.4788 10.7069 16.9065 11.0357 17.2008V18.7529C11.0357 19.3051 11.4834 19.7529 12.0357 19.7529H12.1786C12.7309 19.7529 13.1786 19.3051 13.1786 18.7529V17.2008C13.5074 16.9065 13.7143 16.4788 13.7143 16.0028C13.7143 15.1152 12.9948 14.3957 12.1072 14.3957C11.2195 14.3957 10.5 15.1152 10.5 16.0028Z" fill="#000000"/>
              </svg>
            </div>
            <CardTitle className="text-2xl">{t('admin.login_title', 'Admin Login')}</CardTitle>
            <CardDescription>
              {t('admin.login_description', 'Enter your credentials to access the admin panel')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.username_or_email', 'Username or Email')}</FormLabel>
                      <FormControl>
                        <Input
                          placeholder={t('auth.admin_login_placeholder', 'Enter your username or email')}
                          {...field}
                          autoComplete="username"
                          disabled={loginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('auth.password', 'Password')}</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder={t('auth.password_placeholder', '••••••••')}
                          {...field}
                          autoComplete="current-password"
                          disabled={loginMutation.isPending}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Forgot password link */}
                <div className="flex justify-end">
                  <a href="/admin/forgot-password" className="text-sm text-blue-600 hover:text-blue-800 hover:underline">
                    {t('auth.forgot_password', 'Forgot password?')}
                  </a>
                </div>

                <Button
                  type="submit"
                  className="w-full btn-brand-primary"
                  variant="brand"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('auth.logging_in', 'Logging in...')}
                    </>
                  ) : (
                    t('auth.login', 'Login')
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              {t('admin.restricted_area', 'This area is restricted to administrators only')}
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
