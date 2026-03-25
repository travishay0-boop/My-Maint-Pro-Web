import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { CalendarIcon, Plus, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";

import { insertComplianceCertificateSchema, type InsertComplianceCertificate, type Property } from "@shared/schema";
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

export function SimpleCertificateForm() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: properties = [] } = useQuery<Property[]>({
    queryKey: ["/api/properties/1"],
  });

  const form = useForm<InsertComplianceCertificate>({
    resolver: zodResolver(insertComplianceCertificateSchema),
    defaultValues: {
      agencyId: 1, // Set the agency ID
      certificateType: "pool_compliance",
      certificateName: "",
      propertyId: null,
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
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
      console.log("Sending certificate data to API:", data);
      return apiRequest("/api/certificates", "POST", data);
    },
    onSuccess: (data) => {
      console.log("Certificate created successfully:", data);
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
      console.error("Certificate creation failed:", error);
      toast({
        title: "Error",
        description: `Failed to add certificate: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const nameWithoutExtension = file.name.replace(/\.[^/.]+$/, "");
      form.setValue("certificateName", nameWithoutExtension);
      
      // Enhanced date extraction from filename
      console.log("📄 Processing file:", file.name);
      
      // Try multiple date patterns
      const datePatterns = [
        /(\d{1,2}[-/.]\d{1,2}[-/.]\d{4})/g,     // DD/MM/YYYY or MM/DD/YYYY
        /(\d{4}[-/.]\d{1,2}[-/.]\d{1,2})/g,     // YYYY/MM/DD
        /(\d{1,2}[a-zA-Z]{3}\d{4})/g,          // 15Jan2024
        /(\d{1,2}\s[a-zA-Z]{3}\s\d{4})/g,      // 15 Jan 2024
      ];
      
      let foundDate = null;
      
      for (const pattern of datePatterns) {
        const matches = file.name.match(pattern);
        if (matches && matches.length > 0) {
          console.log("📅 Found date pattern:", matches[0]);
          
          try {
            // Handle different date formats
            let dateStr = matches[0];
            
            // Convert various separators to standard format
            dateStr = dateStr.replace(/[-]/g, '/').replace(/[.]/g, '/');
            
            // Handle month abbreviations
            if (/[a-zA-Z]/.test(dateStr)) {
              const months = {
                'jan': '01', 'feb': '02', 'mar': '03', 'apr': '04',
                'may': '05', 'jun': '06', 'jul': '07', 'aug': '08',
                'sep': '09', 'oct': '10', 'nov': '11', 'dec': '12'
              };
              
              for (const [abbr, num] of Object.entries(months)) {
                dateStr = dateStr.toLowerCase().replace(abbr, num);
              }
              dateStr = dateStr.replace(/\s+/g, '/');
            }
            
            const parsedDate = new Date(dateStr);
            
            if (!isNaN(parsedDate.getTime())) {
              foundDate = parsedDate;
              console.log("✅ Successfully parsed date:", foundDate);
              break;
            }
          } catch (e) {
            console.log("❌ Failed to parse date pattern:", matches[0]);
          }
        }
      }
      
      if (foundDate) {
        form.setValue("issueDate", foundDate);
        
        // Calculate expiry date based on certificate type
        const certType = form.getValues("certificateType");
        const expiryDate = new Date(foundDate);
        
        switch (certType) {
          case "pool_compliance":
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
            break;
          case "gas_inspection":
            expiryDate.setFullYear(expiryDate.getFullYear() + 2); // 2 years
            break;
          case "electrical_test_tag":
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
            break;
          case "smoke_alarm":
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // 1 year
            break;
          default:
            expiryDate.setFullYear(expiryDate.getFullYear() + 1); // Default 1 year
        }
        
        form.setValue("expiryDate", expiryDate);
        
        // Set next inspection date based on frequency
        const frequency = form.getValues("inspectionFrequencyMonths") || 12;
        const nextInspection = new Date(expiryDate);
        nextInspection.setMonth(nextInspection.getMonth() + frequency);
        
        console.log("📋 Set dates - Issue:", foundDate, "Expiry:", expiryDate);
      } else {
        console.log("⚠️ Could not extract date from filename");
      }
    }
  };

  const onSubmit = async (data: InsertComplianceCertificate) => {
    console.log("🔥 FORM SUBMISSION STARTED");
    console.log("Raw form data:", data);
    console.log("Selected file:", selectedFile);
    console.log("Form validation errors:", form.formState.errors);
    
    // Ensure agencyId is set
    data.agencyId = 1;
    
    // Handle file URL
    if (selectedFile) {
      data.fileUrl = `/uploads/certificates/${selectedFile.name}`;
      console.log("Setting file URL to:", data.fileUrl);
    }
    
    // Ensure propertyId is properly handled
    if (data.propertyId === 0) {
      data.propertyId = null;
    }
    
    console.log("🚀 FINAL DATA BEING SUBMITTED:", data);
    console.log("About to call mutation...");
    
    try {
      createCertificateMutation.mutate(data);
      console.log("✅ Mutation called successfully");
    } catch (error) {
      console.error("❌ Error calling mutation:", error);
    }
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button data-testid="button-add-certificate">
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
            {/* Certificate Type and Name */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="certificateType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certificate Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-certificate-type">
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
                      <Input 
                        placeholder="Certificate name" 
                        {...field} 
                        data-testid="input-certificate-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Property Selection */}
            <FormField
              control={form.control}
              name="propertyId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property (Optional)</FormLabel>
                  <Select 
                    onValueChange={(value) => field.onChange(value === "0" ? null : parseInt(value))} 
                    value={field.value?.toString() || "0"}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-property">
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

            {/* File Upload */}
            <div className="space-y-4">
              <Label>Upload Certificate File</Label>
              <div className="flex items-center gap-4">
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="flex-1"
                  data-testid="input-file-upload"
                />
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    {selectedFile.name}
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
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
                            data-testid="button-issue-date"
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
                          disabled={(date) => date > new Date()}
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
                            data-testid="button-expiry-date"
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

            {/* Certifying Body and Certificate Number */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="certifyingBody"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Certifying Body</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Organization that issued certificate" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-certifying-body"
                      />
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
                      <Input 
                        placeholder="Certificate reference number" 
                        {...field} 
                        value={field.value || ""}
                        data-testid="input-certificate-number"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Reminder Days and Inspection Frequency */}
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
                        data-testid="input-reminder-days"
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
                        data-testid="input-inspection-frequency"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Notes */}
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
                      data-testid="textarea-notes"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Action Buttons */}
            <div className="flex justify-end gap-2">
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
                disabled={createCertificateMutation.isPending}
                data-testid="button-submit-certificate"
              >
                {createCertificateMutation.isPending ? "Adding..." : "Add Certificate"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}