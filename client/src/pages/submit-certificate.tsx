import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, CheckCircle, Shield, FileText, Phone, Building2, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

const certificateFormSchema = z.object({
  certificateType: z.string().min(1, "Certificate type is required"),
  issuerName: z.string().min(2, "Your name or company name is required"),
  licenseNumber: z.string().min(1, "License number is required"),
  phoneNumber: z.string().min(8, "Valid phone number is required for verification"),
  issueDate: z.date({ required_error: "Issue date is required" }),
  expiryDate: z.date({ required_error: "Expiry date is required" }),
  certificateNumber: z.string().min(1, "Certificate/job number is required"),
  workCompleted: z.string().min(10, "Please describe the work completed"),
  complianceStatus: z.enum(["compliant", "non_compliant", "requires_attention"], {
    required_error: "Compliance status is required"
  }),
  notes: z.string().optional(),
});

type CertificateFormData = z.infer<typeof certificateFormSchema>;

const CERTIFICATE_TYPES = [
  { value: "smoke_alarm", label: "Smoke Alarm Compliance" },
  { value: "gas", label: "Gas Safety Certificate" },
  { value: "electrical", label: "Electrical Safety Certificate" },
  { value: "pool", label: "Pool Compliance Certificate" },
  { value: "fire", label: "Fire Safety Certificate" },
  { value: "pest", label: "Pest Inspection Certificate" },
  { value: "asbestos", label: "Asbestos Inspection" },
];

export default function SubmitCertificate() {
  const { token } = useParams<{ token: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [verificationSent, setVerificationSent] = useState(false);
  const [verificationId, setVerificationId] = useState<number | null>(null);

  const { data: propertyInfo, isLoading: propertyLoading, error: propertyError } = useQuery({
    queryKey: ['/api/public/property-info', token],
    queryFn: async () => {
      const res = await fetch(`/api/public/property-info/${token}`);
      if (!res.ok) {
        throw new Error('Invalid or expired submission link');
      }
      return res.json();
    },
    enabled: !!token,
  });

  const form = useForm<CertificateFormData>({
    resolver: zodResolver(certificateFormSchema),
    defaultValues: {
      certificateType: "",
      issuerName: "",
      licenseNumber: "",
      phoneNumber: "",
      certificateNumber: "",
      workCompleted: "",
      complianceStatus: undefined,
      notes: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: CertificateFormData) => {
      const res = await apiRequest(`/api/public/submit-certificate/${token}`, "POST", data);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to submit certificate');
      }
      return res.json();
    },
    onSuccess: (data) => {
      setVerificationId(data.verificationId);
      setVerificationSent(true);
      toast({
        title: "Verification code sent!",
        description: `A verification code has been sent to ${form.getValues('phoneNumber')}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CertificateFormData) => {
    submitMutation.mutate(data);
  };

  if (propertyLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading property information...</p>
        </div>
      </div>
    );
  }

  if (propertyError || !propertyInfo) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <CardTitle className="text-red-700">Invalid Link</CardTitle>
            <CardDescription>
              This certificate submission link is invalid or has expired. 
              Please contact your property manager for a new link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Phone className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <CardTitle className="text-green-700">Verification Code Sent</CardTitle>
            <CardDescription className="text-base mt-2">
              A 6-digit verification code has been sent to your phone number. 
              Enter it below to complete your certificate submission.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationForm 
              verificationId={verificationId!} 
              onSuccess={() => setLocation('/certificate-confirmed')}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <Shield className="h-16 w-16 text-blue-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900">Certificate Submission</h1>
          <p className="text-gray-600 mt-2">Submit your compliance certificate for verification</p>
        </div>

        <Card className="mb-6 bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-lg">Property Details</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-medium text-gray-900" data-testid="text-property-address">
              {propertyInfo.address}
            </p>
            {propertyInfo.agencyName && (
              <p className="text-sm text-gray-600 mt-1">
                Managed by: {propertyInfo.agencyName}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Certificate Details
            </CardTitle>
            <CardDescription>
              All fields marked with * are required for verification
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="certificateType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-certificate-type">
                            <SelectValue placeholder="Select certificate type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {CERTIFICATE_TYPES.map((type) => (
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issuerName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Your Name / Company *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., John Smith Electrical" 
                            {...field} 
                            data-testid="input-issuer-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="licenseNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>License Number *</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="e.g., EC12345" 
                            {...field} 
                            data-testid="input-license-number"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="phoneNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mobile Phone Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., 0412 345 678" 
                          {...field} 
                          data-testid="input-phone-number"
                        />
                      </FormControl>
                      <FormDescription>
                        A verification code will be sent to this number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="issueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Issue Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
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
                              selected={field.value}
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
                        <FormLabel>Expiry / Next Due Date *</FormLabel>
                        <Popover>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant={"outline"}
                                className={cn(
                                  "pl-3 text-left font-normal",
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
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date()
                              }
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="certificateNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Certificate / Job Number *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., INV-2024-1234" 
                          {...field} 
                          data-testid="input-certificate-number"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="workCompleted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Work Completed *</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Describe the work completed, items inspected, and any replacements made..."
                          className="min-h-[100px]"
                          {...field}
                          data-testid="textarea-work-completed"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complianceStatus"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Compliance Status *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-compliance-status">
                            <SelectValue placeholder="Select compliance status" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="compliant">
                            <span className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              Compliant - All items passed
                            </span>
                          </SelectItem>
                          <SelectItem value="requires_attention">
                            <span className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600" />
                              Requires Attention - Minor issues noted
                            </span>
                          </SelectItem>
                          <SelectItem value="non_compliant">
                            <span className="flex items-center gap-2">
                              <AlertCircle className="h-4 w-4 text-red-600" />
                              Non-Compliant - Failed inspection
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Any additional notes, recommendations, or follow-up required..."
                          {...field}
                          data-testid="textarea-notes"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button 
                  type="submit" 
                  className="w-full" 
                  size="lg"
                  disabled={submitMutation.isPending}
                  data-testid="button-submit-certificate"
                >
                  {submitMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending verification code...
                    </>
                  ) : (
                    <>
                      <Phone className="mr-2 h-4 w-4" />
                      Submit & Verify via SMS
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          By submitting this form, you confirm that the information provided is accurate 
          and that you are a licensed tradesperson authorized to issue this certificate.
        </p>
      </div>
    </div>
  );
}

function VerificationForm({ verificationId, onSuccess }: { verificationId: number; onSuccess: () => void }) {
  const { toast } = useToast();
  const [code, setCode] = useState("");

  const verifyMutation = useMutation({
    mutationFn: async (verificationCode: string) => {
      const res = await apiRequest(`/api/public/verify-certificate`, "POST", {
        verificationId,
        code: verificationCode,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Verification failed');
      }
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Certificate Verified!",
        description: "Your certificate has been submitted and linked to the property.",
      });
      onSuccess();
    },
    onError: (error: Error) => {
      toast({
        title: "Verification failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleVerify = () => {
    if (code.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter the 6-digit verification code",
        variant: "destructive",
      });
      return;
    }
    verifyMutation.mutate(code);
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Enter 6-digit verification code
        </label>
        <Input
          type="text"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          placeholder="000000"
          className="text-center text-2xl tracking-widest font-mono"
          data-testid="input-verification-code"
        />
      </div>
      <Button 
        onClick={handleVerify}
        className="w-full"
        disabled={verifyMutation.isPending || code.length !== 6}
        data-testid="button-verify-code"
      >
        {verifyMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <CheckCircle className="mr-2 h-4 w-4" />
            Verify & Submit
          </>
        )}
      </Button>
      <p className="text-sm text-gray-500 text-center">
        Didn't receive the code? Check your phone or wait a moment for the SMS to arrive.
      </p>
    </div>
  );
}
