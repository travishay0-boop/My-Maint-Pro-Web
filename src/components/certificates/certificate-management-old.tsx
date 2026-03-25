import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertComplianceCertificateSchema, type ComplianceCertificate, type InsertComplianceCertificate, type Property } from "@shared/schema";
import { format } from "date-fns";
import { CalendarIcon, FileText, AlertTriangle, CheckCircle, Upload, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

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
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: certificates = [], isLoading } = useQuery<ComplianceCertificate[]>({
    queryKey: ["/api/certificates"],
  });

  const { data: expiringCertificates = [] } = useQuery<ComplianceCertificate[]>({
    queryKey: ["/api/certificates/expiring"],
  });

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties/1"], // Using agency ID 1 for now
  });

  const form = useForm<InsertComplianceCertificate>({
    resolver: zodResolver(insertComplianceCertificateSchema),
    defaultValues: {
      certificateType: "pool_compliance", // Set a default instead of empty string
      certificateName: "",
      propertyId: null,
      issueDate: new Date(),
      expiryDate: new Date(),
      reminderDays: 30,
      inspectionFrequencyMonths: 12,
      certifyingBody: "",
      certificateNumber: "",
      fileUrl: "",
      notes: "",
      status: "active",
    },
  });

  const createCertificateMutation = useMutation({
    mutationFn: async (data: InsertComplianceCertificate) => {
      return apiRequest("/api/certificates", "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/certificates"] });
      queryClient.invalidateQueries({ queryKey: ["/api/certificates/expiring"] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedFile(null);
      toast({
        title: "Success",
        description: "Certificate added successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add certificate. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      // Extract certificate name from file name
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      form.setValue("certificateName", nameWithoutExtension);
      
      // Try to extract dates from filename if possible
      // This is a basic implementation - in production you'd want more sophisticated parsing
      const dateRegex = /(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/g;
      const dates = file.name.match(dateRegex);
      if (dates && dates.length > 0) {
        try {
          const parsedDate = new Date(dates[0].replace(/[-/.]/g, '/'));
          if (!isNaN(parsedDate.getTime())) {
            form.setValue("issueDate", parsedDate);
            
            // Set expiry date 1 year from issue date by default
            const expiryDate = new Date(parsedDate);
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            form.setValue("expiryDate", expiryDate);
          }
        } catch (e) {
          console.log("Could not parse date from filename");
        }
      }
    }
  };

  const onSubmit = (data: InsertComplianceCertificate) => {
    try {
      console.log("Form data before submission:", data);
      console.log("Form errors:", form.formState.errors);
      
      // Ensure propertyId is handled correctly - convert "0" to null
      if (data.propertyId === 0 || String(data.propertyId) === "0") {
        data.propertyId = null;
      } else if (data.propertyId) {
        data.propertyId = Number(data.propertyId);
      }

      // In a real implementation, you'd upload the file first and get the URL
      if (selectedFile) {
        data.fileUrl = `/uploads/certificates/${selectedFile.name}`;
      }
      
      console.log("Final data being submitted:", data);
      createCertificateMutation.mutate(data);
    } catch (error) {
      console.error("Error in onSubmit:", error);
      toast({
        title: "Error",
        description: "Failed to submit form. Please check your inputs.",
        variant: "destructive",
      });
    }
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
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Certificate
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Certificate</DialogTitle>
              <DialogDescription>
                Upload a compliance certificate and set its details
              </DialogDescription>
            </DialogHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="certificateType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate Type</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select certificate type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {certificateTypes.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certificateName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Certificate name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="propertyId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property (Optional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))} value={field.value?.toString() || "0"}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a property (optional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="0">No specific property</SelectItem>
                          {properties.map((property) => (
                            <SelectItem key={property.id} value={property.id.toString()}>
                              {property.name} - {property.address}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="space-y-4">
                  <Label>Upload Certificate File</Label>
                  <div className="flex items-center gap-4">
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={handleFileUpload}
                      className="flex-1"
                    />
                    {selectedFile && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {selectedFile.name}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Issue Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date > new Date() || date < new Date("1900-01-01")
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expiryDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Expiry Date</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "w-full pl-3 text-left font-normal",
                                  !field.value && "text-muted-foreground"
                                )}
                              >
                                {field.value ? (
                                  format(field.value, "PPP")
                                ) : (
                                  <span>Pick a date</span>
                                )}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value || undefined}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="certifyingBody"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certifying Body</FormLabel>
                        <FormControl>
                          <Input placeholder="Organization that issued certificate" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="certificateNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Certificate Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Certificate reference number" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="reminderDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reminder Days Before Expiry</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            {...field}
                            onChange={e => field.onChange(parseInt(e.target.value) || 30)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="inspectionFrequencyMonths"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Inspection Frequency (Months)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="12" 
                            value={field.value || 12}
                            onChange={e => field.onChange(parseInt(e.target.value) || 12)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Additional notes about this certificate"
                          {...field}
                          value={field.value || ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={createCertificateMutation.isPending}
                    onClick={(e) => {
                      e.preventDefault();
                      console.log("Submit button clicked - preventing default");
                      console.log("Form is valid:", form.formState.isValid);
                      console.log("Form errors:", form.formState.errors);
                      console.log("Form values:", form.getValues());
                      
                      // Manually trigger form submission
                      form.handleSubmit(onSubmit)();
                    }}
                  >
                    {createCertificateMutation.isPending ? "Adding..." : "Add Certificate"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
                  <div className="text-right">
                    <p className="text-sm">
                      Expires {format(new Date(cert.expiryDate), "MMM dd, yyyy")}
                    </p>
                    <div className="mt-1">
                      {getStatusBadge(cert)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}