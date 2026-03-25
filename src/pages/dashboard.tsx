import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import MetricsGrid from '@/components/dashboard/metrics-grid';
import MaintenanceCalendar from '@/components/dashboard/maintenance-calendar';
import UpcomingTasks from '@/components/dashboard/upcoming-tasks';
import QuickActions from '@/components/dashboard/quick-actions';
import RecentActivity from '@/components/dashboard/recent-activity';
import MaintenanceTemplates from '@/components/maintenance/maintenance-templates';
import BulkScheduleModal from '@/components/dashboard/bulk-schedule-modal';
import ComplianceInsights from '@/components/dashboard/compliance-insights';
import SetupChecklist from '@/components/onboarding/setup-checklist';
import { CertificateManagement } from '@/components/certificates/certificate-management';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calendar, Home, Camera, FileText, Activity } from 'lucide-react';
import { useLocation } from 'wouter';

export default function Dashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [isBulkScheduleOpen, setIsBulkScheduleOpen] = useState(false);

  if (!user) return null;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Dashboard Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-600">Overview of your property maintenance operations</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsBulkScheduleOpen(true)}
            >
              <Camera className="w-4 h-4 mr-2" />
              Bulk Schedule
            </Button>
            <Button size="sm" onClick={() => setLocation('/properties?add=true')}>
              <Home className="w-4 h-4 mr-2" />
              Add Property
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <MetricsGrid />

      {/* Compliance Insights - Full Width */}
      <div className="mt-8">
        <ComplianceInsights />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        {/* Left Column - Tabbed Content */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="maintenance" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="maintenance" className="flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Maintenance
              </TabsTrigger>
              <TabsTrigger value="certificates" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Certificates
              </TabsTrigger>
            </TabsList>
            <TabsContent value="maintenance" className="space-y-8 mt-6">
              <MaintenanceCalendar />
              <UpcomingTasks />
            </TabsContent>
            <TabsContent value="certificates" className="mt-6">
              <CertificateManagement />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column - Actions & Activity */}
        <div className="space-y-8">
          <SetupChecklist />
          <QuickActions />
          <RecentActivity />
          <MaintenanceTemplates />
        </div>
      </div>

      {/* Bulk Schedule Modal */}
      <BulkScheduleModal 
        isOpen={isBulkScheduleOpen} 
        onClose={() => setIsBulkScheduleOpen(false)} 
      />
    </div>
  );
}
