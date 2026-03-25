import { useState, useEffect, useRef } from 'react';
import { useParams, useLocation, Link } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authenticatedApiRequest } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { insertPropertySchema, type Property, type PropertyRoom, type InsertProperty, type ComplianceCertificate, type CertificateSubmission } from '@shared/schema';
import PropertyRoomsModal from '@/components/property/property-rooms-modal';
import RoomTypePicker from '@/components/property/room-type-picker';
import RoomInspectionPopup from '@/components/property/room-inspection-modal';
import InspectionStatusCards from '@/components/property/inspection-status-cards';
import InspectionReportModal from '@/components/property/inspection-report-modal';
import { PhotoRequiredIndicator } from '@/components/compliance/compliance-status-badge';
import { ComplianceDateSection } from '@/components/compliance/compliance-date-section';
import { 
  ArrowLeft, 
  Home, 
  MapPin, 
  User, 
  Settings,
  Calendar,
  Plus,
  Edit,
  Bed,
  Bath,
  Car,
  Utensils,
  Tv,
  Building,
  ChevronRight,
  Trash2,
  Camera,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ExternalLink,
  X,
  Mail,
  Image,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Ban,
  Inbox,
  Loader2,
  Eye,
  Wrench,
  FileCheck,
  Check
} from 'lucide-react';

const roomTypeIcons = {
  master_bedroom: Bed,
  bedroom: Bed,
  kitchen: Utensils,
  main_bathroom: Bath,
  master_ensuite: Bath,
  powder_room: Bath,
  garage: Car,
  office: Building,
  media_room: Tv,
  other: Home,
};

export default function PropertyDetails() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isRoomsModalOpen, setIsRoomsModalOpen] = useState(false);
  const [isRoomPickerOpen, setIsRoomPickerOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<number | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [showBulkCheckModal, setShowBulkCheckModal] = useState(false);
  const [selectedCertificate, setSelectedCertificate] = useState<ComplianceCertificate | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [inspectionRoomId, setInspectionRoomId] = useState<number | null>(null);
  const [showDeletePropertyDialog, setShowDeletePropertyDialog] = useState(false);
  const [certificateToDelete, setCertificateToDelete] = useState<{id: number, name: string} | null>(null);
  const [roomToDelete, setRoomToDelete] = useState<{id: number, name: string} | null>(null);
  const roomsSectionRef = useRef<HTMLDivElement>(null);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const propertyId = parseInt(id || '0');

  useEffect(() => {
    if (hasAutoOpened) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const roomParam = urlParams.get('room');
    
    if (roomParam) {
      const roomId = parseInt(roomParam);
      if (!isNaN(roomId)) {
        setSelectedRoomId(roomId);
        setHasAutoOpened(true);
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [hasAutoOpened]);

  const { data: property, isLoading: propertyLoading } = useQuery<Property>({
    queryKey: ['/api/properties', propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/properties/single/${propertyId}`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch property');
      return response.json();
    },
    enabled: !!propertyId,
  });

  const { data: rooms, isLoading: roomsLoading } = useQuery<PropertyRoom[]>({
    queryKey: ['/api/properties', propertyId, 'rooms'],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}/rooms`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Query for all inspection items across all rooms
  const { data: allInspectionItems } = useQuery({
    queryKey: ['/api/properties', propertyId, 'all-inspection-items'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/${propertyId}/inspection-items`);
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Query for property certificates
  const { data: certificates = [] } = useQuery<ComplianceCertificate[]>({
    queryKey: ['/api/properties', propertyId, 'certificates'],
    queryFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}/certificates`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch certificates');
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Query for inspection periods
  const { data: inspectionPeriods = [] } = useQuery({
    queryKey: ['/api/properties', propertyId, 'inspection-periods'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/${propertyId}/inspection-periods`);
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Query for certificate email submissions (inbox)
  const { data: certificateSubmissions = [], isLoading: submissionsLoading } = useQuery<CertificateSubmission[]>({
    queryKey: ['/api/certificate-submissions', propertyId],
    queryFn: async () => {
      const response = await fetch(`/api/certificate-submissions/property/${propertyId}`, {
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to fetch certificate submissions');
      return response.json();
    },
    enabled: !!propertyId,
  });

  // Delete certificate submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/certificate-submissions/${submissionId}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to delete submission');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-submissions', propertyId] });
      toast({ title: 'Deleted', description: 'Certificate submission removed' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete submission', variant: 'destructive' });
    },
  });

  // Approve certificate submission mutation (marks as processed and links inspection items)
  const approveSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/certificate-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
        body: JSON.stringify({ status: 'processed' }),
      });
      if (!response.ok) throw new Error('Failed to approve submission');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-submissions', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'rooms'] });
      toast({ title: 'Approved', description: 'Certificate approved and linked to inspection items' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to approve submission', variant: 'destructive' });
    },
  });

  // Reject certificate submission mutation
  const rejectSubmissionMutation = useMutation({
    mutationFn: async (submissionId: number) => {
      const response = await fetch(`/api/certificate-submissions/${submissionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
        body: JSON.stringify({ status: 'rejected' }),
      });
      if (!response.ok) throw new Error('Failed to reject submission');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/certificate-submissions', propertyId] });
      toast({ title: 'Rejected', description: 'Certificate submission rejected' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to reject submission', variant: 'destructive' });
    },
  });

  const generateRoomsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}/rooms/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to generate rooms');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'rooms'] });
      toast({ title: 'Success', description: 'Rooms generated automatically based on property details' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate rooms', variant: 'destructive' });
    },
  });

  // Bulk check specific inspection items mutation
  const bulkCheckInspectionItemsMutation = useMutation({
    mutationFn: async (data: { itemName: string; propertyId: number }) => {
      const response = await authenticatedApiRequest('POST', `/api/properties/${data.propertyId}/bulk-check-items`, {
        itemName: data.itemName
      });
      return response.json();
    },
    onSuccess: () => {
      // Force immediate refetch of all inspection items to update completion percentages
      queryClient.refetchQueries({ queryKey: ['/api/properties', propertyId, 'all-inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'rooms'] });
      
      // Invalidate inspection items cache for ALL rooms in this property
      if (rooms) {
        rooms.forEach(room => {
          queryClient.invalidateQueries({ queryKey: ['/api/rooms', room.id, 'inspection-items'] });
        });
      }
      
      toast({ 
        title: 'Bulk Check Completed', 
        description: 'Items marked as completed across all rooms' 
      });
      setShowBulkCheckModal(false);
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to bulk check items', 
        variant: 'destructive' 
      });
    },
  });

  const editForm = useForm<Omit<InsertProperty, 'agencyId'>>({
    resolver: zodResolver(insertPropertySchema.omit({ agencyId: true })),
    defaultValues: {
      name: property?.name || '',
      address: property?.address || '',
      propertyType: property?.propertyType || 'apartment',
      unitNumber: property?.unitNumber || '',
      bedrooms: property?.bedrooms || 0,
      bathrooms: property?.bathrooms || 0,
      squareFootage: property?.squareFootage || 0,
      yearBuilt: property?.yearBuilt || 0,
      numberOfLevels: property?.numberOfLevels || 1,
      specialInstructions: property?.specialInstructions || '',
      latitude: property?.latitude || '',
      longitude: property?.longitude || '',
    }
  });

  // Update form when property data loads
  useEffect(() => {
    if (property) {
      editForm.reset({
        name: property.name,
        address: property.address,
        propertyType: property.propertyType,
        unitNumber: property.unitNumber || '',
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFootage: property.squareFootage || 0,
        yearBuilt: property.yearBuilt || 0,
        numberOfLevels: property.numberOfLevels || 1,
        specialInstructions: property.specialInstructions || '',
        latitude: property.latitude || '',
        longitude: property.longitude || '',
      });
    }
  }, [property, editForm]);

  const editPropertyMutation = useMutation({
    mutationFn: async (data: Omit<InsertProperty, 'agencyId'>) => {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update property');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', user?.agencyId] });
      toast({ title: 'Success', description: 'Property updated successfully' });
      setIsEditDialogOpen(false);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update property', variant: 'destructive' });
    }
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: async (certificateId: number) => {
      return apiRequest(`/api/certificates/${certificateId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'certificates'] });
      queryClient.invalidateQueries({ queryKey: ['/api/certificates'] });
      toast({
        title: "Success",
        description: "Certificate deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete certificate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleDeleteCertificate = async (certificateId: number, certificateName: string) => {
    setCertificateToDelete({ id: certificateId, name: certificateName });
  };

  const handleViewDocument = async (cert: ComplianceCertificate) => {
    if (cert.fileUrl) {
      try {
        console.log('Attempting to view document for certificate:', cert.id);
        
        // Fetch the file with proper authentication headers
        const response = await fetch(`/api/certificates/${cert.id}/download`, {
          headers: {
            'X-User-ID': user?.id?.toString() || '1',
            'X-Agency-ID': user?.agencyId?.toString() || '1',
          },
        });
        
        console.log('Download response status:', response.status);
        console.log('Download response headers:', response.headers);
        
        if (!response.ok) {
          if (response.status === 404) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Document not found');
          }
          throw new Error(`Failed to load: ${response.statusText}`);
        }
        
        // Create blob URL for viewing in modal
        const blob = await response.blob();
        console.log('Created blob:', blob.type, blob.size);
        
        const url = window.URL.createObjectURL(blob);
        console.log('Created blob URL:', url);
        
        setDocumentUrl(url);
        setSelectedCertificate(cert);
      } catch (error) {
        console.error('Document viewing error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load certificate document.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "No Document",
        description: "No document file is associated with this certificate.",
        variant: "destructive",
      });
    }
  };

  const handleCloseModal = () => {
    if (documentUrl) {
      window.URL.revokeObjectURL(documentUrl);
    }
    setDocumentUrl(null);
    setSelectedCertificate(null);
  };

  const deletePropertyMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/properties/${propertyId}`, {
        method: 'DELETE',
        headers: {
          'X-User-ID': user?.id?.toString() || '',
          'X-Agency-ID': user?.agencyId?.toString() || '',
        },
      });
      if (!response.ok) throw new Error('Failed to delete property');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] });
      toast({ title: 'Success', description: 'Property deleted successfully' });
      setLocation('/properties');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete property', variant: 'destructive' });
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await authenticatedApiRequest('DELETE', `/api/rooms/${roomId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'rooms'] });
      toast({ title: 'Success', description: 'Room deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' });
    },
  });

  const sendInspectionReportMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/properties/${propertyId}/send-inspection-report`, 'POST', {});
      return response;
    },
    onSuccess: (data: any) => {
      toast({ 
        title: 'Success', 
        description: `Inspection report sent to ${data.recipientCount} recipient(s)` 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to send inspection report', 
        variant: 'destructive' 
      });
    },
  });

  const markAsBaselineMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/properties/${propertyId}/mark-baseline`, 'POST', {});
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'all-inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'rooms'] });
      toast({ 
        title: 'Baseline Set', 
        description: 'All items marked with today\'s date and Good condition' 
      });
    },
    onError: (error: any) => {
      toast({ 
        title: 'Error', 
        description: error?.message || 'Failed to set baseline', 
        variant: 'destructive' 
      });
    },
  });

  const onEditSubmit = (data: Omit<InsertProperty, 'agencyId'>) => {
    editPropertyMutation.mutate(data);
  };

  const handleEdit = () => {
    if (property) {
      editForm.reset({
        name: property.name,
        address: property.address,
        propertyType: property.propertyType,
        unitNumber: property.unitNumber || '',
        bedrooms: property.bedrooms || 0,
        bathrooms: property.bathrooms || 0,
        squareFootage: property.squareFootage || 0,
        yearBuilt: property.yearBuilt || 0,
        specialInstructions: property.specialInstructions || '',
        latitude: property.latitude || '',
        longitude: property.longitude || '',
      });
      setIsEditDialogOpen(true);
    }
  };

  const getRoomIcon = (roomType: string) => {
    const IconComponent = roomTypeIcons[roomType as keyof typeof roomTypeIcons] || Home;
    return <IconComponent className="w-5 h-5" />;
  };

  const getRoomTypeDisplay = (roomType: string) => {
    return roomType.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleDeleteRoom = (roomId: number, roomName: string) => {
    setRoomToDelete({ id: roomId, name: roomName });
  };

  if (propertyLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-64 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-96 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-gray-200 rounded"></div>
            <div className="h-64 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Property not found</h3>
          <p className="text-gray-500 mb-4">The property you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => setLocation('/properties')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header with back button */}
      <div className="flex items-center mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation('/properties')}
          className="mr-4"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Properties
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <div className="flex items-center text-gray-600 mt-1">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{property.address}</span>
            {property.unitNumber && (
              <>
                <span className="mx-2">•</span>
                <span>Unit {property.unitNumber}</span>
              </>
            )}
          </div>
        </div>
        <Badge variant="secondary" className="capitalize">
          {property.propertyType}
        </Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Property Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Home className="w-5 h-5 mr-2" />
                Property Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(property.bedrooms || property.bathrooms) && (
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-24">Size:</span>
                  <span>
                    {property.bedrooms ? `${property.bedrooms} bed` : ''}
                    {property.bedrooms && property.bathrooms ? ', ' : ''}
                    {property.bathrooms ? `${property.bathrooms} bath` : ''}
                  </span>
                </div>
              )}
              
              {property.squareFootage ? (
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-24">Area:</span>
                  <span>{property.squareFootage.toLocaleString()} sq ft</span>
                </div>
              ) : null}

              <div className="flex items-center text-sm">
                <span className="font-medium text-gray-600 w-24">Levels:</span>
                <span>{property.numberOfLevels || 1} {(property.numberOfLevels || 1) === 1 ? 'Storey' : 'Storey'}</span>
              </div>
              
              {property.yearBuilt && (
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-24">Built:</span>
                  <span>{property.yearBuilt}</span>
                </div>
              )}
              
              <Separator />
              
              {/* Inspection Schedule */}
              <div className="space-y-3">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium text-gray-900">Inspection Schedule</span>
                </div>
                
                <div className="space-y-2">
                  {inspectionPeriods.length === 0 ? (
                    <p className="text-sm text-gray-500">No inspection periods scheduled</p>
                  ) : (
                    inspectionPeriods.map((period: any) => {
                      const isDue = new Date(period.dueDate) < new Date();
                      const isCompleted = period.status === 'completed';
                      const completionRatio = period.completedItems && period.totalItems 
                        ? (period.completedItems / period.totalItems) * 100 
                        : 0;
                      
                      return (
                        <Link key={period.id} href={`/properties/${propertyId}/inspection/${period.id}`}>
                          <div className="flex items-center justify-between p-2 bg-gray-50 rounded hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">{period.periodName}</div>
                              {period.totalItems > 0 && (
                                <div className="text-xs text-gray-600">
                                  {period.completedItems}/{period.totalItems} rooms ({Math.round(completionRatio)}%)
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-1">
                              {isCompleted && (
                                <span className="text-green-600 text-sm">✓</span>
                              )}
                              {isDue && !isCompleted && (
                                <span className="text-red-600 text-sm">⚠️</span>
                              )}
                              <ChevronRight className="h-3 w-3 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </div>
              
              {property.yearBuilt && (
                <div className="flex items-center text-sm">
                  <span className="font-medium text-gray-600 w-24">Built:</span>
                  <span>{property.yearBuilt}</span>
                </div>
              )}
              
              {property.ownerId && (
                <div className="flex items-center text-sm">
                  <User className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Owner assigned</span>
                </div>
              )}
              
              {property.managerId && (
                <div className="flex items-center text-sm">
                  <Settings className="w-4 h-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Manager assigned</span>
                </div>
              )}

              {property.specialInstructions && (
                <>
                  <Separator />
                  <div>
                    <p className="font-medium text-gray-600 text-sm mb-2">Special Instructions:</p>
                    <p className="text-sm text-gray-700">{property.specialInstructions}</p>
                  </div>
                </>
              )}

              <Separator />
              
              {/* Certificate Submission Email */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-2 text-blue-600" />
                  <span className="font-medium text-gray-900 text-sm">Submit Certificates</span>
                </div>
                <p className="text-xs text-gray-600">
                  Email certificates to this address for automatic processing:
                </p>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-xs bg-gray-100 px-3 py-2 rounded border border-gray-200 font-mono text-gray-800 break-all">
                    property-{property.id}@parse.mymaintpro.com
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(`property-${property.id}@parse.mymaintpro.com`);
                      toast({
                        title: "Email copied!",
                        description: "Certificate submission email copied to clipboard",
                      });
                    }}
                    data-testid="button-copy-certificate-email"
                  >
                    <Mail className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-gray-500 italic">
                  Future: AI will automatically read certificates and schedule inspections
                </p>
              </div>

              {/* Certificate Inbox - Shows received email submissions */}
              <div className="space-y-2 mt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Inbox className="w-4 h-4 mr-2 text-green-600" />
                    <span className="font-medium text-gray-900 text-sm">Certificate Inbox</span>
                  </div>
                  {certificateSubmissions.length > 0 && (
                    <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">
                      {certificateSubmissions.filter(s => s.status === 'pending').length} pending
                    </Badge>
                  )}
                </div>
                
                {submissionsLoading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
                    <span className="text-xs text-gray-500 ml-2">Loading...</span>
                  </div>
                ) : certificateSubmissions.length === 0 ? (
                  <div className="text-center py-4 bg-gray-50 rounded-md border border-dashed border-gray-200">
                    <Inbox className="w-6 h-6 mx-auto text-gray-300 mb-2" />
                    <p className="text-xs text-gray-500">No certificates received yet</p>
                    <p className="text-xs text-gray-400 mt-1">
                      Emails sent to property-{property.id}@parse.mymaintpro.com will appear here
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {certificateSubmissions.map((submission) => (
                      <div 
                        key={submission.id} 
                        className={`flex items-start justify-between p-2 rounded-md border ${
                          submission.status === 'pending' 
                            ? 'bg-blue-50 border-blue-100' 
                            : submission.status === 'processed'
                            ? 'bg-green-50 border-green-100'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                        data-testid={`submission-${submission.id}`}
                      >
                        <div className="flex items-start space-x-2 flex-1 min-w-0">
                          <Mail className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                            submission.status === 'pending' ? 'text-blue-500' : 'text-gray-400'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-900 truncate">
                              {submission.subject || 'Certificate Submission'}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              From: {submission.senderName || submission.senderEmail}
                            </p>
                            <div className="flex items-center space-x-2 mt-1">
                              {submission.certificateType && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {submission.certificateType.replace(/_/g, ' ')}
                                </Badge>
                              )}
                              {submission.fileName && (
                                <span className="text-xs text-gray-400 flex items-center">
                                  <FileText className="w-3 h-3 mr-1" />
                                  {submission.fileName}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-1">
                              {submission.receivedAt && new Date(submission.receivedAt).toLocaleDateString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 ml-2">
                          <Badge 
                            variant={submission.status === 'pending' ? 'default' : 'secondary'}
                            className={`text-xs ${
                              submission.status === 'pending' 
                                ? 'bg-blue-500' 
                                : submission.status === 'processed'
                                ? 'bg-green-100 text-green-800'
                                : submission.status === 'rejected'
                                ? 'bg-red-100 text-red-800'
                                : submission.status === 'rejected_address_mismatch'
                                ? 'bg-amber-100 text-amber-800'
                                : submission.status === 'review_required'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {submission.status === 'rejected_address_mismatch' ? 'Address Mismatch' : submission.status}
                          </Badge>
                          {(submission.status === 'pending' || submission.status === 'processing' || submission.status === 'rejected_address_mismatch' || submission.status === 'review_required') && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-primary hover:text-primary/80 hover:bg-primary/10"
                                onClick={() => approveSubmissionMutation.mutate(submission.id)}
                                disabled={approveSubmissionMutation.isPending}
                                title="Approve certificate"
                                data-testid={`button-approve-submission-${submission.id}`}
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 text-orange-500 hover:text-orange-700 hover:bg-orange-50"
                                onClick={() => rejectSubmissionMutation.mutate(submission.id)}
                                disabled={rejectSubmissionMutation.isPending}
                                title="Reject certificate"
                                data-testid={`button-reject-submission-${submission.id}`}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                          {submission.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => window.open(submission.fileUrl!, '_blank')}
                              data-testid={`button-view-submission-${submission.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => deleteSubmissionMutation.mutate(submission.id)}
                            disabled={deleteSubmissionMutation.isPending}
                            data-testid={`button-delete-submission-${submission.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Separator />
              
              {/* Certificates Section */}
              {certificates.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-600 text-sm">Certificates ({certificates.length})</p>
                  </div>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-blue-600" />
                          <div>
                            <p className="text-xs font-medium">{cert.certificateName}</p>
                            <p className="text-xs text-gray-500 capitalize">
                              {cert.certificateType.replace('_', ' ')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1">
                          {new Date(cert.expiryDate) < new Date() ? (
                            <Badge variant="destructive" className="text-xs">Expired</Badge>
                          ) : new Date(cert.expiryDate).getTime() - new Date().getTime() < 30 * 24 * 60 * 60 * 1000 ? (
                            <Badge variant="secondary" className="text-xs bg-orange-100 text-orange-800">Expiring</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs bg-green-100 text-green-800">Valid</Badge>
                          )}
                          {cert.fileUrl && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewDocument(cert)}
                              className="h-6 w-6 p-0"
                              data-testid={`button-view-certificate-${cert.id}`}
                            >
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCertificate(cert.id, cert.certificateName)}
                            disabled={deleteCertificateMutation.isPending}
                            className="h-6 w-6 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            data-testid={`button-delete-certificate-${cert.id}`}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />
              
              {/* Inspection Status Section - Redesigned with clear cards */}
              <div className="space-y-3">
                <h4 className="font-medium text-sm flex items-center">
                  <ShieldCheck className="w-4 h-4 mr-2 text-blue-600" />
                  Inspection Status
                </h4>
                <InspectionStatusCards
                  inspectionItems={allInspectionItems || []}
                  onMarkAllAsBaseline={() => markAsBaselineMutation.mutate()}
                  onStartFirstInspection={() => {
                    if (rooms && rooms.length > 0) {
                      setSelectedRoomId(rooms[0].id);
                    }
                  }}
                  isMarkingBaseline={markAsBaselineMutation.isPending}
                  propertyNextInspectionDate={property?.nextInspectionDate}
                  rooms={rooms || []}
                  onRoomClick={(roomId) => setSelectedRoomId(roomId)}
                  onOverdueClick={() => {
                    roomsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                />
              </div>

              <Separator />
              <div className="space-y-2">
                <Button
                  onClick={() => setShowReportModal(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-white"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
                <Button
                  onClick={() => setShowBulkCheckModal(true)}
                  variant="outline"
                  className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Bulk Check
                </Button>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEdit}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowDeletePropertyDialog(true)}
                    disabled={deletePropertyMutation.isPending}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Property Rooms */}
        <div className="lg:col-span-2" ref={roomsSectionRef}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <Building className="w-5 h-5 mr-2" />
                  Property Rooms/Areas {rooms && `(${rooms.length})`}
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    onClick={() => sendInspectionReportMutation.mutate()}
                    size="sm"
                    variant="outline"
                    disabled={!allInspectionItems || allInspectionItems.length === 0 || sendInspectionReportMutation.isPending}
                    data-testid="button-send-inspection-report"
                  >
                    <Mail className="w-4 h-4 mr-1" />
                    {sendInspectionReportMutation.isPending ? 'Sending...' : 'Send Report'}
                  </Button>
                  <Button
                    onClick={() => setIsRoomPickerOpen(true)}
                    size="sm"
                  >
                    <Camera className="w-4 h-4 mr-1" />
                    Add Rooms/Areas
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {roomsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <span className="ml-2">Loading rooms...</span>
                </div>
              ) : rooms && rooms.length > 0 ? (
                <div className="space-y-6">
                  {(() => {
                    const getFloorLabel = (floor: number) => {
                      if (floor === -1) return 'Basement';
                      if (floor === 0) return 'Ground Floor';
                      if (floor === 1) return 'First Floor';
                      if (floor === 2) return 'Second Floor';
                      if (floor === 3) return 'Third Floor';
                      return `Floor ${floor}`;
                    };

                    const isExteriorRoom = (roomType: string) =>
                      ['exterior', 'roof', 'gutters', 'pool', 'deck', 'bbq'].includes(roomType);

                    const grouped: Record<string, typeof rooms> = {};
                    rooms.forEach((room) => {
                      const key = isExteriorRoom(room.roomType) ? 'exterior' : String(room.floor ?? 0);
                      if (!grouped[key]) grouped[key] = [];
                      grouped[key].push(room);
                    });

                    const sortedKeys = Object.keys(grouped).sort((a, b) => {
                      if (a === 'exterior') return 1;
                      if (b === 'exterior') return -1;
                      return parseInt(a) - parseInt(b);
                    });

                    return sortedKeys.map((key) => (
                      <div key={key}>
                        <div className="flex items-center mb-3">
                          <div className="h-px flex-1 bg-gray-200" />
                          <span className="px-3 text-sm font-semibold text-gray-700 uppercase tracking-wide">
                            {key === 'exterior' ? 'Exterior / Outdoor' : getFloorLabel(parseInt(key))}
                          </span>
                          <div className="h-px flex-1 bg-gray-200" />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {grouped[key].map((room) => (
                    <Card 
                      key={room.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        // Open simple inspection view
                        setSelectedRoomId(room.id);
                      }}
                      data-testid={`room-card-${room.id}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              {getRoomIcon(room.roomType)}
                            </div>
                            <div>
                              <p className="font-medium">{room.roomName}</p>
                              <p className="text-sm text-gray-500">
                                {getRoomTypeDisplay(room.roomType)} • {room.floor === -1 ? 'Basement' : room.floor === 0 ? 'Ground Floor' : room.floor === 1 ? 'First Floor' : room.floor === 2 ? 'Second Floor' : room.floor === 3 ? 'Third Floor' : `Floor ${room.floor}`}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteRoom(room.id, room.roomName);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              aria-label={`Delete ${room.roomName}`}
                              title={`Delete ${room.roomName}`}
                              data-testid={`button-delete-room-${room.id}`}
                              disabled={deleteRoomMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 pointer-events-none" />
                            </Button>
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                        
                        {/* Room Inspection Status - Visual vs Professional Divide */}
                        <div className="mt-3 pt-3 border-t space-y-2">
                          {(() => {
                            const roomItems = allInspectionItems?.filter(item => item.roomId === room.id) || [];
                            
                            // Separate into visual and professional items
                            const visualItems = roomItems.filter(item => item.inspectionType !== 'professional');
                            const professionalItems = roomItems.filter(item => item.inspectionType === 'professional');
                            
                            // Calculate visual completion
                            const visualChecked = visualItems.filter(item => item.isCompleted || item.isNotApplicable).length;
                            const visualTotal = visualItems.length;
                            const visualPercent = visualTotal > 0 ? Math.round((visualChecked / visualTotal) * 100) : 0;
                            
                            // Calculate professional completion
                            const profChecked = professionalItems.filter(item => item.isCompleted || item.isNotApplicable).length;
                            const profTotal = professionalItems.length;
                            const profPercent = profTotal > 0 ? Math.round((profChecked / profTotal) * 100) : 0;
                            
                            // Overall completion
                            const totalItems = roomItems.length;
                            const checkedItems = roomItems.filter(item => item.isCompleted || item.isNotApplicable).length;
                            const completionPercent = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

                            // Calculate overdue items for this room
                            const today = new Date();
                            today.setHours(0, 0, 0, 0);
                            const propNextDate = property?.nextInspectionDate ? new Date(property.nextInspectionDate) : null;
                            const propIsOverdue = propNextDate ? propNextDate < today : false;
                            const roomOverdueItems = roomItems.filter(item => {
                              if (item.isNotApplicable) return false;
                              if (item.nextInspectionDate && new Date(item.nextInspectionDate) < today) return true;
                              if (!item.isCompleted && propIsOverdue && propNextDate) {
                                const lastInsp = item.lastInspectedDate ? new Date(item.lastInspectedDate) : null;
                                if (!lastInsp || lastInsp < propNextDate) return true;
                              }
                              return false;
                            });
                            
                            return (
                              <>
                                {/* Visual Inspections Row */}
                                {visualTotal > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center text-gray-600">
                                      <Eye className="w-3 h-3 mr-1 text-gray-500" />
                                      Visual:
                                    </span>
                                    <span className="font-medium">
                                      {visualChecked}/{visualTotal}
                                      <span className={`ml-1 ${visualPercent === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                        ({visualPercent}%)
                                      </span>
                                    </span>
                                  </div>
                                )}
                                
                                {/* Professional Inspections Row */}
                                {profTotal > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="flex items-center text-purple-700">
                                      <Wrench className="w-3 h-3 mr-1 text-purple-600" />
                                      Professional:
                                    </span>
                                    <span className="font-medium text-purple-700">
                                      {profChecked}/{profTotal}
                                      <span className={`ml-1 ${profPercent === 100 ? 'text-green-600' : 'text-purple-600'}`}>
                                        ({profPercent}%)
                                      </span>
                                    </span>
                                  </div>
                                )}
                                
                                {/* Divider between types and overall status */}
                                {totalItems > 0 && (visualTotal > 0 && profTotal > 0) && (
                                  <div className="border-t border-dashed border-gray-200 my-1" />
                                )}
                                
                                {/* Overall Total (show when both types exist or for quick reference) */}
                                {totalItems > 0 && (
                                  <div className="flex items-center justify-between text-xs">
                                    <span className="text-gray-600 font-medium">Total:</span>
                                    <span className="font-medium">
                                      {checkedItems}/{totalItems} checked
                                      <span className={`ml-1 ${completionPercent === 100 ? 'text-green-600' : 'text-orange-600'}`}>
                                        ({completionPercent}%)
                                      </span>
                                    </span>
                                  </div>
                                )}
                                
                                {/* Overall Status */}
                                {totalItems > 0 && roomOverdueItems.length > 0 ? (
                                  <div className="flex items-center text-xs text-red-600 bg-red-50 px-2 py-1 rounded">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    {roomOverdueItems.length} item{roomOverdueItems.length > 1 ? 's' : ''} overdue
                                  </div>
                                ) : totalItems > 0 && completionPercent === 100 ? (
                                  <div className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                                    <CheckCircle2 className="w-3 h-3 mr-1" />
                                    All items checked
                                  </div>
                                ) : null}
                                
                                {/* Last Inspection Date */}
                                <div className="flex items-center justify-between text-xs">
                                  <span className="text-gray-600">Last Inspection:</span>
                                  <span className="font-medium text-gray-900">
                                    {room.lastInspectionDate 
                                      ? new Date(room.lastInspectionDate).toLocaleDateString()
                                      : 'Not inspected'
                                    }
                                  </span>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                        
                        {room.description && (
                          <p className="text-xs text-gray-600 mt-2 line-clamp-2">{room.description}</p>
                        )}
                      </CardContent>
                    </Card>
                          ))}
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No rooms/areas added yet</h3>
                  <p className="text-gray-500 mb-4">
                    Start by adding rooms and property areas (walls, fences, roofs, etc.) to manage maintenance and inspections
                  </p>
                  {(property.bedrooms || property.bathrooms) && (
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-3">
                        Based on your property details ({property.bedrooms} bed, {property.bathrooms} bath):
                      </p>
                      <Button 
                        onClick={() => generateRoomsMutation.mutate()}
                        disabled={generateRoomsMutation.isPending}
                        className="mr-3"
                      >
                        {generateRoomsMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        ) : (
                          <Home className="w-4 h-4 mr-2" />
                        )}
                        Auto-Generate Rooms/Areas
                      </Button>
                    </div>
                  )}
                  <Button onClick={() => setIsRoomsModalOpen(true)} variant="outline">
                    <Plus className="w-4 h-4 mr-2" />
                    {(property.bedrooms || property.bathrooms) ? 'Add Manually Instead' : 'Add First Room/Area'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div>
                    <h3 className="font-medium">Maintenance Calendar</h3>
                    <p className="text-sm text-gray-500">View scheduled maintenance</p>
                  </div>
                  <Button size="sm" variant="outline" className="w-full" onClick={() => setLocation(`/calendar?propertyId=${propertyId}`)}>
                    <Calendar className="w-4 h-4 mr-2" />
                    View Calendar
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-3">
                  <div>
                    <h3 className="font-medium">Schedule Maintenance</h3>
                    <p className="text-sm text-gray-500">Create maintenance tasks</p>
                  </div>
                  <Button size="sm" className="w-full">
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Task
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Inspection Periods</CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="space-y-3">
                  {inspectionPeriods.length === 0 ? (
                    <div className="text-center py-4">
                      <Calendar className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500">No inspection periods scheduled</p>
                    </div>
                  ) : (
                    inspectionPeriods.map((period: any) => {
                      const isDue = new Date(period.dueDate) < new Date();
                      const isCompleted = period.status === 'completed';
                      const completionRatio = period.completedItems && period.totalItems 
                        ? (period.completedItems / period.totalItems) * 100 
                        : 0;
                      
                      return (
                        <Link key={period.id} href={`/properties/${propertyId}/inspection/${period.id}`}>
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">{period.periodName}</div>
                              <div className="text-sm text-gray-600">
                                Due: {new Date(period.dueDate).toLocaleDateString()}
                              </div>
                              {period.totalItems > 0 && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {period.completedItems}/{period.totalItems} rooms completed
                                </div>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              {period.totalItems > 0 && (
                                <div className="text-xs bg-gray-200 px-2 py-1 rounded">
                                  {Math.round(completionRatio)}%
                                </div>
                              )}
                              {isCompleted && (
                                <span className="text-green-600 text-sm">✓</span>
                              )}
                              {isDue && !isCompleted && (
                                <span className="text-red-600 text-sm">⚠️</span>
                              )}
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </div>
                        </Link>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Standalone Room Type Picker - for quick adding rooms */}
      {property && (
        <RoomTypePicker
          property={property}
          isOpen={isRoomPickerOpen}
          onClose={() => setIsRoomPickerOpen(false)}
        />
      )}

      {/* Property Rooms Modal - for management only */}
      <PropertyRoomsModal
        property={property}
        isOpen={isRoomsModalOpen}
        onClose={() => {
          setIsRoomsModalOpen(false);
          setInspectionRoomId(null);
        }}
        autoOpenAddForm={false}
        initialSelectedRoomId={null}
        inspectionRoomId={null}
        allInspectionItems={allInspectionItems}
      />

      {/* Room Inspection Popup with Camera, Notes, Condition Rating, and History */}
      <RoomInspectionPopup
        room={rooms?.find(r => r.id === selectedRoomId) || null}
        isOpen={!!selectedRoomId}
        onClose={() => setSelectedRoomId(null)}
        propertyId={propertyId}
      />

      {/* Inspection Report Modal */}
      <InspectionReportModal
        propertyId={propertyId}
        propertyName={property?.name || 'Property'}
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
      />

      {/* Edit Property Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Edit Property</DialogTitle>
            <DialogDescription>
              Update the property information below.
            </DialogDescription>
          </DialogHeader>
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter property name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter property address" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-2">
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
                            <SelectItem value="studio">Studio</SelectItem>
                            <SelectItem value="duplex">Duplex</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="unitNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unit Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Unit #" {...field} value={field.value || ''} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={editForm.control}
                    name="bedrooms"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            value={field.value || 0}
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
                            placeholder="0" 
                            {...field}
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <FormField
                    control={editForm.control}
                    name="squareFootage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Square Meterage/Footage</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="0" 
                            {...field}
                            value={field.value || 0}
                            onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                          />
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
                            placeholder="YYYY" 
                            {...field}
                            value={field.value || 0}
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
                      <FormLabel>Number of Levels</FormLabel>
                      <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value || 1)}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select levels" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="1">1 Storey</SelectItem>
                          <SelectItem value="2">2 Storey</SelectItem>
                          <SelectItem value="3">3 Storey</SelectItem>
                          <SelectItem value="4">4+ Storey</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={editForm.control}
                  name="specialInstructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Instructions (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Paint colours, gate codes, etc." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={editPropertyMutation.isPending}>
                  {editPropertyMutation.isPending ? 'Updating...' : 'Update Property'}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Bulk Check Item Selection Modal */}
      <Dialog open={showBulkCheckModal} onOpenChange={setShowBulkCheckModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Bulk Check Inspection Items</DialogTitle>
            <DialogDescription>
              Select an item type to mark as completed across all rooms in this property.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Show all inspection items across all rooms with completion status */}
            <div className="space-y-2">
              <Label>Select Item Type to Mark Complete Across All Rooms:</Label>
              <div className="max-h-60 overflow-y-auto space-y-2">
                {(() => {
                  // Get all unique item names from existing items plus common ones
                  const existingItemNames = allInspectionItems ? Array.from(new Set(allInspectionItems.map(item => item.itemName))) : [];
                  const commonItemNames = [
                    'Smoke Detectors',
                    'Light Switch', 
                    'Power Points (GPO)',
                    'Windows',
                    'Window Furnishings',
                    'Air Conditioning',
                    'Ceiling Fan',
                    'Tap',
                    'Toilet',
                    'Shower',
                    'Bath',
                    'Exhaust Fan',
                    'Kitchen Tap',
                    'Dishwasher',
                    'Rangehood',
                    'Oven/Cooktop',
                    'Laundry Tap',
                    'Drainage',
                    'Dryer Vent',
                    'TV Point'
                  ];
                  
                  // Combine and deduplicate
                  const allItemNames = Array.from(new Set([...existingItemNames, ...commonItemNames]));
                  
                  return allItemNames.map(itemName => {
                    // Count completion status for this item type across all rooms
                    // Both completed AND N/A items count as "checked"
                    const itemsOfThisType = allInspectionItems ? allInspectionItems.filter(item => item.itemName === itemName) : [];
                    const checkedCount = itemsOfThisType.filter(item => item.isCompleted || item.isNotApplicable).length;
                    const totalCount = itemsOfThisType.length;
                    
                    let statusText = '';
                    let statusColor = '';
                    
                    if (totalCount === 0) {
                      statusText = 'Not in any rooms';
                      statusColor = 'text-gray-400';
                    } else if (checkedCount === totalCount) {
                      statusText = `${totalCount}/${totalCount} - All Checked`;
                      statusColor = 'text-green-600';
                    } else if (checkedCount > 0) {
                      statusText = `${checkedCount}/${totalCount} - Partially Checked`;
                      statusColor = 'text-orange-600';
                    } else {
                      statusText = `${totalCount}/${totalCount} - None Checked`;
                      statusColor = 'text-red-600';
                    }
                    
                    return (
                      <Button
                        key={itemName}
                        variant="outline"
                        className="w-full justify-start text-left p-3"
                        onClick={() => {
                          bulkCheckInspectionItemsMutation.mutate({
                            itemName,
                            propertyId: propertyId
                          });
                        }}
                        disabled={bulkCheckInspectionItemsMutation.isPending || totalCount === 0}
                      >
                        <div className="flex items-center w-full">
                          <CheckCircle2 className="w-4 h-4 mr-2 flex-shrink-0" />
                          <div className="flex-1">
                            <div className="font-medium">{itemName}</div>
                            <div className={`text-xs ${statusColor}`}>
                              {statusText}
                            </div>
                          </div>
                        </div>
                      </Button>
                    );
                  });
                })()}
              </div>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowBulkCheckModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Document Viewer Modal */}
      <Dialog open={!!selectedCertificate} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl w-[90vw] h-[80vh] p-0">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center justify-between">
              <span>{selectedCertificate?.certificateName}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleCloseModal}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {documentUrl && (
            <div className="flex-1 px-6 pb-6">
              <iframe
                src={documentUrl}
                title={selectedCertificate?.certificateName}
                className="w-full h-[60vh] border rounded-md"
                style={{ minHeight: '500px' }}
                onLoad={() => console.log('PDF iframe loaded successfully')}
                onError={() => console.error('PDF iframe failed to load')}
              />
              {/* Fallback link if iframe doesn't work */}
              <div className="mt-2 text-center">
                <a 
                  href={documentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Can't see the document? Click here to open in a new tab
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Property Confirmation Dialog */}
      <Dialog open={showDeletePropertyDialog} onOpenChange={setShowDeletePropertyDialog}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-lg font-medium text-gray-900 mb-2">Delete Property</DialogTitle>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete this property?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-800">
                This will permanently remove the property and all its rooms and inspection items. This action cannot be undone.
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={() => setShowDeletePropertyDialog(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deletePropertyMutation.mutate();
                  setShowDeletePropertyDialog(false);
                }}
                disabled={deletePropertyMutation.isPending}
              >
                {deletePropertyMutation.isPending ? 'Deleting...' : 'Delete Property'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Certificate Confirmation Dialog */}
      {certificateToDelete && (
        <Dialog open={true} onOpenChange={() => setCertificateToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-medium text-gray-900 mb-2">Delete Certificate</DialogTitle>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete "{certificateToDelete.name}"?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  This will permanently remove the certificate. This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={() => setCertificateToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteCertificateMutation.mutate(certificateToDelete.id);
                    setCertificateToDelete(null);
                  }}
                  disabled={deleteCertificateMutation.isPending}
                >
                  {deleteCertificateMutation.isPending ? 'Deleting...' : 'Delete Certificate'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Room Confirmation Dialog */}
      {roomToDelete && (
        <Dialog open={true} onOpenChange={() => setRoomToDelete(null)}>
          <DialogContent className="sm:max-w-md">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <Trash2 className="h-6 w-6 text-red-600" />
              </div>
              <DialogTitle className="text-lg font-medium text-gray-900 mb-2">Delete Room</DialogTitle>
              <p className="text-sm text-gray-500 mb-4">
                Are you sure you want to delete "{roomToDelete.name}"?
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
                <p className="text-sm text-yellow-800">
                  This will permanently remove the room and all inspection items. This action cannot be undone.
                </p>
              </div>
              <div className="flex justify-center space-x-3">
                <Button variant="outline" onClick={() => setRoomToDelete(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    deleteRoomMutation.mutate(roomToDelete.id);
                    setRoomToDelete(null);
                  }}
                  disabled={deleteRoomMutation.isPending}
                >
                  {deleteRoomMutation.isPending ? 'Deleting...' : 'Delete Room'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

    </div>
  );
}