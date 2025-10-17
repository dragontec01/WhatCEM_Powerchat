import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useBranding } from '@/contexts/branding-context';

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Users, DollarSign, TrendingUp, Globe, Building, CheckCircle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
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
import { Checkbox } from "@/components/ui/checkbox";

const affiliateApplicationSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters").max(50),
  lastName: z.string().min(2, "Last name must be at least 2 characters").max(50),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  website: z.string().url("Please enter a valid website URL").optional().or(z.literal("")),
  country: z.string().min(1, "Please select your country"),
  marketingChannels: z.array(z.string()).min(1, "Please select at least one marketing channel"),
  expectedMonthlyReferrals: z.string().min(1, "Please select expected monthly referrals"),
  experience: z.string().min(50, "Please provide at least 50 characters describing your experience"),
  motivation: z.string().min(50, "Please provide at least 50 characters describing your motivation"),
  agreeToTerms: z.boolean().refine(val => val === true, "You must agree to the terms and conditions"),
});

type AffiliateApplicationForm = z.infer<typeof affiliateApplicationSchema>;

export default function AffiliateApplicationPage() {
  const { branding } = useBranding();
  const { toast } = useToast();
  const [isSubmitted, setIsSubmitted] = useState(false);


  useEffect(() => {
    document.title = `Become a Partner - ${branding.appName}`;
    return () => {
      document.title = branding.appName; // Reset to default
    };
  }, [branding.appName]);

  const form = useForm<AffiliateApplicationForm>({
    resolver: zodResolver(affiliateApplicationSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      company: '',
      website: '',
      country: '',
      marketingChannels: [],
      expectedMonthlyReferrals: '',
      experience: '',
      motivation: '',
      agreeToTerms: false,
    },
  });

  const submitApplicationMutation = useMutation({
    mutationFn: async (data: AffiliateApplicationForm) => {
      const res = await apiRequest('POST', '/api/affiliate/apply', data);
      if (!res.ok) throw new Error('Failed to submit application');
      return res.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
      toast({
        title: "Application Submitted!",
        description: "Thank you for your interest. We'll review your application and get back to you soon.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AffiliateApplicationForm) => {
    submitApplicationMutation.mutate(data);
  };

  const marketingChannelOptions = [
    { value: 'social_media', label: 'Social Media (Facebook, Instagram, Twitter)' },
    { value: 'content_marketing', label: 'Content Marketing (Blog, YouTube, Podcast)' },
    { value: 'email_marketing', label: 'Email Marketing' },
    { value: 'paid_advertising', label: 'Paid Advertising (Google Ads, Facebook Ads)' },
    { value: 'seo', label: 'SEO & Organic Search' },
    { value: 'influencer', label: 'Influencer Marketing' },
    { value: 'networking', label: 'Networking & Events' },
    { value: 'referrals', label: 'Word of Mouth & Referrals' },
    { value: 'other', label: 'Other' },
  ];

  const expectedReferralOptions = [
    { value: '1-5', label: '1-5 referrals per month' },
    { value: '6-15', label: '6-15 referrals per month' },
    { value: '16-30', label: '16-30 referrals per month' },
    { value: '31-50', label: '31-50 referrals per month' },
    { value: '50+', label: '50+ referrals per month' },
  ];

  const countries = [
    'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'Spain', 'Italy',
    'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland', 'Switzerland', 'Austria', 'Belgium',
    'Portugal', 'Ireland', 'New Zealand', 'Japan', 'South Korea', 'Singapore', 'Hong Kong', 'India',
    'Brazil', 'Mexico', 'Argentina', 'Chile', 'Colombia', 'South Africa', 'Other'
  ];

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Application Submitted!</h1>
          <p className="text-gray-600 mb-6">
            Thank you for your interest in becoming a {branding.appName} partner. We've received your application and will review it within 2-3 business days.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            You'll receive an email confirmation shortly, and we'll contact you once your application has been reviewed.
          </p>
          <Button
            onClick={() => window.location.href = '/register'}
            className="w-full btn-brand-primary text-white"
          >
            Continue to Registration
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6">
            Become a {branding.appName} Partner
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90">
            Join our affiliate program and earn generous commissions by referring businesses to {branding.appName}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Earn Up to 30%</h3>
              <p className="opacity-90">Competitive commission rates on every successful referral</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Recurring Revenue</h3>
              <p className="opacity-90">Earn ongoing commissions from subscription renewals</p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Marketing Support</h3>
              <p className="opacity-90">Access to marketing materials and dedicated support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Application Form */}
      <div className="max-w-3xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Partner Application</h2>
            <p className="text-gray-600">
              Fill out the form below to apply for our affiliate program. We'll review your application and get back to you within 2-3 business days.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              {/* Personal Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+1 (555) 123-4567" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Business Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                  <Building className="h-5 w-5" />
                  Business Information
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Company/Organization</FormLabel>
                        <FormControl>
                          <Input placeholder="Your Company Name" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="website"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Website</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourwebsite.com" className="h-12" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="country"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Country *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select your country" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {countries.map((country) => (
                            <SelectItem key={country} value={country}>
                              {country}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Marketing Information */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-lg font-semibold text-gray-800 border-b pb-2">
                  <Globe className="h-5 w-5" />
                  Marketing Information
                </div>

                <FormField
                  control={form.control}
                  name="marketingChannels"
                  render={() => (
                    <FormItem>
                      <FormLabel>Marketing Channels *</FormLabel>
                      <FormDescription>
                        Select all marketing channels you plan to use (select at least one)
                      </FormDescription>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {marketingChannelOptions.map((option) => (
                          <FormField
                            key={option.value}
                            control={form.control}
                            name="marketingChannels"
                            render={({ field }) => {
                              return (
                                <FormItem
                                  key={option.value}
                                  className="flex flex-row items-start space-x-3 space-y-0"
                                >
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value?.includes(option.value)}
                                      onCheckedChange={(checked) => {
                                        return checked
                                          ? field.onChange([...field.value, option.value])
                                          : field.onChange(
                                              field.value?.filter(
                                                (value) => value !== option.value
                                              )
                                            )
                                      }}
                                    />
                                  </FormControl>
                                  <FormLabel className="text-sm font-normal">
                                    {option.label}
                                  </FormLabel>
                                </FormItem>
                              )
                            }}
                          />
                        ))}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedMonthlyReferrals"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Monthly Referrals *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-12">
                            <SelectValue placeholder="Select expected monthly referrals" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {expectedReferralOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="experience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Marketing Experience *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe your marketing experience, audience size, and relevant achievements..."
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Tell us about your marketing experience and how you plan to promote {branding.appName} (minimum 50 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="motivation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Why do you want to become a partner? *</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Tell us why you're interested in partnering with ${branding.appName}...`}
                          className="min-h-[100px]"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Share your motivation for joining our affiliate program (minimum 50 characters)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Terms and Conditions */}
              <FormField
                control={form.control}
                name="agreeToTerms"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I agree to the terms and conditions *
                      </FormLabel>
                      <FormDescription>
                        By checking this box, you agree to our affiliate program terms and conditions, privacy policy, and marketing guidelines.
                      </FormDescription>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex gap-4 pt-6">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12"
                  onClick={() => window.location.href = '/register'}
                >
                  Back to Registration
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 btn-brand-primary text-white"
                  disabled={submitApplicationMutation.isPending}
                >
                  {submitApplicationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </div>
    </div>
  );
}
