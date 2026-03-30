import { useState } from "react";
import { useParams, Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { authenticatedApiRequest } from "@/lib/api";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Calendar, MapPin, CheckCircle, Clock, AlertTriangle, FileText, Send, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface InspectionItem {
  id: number;
  roomId: number;
  inspectionPeriodId: number | null;
  category: string;
  itemName: string;
  description: string | null;
  frequency: string;
  priority: string;
  checklistPoints: string[];
  isCompleted: boolean | null;
  completedDate: string | null;
  notes: string | null;
  isActive: boolean | null;
  createdAt: string | null;
}

interface Room {
  id: number;
  propertyId: number;
  roomName: string;
  roomType: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
}

interface Property {
  id: number;
  name: string;
  address: string;
  propertyType: string;
}

interface InspectionPeriod {
  id: number;
  propertyId: number;
  periodName: string;
  startDate: string;
  endDate: string;
  dueDate: string;
  frequency: string;
  status: string;
}

export default function InspectionDetails() {
  const { id: propertyId, periodId } = useParams<{ id: string; periodId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const [completionResult, setCompletionResult] = useState<any>(null);

  // Fetch property details
  const { data: property, isLoading: propertyLoading } = useQuery({
    queryKey: ['/api/properties/single', propertyId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/single/${propertyId}`);
      return await response.json() as Property;
    },
    enabled: !!propertyId,
  });

  // Fetch inspection period details
  const { data: inspectionPeriod, isLoading: periodLoading } = useQuery({
    queryKey: ['/api/inspection-periods', periodId],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/inspection-periods/${periodId}`);
      return await response.json() as InspectionPeriod;
    },
    enabled: !!periodId,
  });

  // Fetch property rooms
  const { data: rooms, isLoading: roomsLoading } = useQuery({
    queryKey: ['/api/properties', propertyId, 'rooms'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/properties/${propertyId}/rooms`);
      return await response.json() as Room[];
    },
    enabled: !!propertyId,
  });

  // Fetch inspection items for this period
  const { data: inspectionItems, isLoading: itemsLoading } = useQuery({
    queryKey: ['/api/inspection-periods', periodId, 'items'],
    queryFn: async () => {
      const response = await authenticatedApiRequest('GET', `/api/inspection-periods/${periodId}/items`);
      return await response.json() as InspectionItem[];
    },
    enabled: !!periodId,
  });

  // Mutation to update inspection item completion
  const updateItemMutation = useMutation({
    mutationFn: async ({ itemId, isCompleted }: { itemId: number; isCompleted: boolean }) => {
      return await apiRequest(`/api/inspection-items/${itemId}`, 'PATCH', {
        isCompleted,
        completedDate: isCompleted ? new Date().toISOString() : null,
        inspectionPeriodId: parseInt(periodId!)
      });
    },
    onSuccess: () => {
      // Invalidate related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/inspection-periods', periodId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', user?.agencyId, 'inspection-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', user?.agencyId, 'inspection-ratios'] });
      
      toast({
        title: "Item Updated",
        description: "Inspection item status updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating inspection item:', error);
      toast({
        title: "Error",
        description: "Failed to update inspection item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleItemToggle = (itemId: number, currentStatus: boolean | null) => {
    updateItemMutation.mutate({
      itemId,
      isCompleted: !currentStatus
    });
  };

  // Mutation to complete the inspection period and generate report
  const completeInspectionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/inspection-periods/${periodId}/complete`, 'POST', {});
      return response;
    },
    onSuccess: (data) => {
      setCompletionResult(data);
      setShowCompleteDialog(false);
      
      // Invalidate related queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/inspection-periods', periodId] });
      queryClient.invalidateQueries({ queryKey: ['/api/inspection-periods', periodId, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/properties', propertyId, 'inspection-periods'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agencies', user?.agencyId, 'inspection-periods'] });
      
      toast({
        title: "Inspection Completed",
        description: `Inspection report generated with ${data?.period?.completionPercentage || 0}% completion.`,
      });
    },
    onError: (error) => {
      console.error('Error completing inspection:', error);
      toast({
        title: "Error",
        description: "Failed to complete inspection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const isLoading = propertyLoading || periodLoading || roomsLoading || itemsLoading;

  if (isLoading) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!property || !inspectionPeriod) {
    return (
      <div className="p-6 max-w-6xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">Inspection Not Found</h1>
        <p className="text-gray-600 mb-6">The requested inspection could not be found.</p>
        <Link href="/properties">
          <Button>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Properties
          </Button>
        </Link>
      </div>
    );
  }

  // Group items by room, only showing rooms with incomplete items
  const itemsByRoom = (inspectionItems || []).reduce((acc, item) => {
    const room = rooms?.find(r => r.id === item.roomId);
    const roomName = room?.roomName || `Room ${item.roomId}`;
    
    if (!acc[roomName]) {
      acc[roomName] = [];
    }
    acc[roomName].push(item);
    return acc;
  }, {} as Record<string, InspectionItem[]>);

  // Filter out rooms where all items are completed
  const incompleteRoomItems = Object.fromEntries(
    Object.entries(itemsByRoom).filter(([roomName, items]) => {
      return items.some(item => !item.isCompleted);
    })
  );

  // Calculate completion stats
  const totalItems = inspectionItems?.length || 0;
  const completedItems = inspectionItems?.filter(item => item.isCompleted).length || 0;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Determine status
  const isPastDue = new Date(inspectionPeriod.dueDate) < new Date();
  const isCompleted = inspectionPeriod.status === 'completed' || completionPercentage === 100;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <Link href={`/properties/${propertyId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Property
            </Button>
          </Link>
          
          <div className="flex items-center space-x-2">
            {isCompleted && (
              <Badge variant="default" className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Completed
              </Badge>
            )}
            {isPastDue && !isCompleted && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Overdue
              </Badge>
            )}
            {!isPastDue && !isCompleted && (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{inspectionPeriod.periodName}</h1>
        <div className="flex items-center text-gray-600 space-x-6">
          <div className="flex items-center">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{property.name}</span>
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Due: {new Date(inspectionPeriod.dueDate).toLocaleDateString()}</span>
          </div>
        </div>
        
        {/* Progress Summary */}
        <div className="mt-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium text-gray-900">Inspection Progress</span>
            <span className="text-sm text-gray-600">{completedItems} of {totalItems} items completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                isCompleted 
                  ? 'bg-green-500' 
                  : completionPercentage >= 50 
                    ? 'bg-yellow-500' 
                    : 'bg-red-400'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className={`text-sm font-medium ${
              isCompleted ? 'text-green-600' : isPastDue ? 'text-red-600' : 'text-gray-600'
            }`}>
              {completionPercentage}% complete
            </span>
            
            {/* Complete Inspection Button */}
            {!isCompleted && completedItems > 0 && (
              <AlertDialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
                <AlertDialogTrigger asChild>
                  <Button 
                    size="sm" 
                    className="bg-primary hover:bg-primary/90"
                    data-testid="button-complete-inspection"
                  >
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Complete Inspection
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Complete Inspection?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-3">
                      <p>
                        You are about to mark this inspection as complete with 
                        <span className="font-semibold text-gray-900"> {completionPercentage}% </span> 
                        of items checked.
                      </p>
                      
                      <div className="bg-gray-50 rounded-lg p-3 text-sm">
                        <div className="flex justify-between text-gray-600">
                          <span>Completed Items:</span>
                          <span className="font-medium text-gray-900">{completedItems} of {totalItems}</span>
                        </div>
                        <div className="flex justify-between text-gray-600 mt-1">
                          <span>Remaining Items:</span>
                          <span className="font-medium text-orange-600">{totalItems - completedItems}</span>
                        </div>
                      </div>
                      
                      {completionPercentage < 100 && (
                        <p className="text-orange-600 text-sm">
                          Note: Some items are still incomplete. A partial completion report will be generated.
                        </p>
                      )}
                      
                      <p className="text-gray-600">
                        A detailed inspection report will be generated and can be sent to stakeholders.
                      </p>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel data-testid="button-cancel-complete">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => completeInspectionMutation.mutate()}
                      disabled={completeInspectionMutation.isPending}
                      className="bg-primary hover:bg-primary/90"
                      data-testid="button-confirm-complete"
                    >
                      {completeInspectionMutation.isPending ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Completing...
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Complete & Generate Report
                        </>
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            
            {/* View Report Button (shown after completion) */}
            {isCompleted && completionResult?.report && (
              <Button 
                size="sm" 
                variant="outline"
                className="border-primary text-primary hover:bg-primary/10"
                data-testid="button-view-report"
              >
                <FileText className="w-4 h-4 mr-2" />
                View Report
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Completion Result Summary */}
      {completionResult && (
        <Card className="mb-6 border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center mb-3">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <h3 className="font-semibold text-green-800">Inspection Completed Successfully</h3>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-green-700">Completion:</span>
                <span className="ml-2 font-medium text-green-900">{completionResult.period?.completionPercentage}%</span>
              </div>
              <div>
                <span className="text-green-700">Report ID:</span>
                <span className="ml-2 font-medium text-green-900">#{completionResult.report?.id}</span>
              </div>
              <div>
                <span className="text-green-700">Generated:</span>
                <span className="ml-2 font-medium text-green-900">
                  {completionResult.report?.generatedAt 
                    ? new Date(completionResult.report.generatedAt).toLocaleDateString() 
                    : 'Just now'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inspection Items by Room */}
      <div className="space-y-6">
        {Object.entries(incompleteRoomItems).length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">All Rooms Completed!</h3>
              <p className="text-gray-600">
                All inspection items have been completed for this inspection period.
              </p>
            </CardContent>
          </Card>
        ) : (
          Object.entries(incompleteRoomItems).map(([roomName, items]) => (
          <Card key={roomName}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>{roomName}</span>
                <Badge variant="outline">
                  {items.filter(item => item.isCompleted).length}/{items.length} completed
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {items.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={item.isCompleted || false}
                        onCheckedChange={() => handleItemToggle(item.id, item.isCompleted)}
                        disabled={updateItemMutation.isPending}
                        data-testid={`checkbox-item-${item.id}`}
                      />
                      
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className={`font-medium ${item.isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {item.itemName}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <Badge variant={
                              item.priority === 'critical' ? 'destructive' :
                              item.priority === 'high' ? 'default' :
                              'secondary'
                            }>
                              {item.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.frequency}
                            </Badge>
                          </div>
                        </div>
                        
                        {item.description && (
                          <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                        )}
                        
                        {item.checklistPoints && item.checklistPoints.length > 0 && (
                          <div className="mb-3">
                            <h5 className="text-xs font-medium text-gray-700 mb-1">Checklist Points:</h5>
                            <ul className="text-xs text-gray-600 space-y-1">
                              {item.checklistPoints.map((point, index) => (
                                <li key={index} className="flex items-start">
                                  <span className="text-gray-400 mr-2">•</span>
                                  <span>{point}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {item.isCompleted && item.completedDate && (
                          <div className="text-xs text-green-600">
                            <CheckCircle className="w-3 h-3 inline mr-1" />
                            Completed on {new Date(item.completedDate).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          ))
        )}
        
        {totalItems === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">No inspection items found for this period.</p>
              <Link href={`/properties/${propertyId}`}>
                <Button className="mt-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Property
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}