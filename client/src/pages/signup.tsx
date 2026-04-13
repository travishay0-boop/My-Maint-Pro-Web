import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Building2, ArrowLeft, Loader2, AlertCircle, Home, Building, Briefcase, TrendingUp } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

const signupSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(6, 'Phone number is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
  propertyCount: z.coerce.number().min(1, 'Must be at least 1'),
  country: z.string().min(1, 'Country is required'),
}).refine(d => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignupFormData = z.infer<typeof signupSchema>;

function getTierInfo(count: number) {
  if (count <= 2)  return { tier: 'my_home',        label: 'My Home',        desc: '1–2 properties',      icon: Home,       color: 'bg-blue-100 text-blue-800',   channel: 'residential', userType: 'private' };
  if (count <= 5)  return { tier: 'property_owner', label: 'Property Owner', desc: '3–5 properties',      icon: Building,   color: 'bg-purple-100 text-purple-800', channel: 'residential', userType: 'private' };
  if (count <= 49) return { tier: 'agency',         label: 'Agency',         desc: '6–49 properties',     icon: Briefcase,  color: 'bg-orange-100 text-orange-800', channel: 'commercial',  userType: 'agency'  };
  if (count <= 199)return { tier: 'portfolio',      label: 'Portfolio',      desc: '50–199 properties',   icon: TrendingUp, color: 'bg-green-100 text-green-800',  channel: 'commercial',  userType: 'agency'  };
  return             { tier: 'enterprise',          label: 'Enterprise',     desc: '200+ properties',     icon: Building2,  color: 'bg-gray-100 text-gray-800',    channel: 'commercial',  userType: 'agency'  };
}

const COUNTRIES = [
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'GB', name: 'United Kingdom' },
  { code: 'IE', name: 'Ireland' },
  { code: 'CA', name: 'Canada' },
  { code: 'NZ', name: 'New Zealand' },
];

export default function Signup() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [error, setError] = useState('');

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: '', lastName: '', email: '', phone: '',
      password: '', confirmPassword: '', propertyCount: 1, country: 'AU',
    },
  });

  const propertyCount = form.watch('propertyCount') || 1;
  const tierInfo = getTierInfo(Number(propertyCount));
  const TierIcon = tierInfo.icon;

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const tier = getTierInfo(data.propertyCount);
      const username = data.email.split('@')[0].replace(/[^a-z0-9]/gi, '').toLowerCase() + Math.floor(Math.random() * 999);

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: data.firstName,
          lastName: data.lastName,
          username,
          email: data.email,
          password: data.password,
          userType: tier.userType,
          role: tier.channel === 'commercial' ? 'agency_admin' : 'property_owner',
          phone: data.phone,
          propertyCount: data.propertyCount,
          subscriptionTier: tier.tier,
          channel: tier.channel,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Signup failed');
      }
      return res.json();
    },
    onSuccess: (data: any) => {
      if (data?.user && data?.token) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('token', data.token);
      }
      window.location.href = '/verify-email';
    },
    onError: (err: Error) => {
      setError(err.message);
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">My Maintenance Pro</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
            <p className="text-gray-500 mt-1">Already have an account?{' '}
              <button className="text-primary hover:underline" onClick={() => setLocation('/login')}>Log in</button>
            </p>
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Form {...form}>
            <form onSubmit={form.handleSubmit((d) => signupMutation.mutate(d))} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="firstName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>First name</FormLabel>
                    <FormControl><Input placeholder="Jane" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="lastName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last name</FormLabel>
                    <FormControl><Input placeholder="Smith" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="email" render={({ field }) => (
                <FormItem>
                  <FormLabel>Email address</FormLabel>
                  <FormControl><Input type="email" placeholder="jane@example.com" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="phone" render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone number</FormLabel>
                  <FormControl><Input type="tel" placeholder="+61 400 000 000" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="country" render={({ field }) => (
                <FormItem>
                  <FormLabel>Country</FormLabel>
                  <FormControl>
                    <select {...field} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                      {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                    </select>
                  </FormControl>
                  {field.value === 'AU' && (
                    <p className="text-xs text-blue-600 mt-1">
                      Australian properties get state-specific compliance items — VIC gas &amp; electrical safety checks, QLD pool safety certificates, QLD &amp; NSW smoke alarm obligations, and more. Enable per property when adding.
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="propertyCount" render={({ field }) => (
                <FormItem>
                  <FormLabel>How many properties do you manage?</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      {...field}
                      onChange={e => field.onChange(Number(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                  {propertyCount >= 1 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex items-center gap-2">
                        <TierIcon className="w-4 h-4 text-gray-500" />
                        <Badge className={tierInfo.color}>{tierInfo.label}</Badge>
                        <span className="text-xs text-gray-500">{tierInfo.desc}</span>
                      </div>
                      {tierInfo.channel === 'commercial' && (
                        <p className="text-xs text-orange-600 font-medium">
                          Commercial plan — monthly billing is per active property.
                        </p>
                      )}
                      {tierInfo.tier === 'enterprise' && (
                        <p className="text-xs text-gray-500">Enterprise plans are customised — we'll reach out after signup.</p>
                      )}
                    </div>
                  )}
                </FormItem>
              )} />

              <div className="grid grid-cols-2 gap-3">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm password</FormLabel>
                    <FormControl><Input type="password" placeholder="••••••" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <Button
                type="submit"
                className="w-full bg-primary hover:bg-primary/90 text-white"
                disabled={signupMutation.isPending}
              >
                {signupMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Creating account...</>
                  : 'Continue to Plan Selection →'}
              </Button>
            </form>
          </Form>

          <p className="text-center text-xs text-gray-400">
            By signing up you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
