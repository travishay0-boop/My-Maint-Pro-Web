import { Switch, Route, useLocation } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { queryClient, apiRequest } from "./lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import Login from "@/pages/login";
import Signup from "@/pages/signup";
import Landing from "@/pages/landing";
import SignupPlan from "@/pages/signup-plan";
import VerifyEmail from "@/pages/verify-email";
import CheckoutSuccess from "@/pages/checkout-success";
import ForgotPassword from "@/pages/forgot-password";
import ResetPassword from "@/pages/reset-password";
import Dashboard from "@/pages/dashboard";
import Properties from "@/pages/properties";
import PropertyDetails from "@/pages/property-details";
import InspectionDetails from "@/pages/inspection-details";
import Calendar from "@/pages/calendar";
import Contractors from "@/pages/contractors";
import Reports from "@/pages/reports";
import Help from "@/pages/help";
import AdminDashboard from "@/pages/admin";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import NotFound from "@/pages/not-found";
import SubmitCertificate from "@/pages/submit-certificate";
import CertificateConfirmed from "@/pages/certificate-confirmed";
import PrivacyPolicy from "@/pages/privacy";

import Header from "@/components/layout/header";
import Sidebar from "@/components/layout/sidebar";
import MobileBottomNav from "@/components/layout/mobile-bottom-nav";
import { TosModal } from "@/components/tos-modal";
import OnboardingWizard from "@/components/onboarding/onboarding-wizard";
import FeedbackWidget from "@/components/feedback/feedback-widget";
import PWAInstallPrompt from "@/components/pwa/install-prompt";
import PWAUpdateNotification from "@/components/pwa/update-notification";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const publicRoutes = ['/', '/welcome', '/login', '/signup', '/signup/plan', '/verify-email', '/checkout/success', '/forgot-password', '/certificate-confirmed', '/privacy'];
  const isPublic = publicRoutes.includes(location) || location.startsWith('/reset-password') || location.startsWith('/submit-certificate');
  if (!user && !isPublic) {
    setLocation('/login');
    return null;
  }

  if (!user) {
    return null;
  }

  return <Component />;
}

function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, updateUser } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const [isTosLoading, setIsTosLoading] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);

  const pathname = location.split('?')[0];
  const isAuthOrOnboardingRoute = ['/', '/welcome', '/login', '/signup', '/signup/plan', '/verify-email', '/checkout/success', '/forgot-password', '/certificate-confirmed', '/privacy'].includes(pathname) || pathname.startsWith('/reset-password') || pathname.startsWith('/submit-certificate');

  // If user is logged in but hasn't accepted TOS, show the TOS modal
  const showTosModal = user && !user.tosAccepted && !isAuthOrOnboardingRoute;
  
  // Check if we should show onboarding (after TOS accepted, first-time user)
  // Use local onboardingDismissed state for immediate UI response
  const shouldShowOnboarding = user && 
    user.tosAccepted && 
    !user.onboardingState?.completed && 
    !user.onboardingState?.dismissed &&
    !onboardingDismissed &&
    !isAuthOrOnboardingRoute;

  const handleAcceptTos = async () => {
    try {
      // CRITICAL FIX: Optimistically update user state IMMEDIATELY (before API call)
      // This closes the modal instantly without waiting for network response
      updateUser({ 
        tosAccepted: true, 
        tosAcceptedAt: new Date() 
      });
      
      toast({
        title: "Terms Accepted",
        description: "You can now use My Maintenance Pro"
      });
      
      // Call API in background to persist TOS acceptance (don't await - fire and forget)
      apiRequest("/api/user/accept-tos", "POST")
        .then(response => {
          if (response.ok) {
            // Background sync: invalidate user query to get server confirmation
            queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
          }
        })
        .catch(error => {
          console.error('TOS acceptance persistence error (non-critical):', error);
          // User already sees success - acceptance is saved in localStorage
          // Will be retried on next page load if server didn't receive it
        });
    } catch (error) {
      console.error('TOS acceptance error:', error);
      // Revert optimistic update if something went wrong
      updateUser({ tosAccepted: false });
      toast({
        title: "Error",
        description: "Failed to accept terms of service. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDeclineTos = async () => {
    try {
      // Log the user out
      logout();
      
      toast({
        title: "Terms Declined",
        description: "You must accept the terms to use this application"
      });
      
      // Redirect to login
      setLocation('/login');
    } catch (error) {
      console.error('Logout error during TOS decline:', error);
      // Even if logout fails, still redirect to login page
      toast({
        title: "Logging out",
        description: "Redirecting to login..."
      });
      setLocation('/login');
    }
  };

  if (!user || isAuthOrOnboardingRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <TosModal 
        open={showTosModal || false}
        onAccept={handleAcceptTos}
        onDecline={handleDeclineTos}
        isLoading={isTosLoading}
      />
      
      <OnboardingWizard 
        open={shouldShowOnboarding || showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          setOnboardingDismissed(true);
        }}
      />
      
      <div className="min-h-screen bg-gray-50">
        <Header onRestartOnboarding={() => {
          setOnboardingDismissed(false);
          setShowOnboarding(true);
        }} />
        <div className="flex h-screen pt-16">
          <Sidebar />
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            {children}
          </main>
        </div>
        <MobileBottomNav />
        <FeedbackWidget />
      </div>
    </>
  );
}

function HomeRoute() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  if (isLoading) return null;
  if (user) {
    setLocation('/dashboard');
    return null;
  }
  return <Landing />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomeRoute} />
      <Route path="/welcome" component={Landing} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/signup/plan" component={SignupPlan} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/checkout/success" component={CheckoutSuccess} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/submit-certificate/:token" component={SubmitCertificate} />
      <Route path="/certificate-confirmed" component={CertificateConfirmed} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/properties/:id/inspection/:periodId">
        <ProtectedRoute component={InspectionDetails} />
      </Route>
      <Route path="/properties/:id">
        <ProtectedRoute component={PropertyDetails} />
      </Route>
      <Route path="/properties">
        <ProtectedRoute component={Properties} />
      </Route>
      <Route path="/calendar">
        <ProtectedRoute component={Calendar} />
      </Route>
      <Route path="/contractors">
        <ProtectedRoute component={Contractors} />
      </Route>
      <Route path="/reports">
        <ProtectedRoute component={Reports} />
      </Route>
      <Route path="/help">
        <ProtectedRoute component={Help} />
      </Route>
      <Route path="/admin">
        <ProtectedRoute component={AdminDashboard} />
      </Route>
      <Route path="/profile">
        <ProtectedRoute component={Profile} />
      </Route>
      <Route path="/settings">
        <ProtectedRoute component={Settings} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <AppLayout>
            <Toaster />
            <Router />
            <PWAInstallPrompt />
            <PWAUpdateNotification />
          </AppLayout>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
