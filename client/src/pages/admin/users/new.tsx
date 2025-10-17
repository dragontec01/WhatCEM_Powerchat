import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Save } from "lucide-react";
import AdminLayout from "@/components/admin/AdminLayout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

interface Company {
  id: number;
  name: string;
  active: boolean;
}

const userSchema = z.object({
  username: z.string().email("Username must be a valid email address"),
  email: z.string().email("Email must be a valid email address"),
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  role: z.enum(["admin", "agent", "user"]),
  companyId: z.number().optional(),
  isSuperAdmin: z.boolean().default(false),
}).refine(data => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type UserFormValues = z.infer<typeof userSchema>;

export default function NewUserPage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!isLoading && user && !user.isSuperAdmin) {
      window.location.href = "/";
    }
  }, [user, isLoading]);
  
  const { data: companies, isLoading: isLoadingCompanies } = useQuery<Company[]>({
    queryKey: ['/api/admin/companies'],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/companies");
      if (!res.ok) throw new Error("Failed to fetch companies");
      return res.json();
    },
    enabled: !!user?.isSuperAdmin
  });
  
  const activeCompanies = companies?.filter(company => company.active) || [];
  
  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: "",
      email: "",
      fullName: "",
      password: "",
      confirmPassword: "",
      role: "agent",
      isSuperAdmin: false,
    },
  });
  
  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormValues) => {
      const { confirmPassword, ...userData } = data;
      const res = await apiRequest("POST", "/api/admin/users", userData);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create user");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User Created",
        description: "The user has been created successfully",
      });
      setTimeout(() => {
        window.location.href = "/admin/users";
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    }
  });
  
  const onSubmit = (data: UserFormValues) => {
    createUserMutation.mutate(data);
  };
  
  const handleCompanyChange = (value: string) => {
    form.setValue("companyId", parseInt(value));
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user?.isSuperAdmin) {
    return null;
  }
  
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => window.location.href = "/admin/users"}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Users
          </Button>
          <h1 className="text-2xl">Create New User</h1>
        </div>
        
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>User Information</CardTitle>
            <CardDescription>
              Create a new user account in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Full Name</FormLabel>
                      <FormControl>
                        <Input placeholder="John Doe" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username (Email)</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="user@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Confirm Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="admin">Admin</SelectItem>
                            <SelectItem value="agent">Agent</SelectItem>
                            <SelectItem value="user">User</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormItem>
                    <FormLabel>Company</FormLabel>
                    <Select 
                      onValueChange={handleCompanyChange}
                      disabled={isLoadingCompanies || form.watch("isSuperAdmin")}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a company" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeCompanies.map(company => (
                          <SelectItem key={company.id} value={company.id.toString()}>
                            {company.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                </div>
                
                <FormField
                  control={form.control}
                  name="isSuperAdmin"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Super Admin</FormLabel>
                        <FormDescription>
                          Super admins have access to all system features and settings
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            if (checked) {
                              form.setValue("companyId", undefined);
                            }
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={createUserMutation.isPending}
                >
                  {createUserMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating User...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Create User
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
