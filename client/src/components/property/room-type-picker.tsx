import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { authenticatedApiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { 
  Home, Plus, Bath, Bed, ChefHat, Sofa, Car, Hammer, TreePine, Building, Wrench,
  Users, Utensils, Shirt, Warehouse, Store, Briefcase, Zap, Wind,
  Sun, Shield, Wifi, BookOpen, Gamepad2, Baby, Dog, Coffee, Camera, X, Waves
} from 'lucide-react';
import type { Property } from '@shared/schema';

const roomTypes = [
  { value: 'master_bedroom', label: 'Master Bedroom', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_1', label: 'Bedroom 1', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_2', label: 'Bedroom 2', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_3', label: 'Bedroom 3', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_4', label: 'Bedroom 4', icon: Bed, category: 'Bedrooms' },
  { value: 'bedroom_5', label: 'Bedroom 5', icon: Bed, category: 'Bedrooms' },
  { value: 'guest_bedroom', label: 'Guest Bedroom', icon: Bed, category: 'Bedrooms' },
  { value: 'kids_bedroom', label: 'Kids Bedroom', icon: Baby, category: 'Bedrooms' },
  { value: 'main_bathroom', label: 'Main Bathroom', icon: Bath, category: 'Bathrooms' },
  { value: 'master_ensuite', label: 'Master Ensuite', icon: Bath, category: 'Bathrooms' },
  { value: 'powder_room', label: 'Powder Room', icon: Bath, category: 'Bathrooms' },
  { value: 'guest_bathroom', label: 'Guest Bathroom', icon: Bath, category: 'Bathrooms' },
  { value: 'living_room', label: 'Living Room', icon: Sofa, category: 'Living Areas' },
  { value: 'family_room', label: 'Family Room', icon: Users, category: 'Living Areas' },
  { value: 'lounge', label: 'Lounge', icon: Sofa, category: 'Living Areas' },
  { value: 'dining_room', label: 'Dining Room', icon: Utensils, category: 'Living Areas' },
  { value: 'breakfast_nook', label: 'Breakfast Nook', icon: Coffee, category: 'Living Areas' },
  { value: 'kitchen', label: 'Kitchen', icon: ChefHat, category: 'Kitchen & Utility' },
  { value: 'pantry', label: 'Pantry', icon: Warehouse, category: 'Kitchen & Utility' },
  { value: 'laundry', label: 'Laundry Room', icon: Shirt, category: 'Kitchen & Utility' },
  { value: 'butler_pantry', label: 'Butler\'s Pantry', icon: Utensils, category: 'Kitchen & Utility' },
  { value: 'office', label: 'Office', icon: Briefcase, category: 'Work & Study' },
  { value: 'study', label: 'Study', icon: BookOpen, category: 'Work & Study' },
  { value: 'library', label: 'Library', icon: BookOpen, category: 'Work & Study' },
  { value: 'home_office', label: 'Home Office', icon: Home, category: 'Work & Study' },
  { value: 'media_room', label: 'Media Room', icon: Sofa, category: 'Entertainment' },
  { value: 'theater_room', label: 'Theater Room', icon: Gamepad2, category: 'Entertainment' },
  { value: 'game_room', label: 'Game Room', icon: Gamepad2, category: 'Entertainment' },
  { value: 'music_room', label: 'Music Room', icon: Home, category: 'Entertainment' },
  { value: 'garage', label: 'Garage', icon: Car, category: 'Storage & Utility' },
  { value: 'storage_room', label: 'Storage Room', icon: Warehouse, category: 'Storage & Utility' },
  { value: 'closet', label: 'Walk-in Closet', icon: Shirt, category: 'Storage & Utility' },
  { value: 'basement', label: 'Basement', icon: Building, category: 'Storage & Utility' },
  { value: 'attic', label: 'Attic', icon: Home, category: 'Storage & Utility' },
  { value: 'utility_room', label: 'Utility Room', icon: Wrench, category: 'Storage & Utility' },
  { value: 'power_box', label: 'Power Box / Electrical Panel', icon: Zap, category: 'Storage & Utility' },
  { value: 'balcony', label: 'Balcony', icon: Sun, category: 'Outdoor & Exterior' },
  { value: 'patio', label: 'Patio', icon: Sun, category: 'Outdoor & Exterior' },
  { value: 'deck', label: 'Deck', icon: TreePine, category: 'Outdoor & Exterior' },
  { value: 'garden', label: 'Garden', icon: TreePine, category: 'Outdoor & Exterior' },
  { value: 'courtyard', label: 'Courtyard', icon: Sun, category: 'Outdoor & Exterior' },
  { value: 'roof_terrace', label: 'Roof Terrace', icon: Building, category: 'Outdoor & Exterior' },
  { value: 'roof', label: 'Roof', icon: Shield, category: 'Outdoor & Exterior' },
  { value: 'gutters', label: 'Gutters', icon: Wind, category: 'Outdoor & Exterior' },
  { value: 'pool', label: 'Pool', icon: Waves, category: 'Outdoor & Exterior' },
  { value: 'windows_exterior', label: 'Windows Exterior', icon: Wind, category: 'Outdoor & Exterior' },
  { value: 'gym', label: 'Gym/Exercise Room', icon: Shield, category: 'Specialty' },
  { value: 'wine_cellar', label: 'Wine Cellar', icon: Warehouse, category: 'Specialty' },
  { value: 'sauna', label: 'Sauna', icon: Wind, category: 'Specialty' },
  { value: 'craft_room', label: 'Craft Room', icon: Hammer, category: 'Specialty' },
  { value: 'pet_room', label: 'Pet Room', icon: Dog, category: 'Specialty' },
  { value: 'reception', label: 'Reception Area', icon: Users, category: 'Commercial' },
  { value: 'conference_room', label: 'Conference Room', icon: Users, category: 'Commercial' },
  { value: 'boardroom', label: 'Boardroom', icon: Briefcase, category: 'Commercial' },
  { value: 'break_room', label: 'Break Room', icon: Coffee, category: 'Commercial' },
  { value: 'server_room', label: 'Server Room', icon: Wifi, category: 'Commercial' },
  { value: 'retail_space', label: 'Retail Space', icon: Store, category: 'Commercial' },
  { value: 'warehouse_space', label: 'Warehouse Space', icon: Warehouse, category: 'Commercial' },
  { value: 'workshop', label: 'Workshop', icon: Hammer, category: 'Commercial' },
  { value: 'hallway', label: 'Hallway', icon: Home, category: 'Other' },
  { value: 'other', label: 'Other (Custom Name)', icon: Home, category: 'Other' },
];

interface RoomTypePickerProps {
  property: Property;
  isOpen: boolean;
  onClose: () => void;
}

export default function RoomTypePicker({ property, isOpen, onClose }: RoomTypePickerProps) {
  const { toast } = useToast();
  const [showRoofMaterialModal, setShowRoofMaterialModal] = useState(false);
  const [pendingRoofData, setPendingRoofData] = useState<any>(null);
  const [showCustomRoomModal, setShowCustomRoomModal] = useState(false);
  const [customRoomName, setCustomRoomName] = useState('');
  const [selectedRoofMaterial, setSelectedRoofMaterial] = useState('');

  const addRoomMutation = useMutation({
    mutationFn: async (data: { roomName: string; roomType: string; floor: number; description: string; materialType?: string }) => {
      const roomData = {
        ...data,
        propertyId: property.id
      };
      const response = await authenticatedApiRequest('POST', `/api/properties/${property.id}/rooms`, roomData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'rooms'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', property.id, 'all-inspection-items'] });
      toast({ title: 'Success', description: 'Room added successfully with inspection items' });
      onClose();
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to add room', variant: 'destructive' });
    },
  });

  const handleRoomSelect = (type: typeof roomTypes[0]) => {
    if (type.value === 'roof') {
      const roomData = {
        roomName: type.label,
        roomType: type.value,
        floor: 2,
        description: '',
      };
      setPendingRoofData(roomData);
      setShowRoofMaterialModal(true);
    } else if (type.value === 'other') {
      setShowCustomRoomModal(true);
      setCustomRoomName('');
    } else {
      const roomData = {
        roomName: type.label,
        roomType: type.value,
        floor: type.value === 'gutters' ? 2 : 1,
        description: '',
      };
      addRoomMutation.mutate(roomData);
    }
  };

  const handleRoofMaterialSubmit = () => {
    if (pendingRoofData && selectedRoofMaterial) {
      const roomData = {
        ...pendingRoofData,
        materialType: selectedRoofMaterial,
        roomName: `Roof (${selectedRoofMaterial})`,
      };
      addRoomMutation.mutate(roomData);
      setShowRoofMaterialModal(false);
      setPendingRoofData(null);
      setSelectedRoofMaterial('');
    }
  };

  const handleCustomRoomSubmit = () => {
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
  };

  return (
    <>
      <Dialog open={isOpen && !showRoofMaterialModal && !showCustomRoomModal} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%]">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Select Room Type to Add
              </span>
            </DialogTitle>
          </DialogHeader>
          <div className="overflow-y-auto max-h-[65vh] pr-2">
            <div className="space-y-4">
              {['Bedrooms', 'Bathrooms', 'Living Areas', 'Kitchen & Utility', 'Work & Study', 'Entertainment', 'Storage & Utility', 'Outdoor & Exterior', 'Specialty', 'Commercial', 'Other'].map((category) => {
                const categoryRooms = roomTypes.filter(room => room.category === category);
                if (categoryRooms.length === 0) return null;
                
                return (
                  <div key={category} className="border-b pb-3 last:border-b-0">
                    <h4 className="font-medium text-sm text-gray-700 mb-2">{category}</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {categoryRooms.map((type) => (
                        <button
                          key={type.value}
                          onClick={() => handleRoomSelect(type)}
                          disabled={addRoomMutation.isPending}
                          className="flex items-center p-3 text-left hover:bg-blue-50 rounded border border-gray-200 bg-white transition-colors disabled:opacity-50"
                          data-testid={`room-type-${type.value}`}
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
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showRoofMaterialModal} onOpenChange={() => setShowRoofMaterialModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Select Roof Material</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              {['Metal', 'Tile', 'Slate', 'Shingle', 'Flat/Membrane', 'Other'].map((material) => (
                <button
                  key={material}
                  onClick={() => setSelectedRoofMaterial(material)}
                  className={`p-3 text-left rounded border transition-colors ${
                    selectedRoofMaterial === material 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {material}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRoofMaterialModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleRoofMaterialSubmit}
                disabled={!selectedRoofMaterial || addRoomMutation.isPending}
              >
                {addRoomMutation.isPending ? 'Adding...' : 'Add Roof'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCustomRoomModal} onOpenChange={() => setShowCustomRoomModal(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Custom Room Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="customRoomName">Room Name</Label>
              <Input
                id="customRoomName"
                value={customRoomName}
                onChange={(e) => setCustomRoomName(e.target.value)}
                placeholder="Enter room name..."
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCustomRoomModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleCustomRoomSubmit}
                disabled={!customRoomName.trim() || addRoomMutation.isPending}
              >
                {addRoomMutation.isPending ? 'Adding...' : 'Add Room'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
