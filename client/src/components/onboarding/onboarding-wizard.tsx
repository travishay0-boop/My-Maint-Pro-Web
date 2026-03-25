import { useState } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { 
  Building2, 
  ClipboardCheck, 
  Calendar, 
  Camera, 
  Shield, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Home,
  BarChart3,
  Bell,
  Mail,
  FileCheck
} from 'lucide-react';

interface OnboardingWizardProps {
  open: boolean;
  onClose: () => void;
}

const steps = [
  {
    id: 'welcome',
    title: 'Welcome to My Maintenance Pro',
    icon: Sparkles,
    content: () => (
      <div className="space-y-6">
        <p className="text-lg text-gray-600">
          Whether you're managing your own home, a few rental properties, or an entire portfolio — we've got you covered.
        </p>
        <div className="grid gap-4">
          <FeatureCard
            icon={Home}
            title="For Homeowners"
            description="Track maintenance, schedule inspections, and keep your home in top shape"
          />
          <FeatureCard
            icon={Building2}
            title="For Landlords"
            description="Manage rental properties, document conditions, and stay compliant"
          />
          <FeatureCard
            icon={ClipboardCheck}
            title="For Property Managers"
            description="Handle multiple properties with room-by-room inspections and reporting"
          />
        </div>
      </div>
    ),
  },
  {
    id: 'properties',
    title: 'Your Properties',
    icon: Home,
    content: () => (
      <div className="space-y-6">
        <p className="text-gray-600">
          Start by adding your property — whether it's your home, a vacation rental, or an investment property.
        </p>
        <div className="bg-blue-50 rounded-lg p-4 space-y-3">
          <h4 className="font-semibold text-blue-900">Getting Started:</h4>
          <ul className="space-y-2 text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Add your property with address and basic details</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Create rooms (Kitchen, Bathroom, Garage, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="w-5 h-5 mt-0.5 text-blue-600 flex-shrink-0" />
              <span>Add items to inspect (Smoke detectors, HVAC (Heating, Ventilation, and Air Conditioning), Appliances)</span>
            </li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          Tip: Your property's country determines recommended inspection intervals based on local standards.
        </p>
      </div>
    ),
  },
  {
    id: 'inspections',
    title: 'Easy Inspections',
    icon: ClipboardCheck,
    content: () => (
      <div className="space-y-6">
        <p className="text-gray-600">
          Walk through your property room by room. It's as simple as rating each item's condition.
        </p>
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
            <ClipboardCheck className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="font-medium">One Tap to Inspect</h4>
              <p className="text-sm text-gray-600">
                Tap <strong>Good</strong>, <strong>Average</strong>, or <strong>Poor</strong> on any item — it's automatically marked as inspected. No need to tick the checkbox separately.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Camera className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="font-medium">Photo Documentation</h4>
              <p className="text-sm text-gray-600">
                Snap photos to document conditions — great for move-in/out or insurance records
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <Shield className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="font-medium">Safety Reminders</h4>
              <p className="text-sm text-gray-600">
                Get reminded when smoke detectors, fire extinguishers, or other safety items need checking
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
            <BarChart3 className="w-6 h-6 text-primary flex-shrink-0" />
            <div>
              <h4 className="font-medium">Track Progress</h4>
              <p className="text-sm text-gray-600">
                See what's done, what's pending, and mark items as N/A if they don't apply
              </p>
            </div>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'staying-organized',
    title: 'Stay Organized',
    icon: Calendar,
    content: () => (
      <div className="space-y-6">
        <p className="text-gray-600">
          Never forget an inspection again. We'll help you stay on top of everything.
        </p>
        <div className="grid gap-4">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Bell className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Calendar & Reminders</h4>
            </div>
            <p className="text-sm text-gray-600">
              See all upcoming inspections at a glance. Color-coded badges show what's overdue or coming up.
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Email Reports</h4>
            </div>
            <p className="text-sm text-gray-600">
              Landlords: Automatically email inspection reports to tenants or property owners with photos included.
            </p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-primary" />
              <h4 className="font-medium">Certificate Tracking</h4>
            </div>
            <p className="text-sm text-gray-600">
              Keep compliance certificates organized. Contractors can email them directly to your property.
            </p>
          </div>
        </div>
      </div>
    ),
  },
  {
    id: 'complete',
    title: "You're Ready!",
    icon: CheckCircle2,
    content: () => (
      <div className="space-y-6 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <p className="text-lg text-gray-600">
          That's all you need to know to get started!
        </p>
        <div className="bg-gray-50 rounded-lg p-4 text-left">
          <h4 className="font-medium mb-3">Your First Steps:</h4>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <Home className="w-4 h-4 text-primary" />
              Add your first property
            </li>
            <li className="flex items-center gap-2">
              <ClipboardCheck className="w-4 h-4 text-primary" />
              Create a few rooms and inspection items
            </li>
            <li className="flex items-center gap-2">
              <Camera className="w-4 h-4 text-primary" />
              Complete your first inspection
            </li>
          </ul>
        </div>
        <p className="text-sm text-gray-500">
          You can restart this tour anytime from the profile menu.
        </p>
      </div>
    ),
  },
];

function FeatureCard({ icon: Icon, title, description }: { 
  icon: typeof Building2; 
  title: string; 
  description: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 border rounded-lg">
      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h4 className="font-medium">{title}</h4>
        <p className="text-sm text-gray-600">{description}</p>
      </div>
    </div>
  );
}

export default function OnboardingWizard({ open, onClose }: OnboardingWizardProps) {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  
  const updateOnboarding = useMutation({
    mutationFn: async (data: { 
      currentStep?: number; 
      completed?: boolean; 
      dismissed?: boolean;
      completedSteps?: string[];
    }) => {
      const res = await apiRequest('PATCH', '/api/user/onboarding', data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
    },
  });

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      const newStep = currentStep + 1;
      setCurrentStep(newStep);
      updateOnboarding.mutate({ 
        currentStep: newStep,
        completedSteps: steps.slice(0, newStep).map(s => s.id)
      });
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    updateOnboarding.mutate({ 
      completed: true,
      currentStep: steps.length - 1,
      completedSteps: steps.map(s => s.id)
    });
    onClose();
    setLocation('/properties');
  };

  const handleSkip = () => {
    updateOnboarding.mutate({ dismissed: true });
    onClose();
  };

  const step = steps[currentStep];
  const StepIcon = step.icon;
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleSkip()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                <StepIcon className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl">{step.title}</DialogTitle>
            </div>
            <span className="text-sm text-gray-500">
              {currentStep + 1} of {steps.length}
            </span>
          </div>
          <DialogDescription className="sr-only">
            Step {currentStep + 1} of {steps.length}: {step.title}
          </DialogDescription>
          <Progress value={progress} className="h-2" />
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          {step.content()}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="ghost"
            onClick={handleSkip}
            className="text-gray-500"
            data-testid="button-skip-onboarding"
          >
            Skip for now
          </Button>
          
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={handleBack}
                data-testid="button-onboarding-back"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <Button 
                onClick={handleNext}
                data-testid="button-onboarding-next"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={handleComplete}
                className="bg-primary hover:bg-primary/90"
                data-testid="button-onboarding-complete"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
