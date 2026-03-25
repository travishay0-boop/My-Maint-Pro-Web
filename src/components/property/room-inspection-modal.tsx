import { useState, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
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
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  CheckCircle2, AlertCircle, Camera, X, Ban,
  Home, Bed, Bath, ChefHat, Sofa, Car, TreePine, Waves,
  Eye, Wrench, FileCheck, Calendar, History, Check, Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PropertyRoom, InspectionItem } from '@shared/schema';
import { TRADE_CATEGORIES, TRADE_CATEGORY_LABELS } from '@shared/schema';
import { ComplianceStatusBadge, PhotoRequiredIndicator } from '@/components/compliance/compliance-status-badge';

interface RoomInspectionPopupProps {
  room: PropertyRoom | null;
  isOpen: boolean;
  onClose: () => void;
  propertyId: number;
}

const roomTypeIcons: Record<string, any> = {
  master_bedroom: Bed,
  bedroom: Bed,
  bathroom: Bath,
  main_bathroom: Bath,
  powder_room: Bath,
  kitchen: ChefHat,
  living_room: Sofa,
  dining_room: Sofa,
  garage: Car,
  garden: TreePine,
  pool: Waves,
  other: Home,
};

const getRoomIcon = (roomType: string) => {
  const IconComponent = roomTypeIcons[roomType] || Home;
  return <IconComponent className="w-5 h-5 text-gray-600" />;
};

const getPriorityBadge = (priority: string) => {
  const colors = {
    critical: 'bg-red-100 text-red-800',
    high: 'bg-orange-100 text-orange-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800',
  };
  return (
    <Badge className={colors[priority as keyof typeof colors] || colors.medium}>
      {priority}
    </Badge>
  );
};

const getCategoryBadge = (category: string) => {
  return (
    <Badge variant="outline" className="text-xs capitalize">
      {category?.replace('_', ' ')}
    </Badge>
  );
};

const getInspectionTypeBadge = (inspectionType: string | null | undefined) => {
  if (inspectionType === 'professional') {
    return (
      <Badge className="bg-purple-100 text-purple-800 border-purple-300">
        <Wrench className="w-3 h-3 mr-1" />
        Professional
      </Badge>
    );
  }
  return (
    <Badge className="bg-gray-100 text-gray-700 border-gray-300">
      <Eye className="w-3 h-3 mr-1" />
      Visual
    </Badge>
  );
};

const getCertificateCoverageBadge = (item: InspectionItem) => {
  if (!item.linkedCertificateId || !item.certificateExpiryDate) return null;
  
  const expiryDate = new Date(item.certificateExpiryDate);
  const now = new Date();
  const isExpired = expiryDate < now;
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpiringSoon = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  
  if (isExpired) {
    return (
      <Badge className="bg-red-100 text-red-800 border-red-300">
        <FileCheck className="w-3 h-3 mr-1" />
        Cert Expired
      </Badge>
    );
  }
  
  if (isExpiringSoon) {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-300">
        <FileCheck className="w-3 h-3 mr-1" />
        Cert Expires {daysUntilExpiry}d
      </Badge>
    );
  }
  
  return (
    <Badge className="bg-emerald-100 text-emerald-800 border-emerald-300">
      <FileCheck className="w-3 h-3 mr-1" />
      Certificate Valid
    </Badge>
  );
};

const requiresCertificateForCompletion = (item: InspectionItem): boolean => {
  const result = (() => {
    if (item.inspectionType !== 'professional') return false;
    if (!item.linkedCertificateId || !item.certificateExpiryDate) return true;
    const expiryDate = new Date(item.certificateExpiryDate);
    return expiryDate < new Date();
  })();
  console.log(`[needsCert] ${item.id}/${item.itemName}: inspectionType=${JSON.stringify(item.inspectionType)}, result=${result}`);
  return result;
};

const getCertificateRequiredBadge = (item: InspectionItem) => {
  if (item.inspectionType !== 'professional') return null;
  if (item.linkedCertificateId && item.certificateExpiryDate) {
    const expiryDate = new Date(item.certificateExpiryDate);
    if (expiryDate >= new Date()) return null;
  }
  return (
    <Badge className="bg-purple-50 text-purple-700 border-purple-200 border">
      <FileCheck className="w-3 h-3 mr-1" />
      Certificate Required
    </Badge>
  );
};

const ITEM_CATEGORIES = ['general', 'electrical', 'plumbing', 'structural', 'hvac', 'fixtures', 'pest_control'] as const;

export default function RoomInspectionPopup({ room, isOpen, onClose, propertyId }: RoomInspectionPopupProps) {
  const { toast } = useToast();
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [currentCameraItem, setCurrentCameraItem] = useState<InspectionItem | null>(null);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [localNotes, setLocalNotes] = useState<Record<number, string>>({});
  const noteUpdateTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [historyItem, setHistoryItem] = useState<InspectionItem | null>(null);
  
  // Custom item state
  const [showAddItemForm, setShowAddItemForm] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemCategory, setNewItemCategory] = useState<string>('general');
  const [newItemTrade, setNewItemTrade] = useState<string>('general');

  // Fetch inspection items for this room
  const { data: inspectionItems, isLoading } = useQuery<InspectionItem[]>({
    queryKey: ['/api/rooms', room?.id, 'inspection-items'],
    queryFn: async () => {
      if (!room?.id) return [];
      const response = await authenticatedApiRequest('GET', `/api/rooms/${room.id}/inspection-items`);
      if (!response.ok) throw new Error('Failed to fetch inspection items');
      const items = await response.json();
      console.log('[RoomInspectionPopup] Fetched items:', items.map((i: InspectionItem) => ({
        id: i.id,
        name: i.itemName,
        inspectionType: i.inspectionType,
        linkedCertId: i.linkedCertificateId
      })));
      return items;
    },
    enabled: !!room?.id && isOpen,
  });

  // Update inspection item mutation
  const updateInspectionItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<InspectionItem> }) => {
      const response = await authenticatedApiRequest('PATCH', `/api/inspection-items/${id}`, updates);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (errorData.code === 'CERTIFICATE_REQUIRED') {
          throw new Error('CERTIFICATE_REQUIRED');
        }
        if (errorData.code === 'PHOTO_REQUIRED') {
          throw new Error('PHOTO_REQUIRED');
        }
        throw new Error(errorData.message || 'Failed to update inspection item');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', room?.id, 'inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'all-inspection-items'] });
      toast({ title: 'Updated', description: 'Inspection item updated successfully' });
    },
    onError: (error: Error) => {
      console.error('[RoomInspectionPopup] Update error:', error.message);
      if (error.message === 'CERTIFICATE_REQUIRED') {
        toast({ 
          title: 'Certificate Required', 
          description: 'Professional inspections require a valid compliance certificate from a licensed professional. Upload a certificate to mark this item as complete.',
          variant: 'destructive'
        });
      } else if (error.message === 'PHOTO_REQUIRED') {
        toast({ 
          title: 'Photo Required', 
          description: 'This item requires photo evidence for compliance. Please capture a photo before marking as complete.',
          variant: 'destructive'
        });
      } else {
        toast({ title: 'Error', description: error.message || 'Failed to update inspection item', variant: 'destructive' });
      }
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', room?.id, 'inspection-items'] });
    },
  });

  // Create custom inspection item mutation
  const createCustomItemMutation = useMutation({
    mutationFn: async (itemData: { itemName: string; category: string; tradeCategory: string }) => {
      const response = await authenticatedApiRequest('POST', `/api/rooms/${room?.id}/inspection-items`, {
        ...itemData,
        frequency: 'quarterly',
        priority: 'medium',
        inspectionType: 'visual',
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to create item');
      }
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', room?.id, 'inspection-items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'all-inspection-items'] });
      toast({ title: 'Item Added', description: 'Custom inspection item added successfully' });
      setShowAddItemForm(false);
      setNewItemName('');
      setNewItemCategory('general');
      setNewItemTrade('general');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to create item', variant: 'destructive' });
    },
  });

  const handleAddCustomItem = () => {
    if (!newItemName.trim()) {
      toast({ title: 'Error', description: 'Please enter an item name', variant: 'destructive' });
      return;
    }
    createCustomItemMutation.mutate({
      itemName: newItemName.trim(),
      category: newItemCategory,
      tradeCategory: newItemTrade,
    });
  };

  // Camera helper functions
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
      });
      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Failed to access camera:', error);
      toast({ title: 'Camera Error', description: 'Could not access camera. Please check permissions.', variant: 'destructive' });
    }
  };

  const stopCamera = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
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
        const photoData = canvas.toDataURL('image/jpeg', 0.8);
        setCapturedPhoto(photoData);
        stopCamera();
      }
    }
  };

  const handleSavePhoto = () => {
    if (capturedPhoto && currentCameraItem) {
      updateInspectionItemMutation.mutate({
        id: currentCameraItem.id,
        updates: { photoUrl: capturedPhoto }
      });
      handleCloseCameraModal();
    }
  };

  const handleCloseCameraModal = () => {
    stopCamera();
    setCapturedPhoto(null);
    setCurrentCameraItem(null);
    setShowCameraModal(false);
  };

  const openCamera = (item: InspectionItem) => {
    setCurrentCameraItem(item);
    setShowCameraModal(true);
    setTimeout(startCamera, 100);
  };

  // Reset add item form when modal closes
  const handleClose = () => {
    setShowAddItemForm(false);
    setNewItemName('');
    setNewItemCategory('general');
    setNewItemTrade('general');
    onClose();
  };

  if (!room) return null;

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getRoomIcon(room.roomType)}
            <span>{room.roomName} - Inspection Items</span>
          </DialogTitle>
          <DialogDescription>
            Check off items as you inspect this room
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-2">Loading inspection items...</span>
            </div>
          ) : !inspectionItems || inspectionItems.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No inspection items yet</h3>
              <p className="text-sm text-gray-500 mb-6">
                Add inspection items from the "Manage Rooms/Areas" section
              </p>
              <Button onClick={handleClose} variant="outline">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {inspectionItems.map((item) => {
                const needsCert = requiresCertificateForCompletion(item);
                return (
                <Card 
                  key={item.id} 
                  className={`${
                    item.isNotApplicable ? 'bg-gray-100 border-gray-300 opacity-60' :
                    item.isCompleted ? 'bg-green-50 border-green-200' : 'bg-white'
                  } transition-colors`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      {needsCert ? (
                        <div 
                          className="mt-1 w-4 h-4 rounded border-2 border-purple-300 bg-purple-50 flex items-center justify-center cursor-not-allowed"
                          title="Professional inspections require a valid certificate"
                          onClick={() => {
                            toast({ 
                              title: 'Certificate Required', 
                              description: `${item.itemName} requires a valid compliance certificate from a licensed professional. Upload a certificate to mark this item as complete.`,
                            });
                          }}
                          data-testid={`checkbox-professional-disabled-${item.id}`}
                        >
                          <FileCheck className="w-3 h-3 text-purple-400" />
                        </div>
                      ) : (
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={item.isCompleted || false}
                          disabled={item.isNotApplicable || false}
                          onCheckedChange={(checked) => {
                            if (item.isNotApplicable) return;
                            if (checked && item.photoRequired && !item.photoUrl) {
                              toast({ 
                                title: 'Photo Required', 
                                description: `Please capture photo evidence for ${item.itemName} before marking as complete`,
                                variant: 'destructive'
                              });
                              return;
                            }
                            updateInspectionItemMutation.mutate({
                              id: item.id,
                              updates: { 
                                isCompleted: checked as boolean,
                                completedDate: checked ? new Date() : null,
                                lastInspectedDate: checked ? new Date() : null
                              }
                            });
                          }}
                          className="mt-1"
                          data-testid={`checkbox-inspection-${item.id}`}
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2 mb-1">
                          {getCategoryBadge(item.category)}
                          {getInspectionTypeBadge(item.inspectionType)}
                          {getCertificateCoverageBadge(item)}
                          {getCertificateRequiredBadge(item)}
                          {getPriorityBadge(item.priority)}
                          <ComplianceStatusBadge item={item} showDetails={true} />
                          <PhotoRequiredIndicator item={item} />
                          {item.isNotApplicable && (
                            <Badge className="bg-gray-200 text-gray-700">
                              <Ban className="w-3 h-3 mr-1" />
                              N/A
                            </Badge>
                          )}
                          {!item.isNotApplicable && item.isCompleted && (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Completed
                            </Badge>
                          )}
                        </div>
                        <label
                          htmlFor={`item-${item.id}`}
                          className={`font-semibold text-base cursor-pointer block ${item.isNotApplicable ? 'line-through text-gray-500' : ''}`}
                        >
                          {item.itemName}
                        </label>
                        {item.description && (
                          <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                        )}
                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                          <span className="capitalize">{item.frequency || 'As needed'}</span>
                          {!item.isNotApplicable && item.isCompleted && item.completedDate && (
                            <span className="text-green-700">
                              • Completed {new Date(item.completedDate).toLocaleDateString()}
                            </span>
                          )}
                          {item.isNotApplicable && item.notApplicableReason && (
                            <span className="text-gray-500 italic">
                              • {item.notApplicableReason}
                            </span>
                          )}
                        </div>
                        
                        {/* Condition Rating */}
                        <div className="mt-3 flex items-center gap-2">
                          <label className="text-xs font-medium text-gray-700">Condition:</label>
                          <div className="flex gap-1">
                            {['good', 'average', 'poor'].map((cond) => (
                              <Button
                                key={cond}
                                size="sm"
                                variant={item.condition === cond ? 'default' : 'outline'}
                                onClick={() => {
                                  const updates: Record<string, unknown> = { condition: cond };
                                  if (!item.isCompleted && !item.isNotApplicable) {
                                    updates.isCompleted = true;
                                    updates.completedDate = new Date();
                                    updates.lastInspectedDate = new Date();
                                  }
                                  updateInspectionItemMutation.mutate({
                                    id: item.id,
                                    updates
                                  });
                                }}
                                className={`h-6 px-2 text-xs capitalize ${
                                  item.condition === cond 
                                    ? cond === 'good' ? 'bg-green-600 hover:bg-green-700' 
                                      : cond === 'average' ? 'bg-amber-500 hover:bg-amber-600' 
                                      : 'bg-red-600 hover:bg-red-700'
                                    : cond === 'good' ? 'text-green-700 border-green-300 hover:bg-green-50'
                                      : cond === 'average' ? 'text-amber-700 border-amber-300 hover:bg-amber-50'
                                      : 'text-red-700 border-red-300 hover:bg-red-50'
                                }`}
                              >
                                {cond}
                              </Button>
                            ))}
                          </div>
                        </div>
                        
                        {/* Notes Section */}
                        <div className="mt-2">
                          <label className="text-xs font-medium text-gray-700">Notes:</label>
                          <Textarea
                            placeholder="Add inspection notes..."
                            value={localNotes[item.id] !== undefined ? localNotes[item.id] : (item.notes || '')}
                            onChange={(e) => {
                              const newValue = e.target.value;
                              setLocalNotes(prev => ({ ...prev, [item.id]: newValue }));
                              if (noteUpdateTimeout.current) {
                                clearTimeout(noteUpdateTimeout.current);
                              }
                              noteUpdateTimeout.current = setTimeout(() => {
                                updateInspectionItemMutation.mutate({
                                  id: item.id,
                                  updates: { notes: newValue }
                                });
                              }, 1000);
                            }}
                            className="text-sm min-h-[50px] mt-1"
                          />
                        </div>
                        
                        {/* Action Buttons Row */}
                        <div className="flex items-center justify-between mt-3 pt-2 border-t">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openCamera(item)}
                              className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                              title="Take photo"
                            >
                              <Camera className="w-3 h-3 mr-1" />
                              Photo
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setHistoryItem(item);
                                setShowHistoryDialog(true);
                              }}
                              className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                              title="View history"
                            >
                              <History className="w-3 h-3 mr-1" />
                              History
                            </Button>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              updateInspectionItemMutation.mutate({
                                id: item.id,
                                updates: { 
                                  isNotApplicable: !item.isNotApplicable,
                                  notApplicableReason: !item.isNotApplicable ? 'Not applicable to this property' : null,
                                  lastInspectedDate: !item.isNotApplicable ? new Date() : item.lastInspectedDate
                                }
                              });
                            }}
                            className={`h-7 px-2 text-xs ${item.isNotApplicable ? 'text-blue-600 hover:text-blue-700' : 'text-gray-500 hover:text-gray-700'}`}
                            data-testid={`button-na-${item.id}`}
                          >
                            <Ban className="w-3 h-3 mr-1" />
                            {item.isNotApplicable ? 'Mark Applicable' : 'Mark N/A'}
                          </Button>
                        </div>
                        
                        {/* Photo Preview */}
                        {item.photoUrl && (
                          <div className="mt-2">
                            <img src={item.photoUrl} alt="Inspection photo" className="rounded-lg max-h-24 object-cover" />
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
              })}
            </div>
          )}
        </div>

        {/* Add Custom Item Section */}
        {showAddItemForm ? (
          <div className="pt-4 border-t space-y-3">
            <div className="text-sm font-medium text-gray-700">Add Custom Item</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                placeholder="Item name (e.g., Ceiling Fan)"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                className="sm:col-span-3"
              />
              <Select value={newItemCategory} onValueChange={setNewItemCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {ITEM_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={newItemTrade} onValueChange={setNewItemTrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Trade" />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_CATEGORIES.map((trade) => (
                    <SelectItem key={trade} value={trade}>
                      {TRADE_CATEGORY_LABELS[trade]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddItemForm(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddCustomItem}
                  disabled={createCustomItemMutation.isPending}
                  className="flex-1"
                >
                  {createCustomItemMutation.isPending ? 'Adding...' : 'Add'}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-between gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => setShowAddItemForm(true)}
              className="text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
            <Button onClick={handleClose} data-testid="button-close-inspection-popup">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>

    {/* Camera Modal */}
    <Dialog open={showCameraModal} onOpenChange={handleCloseCameraModal}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {capturedPhoto ? 'Photo Captured' : 'Take Photo'}
            {currentCameraItem && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                - {currentCameraItem.itemName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="relative bg-black rounded-lg overflow-hidden aspect-video">
            {!capturedPhoto ? (
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            ) : (
              <img src={capturedPhoto} alt="Captured" className="w-full h-full object-contain" />
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex justify-between gap-2">
            {!capturedPhoto ? (
              <>
                <Button variant="outline" onClick={handleCloseCameraModal}>Cancel</Button>
                <Button onClick={capturePhoto} className="bg-blue-600 hover:bg-blue-700">
                  <Camera className="w-4 h-4 mr-2" />
                  Capture Photo
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setCapturedPhoto(null); startCamera(); }}>Retake</Button>
                <Button onClick={handleSavePhoto} className="bg-primary hover:bg-primary/90">
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
  
  if (!itemId) return <div className="text-center text-gray-500 py-8">No item selected</div>;
  if (isLoading) return <div className="text-center text-gray-500 py-8">Loading history...</div>;
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
          {index < snapshots.length - 1 && (
            <div className="absolute left-2 top-6 bottom-0 w-0.5 bg-gray-200" />
          )}
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
            {snapshot.previousCondition && snapshot.condition !== snapshot.previousCondition && (
              <div className={`text-xs mb-2 px-2 py-1 rounded ${
                snapshot.deteriorationSeverity === 'severe' ? 'bg-red-50 text-red-700'
                : snapshot.deteriorationSeverity === 'moderate' ? 'bg-amber-50 text-amber-700'
                : 'bg-blue-50 text-blue-700'
              }`}>
                Condition changed: {snapshot.previousCondition} → {snapshot.condition}
              </div>
            )}
            {snapshot.notes && <p className="text-sm text-gray-700 mt-2">{snapshot.notes}</p>}
            {snapshot.photoUrl && (
              <img src={snapshot.photoUrl} alt="Inspection photo" className="mt-2 rounded-lg max-h-32 object-cover" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
