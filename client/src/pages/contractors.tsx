import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { 
  ArrowLeft, 
  Plus, 
  Phone, 
  Mail, 
  Star, 
  Edit2, 
  Trash2, 
  Wrench,
  Zap,
  Flame,
  Wind,
  Shield,
  Bug,
  Home,
  Building
} from 'lucide-react';
import { 
  TRADE_CATEGORIES, 
  TRADE_CATEGORY_LABELS,
  type TradeCategory,
  type ServiceProvider 
} from '@shared/schema';

const TRADE_ICONS: Record<TradeCategory, React.ReactNode> = {
  plumbing: <Wrench className="w-4 h-4" />,
  electrical: <Zap className="w-4 h-4" />,
  hvac: <Wind className="w-4 h-4" />,
  gas: <Flame className="w-4 h-4" />,
  roofing: <Home className="w-4 h-4" />,
  pest_control: <Bug className="w-4 h-4" />,
  fire_safety: <Shield className="w-4 h-4" />,
  general: <Building className="w-4 h-4" />,
};

const TRADE_COLORS: Record<TradeCategory, string> = {
  plumbing: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  electrical: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  hvac: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  gas: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  roofing: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
  pest_control: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  fire_safety: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  general: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

interface ContractorFormData {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  tradeCategory: TradeCategory;
  licenseNumber: string;
  notes: string;
  isPreferred: boolean;
}

const emptyFormData: ContractorFormData = {
  name: '',
  contactName: '',
  email: '',
  phone: '',
  tradeCategory: 'general',
  licenseNumber: '',
  notes: '',
  isPreferred: false,
};

export default function Contractors() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContractor, setEditingContractor] = useState<ServiceProvider | null>(null);
  const [formData, setFormData] = useState<ContractorFormData>(emptyFormData);
  const [filterCategory, setFilterCategory] = useState<TradeCategory | 'all'>('all');

  const { data: contractors = [], isLoading } = useQuery<ServiceProvider[]>({
    queryKey: ['/api/contractors', user?.agencyId],
    enabled: !!user?.agencyId,
  });

  const createMutation = useMutation({
    mutationFn: async (data: ContractorFormData) => {
      const response = await apiRequest('/api/contractors', 'POST', {
        ...data,
        agencyId: user?.agencyId,
      });
      if (!response.ok) throw new Error('Failed to create contractor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Contractor Added',
        description: 'The contractor has been added successfully.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to add contractor. Please try again.',
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<ContractorFormData> }) => {
      const response = await apiRequest(`/api/contractors/${id}`, 'PATCH', data);
      if (!response.ok) throw new Error('Failed to update contractor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      setIsDialogOpen(false);
      resetForm();
      toast({
        title: 'Contractor Updated',
        description: 'The contractor has been updated successfully.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to update contractor. Please try again.',
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest(`/api/contractors/${id}`, 'DELETE');
      if (!response.ok) throw new Error('Failed to delete contractor');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/contractors'] });
      toast({
        title: 'Contractor Deleted',
        description: 'The contractor has been removed.',
      });
    },
    onError: () => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to delete contractor. Please try again.',
      });
    },
  });

  const resetForm = () => {
    setFormData(emptyFormData);
    setEditingContractor(null);
  };

  const handleOpenDialog = (contractor?: ServiceProvider) => {
    if (contractor) {
      setEditingContractor(contractor);
      setFormData({
        name: contractor.name,
        contactName: contractor.contactName || '',
        email: contractor.email || '',
        phone: contractor.phone,
        tradeCategory: contractor.tradeCategory as TradeCategory,
        licenseNumber: contractor.licenseNumber || '',
        notes: contractor.notes || '',
        isPreferred: contractor.isPreferred || false,
      });
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.phone.trim()) {
      toast({
        variant: 'destructive',
        title: 'Validation Error',
        description: 'Please provide at least a business name and phone number.',
      });
      return;
    }

    if (editingContractor) {
      updateMutation.mutate({ id: editingContractor.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (contractor: ServiceProvider) => {
    if (window.confirm(`Are you sure you want to remove ${contractor.name}?`)) {
      deleteMutation.mutate(contractor.id);
    }
  };

  const filteredContractors = filterCategory === 'all' 
    ? contractors 
    : contractors.filter(c => c.tradeCategory === filterCategory);

  const groupedContractors = TRADE_CATEGORIES.reduce((acc, category) => {
    acc[category] = filteredContractors.filter(c => c.tradeCategory === category);
    return acc;
  }, {} as Record<TradeCategory, ServiceProvider[]>);

  if (!user) {
    setLocation('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setLocation('/dashboard')}
            className="mb-4"
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                <Wrench className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900" data-testid="text-page-title">Trade Contractors</h1>
                <p className="text-gray-600">Manage your trusted trade professionals</p>
              </div>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => handleOpenDialog()} data-testid="button-add-contractor">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Contractor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingContractor ? 'Edit Contractor' : 'Add New Contractor'}
                  </DialogTitle>
                  <DialogDescription>
                    {editingContractor 
                      ? 'Update the contractor details below.' 
                      : 'Add a trade contractor to your list. They can be assigned to inspection items.'}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Business Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="ABC Plumbing Services"
                      required
                      autoFocus
                      data-testid="input-contractor-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="tradeCategory">Trade Category *</Label>
                    <Select 
                      value={formData.tradeCategory} 
                      onValueChange={(value) => setFormData({ ...formData, tradeCategory: value as TradeCategory })}
                    >
                      <SelectTrigger data-testid="select-trade-category">
                        <SelectValue placeholder="Select trade" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRADE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            <span className="flex items-center gap-2">
                              {TRADE_ICONS[category]}
                              {TRADE_CATEGORY_LABELS[category]}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="contactName">Contact Person</Label>
                    <Input
                      id="contactName"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                      placeholder="John Smith"
                      data-testid="input-contact-name"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="0412 345 678"
                      required
                      data-testid="input-phone"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="info@abcplumbing.com"
                      data-testid="input-email"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="licenseNumber">License Number</Label>
                    <Input
                      id="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                      placeholder="LIC-12345"
                      data-testid="input-license"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional information about this contractor..."
                      rows={2}
                      data-testid="input-notes"
                    />
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isPreferred"
                      checked={formData.isPreferred}
                      onChange={(e) => setFormData({ ...formData, isPreferred: e.target.checked })}
                      className="rounded border-gray-300"
                      data-testid="checkbox-preferred"
                    />
                    <Label htmlFor="isPreferred" className="cursor-pointer">
                      Mark as preferred contractor
                    </Label>
                  </div>
                  
                  <div className="flex justify-end gap-2 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                      data-testid="button-cancel"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      disabled={createMutation.isPending || updateMutation.isPending}
                      data-testid="button-save-contractor"
                    >
                      {createMutation.isPending || updateMutation.isPending 
                        ? 'Saving...' 
                        : editingContractor ? 'Update' : 'Add Contractor'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterCategory('all')}
              data-testid="filter-all"
            >
              All ({contractors.length})
            </Button>
            {TRADE_CATEGORIES.map((category) => {
              const count = contractors.filter(c => c.tradeCategory === category).length;
              if (count === 0) return null;
              return (
                <Button
                  key={category}
                  variant={filterCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterCategory(category)}
                  className="gap-1"
                  data-testid={`filter-${category}`}
                >
                  {TRADE_ICONS[category]}
                  {TRADE_CATEGORY_LABELS[category]} ({count})
                </Button>
              );
            })}
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-48" />
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-40" />
                    </div>
                    <Skeleton className="h-8 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredContractors.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {filterCategory === 'all' ? 'No contractors yet' : `No ${TRADE_CATEGORY_LABELS[filterCategory]} contractors`}
              </h3>
              <p className="text-gray-600 mb-4">
                {filterCategory === 'all' 
                  ? 'Add your first trade contractor to get started.' 
                  : 'Try a different filter or add a new contractor.'}
              </p>
              {filterCategory === 'all' && (
                <Button onClick={() => handleOpenDialog()} data-testid="button-add-first-contractor">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Contractor
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredContractors.map((contractor) => (
              <Card key={contractor.id} className="hover:shadow-md transition-shadow" data-testid={`card-contractor-${contractor.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900" data-testid={`text-name-${contractor.id}`}>
                          {contractor.name}
                        </h3>
                        {contractor.isPreferred && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <Star className="w-3 h-3 mr-1 fill-current" />
                            Preferred
                          </Badge>
                        )}
                        <Badge className={TRADE_COLORS[contractor.tradeCategory as TradeCategory]}>
                          {TRADE_ICONS[contractor.tradeCategory as TradeCategory]}
                          <span className="ml-1">{TRADE_CATEGORY_LABELS[contractor.tradeCategory as TradeCategory]}</span>
                        </Badge>
                      </div>
                      
                      {contractor.contactName && (
                        <p className="text-gray-600 text-sm mb-1">
                          Contact: {contractor.contactName}
                        </p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <a 
                          href={`tel:${contractor.phone}`} 
                          className="flex items-center gap-1 hover:text-primary"
                          data-testid={`link-phone-${contractor.id}`}
                        >
                          <Phone className="w-4 h-4" />
                          {contractor.phone}
                        </a>
                        {contractor.email && (
                          <a 
                            href={`mailto:${contractor.email}`} 
                            className="flex items-center gap-1 hover:text-primary"
                            data-testid={`link-email-${contractor.id}`}
                          >
                            <Mail className="w-4 h-4" />
                            {contractor.email}
                          </a>
                        )}
                      </div>
                      
                      {contractor.licenseNumber && (
                        <p className="text-xs text-gray-500 mt-2">
                          License: {contractor.licenseNumber}
                        </p>
                      )}
                      
                      {contractor.notes && (
                        <p className="text-sm text-gray-600 mt-2 italic">
                          {contractor.notes}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenDialog(contractor)}
                        data-testid={`button-edit-${contractor.id}`}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(contractor)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-${contractor.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="text-lg">About Trade Contractors</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 text-sm">
              Trade contractors are the professionals you call for specific maintenance and compliance work. 
              Once added here, you can assign them to inspection items - so when something needs attention, 
              you'll know exactly who to contact. Preferred contractors are highlighted for quick reference.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
