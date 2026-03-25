import { useState, useEffect, useRef } from 'react';
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
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  insertPropertyRoomSchema, insertInspectionItemSchema,
  type PropertyRoom, type InspectionItem, type Property, type ServiceProvider,
  TRADE_CATEGORIES, TRADE_CATEGORY_LABELS, type TradeCategory
} from '@shared/schema';
import { 
  Home, Plus, Settings, Trash2, Edit, CheckCircle2, AlertCircle, 
  Bath, Bed, ChefHat, Sofa, Car, Hammer, TreePine, Building, Wrench,
  Users, Utensils, Shirt, Warehouse, Store, Briefcase, Zap, Wind,
  Sun, Shield, Wifi, BookOpen, Gamepad2, Baby, Dog, Coffee, Camera, Check, X, Waves, Ban, History
} from 'lucide-react';
import { ComplianceStatusBadge, PhotoRequiredIndicator } from '@/components/compliance/compliance-status-badge';
import { ComplianceDateSection } from '@/components/compliance/compliance-date-section';
import { ComplianceSummaryPanel } from '@/components/compliance/compliance-summary-panel';

const roomFormSchema = insertPropertyRoomSchema.extend({
  propertyId: z.number().optional(),
  materialType: z.string().optional()
});

const editRoomFormSchema = z.object({
  roomName: z.string().min(1, 'Room name is required'),
  description: z.string().optional(),
  floor: z.number().optional(),
  lastInspectionDate: z.date().nullable().optional(),
  nextInspectionDate: z.date().nullable().optional(),
  inspectionFrequencyDays: z.number().min(1).optional(),
});

const inspectionFormSchema = insertInspectionItemSchema.extend({
  roomId: z.number().optional()
});

type RoomFormData = z.infer<typeof roomFormSchema>;
type EditRoomFormData = z.infer<typeof editRoomFormSchema>;
type InspectionFormData = z.infer<typeof inspectionFormSchema>;

const roomTypes = [
  // Bedrooms
  { value: 'master_bedroom', label: 'Master Bedroom', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_1', label: 'Bedroom 1', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_2', label: 'Bedroom 2', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_3', label: 'Bedroom 3', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_4', label: 'Bedroom 4', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_5', label: 'Bedroom 5', icon: Bed, category: 'Bedrooms' },
  { value: 'guest_bedroom', label: 'Guest Bedroom', icon: Bed, category: 'Bedrooms' },
  { value: 'kids_bedroom', label: 'Kids Bedroom', icon: Baby, category: 'Bedrooms' },
  
  // Bathrooms
  { value: 'main_bathroom', label: 'Main Bathroom', icon: Bath, category: 'Bathrooms' },
  { value: 'master_ensuite', label: 'Master Ensuite', icon: Bath, category: 'Bathrooms' },
  { value: 'powder_room', label: 'Powder Room', icon: Bath, category: 'Bathrooms' },
  { value: 'guest_bathroom', label: 'Guest Bathroom', icon: Bath, category: 'Bathrooms' },
  
  // Living Areas
  { value: 'living_room', label: 'Living Room', icon: Sofa, category: 'Living Areas' },
  { value: 'family_room', label: 'Family Room', icon: Users, category: 'Living Areas' },
  { value: 'lounge', label: 'Lounge', icon: Sofa, category: 'Living Areas' },
  { value: 'dining_room', label: 'Dining Room', icon: Utensils, category: 'Living Areas' },
  { value: 'breakfast_nook', label: 'Breakfast Nook', icon: Coffee, category: 'Living Areas' },
  
  // Kitchen & Utility
  { value: 'kitchen', label: 'Kitchen', icon: ChefHat, category: 'Kitchen & Utility' },
  { value: 'pantry', label: 'Pantry', icon: Warehouse, category: 'Kitchen & Utility' },
  { value: 'laundry', label: 'Laundry Room', icon: Shirt, category: 'Kitchen & Utility' },
  { value: 'butler_pantry', label: 'Butler\'s Pantry', icon: Utensils, category: 'Kitchen & Utility' },
  
  // Work & Study
  { value: 'office', label: 'Office', icon: Briefcase, category: 'Work & Study' },
  { value: 'study', label: 'Study', icon: BookOpen, category: 'Work & Study' },
  { value: 'library', label: 'Library', icon: BookOpen, category: 'Work & Study' },
  { value: 'home_office', label: 'Home Office', icon: Home, category: 'Work & Study' },
  
  // Entertainment
  { value: 'media_room', label: 'Media Room', icon: Sofa, category: 'Entertainment' },
  { value: 'theater_room', label: 'Theater Room', icon: Gamepad2, category: 'Entertainment' },
  { value: 'game_room', label: 'Game Room', icon: Gamepad2, category: 'Entertainment' },
  { value: 'music_room', label: 'Music Room', icon: Home, category: 'Entertainment' },
  
  // Storage & Utility
  { value: 'garage', label: 'Garage', icon: Car, category: 'Storage & Utility' },
  { value: 'storage_room', label: 'Storage Room', icon: Warehouse, category: 'Storage & Utility' },
  { value: 'closet', label: 'Walk-in Closet', icon: Shirt, category: 'Storage & Utility' },
  { value: 'basement', label: 'Basement', icon: Building, category: 'Storage & Utility' },
  { value: 'attic', label: 'Attic', icon: Home, category: 'Storage & Utility' },
  { value: 'utility_room', label: 'Utility Room', icon: Wrench, category: 'Storage & Utility' },
  
  // Outdoor & Exterior
  { value: 'balcony', label: 'Balcony', icon: Sun, category: 'Outdoor & Exterior' },
  { value: 'patio', label: 'Patio', icon: Sun, category: 'Outdoor & Exterior' },
  { value: 'deck', label: 'Deck', icon: TreePine, category: 'Outdoor & Exterior' },
  { value: 'garden', label: 'Garden', icon: TreePine, category: 'Outdoor & Exterior' },
  { value: 'courtyard', label: 'Courtyard', icon: Sun, category: 'Outdoor & Exterior' },
  { value: 'roof_terrace', label: 'Roof Terrace', icon: Building, category: 'Outdoor & Exterior' },
  { value: 'roof', label: 'Roof', icon: Shield, category: 'Outdoor & Exterior' },
  { value: 'gutters', label: 'Gutters', icon: Wind, category: 'Outdoor & Exterior' },
  { value: 'pool', label: 'Pool', icon: Waves, category: 'Outdoor & Exterior' },
  
  // Specialty Rooms
  { value: 'gym', label: 'Gym/Exercise Room', icon: Shield, category: 'Specialty' },
  { value: 'wine_cellar', label: 'Wine Cellar', icon: Warehouse, category: 'Specialty' },
  { value: 'sauna', label: 'Sauna', icon: Wind, category: 'Specialty' },
  { value: 'craft_room', label: 'Craft Room', icon: Hammer, category: 'Specialty' },
  { value: 'pet_room', label: 'Pet Room', icon: Dog, category: 'Specialty' },
  
  // Commercial Spaces
  { value: 'reception', label: 'Reception Area', icon: Users, category: 'Commercial' },
  { value: 'conference_room', label: 'Conference Room', icon: Users, category: 'Commercial' },
  { value: 'boardroom', label: 'Boardroom', icon: Briefcase, category: 'Commercial' },
  { value: 'break_room', label: 'Break Room', icon: Coffee, category: 'Commercial' },
  { value: 'server_room', label: 'Server Room', icon: Wifi, category: 'Commercial' },
  { value: 'retail_space', label: 'Retail Space', icon: Store, category: 'Commercial' },
  { value: 'warehouse_space', label: 'Warehouse Space', icon: Warehouse, category: 'Commercial' },
  { value: 'workshop', label: 'Workshop', icon: Hammer, category: 'Commercial' },
  
  // Other
  { value: 'other', label: 'Other (Custom Name)', icon: Home, category: 'Other' },
];

const inspectionCategories = [
  // Core Systems
  { value: 'plumbing', label: 'Plumbing', color: 'bg-blue-100 text-blue-800', group: 'Core Systems' },
  { value: 'electrical', label: 'Electrical', color: 'bg-yellow-100 text-yellow-800', group: 'Core Systems' },
  { value: 'hvac', label: 'HVAC & Climate', color: 'bg-green-100 text-green-800', group: 'Core Systems' },
  
  // Structural & Exterior
  { value: 'structural', label: 'Structural', color: 'bg-gray-100 text-gray-800', group: 'Structural & Exterior' },
  { value: 'roofing', label: 'Roofing & Gutters', color: 'bg-slate-100 text-slate-800', group: 'Structural & Exterior' },
  { value: 'exterior', label: 'Exterior & Facades', color: 'bg-stone-100 text-stone-800', group: 'Structural & Exterior' },
  { value: 'windows_doors', label: 'Windows & Doors', color: 'bg-zinc-100 text-zinc-800', group: 'Structural & Exterior' },
  
  // Outdoor & Landscaping
  { value: 'deck_patio', label: 'Decks & Patios', color: 'bg-amber-100 text-amber-800', group: 'Outdoor & Landscaping' },
  { value: 'landscaping', label: 'Landscaping & Drainage', color: 'bg-lime-100 text-lime-800', group: 'Outdoor & Landscaping' },
  { value: 'fencing', label: 'Fencing & Gates', color: 'bg-emerald-100 text-emerald-800', group: 'Outdoor & Landscaping' },
  
  // Interior & Fixtures
  { value: 'fixtures', label: 'Fixtures & Fittings', color: 'bg-purple-100 text-purple-800', group: 'Interior & Fixtures' },
  { value: 'flooring', label: 'Flooring & Carpets', color: 'bg-violet-100 text-violet-800', group: 'Interior & Fixtures' },
  { value: 'furnishings', label: 'Window Furnishings', color: 'bg-fuchsia-100 text-fuchsia-800', group: 'Interior & Fixtures' },
  { value: 'kitchen', label: 'Kitchen Systems', color: 'bg-orange-100 text-orange-800', group: 'Interior & Fixtures' },
  { value: 'bathroom', label: 'Bathroom Systems', color: 'bg-cyan-100 text-cyan-800', group: 'Interior & Fixtures' },
  
  // Safety & Security
  { value: 'safety', label: 'Safety Systems', color: 'bg-red-100 text-red-800', group: 'Safety & Security' },
  { value: 'security', label: 'Security Systems', color: 'bg-pink-100 text-pink-800', group: 'Safety & Security' },
  { value: 'fire_safety', label: 'Fire Safety', color: 'bg-rose-100 text-rose-800', group: 'Safety & Security' },
  
  // Specialty & Others  
  { value: 'pest_control', label: 'Pest Control', color: 'bg-red-100 text-red-800', group: 'Specialty & Others' },
  { value: 'technology', label: 'Technology & AV', color: 'bg-indigo-100 text-indigo-800', group: 'Specialty & Others' },
  { value: 'mechanical', label: 'Mechanical Systems', color: 'bg-teal-100 text-teal-800', group: 'Specialty & Others' },
  { value: 'general', label: 'General Maintenance', color: 'bg-gray-100 text-gray-800', group: 'Specialty & Others' },
];

const frequencyOptions = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'biannual', label: 'Bi-Annual' },
  { value: 'annual', label: 'Annual' },
];

const priorityOptions = [
  { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800' },
  { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' },
];

const commonInspectionItems = [
  // Core Systems - Electrical
  { value: 'light_switches', label: 'Light switches - functionality and safety', category: 'Core Systems' },
  { value: 'power_outlets', label: 'Power outlets (GPOs) - safety and function', category: 'Core Systems' },
  { value: 'ceiling_fan', label: 'Ceiling fan - operation and stability', category: 'Core Systems' },
  { value: 'air_conditioning', label: 'Air conditioning - operation and filters', category: 'Core Systems' },
  { value: 'heating_system', label: 'Heating system - operation and safety', category: 'Core Systems' },
  { value: 'exhaust_fan', label: 'Exhaust fan - operation and cleanliness', category: 'Core Systems' },
  { value: 'tv_points', label: 'TV points and antenna connections', category: 'Core Systems' },
  
  // Core Systems - Plumbing  
  { value: 'taps_fittings', label: 'Taps - fittings and connections', category: 'Core Systems' },
  { value: 'toilet_function', label: 'Toilet - flushing and water level', category: 'Core Systems' },
  { value: 'shower_pressure', label: 'Shower - water pressure and temperature', category: 'Core Systems' },
  { value: 'bath_drainage', label: 'Bath and shower - drainage and sealing', category: 'Core Systems' },
  { value: 'kitchen_taps', label: 'Kitchen taps - operation and leaks', category: 'Core Systems' },
  { value: 'laundry_taps', label: 'Laundry taps - hot and cold water', category: 'Core Systems' },
  { value: 'laundry_drainage', label: 'Laundry drainage - flow and blockages', category: 'Core Systems' },
  
  // Structural & Exterior - Roofing
  { value: 'roof_screws_fasteners', label: 'Roofing - Screw/fastener condition and security', category: 'Structural & Exterior' },
  { value: 'roof_sheets_tiles', label: 'Roofing - Sheet/tile condition and alignment', category: 'Structural & Exterior' },
  { value: 'ridge_capping', label: 'Roofing - Ridge capping defects and sealing', category: 'Structural & Exterior' },
  { value: 'roof_edge_eave', label: 'Roofing - Edge/eave condition and drainage', category: 'Structural & Exterior' },
  { value: 'roof_ventilation', label: 'Roofing - Ventilation systems and airflow', category: 'Structural & Exterior' },
  { value: 'roof_weatherproofing', label: 'Roofing - Weatherproofing and flashing', category: 'Structural & Exterior' },
  { value: 'roof_gutters', label: 'Roofing - Gutter alignment and blockages', category: 'Structural & Exterior' },
  { value: 'roof_downpipes', label: 'Roofing - Downpipe condition and drainage', category: 'Structural & Exterior' },
  { value: 'roof_membrane', label: 'Roofing - Membrane integrity and waterproofing', category: 'Structural & Exterior' },
  { value: 'roof_insulation', label: 'Roofing - Insulation condition and coverage', category: 'Structural & Exterior' },
  { value: 'roof_penetrations', label: 'Roofing - Penetration sealing (vents, pipes)', category: 'Structural & Exterior' },
  { value: 'roof_solar_panels', label: 'Roofing - Solar panel mounting and condition', category: 'Structural & Exterior' },
  
  // Structural & Exterior - Windows & Doors
  { value: 'window_locks', label: 'Window locks - security and operation', category: 'Structural & Exterior' },
  { value: 'door_handles', label: 'Door handles and locks - function and security', category: 'Structural & Exterior' },
  { value: 'windows_glass', label: 'Windows and glass - cracks and cleanliness', category: 'Structural & Exterior' },
  
  // Interior & Fixtures
  { value: 'flooring', label: 'Flooring - condition and safety', category: 'Interior & Fixtures' },
  { value: 'walls_paint', label: 'Walls and paint - condition and cleanliness', category: 'Interior & Fixtures' },
  { value: 'tiles_grout', label: 'Tiles and grout - condition and cleanliness', category: 'Interior & Fixtures' },
  { value: 'dishwasher', label: 'Dishwasher - operation and connections', category: 'Interior & Fixtures' },
  { value: 'rangehood', label: 'Rangehood - operation and filter condition', category: 'Interior & Fixtures' },
  { value: 'oven_cooktop', label: 'Oven and cooktop - operation and safety', category: 'Interior & Fixtures' },
  { value: 'refrigerator_space', label: 'Refrigerator space - power and ventilation', category: 'Interior & Fixtures' },
  { value: 'dryer_vent', label: 'Dryer vent - clearance and ventilation', category: 'Interior & Fixtures' },
  
  // Safety & Security
  { value: 'smoke_detector', label: 'Smoke detector - battery and operation', category: 'Safety & Security' },
  
  // Custom option
  { value: 'custom', label: 'Custom item (type your own)', category: 'Custom' },
];

interface PropertyRoomsModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  autoOpenAddForm?: boolean;
  initialSelectedRoomId?: number | null;
  inspectionRoomId?: number | null;
  allInspectionItems?: InspectionItem[];
}

export default function PropertyRoomsModal({ property, isOpen, onClose, autoOpenAddForm = false, initialSelectedRoomId, inspectionRoomId, allInspectionItems: propInspectionItems }: PropertyRoomsModalProps) {
  // Early return if property is not available
  if (!property) return null;
  const { toast } = useToast();
  const [selectedRoom, setSelectedRoom] = useState<PropertyRoom | null>(null);
  const [isAddingRoom, setIsAddingRoom] = useState(autoOpenAddForm);
  const [isAddingInspection, setIsAddingInspection] = useState(false);
  const [showRoomDropdown, setShowRoomDropdown] = useState(autoOpenAddForm);
  const [showInspectionPopup, setShowInspectionPopup] = useState(false);
  const [selectedInspectionItem, setSelectedInspectionItem] = useState<InspectionItem | null>(null);
  const [isInspectionCompleted, setIsInspectionCompleted] = useState(false);
  const [selectedInspectionItemType, setSelectedInspectionItemType] = useState<string>('');
  const [showCustomItemName, setShowCustomItemName] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState<PropertyRoom | null>(null);
  const [inspectionItemToDelete, setInspectionItemToDelete] = useState<InspectionItem | null>(null);
  const [showBulkCheckModal, setShowBulkCheckModal] = useState(false);

  const [selectedRoomType, setSelectedRoomType] = useState<string>('master_bedroom');
  const [showRoofMaterialModal, setShowRoofMaterialModal] = useState(false);
  const [pendingRoofData, setPendingRoofData] = useState<any>(null);
  const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [editingRoom, setEditingRoom] = useState<PropertyRoom | null>(null);
  const [showEditRoomDialog, setShowEditRoomDialog] = useState(false);
  const [inspectionPopupRoom, setInspectionPopupRoom] = useState<PropertyRoom | null>(null);
  const noteUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  
  // Camera capture states
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [currentInspectionItem, setCurrentInspectionItem] = useState<InspectionItem | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // History drawer state
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyItem, setHistoryItem] = useState<InspectionItem | null>(null);

  // Reset showRoomDropdown when modal opens with autoOpenAddForm
  useEffect(() => {
    if (isOpen && autoOpenAddForm) {
      setShowRoomDropdown(true);
      setSelectedRoom(null);
    }
  }, [isOpen, autoOpenAddForm]);

  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['/api/properties', property.id, 'rooms'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/${property.id}/rooms`);
      return response.json() as Promise<PropertyRoom[]>;
    },
    enabled: isOpen && !!property?.id,
  });

  const { data: inspectionItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/rooms', selectedRoom?.id, 'inspection-items'],
    queryFn: async () => {
      if (!selectedRoom) return [];
      const response = await authenticatedApiRequest('GET', `/api/rooms/${selectedRoom.id}/inspection-items`);
      return response.json() as Promise<InspectionItem[]>;
    },
    enabled: !!selectedRoom,
  });

  // Query to get all inspection items for all rooms (for completion calculation)
  const { data: allInspectionItems } = useQuery({
    queryKey: ['/api/properties', property.id, 'all-inspection-items'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/${property.id}/inspection-items`);
      return response.json() as Promise<InspectionItem[]>;
    },
    enabled: isOpen && !!property?.id,
  });

  // Query to get contractors for the property (for assigning to inspection items)
  const { data: contractors } = useQuery<ServiceProvider[]>({
    queryKey: ['/api/contractors/property', property.id],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/contractors/property/${property.id}`);
      return response.json();
    },
    enabled: isOpen && !!property?.id,
  });

  const roomForm = useForm<RoomFormData>({
    resolver: zodResolver(roomFormSchema),
    defaultValues: {
      roomName: '',
      roomType: '',
      floor: 1,
      description: '',
    },
  });

  const inspectionForm = useForm<InspectionFormData>({
    resolver: zodResolver(inspectionFormSchema),
    defaultValues: {
      category: 'general',
      itemName: '',
      description: '',
      frequency: 'quarterly',
      priority: 'medium',
      tradeCategory: undefined,
      assignedContractorId: undefined,
      contractorNotes: '',
    },
  });

  const addRoomMutation = useMutation({
    mutationFn: async (data: RoomFormData) => {
      const roomData = {
        ...data,
        propertyId: property.id
      };
      const response = await authenticatedApiRequest('POST', `/api/properties/${property.id}/rooms`, roomData);
      return response.json();
    },
    onSuccess: async (newRoom) => {
      await queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      toast({ title: 'Success', description: 'Room added successfully - click to add inspection items' });
      setIsAddingRoom(false);
      roomForm.reset();
      // Auto-select the newly added room so user can immediately add inspection items
      if (newRoom && newRoom.id) {
        setSelectedRoom(newRoom);
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add room', variant: 'destructive' });
    },
  });

  const generateRoomsMutation = useMutation({
    mutationFn: async () => {
      const response = await authenticatedApiRequest('POST', `/api/properties/${property.id}/rooms/generate`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      toast({ title: 'Success', description: 'Rooms generated automatically based on property details' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to generate rooms', variant: 'destructive' });
    },
  });

  const addInspectionMutation = useMutation({
    mutationFn: async (data: InspectionFormData) => {
      if (!selectedRoom) throw new Error('No room selected');
      const response = await authenticatedApiRequest('POST', `/api/rooms/${selectedRoom.id}/inspection-items`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', selectedRoom?.id, 'inspection-items'] });
      toast({ title: 'Success', description: 'Inspection item added successfully' });
      setIsAddingInspection(false);
      inspectionForm.reset();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add inspection item', variant: 'destructive' });
    },
  });

  const editRoomForm = useForm<EditRoomFormData>({
    resolver: zodResolver(editRoomFormSchema),
    defaultValues: {
      roomName: '',
      description: '',
      floor: 0,
      lastInspectionDate: null,
      nextInspectionDate: null,
      inspectionFrequencyDays: 90,
    },
  });

  // Populate edit form when editing room is set
  useEffect(() => {
    if (editingRoom) {
      editRoomForm.reset({
        roomName: editingRoom.roomName,
        description: editingRoom.description || '',
        floor: editingRoom.floor ?? 0,
        lastInspectionDate: editingRoom.lastInspectionDate ? new Date(editingRoom.lastInspectionDate) : null,
        nextInspectionDate: editingRoom.nextInspectionDate ? new Date(editingRoom.nextInspectionDate) : null,
        inspectionFrequencyDays: editingRoom.inspectionFrequencyDays || 90,
      });
    }
  }, [editingRoom, editRoomForm]);

  const onEditRoomSubmit = (data: EditRoomFormData) => {
    if (!editingRoom) return;
    updateRoomMutation.mutate({
      roomId: editingRoom.id,
      updates: data,
    });
  };

  // Add mutation for updating inspection item completion
  const updateInspectionItemMutation = useMutation({
    mutationFn: async (data: { 
      itemId: number; 
      isCompleted: boolean; 
      notes?: string;
      isNotApplicable?: boolean;
      notApplicableReason?: string | null;
      condition?: string | null;
      lastInspectedDate?: Date | null;
    }) => {
      const updates: Record<string, any> = {
        isCompleted: data.isCompleted,
        completedDate: data.isCompleted ? new Date().toISOString() : null,
        notes: data.notes || null
      };
      
      // Add N/A fields if provided
      if (data.isNotApplicable !== undefined) {
        updates.isNotApplicable = data.isNotApplicable;
        updates.notApplicableReason = data.notApplicableReason || null;
      }
      
      // Add condition if provided
      if (data.condition !== undefined) {
        updates.condition = data.condition;
      }
      
      // Add lastInspectedDate if provided
      if (data.lastInspectedDate !== undefined) {
        updates.lastInspectedDate = data.lastInspectedDate ? data.lastInspectedDate.toISOString() : null;
      }
      
      console.log('Updating inspection item:', data.itemId, 'with data:', updates);
      const response = await authenticatedApiRequest('PUT', `/api/inspection-items/${data.itemId}`, updates);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to update' }));
        console.error('Update failed:', errorData);
        if (errorData.code === 'CERTIFICATE_REQUIRED') {
          throw new Error('CERTIFICATE_REQUIRED');
        }
        if (errorData.code === 'PHOTO_REQUIRED') {
          throw new Error('PHOTO_REQUIRED');
        }
        throw new Error(errorData.message || 'Failed to update inspection item');
      }
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Clear local notes for this item since it's now saved
      setLocalNotes(prev => {
        const updated = { ...prev };
        delete updated[variables.itemId];
        return updated;
      });
      
      // Invalidate all related queries to trigger re-fetch and UI updates
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', selectedRoom?.id, 'inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
      
      // Force refetch the all items query immediately for left panel updates
      queryClient.refetchQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
      
      toast({ title: 'Success', description: 'Inspection item updated successfully' });
    },
    onError: (error: Error) => {
      console.error('Mutation error:', error);
      if (error.message === 'CERTIFICATE_REQUIRED') {
        toast({ 
          title: 'Certificate Required', 
          description: 'Professional inspections require a valid compliance certificate. Upload a certificate to mark this item as complete.',
          variant: 'destructive'
        });
      } else if (error.message === 'PHOTO_REQUIRED') {
        toast({ 
          title: 'Photo Required', 
          description: 'This item requires photo evidence for compliance. Please capture a photo before marking as complete.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Error', description: 'Failed to update inspection item', variant: 'destructive' });
      }
      // Re-fetch to reset checkbox state
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
    },
  });

  // Calculate room completion percentage and color
  // N/A items count as "checked" since user made a deliberate decision about them
  const getRoomCompletionInfo = (roomId: number, allRooms: PropertyRoom[], allItems: InspectionItem[]) => {
    const roomItems = allItems.filter(item => item.roomId === roomId);
    if (roomItems.length === 0) return { percentage: 0, color: 'bg-gray-200', textColor: 'text-gray-600' };
    
    // Count both completed AND N/A items as "checked"
    const checkedItems = roomItems.filter(item => item.isCompleted || item.isNotApplicable);
    const percentage = Math.round((checkedItems.length / roomItems.length) * 100);
    
    if (percentage === 100) {
      return { percentage, color: 'bg-green-500', textColor: 'text-white' };
    } else if (percentage >= 75) {
      return { percentage, color: 'bg-amber-500', textColor: 'text-white' };
    } else if (percentage >= 50) {
      return { percentage, color: 'bg-red-500', textColor: 'text-white' };
    } else {
      return { percentage, color: 'bg-gray-300', textColor: 'text-gray-700' };
    }
  };

  // Auto-open add room form when autoOpenAddForm is true or auto-select room when initialSelectedRoomId is provided
  useEffect(() => {
    if (isOpen && autoOpenAddForm) {
      setIsAddingRoom(true);
      setSelectedRoom(null);
    } else if (isOpen && initialSelectedRoomId && rooms) {
      const targetRoom = rooms.find(room => room.id === initialSelectedRoomId);
      if (targetRoom) {
        setSelectedRoom(targetRoom);
        setIsAddingRoom(false);
      }
    }
  }, [isOpen, autoOpenAddForm, initialSelectedRoomId, rooms]);

  // Reset form state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setIsAddingRoom(autoOpenAddForm);
      setSelectedRoom(null);
      setIsAddingInspection(false);
      roomForm.reset();
      inspectionForm.reset();
    }
  }, [isOpen, autoOpenAddForm, roomForm, inspectionForm]);

  const addBulkInspectionsMutation = useMutation({
    mutationFn: async ({ roomId, template }: { roomId: number; template: string }) => {
      const response = await authenticatedApiRequest('POST', `/api/rooms/${roomId}/inspection-items/bulk`, {
        template
      });
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', variables.roomId, 'inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
      toast({ title: 'Success', description: 'Standard inspection items added successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add inspection items', variant: 'destructive' });
    },
  });

  // Define room types that use specialized bulk templates (not standard interior items)
  const exteriorRoomTypes = ['roof', 'gutters', 'pool', 'deck', 'patio', 'balcony', 'garden', 'courtyard', 'roof_terrace'];
  
  // Define room types that are storage/utility (may not need windows/window furnishings)
  const storageRoomTypes = ['garage', 'storage_room', 'closet', 'basement', 'attic', 'utility_room', 'server_room', 'warehouse_space', 'workshop'];

  // Function to get standard inspection items based on room type
  const getStandardInspectionItems = (roomType: string) => {
    // Common interior items (for bedrooms, living areas, etc.)
    const commonItems = [
      { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
      { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
      { itemName: 'Smoke Detectors', category: 'safety', description: 'Test smoke detector functionality and battery', priority: 'high' },
      { itemName: 'Windows', category: 'windows_doors', description: 'Inspect window condition, operation, locks, and seals', priority: 'medium' },
      { itemName: 'Window Furnishings', category: 'furnishings', description: 'Check condition of curtains, blinds, and window treatments', priority: 'low' },
      { itemName: 'Air Conditioning', category: 'hvac', description: 'Test air conditioning system operation and filters', priority: 'medium' }
    ];

    // Storage room items (Light Switch, Power Points, but not always Windows/Window Furnishings)
    const storageItems = [
      { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
      { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
      { itemName: 'Smoke Detectors', category: 'safety', description: 'Test smoke detector functionality and battery', priority: 'high' }
    ];

    // Bathroom items (no Window Furnishings typically, add plumbing items)
    const bathroomBase = [
      { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
      { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
      { itemName: 'Exhaust Fan', category: 'electrical', description: 'Test bathroom ventilation fan', priority: 'medium' },
      { itemName: 'Taps - Fittings and Connections', category: 'plumbing', description: 'Check for leaks and proper water flow', priority: 'high' },
      { itemName: 'Toilet', category: 'plumbing', description: 'Check flush mechanism and seals', priority: 'high' },
      { itemName: 'Shower/Bath', category: 'plumbing', description: 'Inspect drainage and water pressure', priority: 'medium' },
      { itemName: 'Silicone Inspection', category: 'plumbing', description: 'Check silicone seals around bath, shower, and sink for cracks or mould', priority: 'medium' },
      { itemName: 'Grout Inspection', category: 'structural', description: 'Inspect tile grout for cracks, discoloration, or water damage', priority: 'medium' }
    ];

    const roomSpecificItems: { [key: string]: any[] } = {
      // Bedrooms
      'master_bedroom': [...commonItems, 
        { itemName: 'Ceiling Fan', category: 'electrical', description: 'Check ceiling fan operation and stability', priority: 'medium' },
        { itemName: 'Window Locks', category: 'security', description: 'Ensure window locks are secure and functional', priority: 'medium' }
      ],
      'bedroom_1': commonItems,
      'bedroom_2': commonItems,
      'bedroom_3': commonItems,
      'bedroom_4': commonItems,
      'bedroom_5': commonItems,
      'guest_bedroom': commonItems,
      'kids_bedroom': commonItems,

      // Bathrooms - use bathroom-specific items
      'main_bathroom': bathroomBase,
      'master_ensuite': bathroomBase,
      'powder_room': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Exhaust Fan', category: 'electrical', description: 'Test bathroom ventilation fan', priority: 'medium' },
        { itemName: 'Taps - Fittings and Connections', category: 'plumbing', description: 'Check for leaks and proper water flow', priority: 'high' },
        { itemName: 'Toilet', category: 'plumbing', description: 'Check flush mechanism and seals', priority: 'high' },
        { itemName: 'Silicone Inspection', category: 'plumbing', description: 'Check silicone seals around sink for cracks or mould', priority: 'medium' }
      ],
      'guest_bathroom': bathroomBase,
      'toilet': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Exhaust Fan', category: 'electrical', description: 'Test bathroom ventilation fan', priority: 'medium' },
        { itemName: 'Toilet', category: 'plumbing', description: 'Check flush mechanism and seals', priority: 'high' }
      ],

      // Kitchen
      'kitchen': [...commonItems,
        { itemName: 'Kitchen Taps - Fittings and Connections', category: 'plumbing', description: 'Check kitchen sink taps for leaks', priority: 'high' },
        { itemName: 'Dishwasher Connection', category: 'plumbing', description: 'Check dishwasher water connections', priority: 'medium' },
        { itemName: 'Rangehood', category: 'electrical', description: 'Test rangehood extraction and lighting', priority: 'medium' },
        { itemName: 'Oven/Cooktop', category: 'electrical', description: 'Check oven and cooktop functionality', priority: 'medium' }
      ],
      'pantry': storageItems,
      'butler_pantry': [...storageItems,
        { itemName: 'Taps - Fittings and Connections', category: 'plumbing', description: 'Check butler pantry sink taps for leaks', priority: 'high' }
      ],

      // Laundry
      'laundry': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
        { itemName: 'Laundry Taps - Fittings and Connections', category: 'plumbing', description: 'Check washing machine water connections', priority: 'high' },
        { itemName: 'Drainage', category: 'plumbing', description: 'Inspect floor waste and drainage', priority: 'medium' },
        { itemName: 'Dryer Vent', category: 'electrical', description: 'Check dryer ventilation system', priority: 'medium' }
      ],

      // Living Areas (Air Conditioning already in commonItems)
      'living_room': [...commonItems,
        { itemName: 'TV Points', category: 'electrical', description: 'Check television antenna/cable connections', priority: 'low' }
      ],
      'family_room': commonItems,
      'lounge': commonItems,
      'dining_room': commonItems,
      'breakfast_nook': commonItems,

      // Work & Study
      'office': [...commonItems,
        { itemName: 'Data/Network Points', category: 'electrical', description: 'Check data and network connections', priority: 'low' }
      ],
      'study': [...commonItems,
        { itemName: 'Data/Network Points', category: 'electrical', description: 'Check data and network connections', priority: 'low' }
      ],
      'library': commonItems,
      'home_office': [...commonItems,
        { itemName: 'Data/Network Points', category: 'electrical', description: 'Check data and network connections', priority: 'low' }
      ],

      // Entertainment (Air Conditioning already in commonItems)
      'media_room': [...commonItems,
        { itemName: 'TV/AV Points', category: 'electrical', description: 'Check audiovisual connections', priority: 'low' }
      ],
      'theater_room': commonItems,
      'game_room': commonItems,
      'music_room': commonItems,

      // Storage & Utility - no Windows/Window Furnishings
      'garage': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'medium' },
        { itemName: 'Smoke Detectors', category: 'safety', description: 'Test smoke detector functionality and battery', priority: 'high' },
        { itemName: 'Garage Door', category: 'structural', description: 'Check garage door operation and safety sensors', priority: 'high' },
        { itemName: 'Hot Water System', category: 'plumbing', description: 'Inspect hot water system and PTR valve', priority: 'high' }
      ],
      'storage_room': storageItems,
      'closet': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' }
      ],
      'basement': [...storageItems,
        { itemName: 'Sump Pump', category: 'plumbing', description: 'Test sump pump operation if present', priority: 'high' }
      ],
      'attic': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Insulation', category: 'structural', description: 'Inspect attic insulation condition', priority: 'medium' }
      ],
      'utility_room': [...storageItems,
        { itemName: 'Hot Water System', category: 'plumbing', description: 'Inspect hot water system and PTR valve', priority: 'high' }
      ],

      // Specialty Rooms (Air Conditioning already in commonItems)
      'gym': commonItems,
      'wine_cellar': [
        { itemName: 'Light Switch', category: 'electrical', description: 'Check operation and condition of light switches', priority: 'medium' },
        { itemName: 'Climate Control', category: 'hvac', description: 'Check wine cellar climate control system', priority: 'high' }
      ],
      'sauna': [
        { itemName: 'Heating Element', category: 'electrical', description: 'Inspect sauna heater and controls', priority: 'high' },
        { itemName: 'Ventilation', category: 'hvac', description: 'Check sauna ventilation', priority: 'medium' }
      ],
      'craft_room': commonItems,
      'pet_room': [...commonItems,
        { itemName: 'Drainage', category: 'plumbing', description: 'Inspect floor waste and drainage', priority: 'medium' }
      ],

      // Commercial Spaces (Air Conditioning already in commonItems)
      'reception': commonItems,
      'conference_room': commonItems,
      'boardroom': commonItems,
      'break_room': [...commonItems,
        { itemName: 'Taps - Fittings and Connections', category: 'plumbing', description: 'Check sink taps for leaks', priority: 'high' }
      ],
      'server_room': [
        { itemName: 'Power Points (GPO)', category: 'electrical', description: 'Test and inspect general power outlets', priority: 'high' },
        { itemName: 'Air Conditioning', category: 'hvac', description: 'Test cooling system operation - critical for servers', priority: 'critical' },
        { itemName: 'Fire Suppression', category: 'safety', description: 'Check fire suppression system', priority: 'critical' }
      ],
      'retail_space': commonItems,
      'warehouse_space': storageItems,
      'workshop': [...storageItems,
        { itemName: 'Exhaust Ventilation', category: 'hvac', description: 'Check workshop ventilation system', priority: 'medium' }
      ],

      // Exterior rooms return empty - they use bulk templates
      'roof': [],
      'gutters': [],
      'pool': [],
      'deck': [],
      'patio': [],
      'balcony': [],
      'garden': [],
      'courtyard': [],
      'roof_terrace': [],

      // Default for other rooms
      'default': commonItems
    };

    return roomSpecificItems[roomType] || roomSpecificItems['default'];
  };

  // Function to add missing standard items
  const addMissingStandardItems = () => {
    if (!selectedRoom || !inspectionItems) return;
    
    const standardItems = getStandardInspectionItems(selectedRoom.roomType);
    const existingItemNames = new Set(inspectionItems.map(item => item.itemName));
    
    // Find items that are in standards but not in existing items
    const missingItems = standardItems.filter(item => !existingItemNames.has(item.itemName));
    
    if (missingItems.length === 0) {
      toast({ title: 'Info', description: 'All standard items are already added' });
      return;
    }
    
    // Add missing items one by one with a small delay
    missingItems.forEach((item: any, index: number) => {
      setTimeout(() => {
        addInspectionMutation.mutate({
          ...item,
          frequency: 'quarterly',
          checklistPoints: []
        });
      }, index * 100); // 100ms delay between each item
    });
    
    toast({ title: 'Success', description: `Adding ${missingItems.length} missing standard item(s)` });
  };

  // Auto-add inspection items when room is selected for the first time
  useEffect(() => {
    if (selectedRoom && inspectionItems && inspectionItems.length === 0) {
      console.log(`Auto-adding inspection items for ${selectedRoom.roomName} (${selectedRoom.roomType})`);
      
      // Use bulk template system for exterior/outdoor rooms, otherwise use individual items
      if (exteriorRoomTypes.includes(selectedRoom.roomType)) {
        console.log(`Using bulk template for ${selectedRoom.roomType}`);
        addBulkInspectionsMutation.mutate({ roomId: selectedRoom.id, template: selectedRoom.roomType });
      } else {
        addMissingStandardItems();
      }
    }
  }, [selectedRoom, inspectionItems]);

  // Auto-add inspection items when inspection popup room has no items
  useEffect(() => {
    if (inspectionPopupRoom && allInspectionItems) {
      const roomItems = allInspectionItems.filter(item => item.roomId === inspectionPopupRoom.id);
      if (roomItems.length === 0) {
        console.log(`Auto-adding inspection items for popup room: ${inspectionPopupRoom.roomName} (${inspectionPopupRoom.roomType})`);
        
        // Use bulk template system for exterior/outdoor rooms, otherwise add standard items
        if (exteriorRoomTypes.includes(inspectionPopupRoom.roomType)) {
          console.log(`Using bulk template for popup room: ${inspectionPopupRoom.roomType}`);
          addBulkInspectionsMutation.mutate({ roomId: inspectionPopupRoom.id, template: inspectionPopupRoom.roomType });
        } else {
          // Add standard items for this room
          const standardItems = getStandardInspectionItems(inspectionPopupRoom.roomType);
          standardItems.forEach((item: any, index: number) => {
            setTimeout(() => {
              addInspectionMutation.mutate({
                ...item,
                roomId: inspectionPopupRoom.id,
                frequency: 'quarterly',
                checklistPoints: []
              });
            }, index * 100);
          });
          if (standardItems.length > 0) {
            toast({ title: 'Success', description: `Adding ${standardItems.length} standard item(s)` });
          }
        }
      }
    }
  }, [inspectionPopupRoom, allInspectionItems]);

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const response = await authenticatedApiRequest('DELETE', `/api/rooms/${roomId}`);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      toast({ title: 'Success', description: 'Room deleted successfully' });
      // Clear selected room if it was deleted
      if (selectedRoom && selectedRoom.id === undefined) {
        setSelectedRoom(null);
      }
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete room', variant: 'destructive' });
    },
  });

  const deleteInspectionItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      await authenticatedApiRequest('DELETE', `/api/inspection-items/${itemId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', selectedRoom?.id, 'inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
      toast({ title: 'Success', description: 'Inspection item deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete inspection item', variant: 'destructive' });
    },
  });

  const completeRoomInspectionMutation = useMutation({
    mutationFn: async (roomId: number) => {
      const now = new Date();
      const nextInspection = new Date();
      nextInspection.setDate(nextInspection.getDate() + (selectedRoom?.inspectionFrequencyDays || 365));
      
      await authenticatedApiRequest('PUT', `/api/rooms/${roomId}`, {
        lastInspectionDate: now.toISOString(),
        nextInspectionDate: nextInspection.toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      toast({ 
        title: 'Inspection Completed', 
        description: `${selectedRoom?.roomName} inspection saved successfully` 
      });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to save room inspection', 
        variant: 'destructive' 
      });
    },
  });

  const bulkCheckInspectionItemsMutation = useMutation({
    mutationFn: async (data: { itemName: string; propertyId: number }) => {
      const response = await authenticatedApiRequest('POST', `/api/properties/${data.propertyId}/bulk-check-items`, {
        itemName: data.itemName
      });
      return response.json();
    },
    onSuccess: () => {
      // Force immediate refetch of all inspection items to update completion percentages
      queryClient.refetchQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      
      // Invalidate inspection items cache for ALL rooms in this property, not just selected room
      if (rooms) {
        rooms.forEach(room => {
          queryClient.invalidateQueries({ queryKey: ['/api/rooms', room.id, 'inspection-items'] });
        });
      }
      
      toast({ 
        title: 'Bulk Check Completed', 
        description: 'Items marked as completed across all rooms' 
      });
    },
    onError: () => {
      toast({ 
        title: 'Error', 
        description: 'Failed to bulk check items', 
        variant: 'destructive' 
      });
    },
  });

  const updateRoomMutation = useMutation({
    mutationFn: async (data: { roomId: number; updates: Partial<EditRoomFormData> }) => {
      const response = await authenticatedApiRequest('PUT', `/api/rooms/${data.roomId}`, data.updates);
      return response;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties'] }); // Refresh property list to update dates
      toast({ title: 'Success', description: 'Room inspection dates updated successfully' });
      setShowEditRoomDialog(false);
      setEditingRoom(null);
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to update room inspection dates', variant: 'destructive' });
    },
  });

  const onRoomSubmit = (data: RoomFormData) => {
    console.log('Form submission triggered with data:', data);
    console.log('Property ID:', property?.id);
    
    if (!property?.id) {
      toast({ title: 'Error', description: 'Property ID is missing', variant: 'destructive' });
      return;
    }
    
    // Ensure we have all required fields
    if (!data.roomName || !data.roomType) {
      toast({ title: 'Error', description: 'Room name and type are required', variant: 'destructive' });
      return;
    }
    
    console.log('About to call addRoomMutation.mutate with:', data);
    addRoomMutation.mutate(data);
    setSelectedRoomType('master_bedroom'); // Reset after submission
  };

  const onInspectionSubmit = (data: InspectionFormData) => {
    addInspectionMutation.mutate(data);
  };

  const getRoomIcon = (roomType: string) => {
    const room = roomTypes.find(r => r.value === roomType);
    const IconComponent = room?.icon || Home;
    return <IconComponent className="w-4 h-4 pointer-events-none" />;
  };

  const getCategoryBadge = (category: string) => {
    const cat = inspectionCategories.find(c => c.value === category);
    return (
      <Badge className={cat?.color || 'bg-gray-100 text-gray-800'}>
        {cat?.label || category}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const pri = priorityOptions.find(p => p.value === priority);
    return (
      <Badge className={pri?.color || 'bg-gray-100 text-gray-800'}>
        {pri?.label || priority}
      </Badge>
    );
  };

  const getRoomInspectionItems = (roomId: number) => {
    return allInspectionItems?.filter(item => item.roomId === roomId) || [];
  };

  // Camera functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: 'Camera Error',
        description: 'Could not access camera. Please check permissions.',
        variant: 'destructive'
      });
    }
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const photoData = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedPhoto(photoData);
      }
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const handleCloseCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCapturedPhoto(null);
    setCurrentInspectionItem(null);
  };

  const handleSavePhoto = () => {
    if (capturedPhoto && currentInspectionItem) {
      console.log('Saving photo for inspection item:', currentInspectionItem.id);
      console.log('Photo data length:', capturedPhoto.length);
      toast({
        title: 'Photo Saved',
        description: `Photo captured for ${currentInspectionItem.itemName}. Storage integration coming soon.`
      });
      handleCloseCameraModal();
    }
  };

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera when modal opens
  useEffect(() => {
    if (showCameraModal && !capturedPhoto) {
      startCamera();
    }
  }, [showCameraModal]);

  // Find the inspection room if inspectionRoomId is provided
  const inspectionRoom = inspectionRoomId ? rooms?.find(r => r.id === inspectionRoomId) : null;

  // Filter inspection items for this specific room from the already-loaded items
  const roomInspectionItems = inspectionRoomId && propInspectionItems
    ? propInspectionItems.filter(item => item.roomId === inspectionRoomId)
    : [];

  if (roomsLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading rooms...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // INSPECTION MODE: Show simple checklist when inspectionRoomId is set
  if (inspectionRoomId && inspectionRoom) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {inspectionRoom.roomName} - Inspection Items
            </DialogTitle>
            <DialogDescription>
              Check off items as you inspect them
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {!roomInspectionItems || roomInspectionItems.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No inspection items for this room yet.
              </div>
            ) : (
              roomInspectionItems.map((item) => (
                <Card key={item.id} className="p-4">
                  <div className="flex items-start space-x-3">
                    <Checkbox
                      id={`item-${item.id}`}
                      checked={!!item.isCompleted}
                      onCheckedChange={(checked) => {
                        console.log('Checkbox changed:', item.itemName, checked);
                        // TODO: Add mutation to update item
                        toast({
                          title: checked ? 'Item completed' : 'Item unchecked',
                          description: item.itemName,
                        });
                      }}
                      data-testid={`checkbox-inspection-item-${item.id}`}
                    />
                    <div className="flex-1">
                      <label
                        htmlFor={`item-${item.id}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        {item.itemName}
                      </label>
                      {item.category && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {item.category}
                        </Badge>
                      )}
                      {item.priority && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {item.priority}
                        </Badge>
                      )}
                      {item.photoRequired && <PhotoRequiredIndicator item={item} />}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
          <div className="p-4 border-t">
            <Button onClick={onClose} className="w-full" data-testid="button-done-inspection">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // NORMAL MODE: Show full room management UI
  return (
    <>
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Manage Property Rooms & Inspections
          </DialogTitle>
          <DialogDescription>
            {property.name} - Add rooms and define inspection requirements for each area
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 overflow-y-auto" style={{ maxHeight: '200px' }}>
          {allInspectionItems && allInspectionItems.length > 0 && (
            <ComplianceSummaryPanel allItems={allInspectionItems} />
          )}
        </div>

        <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel - Rooms */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Property Rooms</h3>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('Add Room button clicked - showing dropdown');
                  setShowRoomDropdown(!showRoomDropdown);
                  setSelectedRoom(null);
                }}
                className="inline-flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md border border-transparent shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                type="button"
              >
                <Camera className="w-4 h-4 mr-1" />
                <Plus className="w-4 h-4 mr-1" />
                Add Room
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3" style={{ maxHeight: 'calc(100vh - 300px)' }}>
              {rooms?.map((room) => {
                const completionInfo = allInspectionItems ? getRoomCompletionInfo(room.id, rooms, allInspectionItems) : { percentage: 0, color: 'bg-gray-200', textColor: 'text-gray-600' };
                
                return (
                  <Card
                    key={room.id}
                    className={`cursor-pointer transition-colors ${
                      selectedRoom?.id === room.id ? 'ring-2 ring-primary bg-primary/5' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => {
                      setSelectedRoom(room);
                    }}
                    data-testid={`room-card-${room.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getRoomIcon(room.roomType)}
                          <div>
                            <p className="font-medium">{room.roomName}</p>
                            <p className="text-sm text-gray-500 capitalize">
                              {room.roomType.replace('_', ' ')} • {room.floor === -1 ? 'Basement' : room.floor === 0 ? 'Ground Floor' : room.floor === 1 ? 'First Floor' : room.floor === 2 ? 'Second Floor' : `Floor ${room.floor}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          {/* Completion Status Badge */}
                          <div className={`px-2 py-1 rounded-full text-xs font-medium ${completionInfo.color} ${completionInfo.textColor}`}>
                            {completionInfo.percentage}%
                          </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingRoom(room);
                            setShowEditRoomDialog(true);
                          }}
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${room.roomName}`}
                          data-testid={`button-edit-room-${room.id}`}
                        >
                          <Edit className="w-4 h-4 pointer-events-none" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setRoomToDelete(room);
                          }}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                          aria-label={`Delete ${room.roomName}`}
                          title="Delete room"
                          data-testid={`button-delete-room-${room.id}`}
                        >
                          <Trash2 className="w-4 h-4 pointer-events-none" />
                        </Button>
                        {selectedRoom?.id === room.id && (
                          <CheckCircle2 className="w-5 h-5 text-primary pointer-events-none" />
                        )}
                      </div>
                    </div>
                    
                    {/* Mobile-friendly: View Inspections button */}
                    <div className="mt-3 px-4 pb-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('View Inspections button clicked for room:', room.id, room.roomName);
                          console.log('Setting inspectionPopupRoom to:', room);
                          setInspectionPopupRoom(room);
                        }}
                        className="w-full"
                        data-testid={`button-view-inspections-${room.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        View Inspections ({getRoomInspectionItems(room.id)?.length || 0})
                      </Button>                    </div>
                    
                    {/* Room Inspection Dates */}
                    <div className="mt-3 pt-3 border-t space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Last Inspection:</span>
                        <span className="font-medium text-gray-900">
                          {room.lastInspectionDate 
                            ? new Date(room.lastInspectionDate).toLocaleDateString()
                            : 'Not inspected'
                          }
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Next Inspection:</span>
                        <span className={`font-medium ${
                          room.nextInspectionDate 
                            ? new Date(room.nextInspectionDate) < new Date() 
                              ? 'text-red-600' 
                              : new Date(room.nextInspectionDate).getTime() - new Date().getTime() < 7 * 24 * 60 * 60 * 1000
                                ? 'text-orange-600'
                                : 'text-green-600'
                            : 'text-gray-400'
                        }`}>
                          {room.nextInspectionDate 
                            ? new Date(room.nextInspectionDate).toLocaleDateString()
                            : 'Not scheduled'
                          }
                        </span>
                      </div>
                    </div>
                    
                    {room.description && (
                      <p className="text-xs text-gray-600 mt-2">{room.description}</p>
                    )}
                  </CardContent>
                </Card>
                );
              })}

              {rooms?.length === 0 && (
                <Card className="border-dashed">
                  <CardContent className="p-8 text-center">
                    <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No rooms added yet</p>
                    {(property.bedrooms || property.bathrooms) && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-600 mb-2">
                          Based on your property details ({property.bedrooms} bed, {property.bathrooms} bath):
                        </p>
                        <Button 
                          onClick={() => generateRoomsMutation.mutate()}
                          disabled={generateRoomsMutation.isPending}
                          className="mr-2"
                          size="sm"
                        >
                          {generateRoomsMutation.isPending ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          ) : (
                            <Home className="w-4 h-4 mr-2" />
                          )}
                          Auto-Generate Rooms
                        </Button>
                      </div>
                    )}
                    <button 
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setIsAddingRoom(true);
                      }}
                      className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      type="button"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      {(property.bedrooms || property.bathrooms) ? 'Add Manually Instead' : 'Add First Room'}
                    </button>
                  </CardContent>
                </Card>
              )}
            </div>

          </div>

          {/* Add Room Dropdown - Fixed positioning */}
          {showRoomDropdown && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
              onClick={() => {
                setShowRoomDropdown(false);
                if (autoOpenAddForm) {
                  onClose();
                }
              }}
            >
              <Card 
                className="w-full max-w-2xl mx-4 border-blue-200 bg-blue-50 max-h-[80vh] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Select Room Type to Add</span>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        setShowRoomDropdown(false);
                        if (autoOpenAddForm) {
                          onClose();
                        }
                      }}
                      className="h-8 w-8 p-0"
                      aria-label="Close room type selector"
                      data-testid="button-close-room-selector"
                    >
                      ✕
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {['Bedrooms', 'Bathrooms', 'Living Areas', 'Kitchen & Utility', 'Work & Study', 'Entertainment', 'Storage & Utility', 'Outdoor & Exterior', 'Specialty', 'Commercial', 'Other'].map((category) => {
                      const categoryRooms = roomTypes.filter(room => room.category === category);
                      if (categoryRooms.length === 0) return null;
                      
                      return (
                        <div key={category} className="border-b pb-2 mb-2 last:border-b-0">
                          <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {categoryRooms.map((type) => (
                              <button
                                key={type.value}
                                onClick={() => {
                                  console.log('Adding room:', type.label);
                                  if (type.value === 'roof') {
                                    // Show material selection modal for roof
                                    const roomData = {
                                      roomName: type.label,
                                      roomType: type.value,
                                      floor: 2,
                                      description: '',
                                    };
                                    setShowRoofMaterialModal(true);
                                    setPendingRoofData(roomData);
                                    setShowRoomDropdown(false);
                                  } else if (type.value === 'other') {
                                    // Show custom name input modal for other
                                    setShowCustomRoomModal(true);
                                    setCustomRoomName('');
                                    setShowRoomDropdown(false);
                                  } else {
                                    const roomData = {
                                      roomName: type.label,
                                      roomType: type.value,
                                      floor: type.value === 'gutters' ? 2 : 1,
                                      description: '',
                                    };
                                    addRoomMutation.mutate(roomData);
                                    setShowRoomDropdown(false);
                                  }
                                }}
                                className="flex items-center p-3 text-left hover:bg-blue-100 rounded border border-gray-200 bg-white transition-colors"
                              >
                                <type.icon className="w-4 h-4 mr-2 text-gray-600" />
                                <span className="text-sm">{type.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}



          {/* Right Panel - Inspection Items */}
          <div className="flex flex-col h-full overflow-hidden">
            {selectedRoom ? (
              <>
                <div className="flex items-center justify-between mb-4 flex-shrink-0">
                  <div>
                    <h3 className="text-lg font-semibold">Inspection Items</h3>
                    <p className="text-sm text-gray-500">{selectedRoom.roomName}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          if (selectedRoom && exteriorRoomTypes.includes(selectedRoom.roomType)) {
                            addBulkInspectionsMutation.mutate({ roomId: selectedRoom.id, template: selectedRoom.roomType });
                          } else {
                            addMissingStandardItems();
                          }
                        }}
                        variant="outline"
                        size="sm"
                        disabled={addInspectionMutation.isPending || addBulkInspectionsMutation.isPending}
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        <Wrench className="w-4 h-4 mr-1" />
                        {selectedRoom && exteriorRoomTypes.includes(selectedRoom.roomType) 
                          ? `Add ${selectedRoom.roomType.charAt(0).toUpperCase() + selectedRoom.roomType.slice(1).replace('_', ' ')} Items`
                          : 'Add Standards'}
                      </Button>
                      <Button
                        onClick={() => setIsAddingInspection(true)}
                        size="sm"
                      >
                        <Camera className="w-4 h-4 mr-1" />
                        <Plus className="w-4 h-4 mr-1" />
                        Add Custom
                      </Button>
                    </div>
                    
                    {/* Bulk Check and Save Inspection Buttons */}
                    <div className="flex space-x-2 ml-auto">
                      <Button
                        onClick={() => setShowBulkCheckModal(true)}
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Bulk Check
                      </Button>
                      <Button
                        onClick={() => selectedRoom && completeRoomInspectionMutation.mutate(selectedRoom.id)}
                        disabled={completeRoomInspectionMutation.isPending}
                        className="bg-primary hover:bg-primary/90 text-white"
                        size="sm"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        {completeRoomInspectionMutation.isPending ? 'Saving...' : 'Save Inspection'}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 350px)' }}>
                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                      <span className="ml-2 text-sm">Loading inspection items...</span>
                    </div>
                  ) : inspectionItems && inspectionItems.length > 0 ? (
                    <div className="space-y-3">
                      {inspectionItems.map((item) => (
                        <Card key={item.id} className={`${
                          item.isNotApplicable ? 'bg-gray-100 border-gray-300 opacity-60' :
                          item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                        }`}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex items-start space-x-3 flex-1">
                                <Checkbox
                                  checked={item.isCompleted || false}
                                  disabled={item.isNotApplicable || false}
                                  onCheckedChange={(checked) => {
                                    if (item.isNotApplicable) return;
                                    if (checked && item.photoRequired && !item.photoUrl) {
                                      setCurrentInspectionItem(item);
                                      setShowCameraModal(true);
                                      toast({ 
                                        title: 'Photo Required', 
                                        description: `Please capture photo evidence for ${item.itemName} before marking as complete`,
                                        variant: 'destructive'
                                      });
                                      return;
                                    }
                                    updateInspectionItemMutation.mutate({
                                      itemId: item.id,
                                      isCompleted: checked as boolean,
                                      notes: item.notes || ''
                                    });
                                  }}
                                  className="mt-1"
                                  data-testid={`checkbox-inspection-item-${item.id}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center flex-wrap gap-2 mb-1">
                                    {getCategoryBadge(item.category)}
                                    {getPriorityBadge(item.priority)}
                                    <ComplianceStatusBadge item={item} showDetails={true} />
                                    <PhotoRequiredIndicator 
                                      item={item} 
                                      onCaptureClick={() => {
                                        setCurrentInspectionItem(item);
                                        setShowCameraModal(true);
                                      }}
                                    />
                                    {item.isNotApplicable && (
                                      <Badge className="bg-gray-200 text-gray-700">
                                        <Ban className="w-3 h-3 mr-1" />
                                        N/A
                                      </Badge>
                                    )}
                                    {!item.isNotApplicable && item.isCompleted ? (
                                      <Badge className="bg-green-100 text-green-800">
                                        <CheckCircle2 className="w-3 h-3 mr-1" />
                                        Completed
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <h4 className={`font-medium ${item.isNotApplicable ? 'line-through text-gray-500' : ''}`}>{item.itemName}</h4>
                                  <p className="text-sm text-gray-500 capitalize mb-2">
                                    {item.frequency} inspection
                                  </p>
                                  {item.description ? (
                                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                                  ) : null}
                                  
                                  {/* Assigned Contractor Display */}
                                  {item.assignedContractorId && contractors && contractors.find(c => c.id === item.assignedContractorId) && (
                                    <div className="flex items-center gap-2 text-xs bg-blue-50 text-blue-800 px-2 py-1.5 rounded mb-2">
                                      <Wrench className="w-3 h-3" />
                                      <span className="font-medium">{contractors.find(c => c.id === item.assignedContractorId)?.name}</span>
                                      <span className="text-blue-600">
                                        ({TRADE_CATEGORY_LABELS[(contractors.find(c => c.id === item.assignedContractorId)?.tradeCategory || 'general') as TradeCategory]})
                                      </span>
                                      <a href={`tel:${contractors.find(c => c.id === item.assignedContractorId)?.phone}`} className="ml-auto hover:underline">
                                        {contractors.find(c => c.id === item.assignedContractorId)?.phone}
                                      </a>
                                    </div>
                                  )}
                                  
                                  {item.contractorNotes && (
                                    <div className="text-xs text-gray-600 italic bg-gray-50 px-2 py-1 rounded mb-2">
                                      📝 {item.contractorNotes}
                                    </div>
                                  )}
                                  
                                  {/* Completion Date Display */}
                                  {item.isCompleted && item.completedDate ? (
                                    <div className="text-xs text-green-700 bg-green-50 px-2 py-1 rounded mb-2">
                                      Completed on: {new Date(item.completedDate).toLocaleDateString()} at {new Date(item.completedDate).toLocaleTimeString()}
                                    </div>
                                  ) : null}
                                  
                                  {/* Next Inspection Date */}
                                  {!item.isCompleted ? (
                                    <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded mb-2">
                                      Next {String(item.frequency)} inspection due
                                    </div>
                                  ) : null}
                                  
                                  {/* Condition Rating */}
                                  <div className="mt-3 flex items-center gap-3">
                                    <label className="text-xs font-medium text-gray-700">
                                      Condition:
                                    </label>
                                    <div className="flex gap-1">
                                      {['good', 'average', 'poor'].map((conditionOption) => (
                                        <Button
                                          key={conditionOption}
                                          size="sm"
                                          variant={item.condition === conditionOption ? 'default' : 'outline'}
                                          onClick={() => {
                                            updateInspectionItemMutation.mutate({
                                              itemId: item.id,
                                              isCompleted: item.isCompleted || false,
                                              notes: item.notes || '',
                                              condition: conditionOption
                                            });
                                          }}
                                          className={`h-7 px-2.5 text-xs capitalize ${
                                            item.condition === conditionOption 
                                              ? conditionOption === 'good' ? 'bg-green-600 hover:bg-green-700' 
                                                : conditionOption === 'average' ? 'bg-amber-500 hover:bg-amber-600' 
                                                : 'bg-red-600 hover:bg-red-700'
                                              : conditionOption === 'good' ? 'text-green-700 border-green-300 hover:bg-green-50'
                                                : conditionOption === 'average' ? 'text-amber-700 border-amber-300 hover:bg-amber-50'
                                                : 'text-red-700 border-red-300 hover:bg-red-50'
                                          }`}
                                          data-testid={`condition-${conditionOption}-${item.id}`}
                                        >
                                          {conditionOption}
                                        </Button>
                                      ))}
                                    </div>
                                    {item.condition && (
                                      <Badge className={`ml-2 ${
                                        item.condition === 'good' ? 'bg-green-100 text-green-800' 
                                          : item.condition === 'average' ? 'bg-amber-100 text-amber-800' 
                                          : 'bg-red-100 text-red-800'
                                      }`}>
                                        {item.condition === 'good' ? '✓ Good' : item.condition === 'average' ? '~ Average' : '! Poor'}
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  {/* Notes Section */}
                                  <div className="mt-3">
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="text-xs font-medium text-gray-700">
                                        Inspection Notes:
                                      </label>
                                      {localNotes[item.id] !== undefined && localNotes[item.id] !== (item.notes || '') ? (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            // Cancel any pending debounced save
                                            if (noteUpdateTimeout.current) {
                                              clearTimeout(noteUpdateTimeout.current);
                                            }
                                            // Save immediately
                                            updateInspectionItemMutation.mutate({
                                              itemId: item.id,
                                              isCompleted: item.isCompleted || false,
                                              notes: localNotes[item.id]
                                            });
                                          }}
                                          disabled={updateInspectionItemMutation.isPending}
                                          className="h-6 text-xs px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                                          data-testid={`button-save-notes-${item.id}`}
                                        >
                                          <Check className="w-3 h-3 mr-1" />
                                          Save
                                        </Button>
                                      ) : null}
                                    </div>
                                    <Textarea
                                      placeholder="Record any issues or observations..."
                                      value={localNotes[item.id] !== undefined ? localNotes[item.id] : (item.notes || '')}
                                      onChange={(e) => {
                                        const newValue = e.target.value;
                                        // Update local state immediately
                                        setLocalNotes(prev => ({ ...prev, [item.id]: newValue }));
                                        
                                        // Debounced update to avoid too many API calls
                                        if (noteUpdateTimeout.current) {
                                          clearTimeout(noteUpdateTimeout.current);
                                        }
                                        noteUpdateTimeout.current = setTimeout(() => {
                                          updateInspectionItemMutation.mutate({
                                            itemId: item.id,
                                            isCompleted: item.isCompleted || false,
                                            notes: newValue
                                          });
                                        }, 1000);
                                      }}
                                      className="text-sm min-h-[60px] w-full resize-y"
                                      data-testid={`textarea-notes-${item.id}`}
                                    />
                                  </div>

                                  {item.checklistPoints && Array.isArray(item.checklistPoints) && item.checklistPoints.length > 0 && (
                                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                                      <p className="text-xs font-medium text-gray-900 mb-2">Checklist Points:</p>
                                      <ul className="text-xs text-gray-600 space-y-1">
                                        {item.checklistPoints.map((point: string, index: number) => (
                                          <li key={index} className="flex items-start">
                                            <span className="text-primary mr-2">•</span>
                                            <span>{point}</span>
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                  
                                  <ComplianceDateSection 
                                    item={item}
                                    onUpdate={(dateUpdates) => {
                                      updateInspectionItemMutation.mutate({
                                        itemId: item.id,
                                        isCompleted: item.isCompleted || false,
                                        notes: item.notes || '',
                                        ...dateUpdates
                                      });
                                    }}
                                  />
                                </div>
                              </div>
                              
                              <div className="flex items-start space-x-1 ml-2">
                                {/* N/A Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    updateInspectionItemMutation.mutate({
                                      itemId: item.id,
                                      isCompleted: item.isCompleted || false,
                                      notes: item.notes || '',
                                      isNotApplicable: !item.isNotApplicable,
                                      notApplicableReason: !item.isNotApplicable ? 'Not applicable to this property' : null,
                                      // Set inspection date when marking N/A (user reviewed and made a decision)
                                      lastInspectedDate: !item.isNotApplicable ? new Date() : item.lastInspectedDate
                                    });
                                  }}
                                  className={`h-8 px-2 text-xs ${item.isNotApplicable ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}
                                  aria-label={item.isNotApplicable ? `Mark ${item.itemName} as applicable` : `Mark ${item.itemName} as N/A`}
                                  title={item.isNotApplicable ? 'Mark as applicable' : 'Mark as not applicable'}
                                  data-testid={`button-na-${item.id}`}
                                >
                                  <Ban className="w-3 h-3 mr-1" />
                                  {item.isNotApplicable ? 'Applicable' : 'N/A'}
                                </Button>
                                
                                {/* Camera Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentInspectionItem(item);
                                    setShowCameraModal(true);
                                  }}
                                  className="h-8 w-8 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                  aria-label={`Take photo of ${item.itemName}`}
                                  title="Take photo of inspection item"
                                  data-testid={`button-camera-${item.id}`}
                                >
                                  <Camera className="w-4 h-4 pointer-events-none" />
                                </Button>
                                
                                {/* History Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setHistoryItem(item);
                                    setShowHistoryDialog(true);
                                  }}
                                  className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                                  aria-label={`View history for ${item.itemName}`}
                                  title="View inspection history"
                                  data-testid={`button-history-${item.id}`}
                                >
                                  <History className="w-4 h-4 pointer-events-none" />
                                </Button>
                                
                                {/* Delete Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setInspectionItemToDelete(item)}
                                  className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                                  aria-label={`Delete ${item.itemName}`}
                                  title="Delete inspection item"
                                  data-testid={`button-delete-item-${item.id}`}
                                >
                                  <Trash2 className="w-4 h-4 pointer-events-none" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-dashed">
                      <CardContent className="p-8 text-center">
                        <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No inspection items defined yet</p>
                        {selectedRoom && exteriorRoomTypes.includes(selectedRoom.roomType) && (
                          <p className="text-sm text-blue-600 mb-4">
                            Click the button below to add {selectedRoom.roomType.replace('_', ' ')} inspection items
                          </p>
                        )}
                        <div className="flex justify-center space-x-2">
                          <Button
                            onClick={() => {
                              if (selectedRoom && exteriorRoomTypes.includes(selectedRoom.roomType)) {
                                addBulkInspectionsMutation.mutate({ roomId: selectedRoom.id, template: selectedRoom.roomType });
                              } else {
                                addMissingStandardItems();
                              }
                            }}
                            variant="outline"
                            size="sm"
                            disabled={addBulkInspectionsMutation.isPending || addInspectionMutation.isPending}
                          >
                            <Wrench className="w-4 h-4 mr-2" />
                            {selectedRoom && exteriorRoomTypes.includes(selectedRoom.roomType) 
                              ? `Add ${selectedRoom.roomType.charAt(0).toUpperCase() + selectedRoom.roomType.slice(1).replace('_', ' ')} Items`
                              : 'Add Standard Items'}
                          </Button>
                          <Button onClick={() => setIsAddingInspection(true)} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Custom Item
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* Add Inspection Item Form */}
                {isAddingInspection && (
                  <Card className="mt-4 border-primary/20 bg-primary/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Add Inspection Item</CardTitle>
                    </CardHeader>
                    <CardContent className="max-h-80 overflow-y-auto">
                      <Form {...inspectionForm}>
                        <form onSubmit={inspectionForm.handleSubmit(onInspectionSubmit)} className="space-y-4">
                          <FormField
                            control={inspectionForm.control}
                            name="itemName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Item Name</FormLabel>
                                <FormControl>
                                  <Select 
                                    onValueChange={(value) => {
                                      setSelectedInspectionItemType(value);
                                      if (value === 'custom') {
                                        setShowCustomItemName(true);
                                        field.onChange('');
                                      } else {
                                        setShowCustomItemName(false);
                                        const selectedItem = commonInspectionItems.find(item => item.value === value);
                                        field.onChange(selectedItem?.label || '');
                                        
                                        // Auto-set category for roofing items
                                        if (value.startsWith('roof_')) {
                                          inspectionForm.setValue('category', 'structural');
                                          inspectionForm.setValue('priority', 'high');
                                        }
                                      }
                                    }} 
                                    defaultValue={field.value}
                                  >
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select an inspection item..." />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-80 overflow-y-auto">
                                      {Object.entries(
                                        commonInspectionItems.reduce((groups, item) => {
                                          if (!groups[item.category]) groups[item.category] = [];
                                          groups[item.category].push(item);
                                          return groups;
                                        }, {} as Record<string, typeof commonInspectionItems>)
                                      ).map(([categoryName, items]) => (
                                        <div key={categoryName}>
                                          <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                                            {categoryName}
                                          </div>
                                          {items.map((item) => (
                                            <SelectItem key={item.value} value={item.value} className="pl-4">
                                              {item.label}
                                            </SelectItem>
                                          ))}
                                        </div>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {/* Custom item name input - shown when "Custom" is selected */}
                          {showCustomItemName && (
                            <FormField
                              control={inspectionForm.control}
                              name="itemName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Custom Item Name</FormLabel>
                                  <FormControl>
                                    <Input {...field} placeholder="Type your custom inspection item..." />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={inspectionForm.control}
                              name="category"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Category</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent className="max-h-80 overflow-y-auto">
                                        {Object.entries(
                                          inspectionCategories.reduce((groups, cat) => {
                                            if (!groups[cat.group]) groups[cat.group] = [];
                                            groups[cat.group].push(cat);
                                            return groups;
                                          }, {} as Record<string, typeof inspectionCategories>)
                                        ).map(([groupName, categories]) => (
                                          <div key={groupName}>
                                            <div className="px-2 py-1.5 text-xs font-semibold text-gray-500 bg-gray-50 border-b">
                                              {groupName}
                                            </div>
                                            {categories.map((cat) => (
                                              <SelectItem key={cat.value} value={cat.value} className="pl-4">
                                                <div className="flex items-center space-x-2">
                                                  <div className={`w-2 h-2 rounded-full ${cat.color.split(' ')[0]}`}></div>
                                                  <span>{cat.label}</span>
                                                </div>
                                              </SelectItem>
                                            ))}
                                          </div>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={inspectionForm.control}
                              name="frequency"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Frequency</FormLabel>
                                  <FormControl>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                      <SelectTrigger>
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {frequencyOptions.map((freq) => (
                                          <SelectItem key={freq.value} value={freq.value}>
                                            {freq.label}
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

                          <FormField
                            control={inspectionForm.control}
                            name="priority"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Priority</FormLabel>
                                <FormControl>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {priorityOptions.map((pri) => (
                                        <SelectItem key={pri.value} value={pri.value}>
                                          {pri.label}
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
                            control={inspectionForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl>
                                  <Textarea value={field.value || ''} onChange={field.onChange} placeholder="Detailed inspection instructions..." />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          {/* Contractor Assignment Section */}
                          {contractors && contractors.length > 0 && (
                            <div className="border-t pt-4 mt-4">
                              <Label className="text-sm font-medium text-gray-700 mb-3 block">
                                Contractor Assignment (Optional)
                              </Label>
                              <p className="text-xs text-gray-500 mb-3">
                                Assign a trade contractor to this item. They'll be shown as the contact for this inspection.
                              </p>
                              
                              <div className="grid grid-cols-2 gap-4">
                                <FormField
                                  control={inspectionForm.control}
                                  name="tradeCategory"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Trade Type</FormLabel>
                                      <FormControl>
                                        <Select 
                                          onValueChange={(value) => {
                                            field.onChange(value);
                                            inspectionForm.setValue('assignedContractorId', undefined);
                                          }} 
                                          value={field.value || ''}
                                        >
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select trade..." />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {TRADE_CATEGORIES.map((trade) => (
                                              <SelectItem key={trade} value={trade}>
                                                {TRADE_CATEGORY_LABELS[trade]}
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
                                  control={inspectionForm.control}
                                  name="assignedContractorId"
                                  render={({ field }) => {
                                    const selectedTrade = inspectionForm.watch('tradeCategory');
                                    const availableContractors = selectedTrade 
                                      ? contractors.filter(c => c.tradeCategory === selectedTrade)
                                      : contractors;
                                    
                                    return (
                                      <FormItem>
                                        <FormLabel>Contractor</FormLabel>
                                        <FormControl>
                                          <Select 
                                            onValueChange={(value) => field.onChange(parseInt(value))} 
                                            value={field.value?.toString() || ''}
                                            disabled={availableContractors.length === 0}
                                          >
                                            <SelectTrigger>
                                              <SelectValue placeholder={
                                                availableContractors.length === 0 
                                                  ? "No contractors available" 
                                                  : "Select contractor..."
                                              } />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {availableContractors.map((contractor) => (
                                                <SelectItem key={contractor.id} value={contractor.id.toString()}>
                                                  <div className="flex items-center gap-2">
                                                    <span>{contractor.name}</span>
                                                    {contractor.isPreferred && (
                                                      <Badge variant="secondary" className="text-xs">Preferred</Badge>
                                                    )}
                                                  </div>
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    );
                                  }}
                                />
                              </div>

                              <FormField
                                control={inspectionForm.control}
                                name="contractorNotes"
                                render={({ field }) => (
                                  <FormItem className="mt-3">
                                    <FormLabel>Notes for Contractor</FormLabel>
                                    <FormControl>
                                      <Textarea 
                                        value={field.value || ''} 
                                        onChange={field.onChange} 
                                        placeholder="Special instructions for the contractor..."
                                        rows={2}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          )}

                          <div className="flex justify-end space-x-2">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setIsAddingInspection(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={addInspectionMutation.isPending}>
                              {addInspectionMutation.isPending ? 'Adding...' : 'Add Item'}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-dashed h-full">
                <CardContent className="p-8 text-center flex flex-col justify-center h-full">
                  <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-2">Select a room to manage inspections</p>
                  <p className="text-sm text-gray-400">
                    Choose a room from the left panel to define what needs to be inspected
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Roof Material Selection Modal */}
    <Dialog open={showRoofMaterialModal} onOpenChange={setShowRoofMaterialModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Roof Material</DialogTitle>
          <DialogDescription>
            Choose the roof material type for inspection requirements
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => {
                if (pendingRoofData) {
                  const roofData = {
                    ...pendingRoofData,
                    materialType: 'tile',
                    description: 'Tile roof structure - check for broken, loose, or missing tiles'
                  };
                  addRoomMutation.mutate(roofData);
                }
                setShowRoofMaterialModal(false);
                setPendingRoofData(null);
              }}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  🏠
                </div>
                <h3 className="font-medium">Tile Roof</h3>
                <p className="text-sm text-gray-600">Clay or concrete tiles</p>
              </div>
            </button>
            
            <button
              onClick={() => {
                if (pendingRoofData) {
                  const roofData = {
                    ...pendingRoofData,
                    materialType: 'metal',
                    description: 'Metal roof structure - check for rust, loose sheets, and fasteners'
                  };
                  addRoomMutation.mutate(roofData);
                }
                setShowRoofMaterialModal(false);
                setPendingRoofData(null);
              }}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
            >
              <div className="text-center">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-2 flex items-center justify-center">
                  🏭
                </div>
                <h3 className="font-medium">Metal Roof</h3>
                <p className="text-sm text-gray-600">Corrugated or sheet metal</p>
              </div>
            </button>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRoofMaterialModal(false);
                setPendingRoofData(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Custom Room Name Modal */}
    <Dialog open={showCustomRoomModal} onOpenChange={setShowCustomRoomModal}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Enter Custom Room Name</DialogTitle>
          <DialogDescription>
            Provide a custom name for this room or area
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            value={customRoomName}
            onChange={(e) => setCustomRoomName(e.target.value)}
            placeholder="e.g., Wine Cellar, Server Room, etc."
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customRoomName.trim()) {
                const roomData = {
                  roomName: customRoomName.trim(),
                  roomType: 'other',
                  floor: 1,
                  description: '',
                };
                addRoomMutation.mutate(roomData);
                setShowCustomRoomModal(false);
                setCustomRoomName('');
              }
            }}
          />
          <div className="flex justify-end space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomRoomModal(false);
                setCustomRoomName('');
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (customRoomName.trim()) {
                  const roomData = {
                    roomName: customRoomName.trim(),
                    roomType: 'other',
                    floor: 1,
                    description: '',
                  };
                  addRoomMutation.mutate(roomData);
                  setShowCustomRoomModal(false);
                  setCustomRoomName('');
                }
              }}
              disabled={!customRoomName.trim()}
            >
              Add Room
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* Edit Room Dialog */}
    <Dialog open={showEditRoomDialog} onOpenChange={setShowEditRoomDialog}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Room Details</DialogTitle>
          <DialogDescription>
            Rename room or update inspection settings
          </DialogDescription>
        </DialogHeader>
        
        <Form {...editRoomForm}>
          <form onSubmit={editRoomForm.handleSubmit(onEditRoomSubmit)} className="space-y-4">
            <FormField
              control={editRoomForm.control}
              name="roomName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Room Name</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="e.g., Jack's Room, Master Suite, Guest Bedroom"
                      data-testid="input-room-name"
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground mt-1">
                    Personalize with a custom name like "Chrissie's Room" or "Jack's Room"
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editRoomForm.control}
              name="floor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Floor Level</FormLabel>
                  <Select onValueChange={(val) => field.onChange(parseInt(val))} value={String(field.value ?? 0)}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select floor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="-1">Basement</SelectItem>
                      <SelectItem value="0">Ground Floor</SelectItem>
                      <SelectItem value="1">First Floor</SelectItem>
                      <SelectItem value="2">Second Floor</SelectItem>
                      <SelectItem value="3">Third Floor</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editRoomForm.control}
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
              control={editRoomForm.control}
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

            <FormField
              control={editRoomForm.control}
              name="inspectionFrequencyDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Inspection Frequency (Days)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 90)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={editRoomForm.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowEditRoomDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateRoomMutation.isPending}
              >
                {updateRoomMutation.isPending ? 'Updating...' : 'Update Room'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>

    {/* Delete Room Confirmation Dialog */}
    {roomToDelete && (
      <Dialog open={true} onOpenChange={() => setRoomToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Room</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete "{roomToDelete.roomName}"?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-800">
                This will permanently remove the room and all inspection items. This cannot be undone.
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

    {/* Delete Inspection Item Confirmation Dialog */}
    {inspectionItemToDelete && (
      <Dialog open={true} onOpenChange={() => setInspectionItemToDelete(null)}>
        <DialogContent className="sm:max-w-md">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
              <Trash2 className="h-6 w-6 text-red-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Delete Inspection Item</h3>
            <p className="text-sm text-gray-500 mb-4">
              Are you sure you want to delete "{inspectionItemToDelete.itemName}"?
            </p>
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-800">
                This will permanently remove the inspection item and all its data. This cannot be undone.
              </p>
            </div>
            <div className="flex justify-center space-x-3">
              <Button variant="outline" onClick={() => setInspectionItemToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  deleteInspectionItemMutation.mutate(inspectionItemToDelete.id);
                  setInspectionItemToDelete(null);
                }}
                disabled={deleteInspectionItemMutation.isPending}
              >
                {deleteInspectionItemMutation.isPending ? 'Deleting...' : 'Delete Item'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Bulk Check Modal */}
    {showBulkCheckModal && (
      <Dialog open={true} onOpenChange={() => setShowBulkCheckModal(false)}>
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
                    'Dryer Vent'
                  ];
                  
                  // Combine and deduplicate
                  const allItemNames = Array.from(new Set([...existingItemNames, ...commonItemNames])).sort();
                  
                  return allItemNames.map(itemName => {
                    const itemsOfThisType = allInspectionItems ? allInspectionItems.filter(item => item.itemName === itemName) : [];
                    // Count both completed AND N/A items as "checked"
                    const checkedCount = itemsOfThisType.filter(item => item.isCompleted || item.isNotApplicable).length;
                    const totalCount = itemsOfThisType.length;
                    const roomCount = rooms ? rooms.length : 0;
                    
                    // Determine status text and color
                    let statusText = '';
                    let statusColor = '';
                    
                    if (totalCount === 0) {
                      statusText = `${roomCount} rooms - None exist`;
                      statusColor = 'text-gray-500';
                    } else if (checkedCount === totalCount) {
                      statusText = `${totalCount}/${totalCount} - All Checked`;
                      statusColor = 'text-green-600';
                    } else if (checkedCount > 0) {
                      statusText = `${checkedCount}/${totalCount} - Partial`;
                      statusColor = 'text-amber-600';
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
                            propertyId: property.id
                          });
                          setShowBulkCheckModal(false);
                        }}
                        disabled={bulkCheckInspectionItemsMutation.isPending}
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
    )}

    {/* Mobile-Friendly: Inspection Items Popup for Selected Room */}
    {inspectionPopupRoom && (
      <Dialog open={!!inspectionPopupRoom} onOpenChange={() => setInspectionPopupRoom(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              {getRoomIcon(inspectionPopupRoom.roomType)}
              <span className="ml-2">{inspectionPopupRoom.roomName} - Inspections</span>
            </DialogTitle>
            <DialogDescription>
              View and manage inspection items for this room
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            {getRoomInspectionItems(inspectionPopupRoom.id)?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p className="font-medium">No inspection items yet</p>
                <p className="text-sm mt-1">Add custom inspection items or use templates</p>
              </div>
            ) : (
              <div className="space-y-4">
                {getRoomInspectionItems(inspectionPopupRoom.id)?.map((item) => (
                  <Card key={item.id} className="border shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-base">{item.itemName}</h4>
                            {item.photoRequired && (
                              <PhotoRequiredIndicator 
                                item={item} 
                                onCaptureClick={() => {
                                  setCurrentInspectionItem(item);
                                  setShowCameraModal(true);
                                }}
                              />
                            )}
                          </div>
                          {item.description && (
                            <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {item.category?.replace('_', ' ')}
                            </Badge>
                            {getPriorityBadge(item.priority)}
                            <span className="text-xs text-gray-500">
                              {item.frequency || 'As needed'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Checkbox */}
                      <div className="flex items-center space-x-2 mt-3 p-3 bg-gray-50 rounded">
                        <Checkbox
                          id={`popup-item-${item.id}`}
                          checked={item.isCompleted || false}
                          onCheckedChange={(checked) => {
                            updateInspectionItemMutation.mutate({
                              itemId: item.id,
                              isCompleted: checked as boolean,
                              notes: item.notes || ''
                            });
                          }}
                          data-testid={`checkbox-inspection-${item.id}`}
                        />
                        <label
                          htmlFor={`popup-item-${item.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {item.isCompleted ? 'Completed' : 'Mark as complete'}
                        </label>
                        {item.photoRequired && !item.isCompleted && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setCurrentInspectionItem(item);
                              setShowCameraModal(true);
                              startCamera();
                            }}
                            className="ml-auto"
                          >
                            <Camera className="w-4 h-4 mr-1" />
                            Take Photo
                          </Button>
                        )}
                      </div>

                      {/* Compliance Info */}
                      {item.complianceStandard && (
                        <ComplianceDateSection 
                          item={item} 
                          onUpdate={(dateUpdates) => {
                            updateInspectionItemMutation.mutate({
                              itemId: item.id,
                              isCompleted: item.isCompleted || false,
                              notes: item.notes || '',
                              ...dateUpdates
                            });
                          }}
                        />
                      )}

                      {/* Notes */}
                      <div className="mt-3">
                        <Label htmlFor={`popup-notes-${item.id}`} className="text-xs text-gray-600">
                          Notes
                        </Label>
                        <Textarea
                          id={`popup-notes-${item.id}`}
                          value={localNotes[item.id] ?? item.notes ?? ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setLocalNotes(prev => ({ ...prev, [item.id]: newValue }));
                            if (noteUpdateTimeout.current) {
                              clearTimeout(noteUpdateTimeout.current);
                            }
                            noteUpdateTimeout.current = setTimeout(() => {
                              updateInspectionItemMutation.mutate({
                                itemId: item.id,
                                isCompleted: item.isCompleted || false,
                                notes: newValue
                              });
                            }, 1000);
                          }}
                          placeholder="Add inspection notes..."
                          className="mt-1 text-sm"
                          rows={2}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedRoom(inspectionPopupRoom);
                setInspectionPopupRoom(null);
              }}
              data-testid="button-add-custom-inspection"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add Custom Item
            </Button>
            <Button onClick={() => setInspectionPopupRoom(null)} data-testid="button-close-popup">
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    )}

    {/* Camera Capture Modal */}
    <Dialog open={showCameraModal} onOpenChange={handleCloseCameraModal}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            {capturedPhoto ? 'Photo Captured' : 'Take Photo'}
            {currentInspectionItem && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {currentInspectionItem.itemName}
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            {capturedPhoto 
              ? 'Review your photo and save it to the inspection item'
              : 'Position the camera to capture the inspection item'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Video/Photo Display */}
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {!capturedPhoto ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                  data-testid="camera-video-preview"
                />
                <div className="absolute top-4 left-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center gap-2">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                  Camera Active
                </div>
              </>
            ) : (
              <img
                src={capturedPhoto}
                alt="Captured inspection item"
                className="w-full h-full object-contain"
                data-testid="captured-photo-preview"
              />
            )}
          </div>

          {/* Hidden canvas for photo capture */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Action Buttons */}
          <div className="flex justify-between gap-2">
            {!capturedPhoto ? (
              <>
                <Button
                  variant="outline"
                  onClick={handleCloseCameraModal}
                  data-testid="button-cancel-camera"
                >
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="bg-blue-600 hover:bg-blue-700"
                  data-testid="button-capture-photo"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCapturedPhoto(null);
                    startCamera();
                  }}
                  data-testid="button-retake-photo"
                >
                  Retake
                </Button>
                <Button
                  onClick={handleSavePhoto}
                  className="bg-primary hover:bg-primary/90"
                  data-testid="button-save-photo"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Save Photo
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>

    {/* History Dialog */}
    <Dialog open={showHistoryDialog} onOpenChange={(open) => {
      setShowHistoryDialog(open);
      if (!open) setHistoryItem(null);
    }}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="w-5 h-5 text-purple-600" />
            Inspection History
          </DialogTitle>
          <DialogDescription>
            {historyItem && `History for: ${historyItem.itemName}`}
          </DialogDescription>
        </DialogHeader>
        
        <InspectionHistoryContent itemId={historyItem?.id || null} />
      </DialogContent>
    </Dialog>
    </>
  );
}

function InspectionHistoryContent({ itemId }: { itemId: number | null }) {
  const { data: snapshots, isLoading } = useQuery({
    queryKey: itemId ? ['/api/inspection-items', itemId, 'history'] : ['no-item'],
    queryFn: async () => {
      if (!itemId) return [];
      const response = await authenticatedApiRequest('GET', `/api/inspection-items/${itemId}/history`);
      return response.json();
    },
    enabled: !!itemId,
  });
  
  if (!itemId) {
    return <div className="text-center text-gray-500 py-8">No item selected</div>;
  }
  
  if (isLoading) {
    return <div className="text-center text-gray-500 py-8">Loading history...</div>;
  }
  
  if (!snapshots || snapshots.length === 0) {
    return (
      <div className="text-center text-gray-500 py-8">
        <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p>No inspection history recorded yet.</p>
        <p className="text-sm mt-2">History will appear after condition updates or inspections.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {snapshots.map((snapshot: any, index: number) => (
        <div key={snapshot.id} className="relative pl-6 pb-4">
          {/* Timeline connector */}
          {index < snapshots.length - 1 && (
            <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
          )}
          
          {/* Timeline dot */}
          <div className={`absolute left-0 top-1 w-4 h-4 rounded-full border-2 ${
            snapshot.condition === 'good' ? 'bg-green-500 border-green-600' 
            : snapshot.condition === 'average' ? 'bg-amber-500 border-amber-600' 
            : snapshot.condition === 'poor' ? 'bg-red-500 border-red-600'
            : 'bg-gray-400 border-gray-500'
          }`} />
          
          <div className="bg-gray-50 rounded-lg p-4 ml-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">
                {new Date(snapshot.inspectedAt).toLocaleDateString()} at {new Date(snapshot.inspectedAt).toLocaleTimeString()}
              </span>
              {snapshot.condition && (
                <Badge className={`${
                  snapshot.condition === 'good' ? 'bg-green-100 text-green-800' 
                  : snapshot.condition === 'average' ? 'bg-amber-100 text-amber-800' 
                  : 'bg-red-100 text-red-800'
                }`}>
                  {snapshot.condition}
                </Badge>
              )}
            </div>
            
            {/* Deterioration indicator */}
            {snapshot.previousCondition && snapshot.condition !== snapshot.previousCondition && (
              <div className={`text-xs mb-2 px-2 py-1 rounded ${
                snapshot.deteriorationSeverity === 'severe' ? 'bg-red-50 text-red-700'
                : snapshot.deteriorationSeverity === 'moderate' ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700'
              }`}>
                Condition changed: {snapshot.previousCondition} → {snapshot.condition}
              </div>
            )}
            
            {snapshot.notes && (
              <p className="text-sm text-gray-700 mt-2">{snapshot.notes}</p>
            )}
            
            {snapshot.photoUrl && (
              <img 
                src={snapshot.photoUrl} 
                alt="Inspection photo" 
                className="mt-2 rounded-lg max-h-32 object-cover"
              />
            )}
            
            {snapshot.issueDescription && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                Issue: {snapshot.issueDescription}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}