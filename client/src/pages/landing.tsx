import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Shield, ClipboardCheck, BarChart3, Bell, Building2, CheckCircle2, Smartphone, ArrowRight, X, Minus } from 'lucide-react';

type PricingTab = 'residential' | 'commercial';

export default function Landing() {
  const [, setLocation] = useLocation();
  const [tab, setTab] = useState<PricingTab>('residential');

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg">My Maintenance Pro</span>
        </div>
        <Button variant="ghost" onClick={() => setLocation('/login')}>Log In</Button>
      </header>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 bg-gradient-to-b from-blue-50 to-white">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <Smartphone className="w-4 h-4" />
            Inspect properties on the go with the mobile app
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4 leading-tight">
            My Maintenance Pro<br />
            <span className="text-primary">The Better Choice For Home Maintenance</span>
          </h1>
          <p className="text-lg text-gray-600 mb-8">
            Track inspections, manage compliance certificates, and stay on top of maintenance — whether you own one home or manage an entire portfolio.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-white px-8" onClick={() => setLocation('/signup')}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => setLocation('/login')}>
              Log In to Your Account
            </Button>
          </div>
          <p className="text-sm text-gray-500 mt-4">Residential plans from $9.99 setup · Commercial plans from $99 setup</p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-12">Everything you need to manage your property</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <Feature icon={ClipboardCheck} title="Room-by-Room Inspections" desc="Walk through each room and rate items Good, Average, or Poor. One tap marks it inspected." />
            <Feature icon={Shield} title="Compliance Tracking" desc="Country-specific inspection intervals. Get reminded before certificates expire." />
            <Feature icon={BarChart3} title="Reports & History" desc="Full inspection history with condition tracking. Email reports to owners or tenants instantly." />
            <Feature icon={Bell} title="Maintenance Alerts" desc="Scheduled maintenance reminders sent by email. SMS notifications included with subscription." />
            <Feature icon={Building2} title="Multi-Property Support" desc="Manage from a single home to a full portfolio. Pricing scales with you." />
            <Feature icon={CheckCircle2} title="Certificate Management" desc="Contractors email certificates directly to your property inbox. AI reads and files them automatically." />
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-16 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">My Maintenance Pro — pricing</h2>
          <p className="text-center text-gray-600 mb-8">
            Choose the plan that fits your situation. Residential plans are self-serve. Portfolios of 6 or more properties move to our commercial plans, scaled to your size.
          </p>

          {/* Tabs */}
          <div className="flex gap-2 mb-8">
            <button
              onClick={() => setTab('residential')}
              className={`px-5 py-2 rounded-full border text-sm font-medium transition-all ${tab === 'residential' ? 'border-amber-500 text-amber-700 bg-amber-50' : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'}`}
            >
              Residential
            </button>
            <button
              onClick={() => setTab('commercial')}
              className={`px-5 py-2 rounded-full border text-sm font-medium transition-all ${tab === 'commercial' ? 'border-gray-900 text-gray-900 bg-white' : 'border-gray-300 text-gray-600 bg-white hover:border-gray-400'}`}
            >
              Commercial
            </button>
          </div>

          {tab === 'residential' && (
            <>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Residential Plans — 1 to 5 Properties</p>
              <div className="grid md:grid-cols-3 gap-6">
                {/* My Home */}
                <div className="relative rounded-2xl border-2 border-primary bg-white p-6 flex flex-col shadow-sm">
                  <div className="absolute -top-3 left-6">
                    <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full">MOST POPULAR</span>
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mt-2">My Home</h3>
                  <p className="text-sm text-gray-500 mb-4">1–2 properties</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-gray-900">$9.99</span>
                    <span className="text-gray-500 text-sm"> setup</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-5">$2.97 /month</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    <FeatureRow label="Up to 2 properties" />
                    <FeatureRow label="Full guided maintenance schedule" />
                    <FeatureRow label="Seasonal reminders & alerts" />
                    <FeatureRow label="Web + mobile app" />
                    <FeatureRow label="PDF export of your plan" />
                    <FeatureRow label="Shared household access" excluded />
                    <FeatureRow label="Maintenance history log" excluded />
                  </ul>
                  <Button className="w-full bg-primary hover:bg-primary/90 text-white" onClick={() => setLocation('/signup')}>Get started</Button>
                </div>

                {/* Property Owner */}
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col shadow-sm">
                  <h3 className="font-bold text-xl text-gray-900">Property Owner</h3>
                  <p className="text-sm text-gray-500 mb-4">3–5 properties</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-gray-900">$19.99</span>
                    <span className="text-gray-500 text-sm"> setup</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-5">$1.97 /property /month</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    <FeatureRow label="Up to 5 properties" />
                    <FeatureRow label="Full guided maintenance schedule" />
                    <FeatureRow label="Seasonal reminders & alerts" />
                    <FeatureRow label="Web + mobile app" />
                    <FeatureRow label="PDF export — all properties" />
                    <FeatureRow label="Shared access for 1 household member" />
                    <FeatureRow label="Maintenance history log" />
                  </ul>
                  <Button className="w-full" variant="outline" onClick={() => setLocation('/signup')}>Get started</Button>
                </div>

                {/* Commercial redirect card */}
                <div className="rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 p-6 flex flex-col items-center justify-center text-center gap-4">
                  <p className="font-semibold text-gray-800">Managing 6+ properties?</p>
                  <p className="text-sm text-gray-500">Your portfolio qualifies for our commercial plans — built for agencies and investors who need more.</p>
                  <Button variant="outline" className="gap-2" onClick={() => setTab('commercial')}>
                    See commercial plans <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Residential one-off */}
              <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">Just want a one-off plan? No subscription needed.</p>
                  <p className="text-sm text-gray-500 mt-1">Answer a few questions and receive a complete, personalised maintenance plan emailed as a PDF. Yours to keep forever.</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold text-gray-900">$12.99</span>
                  <p className="text-xs text-gray-500">one-time</p>
                </div>
              </div>
            </>
          )}

          {tab === 'commercial' && (
            <>
              <div className="bg-gray-100 border-l-4 border-gray-400 rounded-lg p-4 mb-7 text-sm text-gray-700">
                <span className="font-semibold">You're managing a serious portfolio.</span> Our commercial plans are built for agencies and property investors with 6 or more properties — same guided maintenance engine, scaled for your size. Setup is a one-time fee; monthly is charged per active property.
              </div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Commercial Plans — 6 or More Properties</p>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Agency */}
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col shadow-sm">
                  <h3 className="font-bold text-xl text-gray-900">Agency</h3>
                  <p className="text-sm text-gray-500 mb-4">6–49 properties</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-gray-900">$99</span>
                    <span className="text-gray-500 text-sm"> setup</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-5">$2.97 /property /month</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    <FeatureRow label="6 to 49 properties" />
                    <FeatureRow label="Full maintenance schedule per property" />
                    <FeatureRow label="Seasonal reminders & alerts" />
                    <FeatureRow label="Web + mobile app" />
                    <FeatureRow label="PDF reports per property" />
                    <FeatureRow label="Team access — up to 3 users" />
                    <FeatureRow label="Bulk reporting dashboard" excluded />
                  </ul>
                  <Button className="w-full" variant="outline" onClick={() => setLocation('/signup')}>Get started</Button>
                </div>

                {/* Portfolio — Best Value */}
                <div className="relative rounded-2xl border-2 border-purple-500 bg-white p-6 flex flex-col shadow-lg">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-purple-600 text-white text-xs font-bold px-3 py-1 rounded-full">BEST VALUE</span>
                  </div>
                  <h3 className="font-bold text-xl text-gray-900 mt-2">Portfolio</h3>
                  <p className="text-sm text-gray-500 mb-4">50–199 properties</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-gray-900">$199</span>
                    <span className="text-gray-500 text-sm"> setup</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-5">$1.50 /property /month</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    <FeatureRow label="50 to 199 properties" />
                    <FeatureRow label="Full maintenance schedule per property" />
                    <FeatureRow label="Seasonal reminders & alerts" />
                    <FeatureRow label="Web + mobile app" />
                    <FeatureRow label="PDF reports per property" />
                    <FeatureRow label="Team access — up to 10 users" />
                    <FeatureRow label="Bulk reporting dashboard" />
                  </ul>
                  <Button className="w-full bg-purple-600 hover:bg-purple-700 text-white" onClick={() => setLocation('/signup')}>Get started</Button>
                </div>

                {/* Enterprise */}
                <div className="rounded-2xl border-2 border-gray-200 bg-white p-6 flex flex-col shadow-sm">
                  <h3 className="font-bold text-xl text-gray-900">Enterprise</h3>
                  <p className="text-sm text-gray-500 mb-4">200+ properties</p>
                  <div className="mb-1">
                    <span className="text-3xl font-bold text-gray-900">$499</span>
                    <span className="text-gray-500 text-sm"> setup</span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium mb-5">$0.50 /property /month</p>
                  <ul className="space-y-2 flex-1 mb-6">
                    <FeatureRow label="200+ properties — no cap" />
                    <FeatureRow label="Full maintenance schedule per property" />
                    <FeatureRow label="Seasonal reminders & alerts" />
                    <FeatureRow label="Web + mobile app" />
                    <FeatureRow label="PDF reports per property" />
                    <FeatureRow label="Unlimited team users" />
                    <FeatureRow label="Bulk reporting + API access" />
                  </ul>
                  <Button className="w-full" variant="outline" onClick={() => setLocation('/signup')}>Talk to us</Button>
                </div>
              </div>

              {/* Commercial one-off */}
              <div className="mt-8 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <p className="font-semibold text-gray-900">One-off property report — no subscription needed.</p>
                  <p className="text-sm text-gray-500 mt-1">Need a maintenance plan for a single property without committing to a plan? We'll generate a complete PDF report per property. Inspection costs are not included and remain the responsibility of the agency.</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-2xl font-bold text-gray-900">$19.99</span>
                  <p className="text-xs text-gray-500">per property, one-time</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">* One-off commercial reports cover the generated maintenance plan only. Any physical inspection, assessment, or on-site visit is arranged and funded separately by the agency or landlord.</p>
            </>
          )}

          <p className="text-center text-sm text-gray-500 mt-8">Have a promo code? Enter it during signup for free access.</p>
        </div>
      </section>

      {/* Mobile App CTA */}
      <section className="py-12 px-6 bg-primary text-white text-center">
        <div className="max-w-xl mx-auto">
          <Smartphone className="w-10 h-10 mx-auto mb-4 opacity-90" />
          <h2 className="text-xl font-bold mb-2">Inspect on your phone</h2>
          <p className="opacity-90 text-sm mb-4">
            Download the My Maintenance Pro mobile app to walk around your property and inspect items room by room — photos and all.
          </p>
          <p className="text-xs opacity-75">Available on iOS and Android. Sign up here first to create your account.</p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-6 border-t text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} My Maintenance Pro · <span className="cursor-pointer hover:text-gray-700" onClick={() => setLocation('/login')}>Log In</span> · <span className="cursor-pointer hover:text-gray-700" onClick={() => setLocation('/signup')}>Sign Up</span></p>
      </footer>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-start gap-3">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-semibold text-gray-900">{title}</h3>
      <p className="text-sm text-gray-600">{desc}</p>
    </div>
  );
}

function FeatureRow({ label, excluded }: { label: string; excluded?: boolean }) {
  return (
    <li className={`flex items-start gap-2 text-sm ${excluded ? 'text-gray-400' : 'text-gray-700'}`}>
      {excluded
        ? <Minus className="w-4 h-4 mt-0.5 shrink-0 text-gray-300" />
        : <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-green-500" />
      }
      {label}
    </li>
  );
}
