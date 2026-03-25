import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { format } from "date-fns";
import { FileText, AlertTriangle, Trash2, ExternalLink, X } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import { type ComplianceCertificate, type Property } from "@shared/schema";
import { SimpleCertificateForm } from "./simple-certificate-form";
import { apiRequest } from "@/lib/queryClient";

const certificateTypes = [
  { value: "pool_compliance", label: "Pool Compliance Certificate" },
  { value: "gas_inspection", label: "Gas Inspection Certificate" },
  { value: "electrical_test_tag", label: "Electrical Test & Tag" },
  { value: "smoke_alarm", label: "Smoke Alarm Certificate" },
  { value: "energy_efficiency", label: "Energy Efficiency Certificate" },
  { value: "building_inspection", label: "Building Inspection Certificate" },
  { value: "pest_inspection", label: "Pest Inspection Certificate" },
  { value: "asbestos_inspection", label: "Asbestos Inspection Certificate" },
];

export function CertificateManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedCertificate, setSelectedCertificate] = useState<ComplianceCertificate | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string | null>(null);
  const [certificateToDelete, setCertificateToDelete] = useState<{id: number, name: string} | null>(null);

  const { data: certificates = [], isLoading } = useQuery<ComplianceCertificate[]>({
    queryKey: ["/api/certificates"],
  });

  const { data: expiringCertificates = [] } = useQuery<ComplianceCertificate[]>({
    queryKey: ["/api/certificates/expiring"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties/1"], // Using agency ID 1 for now
  });

  const deleteCertificateMutation = useMutation({
    mutationFn: async (certificateId: number) => {
      return apiRequest(`/api/certificates/${certificateId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/expiring"] });
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

  const handleDelete = async (certificateId: number, certificateName: string) => {
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

  const getStatusBadge = (certificate: ComplianceCertificate) => {
    const now = new Date();
    const expiryDate = new Date(certificate.expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= certificate.reminderDays) {
      return <Badge variant="secondary">Expiring Soon</Badge>;
    } else {
      return <Badge variant="default">Active</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Certificate Management</h2>
          <p className="text-muted-foreground">Track compliance certificates and their expiry dates</p>
        </div>
        <SimpleCertificateForm />
      </div>

      {/* Expiring Certificates Alert */}
      {expiringCertificates.length > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-5 w-5" />
              Certificates Expiring Soon
            </CardTitle>
            <CardDescription className="text-amber-700">
              {expiringCertificates.length} certificate(s) expire within the next 30 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expiringCertificates.slice(0, 3).map((cert: ComplianceCertificate) => (
                <div key={cert.id} className="flex items-center justify-between p-2 bg-white rounded border">
                  <div>
                    <p className="font-medium">{cert.certificateName}</p>
                    <p className="text-sm text-muted-foreground">
                      Expires {format(new Date(cert.expiryDate), "PPP")}
                    </p>
                  </div>
                  {getStatusBadge(cert)}
                </div>
              ))}
              {expiringCertificates.length > 3 && (
                <p className="text-sm text-muted-foreground">
                  And {expiringCertificates.length - 3} more...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* All Certificates */}
      <Card>
        <CardHeader>
          <CardTitle>All Certificates</CardTitle>
          <CardDescription>
            Manage and track all compliance certificates
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="h-16 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : certificates.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No certificates found</p>
              <p className="text-sm text-muted-foreground">
                Add your first compliance certificate to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {certificates.map((cert: ComplianceCertificate) => (
                <div key={cert.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{cert.certificateName}</p>
                        <p className="text-sm text-muted-foreground">
                          {certificateTypes.find(t => t.value === cert.certificateType)?.label}
                          {cert.certifyingBody && ` • ${cert.certifyingBody}`}
                        </p>
                        {cert.propertyId && (
                          <p className="text-xs text-blue-600 mt-1">
                            Property: {properties.find((p) => p.id === cert.propertyId)?.name || `Property #${cert.propertyId}`}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        Expires: {format(new Date(cert.expiryDate), "MMM dd, yyyy")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Issued: {format(new Date(cert.issueDate), "MMM dd, yyyy")}
                      </p>
                      {cert.certificateNumber && (
                        <p className="text-xs text-muted-foreground">
                          #{cert.certificateNumber}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {cert.fileUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDocument(cert)}
                          data-testid={`button-view-document-${cert.id}`}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(cert.id, cert.certificateName)}
                        disabled={deleteCertificateMutation.isPending}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid={`button-delete-certificate-${cert.id}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      {getStatusBadge(cert)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              />
            </div>
          )}
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
    </div>
  );
}