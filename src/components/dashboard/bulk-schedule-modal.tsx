import { useState, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Property, PropertyRoom, InspectionItem } from '@shared/schema';
import { Calendar, CheckSquare, AlertCircle, Filter, Search, Home, Settings } from 'lucide-react';

const bulkScheduleSchema = z.object({
  propertyIds: z.array(z.number()).min(1, 'Select at least one property'),
  maintenanceType: z.string().min(1, 'Select maintenance type'),
  frequency: z.string().min(1, 'Select frequency'),
  priority: z.string().min(1, 'Select priority'),
  roomType: z.string().optional(),
  inspectionCategory: z.string().optional(),
});

type BulkScheduleForm = z.infer<typeof bulkScheduleSchema>;

const complianceMaintenanceTypes = [
  {
    value: 'pool_compliance',
    label: 'Pool Compliance Certificate',
    description: 'Annual pool safety inspection and certification',
    frequency: 'annual',
    priority: 'high',
    category: 'compliance',
  },
  {
    value: 'gas_compliance',
    label: 'Gas Compliance Certificate',
    description: 'Bi-annual gas appliance safety check',
    frequency: 'biannual',
    priority: 'critical',
    category: 'compliance',
  },
  {
    value: 'electrical_testing',
    label: 'Tag & Test Electrical Appliances',
    description: 'Annual electrical safety testing of appliances',
    frequency: 'annual',
    priority: 'high',
    category: 'safety',
  },
  {
    value: 'water_filter_service',
    label: 'House Water Filter Service',
    description: 'Replace water filters and system maintenance',
    frequency: 'quarterly',
    priority: 'medium',
    category: 'maintenance',
  },
  {
    value: 'smoke_alarm_testing',
    label: 'Smoke Alarm Testing',
    description: 'Test and replace smoke alarm batteries',
    frequency: 'biannual',
    priority: 'critical',
    category: 'safety',
  },
  {
    value: 'hvac_service',
    label: 'HVAC System Service',
    description: 'Clean filters, check system performance',
    frequency: 'biannual',
    priority: 'high',
    category: 'maintenance',
  },
  {
    value: 'roof_gutter_inspection',
    label: 'Roof & Gutter Inspection',
    description: 'Check roof condition and clean gutters',
    frequency: 'biannual',
    priority: 'medium',
    category: 'exterior',
  },
  {
    value: 'pest_inspection',
    label: 'Pest Inspection',
    description: 'Professional pest inspection and treatment',
    frequency: 'annual',
    priority: 'medium',
    category: 'inspection',
  },
];

// Room-based maintenance types
const roomBasedMaintenanceTypes = [
  {
    value: 'room_inspection_all',
    label: 'Complete Room Inspection',
    description: 'Comprehensive inspection of all items in selected room types',
    frequency: 'quarterly',
    priority: 'medium',
    category: 'room_based',
    requiresRoom: true,
  },
  {
    value: 'room_maintenance_plumbing',
    label: 'Plumbing Maintenance (Room-Specific)',
    description: 'Check all plumbing-related items in rooms (taps, toilets, drains)',
    frequency: 'quarterly',
    priority: 'high',
    category: 'room_based',
    requiresRoom: true,
    inspectionCategory: 'plumbing',
  },
  {
    value: 'room_maintenance_electrical',
    label: 'Electrical Safety Check (Room-Specific)',
    description: 'Test electrical outlets, switches, and fixtures in rooms',
    frequency: 'biannual',
    priority: 'high',
    category: 'room_based',
    requiresRoom: true,
    inspectionCategory: 'electrical',
  },
  {
    value: 'room_maintenance_hvac',
    label: 'HVAC System Check (Room-Specific)',
    description: 'Check air conditioning, heating, and ventilation in rooms',
    frequency: 'biannual',
    priority: 'high',
    category: 'room_based',
    requiresRoom: true,
    inspectionCategory: 'hvac',
  },
];

// Combined maintenance types
const allMaintenanceTypes = [
  ...complianceMaintenanceTypes,
  ...roomBasedMaintenanceTypes,
];

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly', days: 30 },
  { value: 'quarterly', label: 'Quarterly', days: 90 },
  { value: 'biannual', label: 'Bi-Annual', days: 180 },
  { value: 'annual', label: 'Annual', days: 365 },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const roomTypeOptions = [
  { value: 'all', label: 'All Rooms' },
  { value: 'bedroom', label: 'Bedrooms' },
  { value: 'bathroom', label: 'Bathrooms' },
  { value: 'kitchen', label: 'Kitchen' },
  { value: 'living_room', label: 'Living Room' },
  { value: 'laundry', label: 'Laundry' },
  { value: 'garage', label: 'Garage' },
  { value: 'exterior', label: 'Exterior' },
  { value: 'roof', label: 'Roof' },
  { value: 'basement', label: 'Basement' },
];

const inspectionCategoryOptions = [
  { value: 'all', label: 'All Categories' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'electrical', label: 'Electrical' },
  { value: 'structural', label: 'Structural' },
  { value: 'hvac', label: 'HVAC' },
  { value: 'fixtures', label: 'Fixtures' },
  { value: 'general', label: 'General' },
  { value: 'pest_control', label: 'Pest Control' },
];

const propertyFilterConfigs = [
  {
    id: 'propertyType',
    label: 'Property Type',
    options: [
      { value: 'all', label: 'All Types' },
      { value: 'apartment', label: 'Apartments' },
      { value: 'house', label: 'Houses' },
      { value: 'commercial', label: 'Commercial' },
    ]
  },
  {
    id: 'hasPool',
    label: 'Pool Features',
    options: [
      { value: 'all', label: 'All Properties' },
      { value: 'with_pool', label: 'Properties with Pool' },
      { value: 'no_pool', label: 'Properties without Pool' },
    ]
  },
  {
    id: 'hasLift',
    label: 'Lift/Elevator',
    options: [
      { value: 'all', label: 'All Properties' },
      { value: 'with_lift', label: 'Properties with Lift' },
      { value: 'no_lift', label: 'Properties without Lift' },
    ]
  },
  {
    id: 'hasGas',
    label: 'Gas Appliances',
    options: [
      { value: 'all', label: 'All Properties' },
      { value: 'with_gas', label: 'Properties with Gas' },
      { value: 'no_gas', label: 'Properties without Gas' },
    ]
  },
  {
    id: 'yearBuilt',
    label: 'Building Age',
    options: [
      { value: 'all', label: 'All Ages' },
      { value: 'new', label: 'Built after 2010' },
      { value: 'modern', label: 'Built 1990-2010' },
      { value: 'older', label: 'Built before 1990' },
    ]
  },
];

interface PropertyFilter {
  propertyType: string;
  hasPool: string;
  hasLift: string;
  hasGas: string;
  yearBuilt: string;
  searchText: string;
}

interface BulkScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BulkScheduleModal({ isOpen, onClose }: BulkScheduleModalProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedProperties, setSelectedProperties] = useState<number[]>([]);
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState<string>('');
  const [selectedRoomType, setSelectedRoomType] = useState<string>('all');
  const [selectedInspectionCategory, setSelectedInspectionCategory] = useState<string>('all');
  const [propertyFilters, setPropertyFilters] = useState<PropertyFilter>({
    propertyType: 'all',
    hasPool: 'all',
    hasLift: 'all',
    hasGas: 'all',
    yearBuilt: 'all',
    searchText: '',
  });

  const { data: allProperties, isLoading } = useQuery({
    queryKey: ['/api/properties', user?.agencyId],
    queryFn: async () => {
      if (!user?.agencyId) throw new Error('No agency ID');
      const response = await authenticatedApiRequest('GET', `/api/properties/${user.agencyId}`);
      return response.json() as Promise<Property[]>;
    },
    enabled: !!user?.agencyId && isOpen,
  });

  // Filter properties based on selected criteria
  const filteredProperties = useMemo(() => {
    if (!allProperties) return [];

    return allProperties.filter((property) => {
      // Property type filter
      if (propertyFilters.propertyType !== 'all' && property.propertyType !== propertyFilters.propertyType) {
        return false;
      }

      // Search text filter
      if (propertyFilters.searchText) {
        const searchLower = propertyFilters.searchText.toLowerCase();
        const matchesSearch = 
          property.name.toLowerCase().includes(searchLower) ||
          property.address.toLowerCase().includes(searchLower) ||
          (property.unitNumber && property.unitNumber.toLowerCase().includes(searchLower));
        if (!matchesSearch) return false;
      }

      // Pool filter (based on special instructions or property features)
      if (propertyFilters.hasPool !== 'all') {
        const hasPool = property.specialInstructions?.toLowerCase().includes('pool') || 
                       property.specialInstructions?.toLowerCase().includes('swimming');
        if (propertyFilters.hasPool === 'with_pool' && !hasPool) return false;
        if (propertyFilters.hasPool === 'no_pool' && hasPool) return false;
      }

      // Lift filter (typically for apartments or commercial buildings)
      if (propertyFilters.hasLift !== 'all') {
        const hasLift = property.specialInstructions?.toLowerCase().includes('lift') || 
                       property.specialInstructions?.toLowerCase().includes('elevator') ||
                       (property.propertyType === 'apartment' && (property.yearBuilt || 0) > 1980);
        if (propertyFilters.hasLift === 'with_lift' && !hasLift) return false;
        if (propertyFilters.hasLift === 'no_lift' && hasLift) return false;
      }

      // Gas filter
      if (propertyFilters.hasGas !== 'all') {
        const hasGas = property.specialInstructions?.toLowerCase().includes('gas') || 
                      property.propertyType === 'house' || // Assume houses typically have gas
                      property.propertyType === 'commercial';
        if (propertyFilters.hasGas === 'with_gas' && !hasGas) return false;
        if (propertyFilters.hasGas === 'no_gas' && hasGas) return false;
      }

      // Year built filter
      if (propertyFilters.yearBuilt !== 'all' && property.yearBuilt) {
        const year = property.yearBuilt;
        if (propertyFilters.yearBuilt === 'new' && year <= 2010) return false;
        if (propertyFilters.yearBuilt === 'modern' && (year < 1990 || year > 2010)) return false;
        if (propertyFilters.yearBuilt === 'older' && year >= 1990) return false;
      }

      return true;
    });
  }, [allProperties, propertyFilters]);

  const form = useForm<BulkScheduleForm>({
    resolver: zodResolver(bulkScheduleSchema),
    defaultValues: {
      propertyIds: [],
      maintenanceType: '',
      frequency: '',
      priority: '',
      roomType: 'all',
      inspectionCategory: 'all',
    },
  });

  const bulkScheduleMutation = useMutation({
    mutationFn: async (data: BulkScheduleForm) => {
      const selectedType = allMaintenanceTypes.find(t => t.value === data.maintenanceType);
      if (!selectedType) throw new Error('Invalid maintenance type');

      const scheduleDate = new Date();
      scheduleDate.setDate(scheduleDate.getDate() + 7); // Start in 7 days

      const dueDate = new Date(scheduleDate);
      const frequencyDays = frequencyOptions.find(f => f.value === data.frequency)?.days || 30;
      dueDate.setDate(dueDate.getDate() + 14); // 2 weeks to complete

      const tasks = data.propertyIds.map(propertyId => ({
        agencyId: user?.agencyId || 0,
        propertyId,
        title: selectedType.label,
        description: selectedType.description,
        category: selectedType.category,
        priority: data.priority,
        status: 'scheduled',
        scheduledDate: scheduleDate.toISOString(),
        dueDate: dueDate.toISOString(),
        estimatedDuration: 120, // 2 hours default
      }));

      // Create all tasks in parallel
      const responses = await Promise.all(
        tasks.map(task => 
          authenticatedApiRequest('POST', '/api/maintenance-tasks', task)
        )
      );

      return responses;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/maintenance-tasks'] });
      queryClient.invalidateQueries({ queryKey: ['/api/dashboard/metrics'] });
      
      toast({
        title: 'Success',
        description: `Successfully scheduled ${data.length} maintenance tasks`,
      });
      
      onClose();
      form.reset();
      setSelectedProperties([]);
      setSelectedMaintenanceType('');
      setPropertyFilters({
        propertyType: 'all',
        hasPool: 'all',
        hasLift: 'all',
        hasGas: 'all',
        yearBuilt: 'all',
        searchText: '',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to schedule maintenance tasks',
        variant: 'destructive',
      });
    },
  });

  const onSubmit = (data: BulkScheduleForm) => {
    bulkScheduleMutation.mutate(data);
  };

  const togglePropertySelection = (propertyId: number) => {
    setSelectedProperties(prev => {
      const updated = prev.includes(propertyId)
        ? prev.filter(id => id !== propertyId)
        : [...prev, propertyId];
      form.setValue('propertyIds', updated);
      return updated;
    });
  };

  const selectAllProperties = () => {
    if (!filteredProperties) return;
    const allIds = filteredProperties.map(p => p.id);
    setSelectedProperties(allIds);
    form.setValue('propertyIds', allIds);
  };

  const selectAllFiltered = () => {
    if (!filteredProperties) return;
    const filteredIds = filteredProperties.map(p => p.id);
    setSelectedProperties(filteredIds);
    form.setValue('propertyIds', filteredIds);
  };

  const clearSelection = () => {
    setSelectedProperties([]);
    form.setValue('propertyIds', []);
  };

  const updateFilter = (key: keyof PropertyFilter, value: string) => {
    setPropertyFilters(prev => ({ ...prev, [key]: value }));
    // Clear selection when filters change
    setSelectedProperties([]);
    form.setValue('propertyIds', []);
  };

  const clearAllFilters = () => {
    setPropertyFilters({
      propertyType: 'all',
      hasPool: 'all',
      hasLift: 'all',
      hasGas: 'all',
      yearBuilt: 'all',
      searchText: '',
    });
    setSelectedProperties([]);
    form.setValue('propertyIds', []);
  };

  const selectedType = complianceMaintenanceTypes.find(t => t.value === selectedMaintenanceType);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading properties...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Calendar className="w-5 h-5 mr-2" />
            Bulk Schedule Maintenance
          </DialogTitle>
          <DialogDescription>
            Schedule maintenance tasks across multiple properties simultaneously
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Property Selection */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center">
                    <Filter className="w-5 h-5 mr-2" />
                    Filter & Select Properties
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={selectAllFiltered}
                    >
                      Select Filtered
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                
                {/* Filter Controls */}
                <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search by name, address, or unit..."
                      value={propertyFilters.searchText}
                      onChange={(e) => updateFilter('searchText', e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {/* Filter Dropdowns */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    {propertyFilterConfigs.map((filterConfig) => (
                      <div key={filterConfig.id} className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">
                          {filterConfig.label}
                        </label>
                        <Select
                          value={propertyFilters[filterConfig.id as keyof PropertyFilter] as string}
                          onValueChange={(value) => updateFilter(filterConfig.id as keyof PropertyFilter, value)}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {filterConfig.options.map((option) => (
                              <SelectItem key={option.value} value={option.value}>
                                <span className="text-sm">{option.label}</span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={clearAllFilters}
                      className="text-gray-500 hover:text-gray-700"
                    >
                      Clear All Filters
                    </Button>
                    <div className="text-sm text-gray-600">
                      {filteredProperties.length} of {allProperties?.length || 0} properties shown
                    </div>
                  </div>
                </div>

                {selectedProperties.length > 0 && (
                  <Badge variant="secondary" className="mt-2">
                    {selectedProperties.length} properties selected
                  </Badge>
                )}
              </CardHeader>
              <CardContent>
                {filteredProperties && filteredProperties.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
                    {filteredProperties.map((property) => (
                      <div
                        key={property.id}
                        className={`flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-colors ${
                          selectedProperties.includes(property.id)
                            ? 'bg-primary/10 border-primary'
                            : 'bg-gray-50 hover:bg-gray-100'
                        }`}
                        onClick={() => togglePropertySelection(property.id)}
                      >
                        <Checkbox
                          checked={selectedProperties.includes(property.id)}
                          onChange={() => togglePropertySelection(property.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{property.name}</p>
                          <p className="text-xs text-gray-500 truncate">{property.address}</p>
                          <Badge variant="outline" className="text-xs mt-1">
                            {property.propertyType}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500">No properties available</p>
                    <p className="text-sm text-gray-400">Add properties first to schedule maintenance</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Maintenance Type Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Maintenance Type</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="maintenanceType"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Select
                          onValueChange={(value) => {
                            field.onChange(value);
                            setSelectedMaintenanceType(value);
                            // Auto-fill recommended frequency and priority
                            const type = complianceMaintenanceTypes.find(t => t.value === value);
                            if (type) {
                              form.setValue('frequency', type.frequency);
                              form.setValue('priority', type.priority);
                            }
                          }}
                          defaultValue={field.value}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select maintenance type" />
                          </SelectTrigger>
                          <SelectContent>
                            {allMaintenanceTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                <div className="flex flex-col">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium">{type.label}</span>
                                    {type.category === 'room_based' && (
                                      <Badge variant="outline" className="text-xs">
                                        <Home className="w-3 h-3 mr-1" />
                                        Room-Based
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-sm text-gray-500">{type.description}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {selectedType && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">{selectedType.label}</h4>
                    <p className="text-sm text-blue-700 mb-2">{selectedType.description}</p>
                    <div className="flex items-center space-x-4 text-xs">
                      <Badge variant="secondary">Category: {selectedType.category}</Badge>
                      <Badge variant="secondary">Recommended: {selectedType.frequency}</Badge>
                      <Badge 
                        className={
                          selectedType.priority === 'critical' ? 'bg-red-100 text-red-800' :
                          selectedType.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                          'bg-blue-100 text-blue-800'
                        }
                      >
                        Priority: {selectedType.priority}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Room-Based Maintenance Options */}
                {selectedType?.category === 'room_based' && (
                  <div className="mt-4 space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h5 className="font-medium flex items-center">
                      <Settings className="w-4 h-4 mr-2" />
                      Room-Based Options
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="roomType"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Room Types</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedRoomType(value);
                                }}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select room types" />
                                </SelectTrigger>
                                <SelectContent>
                                  {roomTypeOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="inspectionCategory"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Inspection Category</FormLabel>
                            <FormControl>
                              <Select
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  setSelectedInspectionCategory(value);
                                }}
                                defaultValue={field.value}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                                <SelectContent>
                                  {inspectionCategoryOptions.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                      <p className="font-medium mb-1">Room-Based Maintenance</p>
                      <p>
                        This will create maintenance tasks for {selectedRoomType === 'all' ? 'all room types' : roomTypeOptions.find(r => r.value === selectedRoomType)?.label.toLowerCase()} 
                        {selectedInspectionCategory !== 'all' && (
                          <span> focusing on {inspectionCategoryOptions.find(c => c.value === selectedInspectionCategory)?.label.toLowerCase()} items</span>
                        )} 
                        in the selected properties.
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Schedule Settings */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Frequency</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                        <SelectContent>
                          {frequencyOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                        <SelectContent>
                          {priorityOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              <div className="flex items-center">
                                <Badge className={`${option.color} mr-2`}>
                                  {option.label}
                                </Badge>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Summary */}
            {selectedProperties.length > 0 && selectedMaintenanceType && (
              <Card className="bg-green-50">
                <CardHeader>
                  <CardTitle className="text-lg text-green-900 flex items-center">
                    <CheckSquare className="w-5 h-5 mr-2" />
                    Schedule Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-sm">
                  <p className="text-green-800">
                    You're about to schedule <strong>{selectedType?.label}</strong> for{' '}
                    <strong>{selectedProperties.length} properties</strong>.
                  </p>
                  <p className="text-green-700 mt-1">
                    Tasks will be scheduled to start in 7 days with a 2-week completion deadline.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={bulkScheduleMutation.isPending || selectedProperties.length === 0}
              >
                {bulkScheduleMutation.isPending ? 'Scheduling...' : 'Schedule Tasks'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}