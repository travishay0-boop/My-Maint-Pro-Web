import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { CheckCircle2, Tag, Loader2, ArrowLeft, Building2, CreditCard, FileText, Phone } from 'lucide-react';

type TierKey = 'my_home' | 'property_owner' | 'agency' | 'portfolio' | 'enterprise';

interface TierDisplay {
  label: string;
  setupLabel: string;
  monthlyLabel: string;
  setupAmount: number;
  monthlyRate: number;
  perProperty: boolean;
  isEnterprise: boolean;
  canReportOnly: boolean;
  channel: 'residential' | 'commercial';
}

const TIER_DISPLAY: Record<TierKey, TierDisplay> = {
  my_home:        { label: 'My Home',        setupLabel: '$9.99 setup',  monthlyLabel: '$2.97/month',         setupAmount: 9.99,  monthlyRate: 2.97,  perProperty: false, isEnterprise: false, canReportOnly: true,  channel: 'residential' },
  property_owner: { label: 'Property Owner', setupLabel: '$19.99 setup', monthlyLabel: '$1.97/property/month', setupAmount: 19.99, monthlyRate: 1.97,  perProperty: true,  isEnterprise: false, canReportOnly: false, channel: 'residential' },
  agency:         { label: 'Agency',         setupLabel: '$99 setup',    monthlyLabel: '$2.97/property/month', setupAmount: 99,    monthlyRate: 2.97,  perProperty: true,  isEnterprise: false, canReportOnly: true,  channel: 'commercial'  },
  portfolio:      { label: 'Portfolio',      setupLabel: '$199 setup',   monthlyLabel: '$1.50/property/month', setupAmount: 199,   monthlyRate: 1.50,  perProperty: true,  isEnterprise: false, canReportOnly: true,  channel: 'commercial'  },
  enterprise:     { label: 'Enterprise',     setupLabel: '$499 setup',   monthlyLabel: '$0.50/property/month', setupAmount: 499,   monthlyRate: 0.50,  perProperty: true,  isEnterprise: true,  canReportOnly: false, channel: 'commercial'  },
};

function getTierFromUser(propertyCount: number, channel?: string): TierKey {
  if (channel === 'commercial' || propertyCount >= 6) {
    if (propertyCount >= 200) return 'enterprise';
    if (propertyCount >= 50)  return 'portfolio';
    return 'agency';
  }
  if (propertyCount >= 3) return 'property_owner';
  return 'my_home';
}

export default function SignupPlan() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'report_only'>('monthly');

  const propertyCount = user?.propertyCount || 1;
  const userChannel = (user as any)?.channel || 'residential';
  const tier = getTierFromUser(propertyCount, userChannel);
  const display = TIER_DISPLAY[tier];

  const monthlyTotal = display.perProperty ? display.monthlyRate * propertyCount : display.monthlyRate;
  const reportOnlyCost = userChannel === 'commercial' ? 19.99 * propertyCount : 12.99;

  useEffect(() => {
    if (!user) setLocation('/login');
  }, [user]);

  const validatePromo = useMutation({
    mutationFn: async (code: string) => {
      const res = await apiRequest('POST', '/api/stripe/validate-promo', { code });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.valid) {
        setPromoResult(data);
        toast({ title: 'Promo code applied!', description: 'Your promo code gives you free access.' });
      } else {
        toast({ title: 'Invalid code', description: data.error, variant: 'destructive' });
      }
    },
  });

  const redeemPromo = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/redeem-promo', { code: promoCode });
      return res.json();
    },
    onSuccess: () => {
      toast({ title: 'Access granted!', description: 'Your promo code has been redeemed.' });
      setLocation('/dashboard');
    },
  });

  const checkout = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/stripe/checkout', {
        planType: selectedPlan,
        propertyCount,
        tier,
        channel: userChannel,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) window.location.href = data.url;
      else toast({ title: 'Error', description: data.error || 'Checkout failed', variant: 'destructive' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Could not start checkout. Please try again.', variant: 'destructive' });
    },
  });

  // Enterprise: show "Talk to us" screen
  if (display.isEnterprise) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation('/signup')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            <span className="font-bold text-primary">My Maintenance Pro</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 text-gray-500" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Let's talk</h1>
            <p className="text-gray-600">
              Your portfolio of {propertyCount} properties qualifies for our <strong>Enterprise</strong> plan.
              Enterprise plans are customised to your organisation's needs — we'll set up your account personally.
            </p>
            <div className="bg-gray-50 rounded-xl border p-5 text-left space-y-2">
              <p className="text-sm font-medium text-gray-700">Enterprise plan includes:</p>
              <ul className="text-sm text-gray-600 space-y-1">
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> 200+ properties — no cap</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> $0.50 /property /month</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> Unlimited team users</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> Bulk reporting + API access</li>
                <li className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5" /> Dedicated onboarding support</li>
              </ul>
            </div>
            <Button className="w-full bg-primary hover:bg-primary/90 text-white" asChild>
              <a href="mailto:enterprise@propertymaintpro.com?subject=Enterprise Plan Enquiry">
                Contact us to get started
              </a>
            </Button>
            <Button variant="ghost" className="w-full" onClick={() => setLocation('/dashboard')}>
              Skip for now — continue to dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => setLocation('/signup')}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">My Maintenance Pro</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-xl space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900">Your plan</h1>
            <p className="text-gray-500 mt-1">
              Based on {propertyCount} propert{propertyCount === 1 ? 'y' : 'ies'} —{' '}
              <Badge className={userChannel === 'commercial' ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}>
                {display.label}
              </Badge>
            </p>
          </div>

          {/* Promo Code */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-primary" />
                <span className="font-medium text-sm">Have a promo or competition code?</span>
              </div>
              {promoResult?.valid ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-medium text-green-800">Code applied: {promoCode.toUpperCase()}</p>
                      <p className="text-xs text-green-600">Full access granted — no payment required</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => redeemPromo.mutate()}
                    disabled={redeemPromo.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {redeemPromo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate'}
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    placeholder="Enter promo code"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => e.key === 'Enter' && validatePromo.mutate(promoCode.trim())}
                    className="uppercase"
                  />
                  <Button
                    variant="outline"
                    onClick={() => validatePromo.mutate(promoCode.trim())}
                    disabled={validatePromo.isPending || !promoCode.trim()}
                  >
                    {validatePromo.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Apply'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly Plan */}
          <div
            className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedPlan === 'monthly' ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            onClick={() => setSelectedPlan('monthly')}
          >
            <div className="flex items-start gap-3">
              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedPlan === 'monthly' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                {selectedPlan === 'monthly' && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-primary" />
                  <span className="font-semibold text-gray-900">Full Subscription</span>
                  <Badge className="bg-primary/10 text-primary text-xs">Recommended</Badge>
                </div>
                <p className="text-sm text-gray-600 mt-1">Full access including maintenance alerts and scheduled reminders.</p>
                <div className="mt-3 space-y-1 text-sm text-gray-700">
                  <div className="flex justify-between">
                    <span>One-time setup fee</span>
                    <span className="font-medium">${display.setupAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-gray-500">
                    <span>
                      {display.perProperty
                        ? `${display.monthlyRate.toFixed(2)}/property × ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'}`
                        : 'Monthly subscription'}
                    </span>
                    <span>${monthlyTotal.toFixed(2)}/month</span>
                  </div>
                  <div className="flex justify-between font-semibold border-t pt-1 mt-1">
                    <span>Due today</span>
                    <span>${display.setupAmount.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* One-off Report */}
          {display.canReportOnly && (
            <div
              className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${selectedPlan === 'report_only' ? 'border-primary bg-blue-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
              onClick={() => setSelectedPlan('report_only')}
            >
              <div className="flex items-start gap-3">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 ${selectedPlan === 'report_only' ? 'border-primary bg-primary' : 'border-gray-300'}`}>
                  {selectedPlan === 'report_only' && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-600" />
                    <span className="font-semibold text-gray-900">One-Off Report</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {userChannel === 'commercial'
                      ? `Generate a complete PDF report per property. No ongoing subscription. $19.99 × ${propertyCount} propert${propertyCount === 1 ? 'y' : 'ies'}.`
                      : 'One-off payment to generate a personalised maintenance plan PDF. No ongoing subscription.'}
                  </p>
                  <div className="mt-2 flex justify-between text-sm font-semibold">
                    <span>One-off fee</span>
                    <span>${reportOnlyCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Button
            className="w-full bg-primary hover:bg-primary/90 text-white py-6 text-base"
            onClick={() => checkout.mutate()}
            disabled={checkout.isPending}
          >
            {checkout.isPending
              ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Redirecting to payment...</>
              : <>Continue to Payment — ${selectedPlan === 'report_only' ? reportOnlyCost.toFixed(2) : display.setupAmount.toFixed(2)} today</>
            }
          </Button>

          <p className="text-center text-xs text-gray-500">
            Secure payment via Stripe · Cancel subscription anytime · No hidden fees
          </p>
        </div>
      </div>
    </div>
  );
}
