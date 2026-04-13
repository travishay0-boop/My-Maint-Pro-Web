import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation, Link } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { authenticatedApiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPropertySchema, type Property, type InsertProperty } from '@shared/schema';
import { detectCountryFromAddress } from '@shared/compliance-standards';
import { format } from 'date-fns';
import PropertyRoomsModal from '@/components/property/property-rooms-modal';
import PropertyLocationFinder from '@/components/property/property-location-finder';
import { 
  Plus, 
  Search, 
  Home,
  Camera, 
  MapPin, 
  User, 
  Settings,
  Filter,
  Navigation,
  Map,
  Edit,
  Pencil,
  Trash2,
  Calendar,
  Building,
  Clock,
  AlertTriangle
} from 'lucide-react';

export default function Properties() {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [showLocationView, setShowLocationView] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<Property | null>(null);

  // Structured address sub-fields (combined into single address string on submit)
  const [addAddressParts, setAddAddressParts] = useState({ street: '', suburb: '', stateRegion: '', postcode: '' });
  const [editAddressParts, setEditAddressParts] = useState({ street: '', suburb: '', stateRegion: '', postcode: '' });

  const ADDRESS_STATE_OPTIONS: Record<string, { label: string; options: string[] }> = {
    AU: { label: 'State / Territory', options: ['ACT', 'NSW', 'NT', 'QLD', 'SA', 'TAS', 'VIC', 'WA'] },
    US: { label: 'State', options: ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'] },
    GB: { label: 'County / Region', options: ['England', 'Scotland', 'Wales', 'Northern Ireland'] },
    NZ: { label: 'Region', options: ['Auckland', 'Bay of Plenty', 'Canterbury', 'Gisborne', "Hawke's Bay", 'Manawatu-Whanganui', 'Marlborough', 'Nelson', 'Northland', 'Otago', 'Southland', 'Taranaki', 'Tasman', 'Waikato', 'Wellington', 'West Coast'] },
    CA: { label: 'Province / Territory', options: ['AB', 'BC', 'MB', 'NB', 'NL', 'NS', 'NT', 'NU', 'ON', 'PE', 'QC', 'SK', 'YT'] },
  };
  const ADDRESS_SUBURB_LABEL: Record<string, string> = { AU: 'Suburb', US: 'City', GB: 'City / Town', NZ: 'Suburb / Town', CA: 'City' };
  const ADDRESS_POSTCODE_LABEL: Record<string, string> = { AU: 'Postcode', US: 'ZIP Code', GB: 'Postcode', NZ: 'Postcode', CA: 'Postal Code' };

  function assembleAddress(parts: { street: string; suburb: string; stateRegion: string; postcode: string }) {
    const statePostcode = [parts.stateRegion, parts.postcode].filter(Boolean).join(' ');
    return [parts.street, parts.suburb, statePostcode].filter(Boolean).join(', ');
  }

  function parseAddressParts(address: string) {
    const parts = address.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const street = parts[0];
      const suburb = parts[1];
      const lastPart = parts[parts.length - 1].trim();
      const lastSpaceIdx = lastPart.lastIndexOf(' ');
      let stateRegion = lastPart;
      let postcode = '';
      if (lastSpaceIdx > -1) {
        const potentialPostcode = lastPart.substring(lastSpaceIdx + 1);
        if (/^[A-Z0-9]{3,10}$/.test(potentialPostcode)) {
          stateRegion = lastPart.substring(0, lastSpaceIdx);
          postcode = potentialPostcode;
        }
      }
      return { street, suburb, stateRegion, postcode };
    } else if (parts.length === 2) {
      return { street: parts[0], suburb: parts[1], stateRegion: '', postcode: '' };
    }
    return { street: address, suburb: '', stateRegion: '', postcode: '' };
  }

  // Auto-open add dialog when ?add=true is in URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('add') === 'true') {
      setIsAddDialogOpen(true);
      // Clean up URL without page refresh
      window.history.replaceState({}, '', '/properties');
    }
  }, []);



  // Use server-authoritative endpoint — works even when user.agencyId is stale/null in localStorage
  const { data: properties, isLoading } = useQuery({
    queryKey: ['/api/my-properties'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/my-properties');
      return await response.json() as Property[];
    },
  });

  // Fetch inspection completion ratios for all properties
  const { data: inspectionRatios } = useQuery({
    queryKey: ['/api/my-properties', 'inspection-ratios'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', '/api/my-properties/inspection-ratios');
      return await response.json() as { propertyId: number; completedCount: number; totalCount: number; completionRatio: number }[];
    },
  });

  // Fetch inspection periods with completion status (per-agency)
  const { data: inspectionPeriods } = useQuery({
    queryKey: ['/api/properties', user?.agencyId, 'inspection-periods'],
    queryFn: async () => {
      if (!user?.agencyId) return [];
      const response = await authenticatedApiRequest('GET', `/api/properties/${user.agencyId}/inspection-periods`);
      return await response.json() as Array<{
        propertyId: number;
        periods: Array<{
          id: number;
          periodName: string;
          startDate: string;
          endDate: string;
          dueDate: string;
          status: string;
          completedItems: number;
          totalItems: number;
          completionRatio: number;
        }>;
      }>;
    },
    enabled: !!user?.agencyId,
  });

  const addPropertyMutation = useMutation({
    mutationFn: async (propertyData: InsertProperty) => {
      const response = await authenticatedApiRequest('POST', '/api/properties', propertyData);
      return response.json();
    },
    onSuccess: async (data) => {
      // Refresh properties list (server-authoritative endpoint)
      queryClient.invalidateQueries({ queryKey: ['/api/my-properties'] });
      // Also refresh user so agencyId gets updated in auth context (in case it was just created)
      try {
        const meRes = await authenticatedApiRequest('GET', '/api/user/me');
        const freshUser = await meRes.json();
        if (freshUser?.agencyId && freshUser.agencyId !== user?.agencyId) {
          updateUser({ agencyId: freshUser.agencyId });
        }
      } catch { /* non-critical */ }
      toast({
        title: 'Success',
        description: 'Property added successfully',
      });
      setIsAddDialogOpen(false);
      form.reset();
      setAddAddressParts({ street: '', suburb: '', stateRegion: '', postcode: '' });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to add property',
        variant: 'destructive',
      });
    },
  });

  const updatePropertyMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<InsertProperty> }) => {
      const response = await authenticatedApiRequest('PATCH', `/api/properties/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-properties'] });
      toast({
        title: 'Success',
        description: 'Property updated successfully',
      });
      setIsEditDialogOpen(false);
      setEditingProperty(null);
      editForm.reset();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: 'Failed to update property',
        variant: 'destructive',
      });
    },
  });

  const deletePropertyMutation = useMutation({
    mutationFn: async (propertyId: number) => {
      const response = await authenticatedApiRequest('DELETE', `/api/properties/${propertyId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/my-properties'] });
      setDeleteDialogOpen(false);
      setPropertyToDelete(null);
      toast({
        title: "Success",
        description: "Property deleted successfully!",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive",
      });
    },
  });

  const form = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      agencyId: user?.agencyId || 0,
      name: '',
      address: '',
      country: 'AU', // Default to Australia
      stateProvince: '',
      isRentalProperty: false,
      propertyType: 'apartment',
      unitNumber: '',
      bedrooms: 0,
      bathrooms: 0,
      squareFootage: 0,
      yearBuilt: 0,
      numberOfLevels: 1,
      specialInstructions: '',
      isActive: true,
      ownerId: null,
      managerId: null,
      latitude: '',
      longitude: '',
      lastInspectionDate: new Date(), // Default to today
      nextInspectionDate: null,
      inspectionFrequencyDays: 90, // Default to quarterly (90 days)
      reportRecipients: {
        ownerEmail: true,
        managerEmail: false,
        additionalEmails: []
      },
    },
  });

  const editForm = useForm<InsertProperty>({
    resolver: zodResolver(insertPropertySchema),
    defaultValues: {
      agencyId: user?.agencyId || 0,
      name: '',
      address: '',
      country: 'AU',
      stateProvince: '',
      isRentalProperty: false,
      propertyType: 'apartment',
      unitNumber: '',
      bedrooms: 0,
      bathrooms: 0,
      squareFootage: 0,
      yearBuilt: 0,
      numberOfLevels: 1,
      specialInstructions: '',
      isActive: true,
      ownerId: null,
      managerId: null,
      latitude: '',
      longitude: '',
      lastInspectionDate: null,
      nextInspectionDate: null,
      inspectionFrequencyDays: null,
      reportRecipients: {
        ownerEmail: true,
        managerEmail: false,
        additionalEmails: []
      },
    },
  });

  // Auto-calculate next inspection date when form defaults are set
  useEffect(() => {
    const lastDate = form.getValues('lastInspectionDate');
    const frequency = form.getValues('inspectionFrequencyDays');
    
    if (lastDate && frequency && !form.getValues('nextInspectionDate')) {
      const nextDate = new Date(lastDate);
      nextDate.setDate(nextDate.getDate() + frequency);
      form.setValue('nextInspectionDate', nextDate);
    }
  }, [form]);

  const addCountry = form.watch('country') || 'AU';
  const editCountry = editForm.watch('country') || 'AU';

  // Keep the hidden address field in sync with sub-fields so Zod validation passes
  useEffect(() => {
    const assembled = assembleAddress(addAddressParts);
    if (assembled) form.setValue('address', assembled, { shouldValidate: false });
  }, [addAddressParts]);

  useEffect(() => {
    const assembled = assembleAddress(editAddressParts);
    if (assembled) editForm.setValue('address', assembled, { shouldValidate: false });
  }, [editAddressParts]);

  const onSubmit = (data: InsertProperty) => {
    const assembled = assembleAddress(addAddressParts);
    const submissionData = {
      ...data,
      address: assembled || data.address,
      agencyId: user?.agencyId || 0,
      // Derive stateProvince from the address state/region sub-field
      stateProvince: addAddressParts.stateRegion || data.stateProvince || null,
    };
    addPropertyMutation.mutate(submissionData);
  };

  const onEditSubmit = (data: InsertProperty) => {
    if (!editingProperty) return;
    const assembled = assembleAddress(editAddressParts);
    updatePropertyMutation.mutate({
      id: editingProperty.id,
      data: {
        ...data,
        address: assembled || data.address,
        agencyId: user?.agencyId || 0,
        stateProvince: editAddressParts.stateRegion || data.stateProvince || null,
        lastInspectionDate: data.lastInspectionDate ? new Date(data.lastInspectionDate) : null,
        nextInspectionDate: data.nextInspectionDate ? new Date(data.nextInspectionDate) : null,
      },
    });
  };

  const handleEdit = (property: Property) => {
    setEditingProperty(property);
    setEditAddressParts(parseAddressParts(property.address || ''));
    editForm.reset({
      agencyId: property.agencyId,
      name: property.name,
      address: property.address,
      country: property.country || 'AU',
      stateProvince: property.stateProvince || '',
      isRentalProperty: property.isRentalProperty ?? false,
      propertyType: property.propertyType as 'apartment' | 'house' | 'commercial',
      unitNumber: property.unitNumber || '',
      bedrooms: property.bedrooms || 0,
      bathrooms: property.bathrooms || 0,
      squareFootage: property.squareFootage || 0,
      yearBuilt: property.yearBuilt || 0,
      numberOfLevels: property.numberOfLevels || 1,
      specialInstructions: property.specialInstructions || '',
      isActive: property.isActive,
      ownerId: property.ownerId,
      managerId: property.managerId,
      latitude: property.latitude || '',
      longitude: property.longitude || '',
      lastInspectionDate: property.lastInspectionDate,
      nextInspectionDate: property.nextInspectionDate,
      inspectionFrequencyDays: property.inspectionFrequencyDays,
      reportRecipients: property.reportRecipients || {
        ownerEmail: true,
        managerEmail: false,
        additionalEmails: []
      },
    });
    setIsEditDialogOpen(true);
  };

  const handleDelete = (property: Property) => {
    setPropertyToDelete(property);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (propertyToDelete) {
      deletePropertyMutation.mutate(propertyToDelete.id);
    }
  };

  // Helper function to get inspection periods for a property
  const getInspectionPeriods = (propertyId: number) => {
    return inspectionPeriods?.find(data => data.propertyId === propertyId)?.periods || [];
  };

  const filteredProperties = properties?.filter(property => {
    const matchesSearch = 
      property.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (property.unitNumber && property.unitNumber.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = 
      filterType === 'all' || 
      property.propertyType === filterType;
    
    return matchesSearch && matchesType;
  }) || [];

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-2/3" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Properties</h1>
            <p className="text-gray-600">
              Manage your property portfolio ({filteredProperties.length} properties)
            </p>
          </div>
          
          <div className="flex items-center space-x-3">
            <Button
              variant={showLocationView ? "default" : "outline"}
              onClick={() => setShowLocationView(!showLocationView)}
              size="sm"
            >
              <Navigation className="w-4 h-4 mr-2" />
              {showLocationView ? 'Hide Location View' : 'Location View'}
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Property
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Add New Property</DialogTitle>
                <DialogDescription>
                  Add a new property to your portfolio
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="contents">
                  <DialogBody className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Sunset Apartments - Unit 4B" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="propertyType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Property Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="apartment">Apartment</SelectItem>
                              <SelectItem value="house">House</SelectItem>
                              <SelectItem value="commercial">Commercial</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  {/* Street Address — split into sub-fields, assembled on submit */}
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium leading-none">Street Address <span className="text-destructive">*</span></p>
                    <Input
                      placeholder="e.g. 34 Dorren Court"
                      value={addAddressParts.street}
                      onChange={e => setAddAddressParts(p => ({ ...p, street: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">Street number and name (use Unit Number field above for unit/apt)</p>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    <div className="col-span-2 space-y-1.5">
                      <p className="text-sm font-medium leading-none">{ADDRESS_SUBURB_LABEL[addCountry] || 'Suburb'} <span className="text-destructive">*</span></p>
                      <Input
                        placeholder={addCountry === 'AU' ? 'e.g. Moore Park Beach' : addCountry === 'US' ? 'e.g. Los Angeles' : 'City / Suburb'}
                        value={addAddressParts.suburb}
                        onChange={e => setAddAddressParts(p => ({ ...p, suburb: e.target.value }))}
                        onBlur={e => {
                          const candidate = [addAddressParts.street, e.target.value].filter(Boolean).join(', ');
                          if (candidate) {
                            const detected = detectCountryFromAddress(candidate);
                            if (detected !== addCountry) {
                              form.setValue('country', detected);
                              setAddAddressParts(p => ({ ...p, stateRegion: '' }));
                            }
                          }
                        }}
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <p className="text-sm font-medium leading-none">{ADDRESS_STATE_OPTIONS[addCountry]?.label || 'State'} <span className="text-destructive">*</span></p>
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        value={addAddressParts.stateRegion}
                        onChange={e => setAddAddressParts(p => ({ ...p, stateRegion: e.target.value }))}
                      >
                        <option value="">Select...</option>
                        {(ADDRESS_STATE_OPTIONS[addCountry]?.options || []).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1 space-y-1.5">
                      <p className="text-sm font-medium leading-none">{ADDRESS_POSTCODE_LABEL[addCountry] || 'Postcode'}</p>
                      <Input
                        placeholder={addCountry === 'AU' ? '4670' : addCountry === 'US' ? '90210' : ''}
                        value={addAddressParts.postcode}
                        onChange={e => setAddAddressParts(p => ({ ...p, postcode: e.target.value.toUpperCase() }))}
                        maxLength={10}
                      />
                    </div>
                  </div>

                  {form.formState.errors.address && (
                    <p className="text-xs text-destructive">{form.formState.errors.address.message}</p>
                  )}

                  <FormField
                    control={form.control}
                    name="country"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Country / Region</FormLabel>
                        <Select onValueChange={v => { field.onChange(v); setAddAddressParts(p => ({ ...p, stateRegion: '' })); }} value={field.value || ''}>
                          <FormControl>
                            <SelectTrigger data-testid="select-country">
                              <SelectValue placeholder="Select country" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="AU">Australia</SelectItem>
                            <SelectItem value="US">United States</SelectItem>
                            <SelectItem value="GB">United Kingdom</SelectItem>
                            <SelectItem value="CA">Canada</SelectItem>
                            <SelectItem value="NZ">New Zealand</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Changing country updates the state/postcode fields and compliance standards.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isRentalProperty"
                    render={({ field }) => (
                      <FormItem>
                        <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                          <div>
                            <FormLabel className="text-sm font-medium">Rental / Investment Property</FormLabel>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Enables state-specific mandatory compliance items (e.g. VIC gas/electrical safety checks, QLD smoke alarms, NSW smoke alarm obligations).
                            </p>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value ?? false}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="unitNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Unit Number (Optional)</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., 4B, 102" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="yearBuilt"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Year Built</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2020"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4">
                    <FormField
                      control={form.control}
                      name="bedrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bedrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="2"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="bathrooms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bathrooms</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="squareFootage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Square Meterage/Footage</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="1200"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="numberOfLevels"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Number of Levels/Storeys</FormLabel>
                        <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 1)}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select levels" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1">1 Storey (Single Level)</SelectItem>
                            <SelectItem value="2">2 Storey</SelectItem>
                            <SelectItem value="3">3 Storey</SelectItem>
                            <SelectItem value="4">4+ Storey</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground mt-1">
                          Rooms will be auto-assigned to floors. Ground floor items won't require window restrictors.
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Inspection Date Fields */}
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="lastInspectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Inspection Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => {
                                const newDate = e.target.value ? new Date(e.target.value) : null;
                                field.onChange(newDate);
                                
                                // Auto-calculate next inspection date if frequency is set
                                const frequency = form.getValues('inspectionFrequencyDays');
                                if (newDate && frequency) {
                                  const nextDate = new Date(newDate);
                                  nextDate.setDate(nextDate.getDate() + frequency);
                                  form.setValue('nextInspectionDate', nextDate);
                                }
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="nextInspectionDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Next Inspection Date</FormLabel>
                          <FormControl>
                            <Input 
                              type="date"
                              {...field}
                              value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                              onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="inspectionFrequencyDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspection Frequency (Days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="365 (yearly), 180 (bi-annual), 90 (quarterly)"
                            {...field}
                            value={field.value || ''}
                            onChange={(e) => {
                              const days = parseInt(e.target.value) || null;
                              field.onChange(days);
                              
                              // Auto-calculate next inspection date
                              if (days && form.getValues('lastInspectionDate')) {
                                const lastDate = form.getValues('lastInspectionDate');
                                if (lastDate) {
                                  const nextDate = new Date(lastDate);
                                  nextDate.setDate(nextDate.getDate() + days);
                                  form.setValue('nextInspectionDate', nextDate);
                                }
                              }
                            }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="specialInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Special Instructions (Optional)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Any special notes or instructions for this property"
                            {...field}
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {/* Inspection Report Recipients */}
                  <div className="border-t pt-4 space-y-4">
                    <div>
                      <h3 className="font-semibold text-sm mb-2">Inspection Report Recipients</h3>
                      <p className="text-xs text-muted-foreground mb-3">
                        Choose who should receive inspection completion reports via email
                      </p>
                    </div>
                    
                    <div className="space-y-3">
                      <FormField
                        control={form.control}
                        name="reportRecipients.ownerEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                data-testid="checkbox-owner-email"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                Send reports to property owner
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="reportRecipients.managerEmail"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={field.value}
                                onChange={(e) => field.onChange(e.target.checked)}
                                data-testid="checkbox-manager-email"
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel className="text-sm font-normal">
                                Send reports to property manager
                              </FormLabel>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="reportRecipients.additionalEmails"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">Additional Email Recipients (Optional)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="email1@example.com, email2@example.com"
                                value={field.value?.join(', ') || ''}
                                onChange={(e) => {
                                  const emails = e.target.value
                                    .split(',')
                                    .map(email => email.trim())
                                    .filter(email => email.length > 0);
                                  field.onChange(emails);
                                }}
                                data-testid="input-additional-emails"
                              />
                            </FormControl>
                            <p className="text-xs text-muted-foreground">
                              Separate multiple email addresses with commas
                            </p>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                  </DialogBody>
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsAddDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={addPropertyMutation.isPending}
                    >
                      {addPropertyMutation.isPending ? 'Adding...' : 'Add Property'}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center space-x-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search properties..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </Button>
        </div>
      </div>

      {/* Properties Grid */}
      {filteredProperties.length === 0 ? (
        <div className="text-center py-12">
          <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchQuery ? 'No properties found' : 'No properties yet'}
          </h3>
          <p className="text-gray-500 mb-4">
            {searchQuery 
              ? 'Try adjusting your search terms'
              : 'Get started by adding your first property to the system'
            }
          </p>
          {!searchQuery && (
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your First Property
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Location View Toggle */}
          {showLocationView && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <PropertyLocationFinder 
                  onPropertySelect={(property) => {
                    setSelectedProperty(property);
                    setIsRoomsModalOpen(true);
                  }}
                />
              </div>
              <div className="lg:col-span-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Map className="w-5 h-5 mr-2" />
                      Property Locations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600 mb-4">
                      Properties with GPS coordinates will appear in the location finder.
                      Add latitude and longitude when creating properties to enable location-based features.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredProperties
                        .filter(p => p.latitude && p.longitude)
                        .map((property) => (
                          <div 
                            key={property.id}
                            className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => {
                              setSelectedProperty(property);
                              setIsRoomsModalOpen(true);
                            }}
                          >
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                              <MapPin className="w-4 h-4 text-green-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">{property.name}</p>
                              <p className="text-xs text-gray-500 truncate">{property.address}</p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              GPS
                            </Badge>
                          </div>
                        ))}
                      {filteredProperties.filter(p => p.latitude && p.longitude).length === 0 && (
                        <div className="col-span-2 text-center py-8 text-gray-500">
                          <MapPin className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                          <p className="text-sm">No properties have GPS coordinates yet</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
          
          {/* Properties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredProperties.map((property) => (
            <Card 
              key={property.id} 
              className="card-hover cursor-pointer transition-shadow hover:shadow-lg"
              onClick={() => setLocation(`/properties/${property.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      {property.address}
                    </div>
                    {(property as any).agencyName && (
                      <div className="flex items-center text-xs text-blue-600 mt-2">
                        <Building className="w-3 h-3 mr-1" />
                        {(property as any).agencyName}
                      </div>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {property.propertyType}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {property.unitNumber && (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-600 w-20">Unit:</span>
                      <span>{property.unitNumber}</span>
                    </div>
                  )}
                  
                  {(property.bedrooms || property.bathrooms) ? (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-600 w-20">Size:</span>
                      <span>
                        {property.bedrooms ? `${property.bedrooms} bed` : ''}
                        {property.bedrooms && property.bathrooms ? ', ' : ''}
                        {property.bathrooms ? `${property.bathrooms} bath` : ''}
                      </span>
                    </div>
                  ) : null}
                  
                  {/* Inspection Information */}
                  <div className="border-t pt-3 mt-3">
                    {/* Inspection Periods */}
                    {(() => {
                      const periods = getInspectionPeriods(property.id);
                      return periods && periods.length > 0 ? (
                        <div className="mb-3">
                          <span className="font-medium text-gray-600 text-sm mb-2 block">Inspection Periods:</span>
                          <div className="space-y-2">
                            {periods.slice(0, 3).map(period => {
                              const isDue = new Date(period.dueDate) < new Date();
                              const isCompleted = period.status === 'completed' || period.completionRatio === 100;
                              
                              return (
                                <Link key={period.id} href={`/properties/${property.id}/inspection/${period.id}`}>
                                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded text-xs hover:bg-gray-100 transition-colors cursor-pointer">
                                    <div className="flex-1">
                                      <div className="font-medium text-gray-900">{period.periodName}</div>
                                      <div className="text-gray-600">
                                        Due: {new Date(period.dueDate).toLocaleDateString()}
                                      </div>
                                    </div>
                                  <div className="flex items-center space-x-2">
                                    <div className="flex items-center space-x-1">
                                      <div className="w-12 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div 
                                          className={`h-full transition-all duration-300 ${
                                            isCompleted 
                                              ? 'bg-green-500' 
                                              : period.completionRatio >= 50 
                                                ? 'bg-yellow-500' 
                                                : 'bg-red-400'
                                          }`}
                                          style={{ width: `${period.completionRatio}%` }}
                                        />
                                      </div>
                                      <span 
                                        className={`text-xs font-medium ${
                                          isCompleted 
                                            ? 'text-green-600' 
                                            : isDue
                                              ? 'text-red-600'
                                              : 'text-gray-600'
                                        }`}
                                        title={`${period.completedItems} of ${period.totalItems} rooms completed`}
                                      >
                                        {period.completionRatio}%
                                      </span>
                                    </div>
                                    {isCompleted && (
                                      <span className="text-green-600 text-xs">✓</span>
                                    )}
                                    {isDue && !isCompleted && (
                                      <span className="text-red-600 text-xs">⚠️</span>
                                    )}
                                    </div>
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </div>
                      ) : null;
                    })()}

                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-gray-600">Last Inspection:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/properties/${property.id}`);
                        }}
                        className="text-gray-900 hover:text-blue-600 hover:underline cursor-pointer transition-colors"
                        title="Click to manage room inspections"
                      >
                        {property.lastInspectionDate 
                          ? new Date(property.lastInspectionDate).toLocaleDateString()
                          : 'Not set'
                        }
                      </button>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-1">
                      <span className="font-medium text-gray-600">Next Inspection:</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setLocation(`/properties/${property.id}`);
                        }}
                        className={`font-medium hover:underline cursor-pointer transition-colors ${
                          property.nextInspectionDate 
                            ? new Date(property.nextInspectionDate) < new Date() 
                              ? 'text-red-600 hover:text-red-700' 
                              : new Date(property.nextInspectionDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
                                ? 'text-orange-600 hover:text-orange-700'
                                : 'text-green-600 hover:text-green-700'
                            : 'text-gray-400 hover:text-blue-600'
                        }`}
                        title="Click to manage room inspections"
                      >
                        {property.nextInspectionDate 
                          ? new Date(property.nextInspectionDate).toLocaleDateString()
                          : 'Not scheduled'
                        }
                      </button>
                    </div>
                    {property.nextInspectionDate && new Date(property.nextInspectionDate) < new Date() && (
                      <div className="text-xs text-red-600 mt-1 font-medium">
                        ⚠️ Inspection Overdue
                      </div>
                    )}
                    {property.nextInspectionDate && 
                     new Date(property.nextInspectionDate) >= new Date() &&
                     new Date(property.nextInspectionDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000 && (
                      <div className="text-xs text-orange-600 mt-1 font-medium">
                        🔔 Due soon
                      </div>
                    )}
                  </div>
                  
                  {property.squareFootage ? (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-600 w-20">Area:</span>
                      <span>{property.squareFootage.toLocaleString()} sq ft</span>
                    </div>
                  ) : null}
                  
                  {property.yearBuilt ? (
                    <div className="flex items-center text-sm">
                      <span className="font-medium text-gray-600 w-20">Built:</span>
                      <span>{property.yearBuilt}</span>
                    </div>
                  ) : null}
                  
                  {property.ownerId ? (
                    <div className="flex items-center text-sm">
                      <User className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Owner assigned</span>
                    </div>
                  ) : null}
                  
                  {property.managerId ? (
                    <div className="flex items-center text-sm">
                      <Settings className="w-4 h-4 mr-2 text-gray-400" />
                      <span className="text-gray-600">Manager assigned</span>
                    </div>
                  ) : null}
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(property);
                      }}
                      className="text-xs"
                    >
                      <Pencil className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedProperty(property);
                        setIsRoomsModalOpen(true);
                      }}
                      className="text-xs"
                    >
                      <Settings className="w-3 h-3 mr-1" />
                      Rooms
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(property);
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                    <Button 
                      size="sm"
                      onClick={(e) => e.stopPropagation()}
                      className="text-xs"
                    >
                      <Calendar className="w-3 h-3 mr-1" />
                      Schedule
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            ))}
          </div>
        </div>
      )}

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the property information
            </DialogDescription>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="contents">
              <DialogBody className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g., Sunset Apartments - Unit 4B" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="propertyType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="townhouse">Townhouse</SelectItem>
                          <SelectItem value="condo">Condo</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              {/* Street Address — split sub-fields, assembled on submit */}
              <div className="space-y-1.5">
                <p className="text-sm font-medium leading-none">Street Address <span className="text-destructive">*</span></p>
                <Input
                  placeholder="e.g. 34 Dorren Court"
                  value={editAddressParts.street}
                  onChange={e => setEditAddressParts(p => ({ ...p, street: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">Street number and name (use Unit Number field for unit/apt)</p>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="col-span-2 space-y-1.5">
                  <p className="text-sm font-medium leading-none">{ADDRESS_SUBURB_LABEL[editCountry] || 'Suburb'} <span className="text-destructive">*</span></p>
                  <Input
                    placeholder={editCountry === 'AU' ? 'e.g. Moore Park Beach' : editCountry === 'US' ? 'e.g. Los Angeles' : 'City / Suburb'}
                    value={editAddressParts.suburb}
                    onChange={e => setEditAddressParts(p => ({ ...p, suburb: e.target.value }))}
                    onBlur={e => {
                      const candidate = [editAddressParts.street, e.target.value].filter(Boolean).join(', ');
                      if (candidate) {
                        const detected = detectCountryFromAddress(candidate);
                        if (detected !== editCountry) {
                          editForm.setValue('country', detected);
                          setEditAddressParts(p => ({ ...p, stateRegion: '' }));
                        }
                      }
                    }}
                  />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <p className="text-sm font-medium leading-none">{ADDRESS_STATE_OPTIONS[editCountry]?.label || 'State'} <span className="text-destructive">*</span></p>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={editAddressParts.stateRegion}
                    onChange={e => setEditAddressParts(p => ({ ...p, stateRegion: e.target.value }))}
                  >
                    <option value="">Select...</option>
                    {(ADDRESS_STATE_OPTIONS[editCountry]?.options || []).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-1 space-y-1.5">
                  <p className="text-sm font-medium leading-none">{ADDRESS_POSTCODE_LABEL[editCountry] || 'Postcode'}</p>
                  <Input
                    placeholder={editCountry === 'AU' ? '4670' : editCountry === 'US' ? '90210' : ''}
                    value={editAddressParts.postcode}
                    onChange={e => setEditAddressParts(p => ({ ...p, postcode: e.target.value.toUpperCase() }))}
                    maxLength={10}
                  />
                </div>
              </div>

              {editForm.formState.errors.address && (
                <p className="text-xs text-destructive">{editForm.formState.errors.address.message}</p>
              )}

              <FormField
                control={editForm.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country / Region</FormLabel>
                    <Select onValueChange={v => { field.onChange(v); setEditAddressParts(p => ({ ...p, stateRegion: '' })); }} value={field.value || ''}>
                      <FormControl>
                        <SelectTrigger data-testid="select-country-edit">
                          <SelectValue placeholder="Select country" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="AU">Australia</SelectItem>
                        <SelectItem value="US">United States</SelectItem>
                        <SelectItem value="GB">United Kingdom</SelectItem>
                        <SelectItem value="CA">Canada</SelectItem>
                        <SelectItem value="NZ">New Zealand</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Changing country updates the state/postcode fields and compliance standards.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="isRentalProperty"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/30">
                      <div>
                        <FormLabel className="text-sm font-medium">Rental / Investment Property</FormLabel>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Enables state-specific mandatory compliance items (e.g. VIC gas/electrical safety checks, QLD smoke alarms, NSW smoke alarm obligations).
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value ?? false}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="unitNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Unit Number (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="4B, 201, etc." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="yearBuilt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year Built</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="2020"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={editForm.control}
                  name="bedrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bedrooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="2"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="bathrooms"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bathrooms</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="squareFootage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Square Meterage/Footage</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="1200"
                          {...field}
                          value={field.value || ''}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={editForm.control}
                name="numberOfLevels"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Levels/Storeys</FormLabel>
                    <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 1)}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select levels" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="1">1 Storey (Single Level)</SelectItem>
                        <SelectItem value="2">2 Storey</SelectItem>
                        <SelectItem value="3">3 Storey</SelectItem>
                        <SelectItem value="4">4+ Storey</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Rooms will be auto-assigned to floors. Ground floor items won't require window restrictors.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Inspection Date Fields */}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={editForm.control}
                  name="lastInspectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Inspection Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="nextInspectionDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Next Inspection Date</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                          onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={editForm.control}
                name="specialInstructions"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Instructions (Optional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Paint colours, gate codes, etc."
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Inspection Report Recipients */}
              <div className="border-t pt-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm mb-2">Inspection Report Recipients</h3>
                  <p className="text-xs text-muted-foreground mb-3">
                    Choose who should receive inspection completion reports via email
                  </p>
                </div>
                
                <div className="space-y-3">
                  <FormField
                    control={editForm.control}
                    name="reportRecipients.ownerEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            data-testid="checkbox-owner-email-edit"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Send reports to property owner
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="reportRecipients.managerEmail"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                            data-testid="checkbox-manager-email-edit"
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Send reports to property manager
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="reportRecipients.additionalEmails"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm">Additional Email Recipients (Optional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="email1@example.com, email2@example.com"
                            value={field.value?.join(', ') || ''}
                            onChange={(e) => {
                              const emails = e.target.value
                                .split(',')
                                .map(email => email.trim())
                                .filter(email => email.length > 0);
                              field.onChange(emails);
                            }}
                            data-testid="input-additional-emails-edit"
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground">
                          Separate multiple email addresses with commas
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              </DialogBody>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={updatePropertyMutation.isPending}
                >
                  {updatePropertyMutation.isPending ? 'Updating...' : 'Update Property'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Property Rooms Modal */}
      {selectedProperty && (
        <PropertyRoomsModal
          property={selectedProperty}
          isOpen={isRoomsModalOpen}
          onClose={() => {
            setIsRoomsModalOpen(false);
            setSelectedProperty(null);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Property</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{propertyToDelete?.name}"? This action cannot be undone and will remove all associated rooms and maintenance data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={deletePropertyMutation.isPending}
            >
              {deletePropertyMutation.isPending ? 'Deleting...' : 'Delete Property'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
