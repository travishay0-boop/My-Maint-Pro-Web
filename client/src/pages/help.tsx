import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  HelpCircle, 
  BookOpen, 
  MessageCircle, 
  Mail, 
  ExternalLink,
  FileText,
  Video,
  Users,
  Shield,
  Calendar,
  Home,
  ClipboardCheck
} from 'lucide-react';

const quickStartGuides = [
  {
    title: 'Adding Your First Property',
    description: 'Learn how to add properties, set up rooms, and configure inspection items.',
    icon: Home,
    steps: [
      'Go to Properties and click "Add Property"',
      'Enter property details and address',
      'Add rooms/areas using the room picker',
      'Inspection items are automatically added based on room type'
    ]
  },
  {
    title: 'Managing Inspections',
    description: 'Understand how to complete inspections and track compliance.',
    icon: ClipboardCheck,
    steps: [
      'Click on a property to view its rooms',
      'Select a room to see inspection items',
      'Check off items as you inspect them',
      'Take photos when required for compliance items'
    ]
  },
  {
    title: 'Using the Calendar',
    description: 'Track upcoming and overdue inspections across all properties.',
    icon: Calendar,
    steps: [
      'View all upcoming inspections in one place',
      'Red badges indicate overdue items',
      'Click any inspection to go directly to it',
      'Set country-specific compliance intervals'
    ]
  },
  {
    title: 'Compliance Certificates',
    description: 'Manage gas, electrical, pool safety, and other certificates.',
    icon: Shield,
    steps: [
      'Each property has a unique email address for certificates',
      'Upload certificates directly or email them',
      'Track expiry dates and get alerts',
      'View certificate history on property details'
    ]
  }
];

const faqItems = [
  {
    question: 'How do inspection intervals work?',
    answer: 'Inspection intervals are automatically set based on your country\'s compliance standards. When you complete an inspection, the next due date is calculated automatically. You can view and modify country-specific intervals in property settings.'
  },
  {
    question: 'Can I mark items as not applicable?',
    answer: 'Yes! If an inspection item doesn\'t apply to a particular property (e.g., no gas appliances), you can mark it as N/A. This removes it from the active checklist while maintaining an audit trail.'
  },
  {
    question: 'How do I add contractors?',
    answer: 'Go to the Contractors page and click "Add Contractor". You can assign trade categories (plumbing, electrical, HVAC, etc.) and mark preferred contractors. Contractors can then be assigned to specific inspection items.'
  },
  {
    question: 'How do inspection reports work?',
    answer: 'When you\'ve completed inspecting a property, click "Send Report" on the property details page. An email will be sent to the property owner and any additional recipients you\'ve configured.'
  },
  {
    question: 'What countries are supported?',
    answer: 'My Maintenance Pro supports compliance standards for Australia, USA, UK, Canada, and New Zealand. Each country has specific inspection intervals and requirements built into the system.'
  }
];

export default function Help() {
  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2" data-testid="text-page-title">
            <HelpCircle className="w-8 h-8 text-primary" />
            Help & Support
          </h1>
          <p className="text-muted-foreground mt-1">
            Everything you need to get started and make the most of My Maintenance Pro
          </p>
        </div>
      </div>

      {/* Quick Start Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Quick Start Guides
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {quickStartGuides.map((guide) => (
            <Card key={guide.title} data-testid={`card-guide-${guide.title.toLowerCase().replace(/\s+/g, '-')}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <guide.icon className="w-5 h-5 text-primary" />
                  {guide.title}
                </CardTitle>
                <CardDescription>{guide.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                  {guide.steps.map((step, index) => (
                    <li key={index}>{step}</li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <MessageCircle className="w-6 h-6" />
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqItems.map((faq, index) => (
            <Card key={index} data-testid={`card-faq-${index}`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-medium">{faq.question}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{faq.answer}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Support */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Mail className="w-6 h-6" />
          Contact Support
        </h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Mail className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium mb-1">Email Support</h3>
                <p className="text-sm text-muted-foreground mb-3">Get help via email</p>
                <Button variant="outline" size="sm" asChild>
                  <a href="mailto:support@mymaintpro.com" data-testid="link-email-support">
                    support@mymaintpro.com
                  </a>
                </Button>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <FileText className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium mb-1">Documentation</h3>
                <p className="text-sm text-muted-foreground mb-3">Detailed guides and tutorials</p>
                <Button variant="outline" size="sm" data-testid="button-documentation">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  View Docs
                </Button>
              </div>
              <div className="text-center p-4 rounded-lg bg-muted/50">
                <Users className="w-8 h-8 mx-auto mb-2 text-primary" />
                <h3 className="font-medium mb-1">Community</h3>
                <p className="text-sm text-muted-foreground mb-3">Connect with other users</p>
                <Button variant="outline" size="sm" data-testid="button-community">
                  <ExternalLink className="w-4 h-4 mr-1" />
                  Join Community
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Video Tutorials Placeholder */}
      <section>
        <h2 className="text-2xl font-semibold mb-4 flex items-center gap-2">
          <Video className="w-6 h-6" />
          Video Tutorials
        </h2>
        <Card>
          <CardContent className="p-8 text-center">
            <Video className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-2">Video tutorials coming soon</h3>
            <p className="text-sm text-muted-foreground">
              We're working on step-by-step video guides to help you get the most out of My Maintenance Pro.
            </p>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
