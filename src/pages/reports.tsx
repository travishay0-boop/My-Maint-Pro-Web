import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { format, parseISO, isBefore, addDays, startOfDay, differenceInDays } from 'date-fns';
import { 
  BarChart3, 
  FileText, 
  Download, 
  Shield, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  Home,
  Calendar,
  ClipboardCheck,
  TrendingUp,
  Building,
  Wrench,
  FileCheck,
  Camera,
  MapPin,
  ChevronRight,
  ExternalLink,
  Users,
  Activity,
  Zap,
  Flag,
  Globe,
  Layers,
  Target,
  Eye,
  AlertCircle,
  Award
} from 'lucide-react';

interface Property {
  id: number;
  name: string;
  address: string;
  country: string | null;
  propertyType: string;
  bedrooms: number | null;
  bathrooms: number | null;
  isActive: boolean;
}

interface Room {
  id: number;
  propertyId: number;
  roomName: string;
  roomType: string;
}

interface InspectionItem {
  id: number;
  itemName: string;
  category: string;
  priority: string;
  isCompleted: boolean;
  isNotApplicable: boolean;
  photoRequired: boolean;
  photoUrl: string | null;
  nextInspectionDate: string | null;
  lastInspectedDate: string | null;
  complianceStandard: string | null;
  tradeCategory: string | null;
  assignedContractorId: number | null;
  roomId: number;
  roomName?: string;
  roomType?: string;
  propertyId?: number;
  propertyName?: string;
  propertyAddress?: string;
}

interface Contractor {
  id: number;
  name: string;
  tradeCategory: string;
  phone: string;
  email: string | null;
  isPreferred: boolean;
  isActive: boolean;
}

interface Certificate {
  id: number;
  certificateType: string;
  certificateName: string;
  expiryDate: string;
  issueDate: string;
  propertyId: number | null;
  status: string;
}

interface MaintenanceTask {
  id: number;
  title: string;
  status: string;
  priority: string;
  category: string;
  propertyId: number;
  scheduledDate: string;
  dueDate: string;
  completedDate: string | null;
  cost: number | null;
}

interface DashboardMetrics {
  totalProperties: number;
  totalRooms: number;
  totalInspectionItems: number;
  completedItems: number;
  overdueItems: number;
  upcomingItems: number;
}

export default function Reports() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [selectedProperty, setSelectedProperty] = useState<string>('all');
  const [selectedTab, setSelectedTab] = useState<string>('overview');

  const { data: properties, isLoading: propertiesLoading } = useQuery<Property[]>({
    queryKey: ['/api/properties', user?.agencyId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/${user?.agencyId}`);
      return response.json();
    },
    enabled: !!user?.agencyId,
  });

  const { data: upcomingInspections, isLoading: inspectionsLoading } = useQuery<InspectionItem[]>({
    queryKey: ['/api/inspections/upcoming', user?.agencyId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/inspections/upcoming');
      return response.json();
    },
    enabled: !!user?.agencyId,
  });

  const { data: contractors } = useQuery<Contractor[]>({
    queryKey: ['/api/contractors', user?.agencyId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/contractors/${user?.agencyId}`);
      return response.json();
    },
    enabled: !!user?.agencyId,
  });

  const { data: certificates } = useQuery<Certificate[]>({
    queryKey: ['/api/certificates', user?.agencyId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/certificates`);
      return response.json();
    },
    enabled: !!user?.agencyId,
  });

  const { data: maintenanceTasks } = useQuery<MaintenanceTask[]>({
    queryKey: ['/api/maintenance-tasks', user?.agencyId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/maintenance-tasks/${user?.agencyId}`);
      return response.json();
    },
    enabled: !!user?.agencyId,
  });

  const today = startOfDay(new Date());
  const sevenDaysFromNow = addDays(today, 7);
  const thirtyDaysFromNow = addDays(today, 30);
  const ninetyDaysFromNow = addDays(today, 90);

  // Apply property filter
  const filteredInspections = upcomingInspections?.filter(item => {
    if (selectedProperty === 'all') return true;
    return item.propertyId?.toString() === selectedProperty;
  }) || [];

  const filteredProperties = properties?.filter(property => {
    if (selectedProperty === 'all') return true;
    return property.id.toString() === selectedProperty;
  }) || [];

  const filteredCertificates = certificates?.filter(cert => {
    if (selectedProperty === 'all') return true;
    return cert.propertyId?.toString() === selectedProperty;
  }) || [];

  const filteredTasks = maintenanceTasks?.filter(task => {
    if (selectedProperty === 'all') return true;
    return task.propertyId?.toString() === selectedProperty;
  }) || [];

  const activeItems = filteredInspections.filter(item => !item.isNotApplicable);
  
  const overduePropertyMap = new Map<number, Date>();
  (properties || []).forEach(p => {
    if (p.nextInspectionDate && isBefore(new Date(p.nextInspectionDate), today)) {
      overduePropertyMap.set(p.id, new Date(p.nextInspectionDate));
    }
  });

  const overdueItems = activeItems.filter(item => {
    if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) return true;
    if (!item.isCompleted && item.propertyId) {
      const propNextDate = overduePropertyMap.get(item.propertyId);
      if (propNextDate) {
        const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
        if (!lastInsp || lastInsp < propNextDate) return true;
      }
    }
    return false;
  });

  const dueSoonItems = activeItems.filter(item => {
    if (!item.nextInspectionDate) return false;
    const date = parseISO(item.nextInspectionDate);
    return !isBefore(date, today) && isBefore(date, sevenDaysFromNow);
  });

  const dueThisMonthItems = activeItems.filter(item => {
    if (!item.nextInspectionDate) return false;
    const date = parseISO(item.nextInspectionDate);
    return !isBefore(date, sevenDaysFromNow) && isBefore(date, thirtyDaysFromNow);
  });

  // Compliant items - active items with nextInspectionDate that are not due within 30 days
  const compliantItems = activeItems.filter(item => {
    if (!item.nextInspectionDate) return false; // Items without scheduled dates are not counted as compliant
    return !isBefore(parseISO(item.nextInspectionDate), thirtyDaysFromNow);
  });

  // Items without scheduled inspection dates (excluding N/A items)
  const unscheduledItems = activeItems.filter(item => !item.nextInspectionDate);

  // Category breakdown
  const categoryBreakdown = filteredInspections.reduce((acc, item) => {
    const category = item.category || 'general';
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Priority breakdown
  const priorityBreakdown = filteredInspections.reduce((acc, item) => {
    const priority = item.priority || 'medium';
    acc[priority] = (acc[priority] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Country breakdown - uses filtered properties
  const countryBreakdown = filteredProperties.reduce((acc, prop) => {
    const country = prop.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Property type breakdown
  const propertyTypeBreakdown = filteredProperties.reduce((acc, prop) => {
    const type = prop.propertyType || 'other';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Contractor trade breakdown
  const tradeBreakdown = (contractors || []).reduce((acc, contractor) => {
    acc[contractor.tradeCategory] = (acc[contractor.tradeCategory] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Items with photo requirements
  const photoRequiredItems = filteredInspections.filter(item => item.photoRequired);
  const photoCompletedItems = photoRequiredItems.filter(item => item.photoUrl);
  const photoComplianceRate = photoRequiredItems.length > 0 
    ? Math.round((photoCompletedItems.length / photoRequiredItems.length) * 100) 
    : 100;

  // Items marked N/A
  const naItems = filteredInspections.filter(item => item.isNotApplicable);

  // Certificate status
  const validCertificates = filteredCertificates.filter(cert => 
    cert.expiryDate && !isBefore(parseISO(cert.expiryDate), today)
  );
  const expiredCertificates = filteredCertificates.filter(cert => 
    cert.expiryDate && isBefore(parseISO(cert.expiryDate), today)
  );
  const expiringCertificates = filteredCertificates.filter(cert => {
    if (!cert.expiryDate) return false;
    const date = parseISO(cert.expiryDate);
    return !isBefore(date, today) && isBefore(date, thirtyDaysFromNow);
  });

  // Certificate type breakdown
  const certificateTypeBreakdown = filteredCertificates.reduce((acc, cert) => {
    acc[cert.certificateType] = (acc[cert.certificateType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Task status breakdown
  const taskStatusBreakdown = filteredTasks.reduce((acc, task) => {
    acc[task.status] = (acc[task.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Contractor assignment coverage
  const itemsWithContractor = filteredInspections.filter(item => item.assignedContractorId);
  const contractorCoverage = filteredInspections.length > 0
    ? Math.round((itemsWithContractor.length / filteredInspections.length) * 100)
    : 0;

  // Overall health score calculation (uses activeItems to exclude N/A items)
  const calculateHealthScore = () => {
    if (activeItems.length === 0) return 100;
    
    const overdueWeight = 40;
    const dueSoonWeight = 20;
    const photoWeight = 20;
    const certificateWeight = 20;
    
    // Calculate scores based on active items only (excludes N/A)
    const overdueScore = Math.max(0, 100 - (overdueItems.length / activeItems.length) * 100);
    const dueSoonScore = Math.max(0, 100 - (dueSoonItems.length / activeItems.length) * 50);
    const photoScore = photoComplianceRate;
    const certScore = filteredCertificates.length > 0
      ? Math.max(0, 100 - (expiredCertificates.length / filteredCertificates.length) * 100)
      : 100;
    
    return Math.round(
      (overdueScore * overdueWeight + 
       dueSoonScore * dueSoonWeight + 
       photoScore * photoWeight + 
       certScore * certificateWeight) / 100
    );
  };

  const healthScore = calculateHealthScore();

  const getHealthColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getHealthBg = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getHealthLabel = (score: number) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  // Navigation helper
  const navigateToProperty = (propertyId: number) => {
    navigate(`/properties/${propertyId}`);
  };

  const navigateToCalendar = () => {
    navigate('/calendar');
  };

  const navigateToContractors = () => {
    navigate('/contractors');
  };

  const formatCategoryName = (category: string) => {
    return category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  if (propertiesLoading || inspectionsLoading) {
    return (
      <div className="container mx-auto p-6 max-w-7xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-32" />)}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl space-y-6">
      {/* Header with Property Filter */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2" data-testid="text-reports-title">
            <BarChart3 className="w-8 h-8 text-primary" />
            Property Reports
          </h1>
          <p className="text-muted-foreground mt-1">
            Comprehensive maintenance and compliance overview
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[250px]" data-testid="select-property-filter">
              <SelectValue placeholder="Filter by property" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {properties?.map(property => (
                <SelectItem key={property.id} value={property.id.toString()}>
                  {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" data-testid="button-export-report">
            <Download className="w-4 h-4 mr-1" />
            Export
          </Button>
        </div>
      </div>

      {/* Executive Summary - Health Score */}
      <Card className={`${getHealthBg(healthScore)} border-none`} data-testid="card-health-score">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`w-24 h-24 rounded-full ${getHealthBg(healthScore)} flex items-center justify-center border-4 border-white shadow-lg`}>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${getHealthColor(healthScore)}`}>{healthScore}</p>
                  <p className="text-xs text-muted-foreground">Score</p>
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-bold">Overall Property Health</h2>
                <Badge variant="outline" className={`${getHealthColor(healthScore)} mt-1`}>
                  {getHealthLabel(healthScore)}
                </Badge>
                <p className="text-sm text-muted-foreground mt-2">
                  Based on {activeItems.length} active items across {filteredProperties.length} properties
                  {naItems.length > 0 && ` (${naItems.length} N/A excluded)`}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-red-600">{overdueItems.length}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-orange-600">{dueSoonItems.length}</p>
                <p className="text-xs text-muted-foreground">Due Soon</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-blue-600">{dueThisMonthItems.length}</p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-2xl font-bold text-green-600">{compliantItems.length}</p>
                <p className="text-xs text-muted-foreground">Compliant</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Action Links */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => navigate('/properties')}
          data-testid="button-nav-properties"
        >
          <Building className="w-5 h-5" />
          <span className="text-sm">{properties?.length || 0} Properties</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={navigateToCalendar}
          data-testid="button-nav-calendar"
        >
          <Calendar className="w-5 h-5" />
          <span className="text-sm">View Calendar</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={navigateToContractors}
          data-testid="button-nav-contractors"
        >
          <Wrench className="w-5 h-5" />
          <span className="text-sm">{contractors?.length || 0} Contractors</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={() => setSelectedTab('certificates')}
          data-testid="button-nav-certificates"
        >
          <FileCheck className="w-5 h-5" />
          <span className="text-sm">{certificates?.length || 0} Certificates</span>
        </Button>
        <Button 
          variant="outline" 
          className="h-auto py-4 flex flex-col items-center gap-2"
          onClick={navigateToCalendar}
          data-testid="button-nav-inspections"
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-sm">{filteredInspections.length} Items</span>
        </Button>
      </div>

      {/* Report Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab} className="space-y-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 p-1">
          <TabsTrigger value="overview" className="flex-1 min-w-[100px]" data-testid="tab-overview">
            <Activity className="w-4 h-4 mr-1" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="properties" className="flex-1 min-w-[100px]" data-testid="tab-properties">
            <Building className="w-4 h-4 mr-1" />
            Properties
          </TabsTrigger>
          <TabsTrigger value="inspections" className="flex-1 min-w-[100px]" data-testid="tab-inspections">
            <ClipboardCheck className="w-4 h-4 mr-1" />
            Inspections
          </TabsTrigger>
          <TabsTrigger value="compliance" className="flex-1 min-w-[100px]" data-testid="tab-compliance">
            <Shield className="w-4 h-4 mr-1" />
            Compliance
          </TabsTrigger>
          <TabsTrigger value="contractors" className="flex-1 min-w-[100px]" data-testid="tab-contractors">
            <Wrench className="w-4 h-4 mr-1" />
            Contractors
          </TabsTrigger>
          <TabsTrigger value="certificates" className="flex-1 min-w-[100px]" data-testid="tab-certificates">
            <FileCheck className="w-4 h-4 mr-1" />
            Certificates
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Inspection Status Summary */}
            <Card data-testid="card-inspection-status">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4" />
                  Inspection Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <span className="text-sm">Overdue</span>
                    </div>
                    <span className="font-medium">{overdueItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500" />
                      <span className="text-sm">Due This Week</span>
                    </div>
                    <span className="font-medium">{dueSoonItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm">Due This Month</span>
                    </div>
                    <span className="font-medium">{dueThisMonthItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm">On Schedule</span>
                    </div>
                    <span className="font-medium">{compliantItems.length}</span>
                  </div>
                  {naItems.length > 0 && (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-gray-400" />
                        <span className="text-sm">N/A (Excluded)</span>
                      </div>
                      <span className="font-medium text-muted-foreground">{naItems.length}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex items-center justify-between font-medium">
                    <span>Active Items</span>
                    <span>{activeItems.length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Category Breakdown */}
            <Card data-testid="card-category-breakdown">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Layers className="w-4 h-4" />
                  By Category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(categoryBreakdown).slice(0, 6).map(([category, count]) => (
                    <div key={category} className="flex items-center justify-between">
                      <span className="text-sm capitalize">{formatCategoryName(category)}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                  {Object.keys(categoryBreakdown).length === 0 && (
                    <p className="text-sm text-muted-foreground">No items to display</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Priority Breakdown */}
            <Card data-testid="card-priority-breakdown">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Flag className="w-4 h-4" />
                  By Priority
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {['critical', 'high', 'medium', 'low'].map(priority => (
                    <div key={priority} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          priority === 'critical' ? 'bg-red-600' :
                          priority === 'high' ? 'bg-orange-500' :
                          priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                        }`} />
                        <span className="text-sm capitalize">{priority}</span>
                      </div>
                      <Badge variant="outline">{priorityBreakdown[priority] || 0}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Photo Evidence */}
            <Card data-testid="card-photo-evidence">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Camera className="w-4 h-4" />
                  Photo Evidence
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Photos Required</span>
                    <span className="font-medium">{photoRequiredItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Photos Captured</span>
                    <span className="font-medium">{photoCompletedItems.length}</span>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Compliance Rate</span>
                      <span className="font-medium">{photoComplianceRate}%</span>
                    </div>
                    <Progress value={photoComplianceRate} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contractor Coverage */}
            <Card data-testid="card-contractor-coverage">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Wrench className="w-4 h-4" />
                  Contractor Coverage
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Items with Contractor</span>
                    <span className="font-medium">{itemsWithContractor.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Unassigned Items</span>
                    <span className="font-medium">{filteredInspections.length - itemsWithContractor.length}</span>
                  </div>
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Coverage Rate</span>
                      <span className="font-medium">{contractorCoverage}%</span>
                    </div>
                    <Progress value={contractorCoverage} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* N/A Items */}
            <Card data-testid="card-na-items">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Not Applicable Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marked as N/A</span>
                    <span className="font-medium">{naItems.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Active Items</span>
                    <span className="font-medium">{filteredInspections.length - naItems.length}</span>
                  </div>
                  {naItems.length > 0 && (
                    <>
                      <Separator />
                      <p className="text-xs text-muted-foreground">
                        Items marked N/A are excluded from compliance calculations
                      </p>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Properties Tab */}
        <TabsContent value="properties" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Property Portfolio</CardTitle>
                  <CardDescription>Status of all properties under management</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 mb-6">
                {/* Property Type Breakdown */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    By Type
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(propertyTypeBreakdown).map(([type, count]) => (
                      <div key={type} className="flex items-center justify-between">
                        <span className="text-sm capitalize">{type}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Country Breakdown */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Globe className="w-4 h-4" />
                    By Country
                  </h4>
                  <div className="space-y-2">
                    {Object.entries(countryBreakdown).map(([country, count]) => (
                      <div key={country} className="flex items-center justify-between">
                        <span className="text-sm">{country}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="p-4 rounded-lg border">
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Quick Stats
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Total Properties</span>
                      <span className="font-medium">{filteredProperties.length}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Active</span>
                      <span className="font-medium">{filteredProperties.filter(p => p.isActive).length}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Property List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-3">
                  {filteredProperties.map(property => {
                    const propertyItems = upcomingInspections?.filter(item => item.propertyId === property.id) || [];
                    const propOverdueDate = overduePropertyMap.get(property.id);
                    const propertyOverdue = propertyItems.filter(item => {
                      if (item.isNotApplicable) return false;
                      if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) return true;
                      if (!item.isCompleted && propOverdueDate) {
                        const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
                        if (!lastInsp || lastInsp < propOverdueDate) return true;
                      }
                      return false;
                    });
                    const propertyDueSoon = propertyItems.filter(item => {
                      if (!item.nextInspectionDate) return false;
                      const date = parseISO(item.nextInspectionDate);
                      return !isBefore(date, today) && isBefore(date, sevenDaysFromNow);
                    });
                    const propertyScore = propertyItems.length > 0
                      ? Math.round(((propertyItems.length - propertyOverdue.length) / propertyItems.length) * 100)
                      : 100;

                    return (
                      <div 
                        key={property.id}
                        className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => navigateToProperty(property.id)}
                        data-testid={`property-row-${property.id}`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{property.address}</p>
                            <Badge variant="outline" className="capitalize">{property.propertyType}</Badge>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {property.country || 'Unknown'}
                            </span>
                            <span>{propertyItems.length} items</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {propertyOverdue.length > 0 && (
                            <Badge variant="destructive">{propertyOverdue.length} overdue</Badge>
                          )}
                          {propertyDueSoon.length > 0 && (
                            <Badge variant="secondary">{propertyDueSoon.length} due soon</Badge>
                          )}
                          {propertyOverdue.length === 0 && propertyDueSoon.length === 0 && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Compliant
                            </Badge>
                          )}
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                            propertyScore >= 80 ? 'bg-green-100 text-green-700' :
                            propertyScore >= 60 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {propertyScore}
                          </div>
                          <ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </div>
                    );
                  })}
                  {filteredProperties.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <Building className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No properties found</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Inspections Tab */}
        <TabsContent value="inspections" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Overdue Items */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    Overdue Items ({overdueItems.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={navigateToCalendar}>
                    View All
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {overdueItems.length > 0 ? (
                    <div className="space-y-2">
                      {overdueItems.slice(0, 10).map(item => {
                        const daysOverdue = item.nextInspectionDate 
                          ? differenceInDays(today, parseISO(item.nextInspectionDate))
                          : 0;
                        return (
                          <div 
                            key={item.id}
                            className="p-3 rounded-lg bg-red-50 border border-red-200 cursor-pointer hover:bg-red-100 transition-colors"
                            onClick={() => item.propertyId && navigateToProperty(item.propertyId)}
                            data-testid={`overdue-item-${item.id}`}
                          >
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-red-800">{item.itemName}</p>
                              <Badge variant="destructive">{daysOverdue}d overdue</Badge>
                            </div>
                            <p className="text-sm text-red-600 mt-1">
                              {item.roomName} • {item.propertyAddress}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-green-600" />
                      <p className="font-medium text-green-600">No overdue items!</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Due Soon Items */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-600" />
                    Due This Week ({dueSoonItems.length})
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={navigateToCalendar}>
                    View All
                    <ExternalLink className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  {dueSoonItems.length > 0 ? (
                    <div className="space-y-2">
                      {dueSoonItems.slice(0, 10).map(item => (
                        <div 
                          key={item.id}
                          className="p-3 rounded-lg bg-orange-50 border border-orange-200 cursor-pointer hover:bg-orange-100 transition-colors"
                          onClick={() => item.propertyId && navigateToProperty(item.propertyId)}
                          data-testid={`due-soon-item-${item.id}`}
                        >
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-orange-800">{item.itemName}</p>
                            <Badge variant="secondary">
                              {item.nextInspectionDate && format(parseISO(item.nextInspectionDate), 'MMM d')}
                            </Badge>
                          </div>
                          <p className="text-sm text-orange-600 mt-1">
                            {item.roomName} • {item.propertyAddress}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                      <p className="text-muted-foreground">No items due this week</p>
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming 30 Days */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Upcoming 30 Days ({dueThisMonthItems.length} items)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[300px]">
                {dueThisMonthItems.length > 0 ? (
                  <div className="space-y-2">
                    {dueThisMonthItems.map(item => (
                      <div 
                        key={item.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                        onClick={() => item.propertyId && navigateToProperty(item.propertyId)}
                        data-testid={`upcoming-item-${item.id}`}
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.itemName}</p>
                          <p className="text-sm text-muted-foreground">
                            {item.roomName} • {item.propertyAddress}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {item.nextInspectionDate && (
                            <span className="text-sm text-muted-foreground">
                              {format(parseISO(item.nextInspectionDate), 'MMM d, yyyy')}
                            </span>
                          )}
                          <Badge variant="outline">Scheduled</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No upcoming inspections in the next 30 days</p>
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{compliantItems.length}</p>
                    <p className="text-sm text-green-700">Compliant Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{dueSoonItems.length + dueThisMonthItems.length}</p>
                    <p className="text-sm text-orange-700">Due Soon (30 days)</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{overdueItems.length}</p>
                    <p className="text-sm text-red-700">Overdue Items</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Compliance by Country */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="w-5 h-5" />
                Compliance by Country Standard
              </CardTitle>
              <CardDescription>
                Properties are inspected according to their country's regulations
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(countryBreakdown).map(([country, count]) => {
                  const countryPropertyIds = filteredProperties
                    .filter(p => (p.country || 'Unknown') === country)
                    .map(p => p.id);
                  const countryItems = filteredInspections.filter(item => 
                    countryPropertyIds.includes(item.propertyId || 0)
                  );
                  const countryOverdue = countryItems.filter(item => {
                    if (item.isNotApplicable) return false;
                    if (item.nextInspectionDate && isBefore(parseISO(item.nextInspectionDate), today)) return true;
                    if (!item.isCompleted && item.propertyId) {
                      const pd = overduePropertyMap.get(item.propertyId);
                      if (pd) {
                        const li = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
                        if (!li || li < pd) return true;
                      }
                    }
                    return false;
                  });
                  const complianceRate = countryItems.length > 0
                    ? Math.round(((countryItems.length - countryOverdue.length) / countryItems.length) * 100)
                    : 100;

                  return (
                    <div key={country} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Flag className="w-4 h-4" />
                          <span className="font-medium">{country}</span>
                        </div>
                        <Badge variant="outline">{count} properties</Badge>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span>Compliance Rate</span>
                          <span className={complianceRate >= 80 ? 'text-green-600' : complianceRate >= 60 ? 'text-yellow-600' : 'text-red-600'}>
                            {complianceRate}%
                          </span>
                        </div>
                        <Progress value={complianceRate} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{countryItems.length} items</span>
                          <span>{countryOverdue.length} overdue</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contractors Tab */}
        <TabsContent value="contractors" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Users className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold">{contractors?.length || 0}</p>
                    <p className="text-sm text-muted-foreground">Total Contractors</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Award className="w-8 h-8 text-yellow-600" />
                  <div>
                    <p className="text-2xl font-bold">
                      {contractors?.filter(c => c.isPreferred).length || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Preferred</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Target className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold">{contractorCoverage}%</p>
                    <p className="text-sm text-muted-foreground">Coverage Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Trade Categories */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Wrench className="w-5 h-5" />
                    Contractors by Trade
                  </CardTitle>
                  <CardDescription>Available contractors for each trade category</CardDescription>
                </div>
                <Button variant="outline" onClick={navigateToContractors}>
                  Manage Contractors
                  <ExternalLink className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {['plumbing', 'electrical', 'hvac', 'gas', 'roofing', 'pest_control', 'fire_safety', 'general'].map(trade => {
                  const tradeContractors = contractors?.filter(c => c.tradeCategory === trade) || [];
                  const preferred = tradeContractors.filter(c => c.isPreferred);
                  
                  return (
                    <div key={trade} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize">{formatCategoryName(trade)}</span>
                        <Badge variant={tradeContractors.length > 0 ? 'default' : 'secondary'}>
                          {tradeContractors.length}
                        </Badge>
                      </div>
                      {tradeContractors.length > 0 ? (
                        <div className="text-sm text-muted-foreground">
                          {preferred.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Award className="w-3 h-3 text-yellow-500" />
                              {preferred.length} preferred
                            </span>
                          )}
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">No contractors</p>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Certificates Tab */}
        <TabsContent value="certificates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{validCertificates.length}</p>
                    <p className="text-sm text-green-700">Valid Certificates</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-orange-50 border-orange-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <Clock className="w-8 h-8 text-orange-600" />
                  <div>
                    <p className="text-2xl font-bold text-orange-600">{expiringCertificates.length}</p>
                    <p className="text-sm text-orange-700">Expiring Soon</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-8 h-8 text-red-600" />
                  <div>
                    <p className="text-2xl font-bold text-red-600">{expiredCertificates.length}</p>
                    <p className="text-sm text-red-700">Expired</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Certificate Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileCheck className="w-5 h-5" />
                Certificates by Type
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {Object.entries(certificateTypeBreakdown).map(([type, count]) => {
                  const typeCerts = filteredCertificates.filter(c => c.certificateType === type);
                  const expired = typeCerts.filter(c => c.expiryDate && isBefore(parseISO(c.expiryDate), today));
                  const expiring = typeCerts.filter(c => {
                    if (!c.expiryDate) return false;
                    const date = parseISO(c.expiryDate);
                    return !isBefore(date, today) && isBefore(date, thirtyDaysFromNow);
                  });

                  return (
                    <div key={type} className="p-4 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium capitalize text-sm">{formatCategoryName(type)}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                      <div className="flex gap-2 text-xs">
                        {expired.length > 0 && (
                          <span className="text-red-600">{expired.length} expired</span>
                        )}
                        {expiring.length > 0 && (
                          <span className="text-orange-600">{expiring.length} expiring</span>
                        )}
                        {expired.length === 0 && expiring.length === 0 && (
                          <span className="text-green-600">All valid</span>
                        )}
                      </div>
                    </div>
                  );
                })}
                {Object.keys(certificateTypeBreakdown).length === 0 && (
                  <div className="col-span-full text-center py-8 text-muted-foreground">
                    <FileCheck className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No certificates found</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Expiring Certificates List */}
          {(expiringCertificates.length > 0 || expiredCertificates.length > 0) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-600">
                  <AlertTriangle className="w-5 h-5" />
                  Certificates Requiring Attention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[300px]">
                  <div className="space-y-2">
                    {[...expiredCertificates, ...expiringCertificates].map(cert => {
                      const isExpired = cert.expiryDate && isBefore(parseISO(cert.expiryDate), today);
                      const daysUntil = cert.expiryDate 
                        ? differenceInDays(parseISO(cert.expiryDate), today)
                        : 0;

                      return (
                        <div 
                          key={cert.id}
                          className={`p-3 rounded-lg border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className={`font-medium ${isExpired ? 'text-red-800' : 'text-orange-800'}`}>
                                {cert.certificateName}
                              </p>
                              <p className={`text-sm ${isExpired ? 'text-red-600' : 'text-orange-600'}`}>
                                {formatCategoryName(cert.certificateType)}
                              </p>
                            </div>
                            <Badge variant={isExpired ? 'destructive' : 'secondary'}>
                              {isExpired ? `Expired ${Math.abs(daysUntil)}d ago` : `Expires in ${daysUntil}d`}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
