import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Send, 
  Download, 
  Printer,
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  Building,
  MapPin,
  Calendar,
  Loader2,
  Mail,
  Camera,
  Ban
} from 'lucide-react';
import { format } from 'date-fns';

interface InspectionReportModalProps {
  propertyId: number;
  propertyName: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ReportData {
  property: {
    id: number;
    name: string;
    address: string;
    unitNumber?: string;
    propertyType: string;
    country?: string;
  };
  agency: {
    name: string;
    email: string;
    phone?: string;
    branding?: any;
  };
  generatedAt: string;
  lastInspectionDate: string | null;
  summary: {
    totalItems: number;
    completedItems: number;
    itemsNeedingAttention: number;
    naItems: number;
    completionPercentage: number;
    conditionCounts: {
      good: number;
      average: number;
      poor: number;
      notInspected: number;
    };
  };
  rooms: Array<{
    name: string;
    items: Array<{
      id: number;
      name: string;
      category: string;
      condition: string | null;
      notes: string | null;
      photoUrl: string | null;
      isCompleted: boolean;
      isNotApplicable: boolean;
      lastInspectedDate: string | null;
      inspectionType: string | null;
    }>;
  }>;
  itemsNeedingAttention: Array<{
    id: number;
    name: string;
    roomName: string;
    condition: string | null;
    notes: string | null;
    photoUrl: string | null;
  }>;
}

export default function InspectionReportModal({
  propertyId,
  propertyName,
  isOpen,
  onClose
}: InspectionReportModalProps) {
  const { toast } = useToast();
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [recipientName, setRecipientName] = useState('');

  const { data: reportData, isLoading, error } = useQuery<ReportData>({
    queryKey: ['/api/properties', propertyId, 'inspection-report'],
    enabled: isOpen && propertyId > 0,
  });

  const sendReportMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/properties/${propertyId}/inspection-report/send`, 'POST', {
        recipientEmail,
        recipientName
      });
    },
    onSuccess: () => {
      toast({ title: 'Report Sent', description: `Inspection report sent to ${recipientEmail}` });
      setShowEmailForm(false);
      setRecipientEmail('');
      setRecipientName('');
    },
    onError: (error: Error) => {
      toast({ title: 'Error', description: error.message || 'Failed to send report', variant: 'destructive' });
    }
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = () => {
    // Create a new window with the report content for PDF generation
    const printWindow = window.open('', '_blank');
    if (!printWindow || !reportData) return;

    const brandColor = reportData.agency?.branding?.primaryColor || '#1976D2';
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inspection Report - ${reportData.property.name}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px; }
            .header { background: ${brandColor}; color: white; padding: 20px; border-radius: 8px 8px 0 0; margin-bottom: 0; }
            .header h1 { font-size: 24px; margin: 0; }
            .header p { margin: 5px 0 0 0; opacity: 0.9; }
            .content { padding: 20px; background: #f9f9f9; border: 1px solid #ddd; border-top: none; }
            .section { background: white; border-radius: 8px; padding: 16px; margin-bottom: 16px; border: 1px solid #eee; }
            .section-title { font-size: 16px; font-weight: bold; margin-bottom: 12px; color: #333; }
            .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
            .summary-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
            .summary-card { text-align: center; padding: 16px; border-radius: 8px; }
            .summary-card.blue { background: #e3f2fd; }
            .summary-card.green { background: #e8f5e9; }
            .summary-card.amber { background: #fff8e1; }
            .summary-card.red { background: #ffebee; }
            .summary-card .value { font-size: 28px; font-weight: bold; }
            .summary-card.blue .value { color: #1976d2; }
            .summary-card.green .value { color: #2e7d32; }
            .summary-card.amber .value { color: #f57c00; }
            .summary-card.red .value { color: #d32f2f; }
            .summary-card .label { font-size: 12px; color: #666; }
            .attention-box { border-left: 4px solid #ff9800; background: #fff8e1; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 16px; }
            .attention-item { background: white; padding: 12px; border-radius: 4px; margin-top: 8px; border: 1px solid #ffe0b2; }
            .room { border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; overflow: hidden; }
            .room-header { background: #f5f5f5; padding: 10px 16px; font-weight: bold; }
            .room-item { padding: 12px 16px; border-bottom: 1px solid #eee; display: flex; justify-content: space-between; align-items: flex-start; }
            .room-item:last-child { border-bottom: none; }
            .badge { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: 500; }
            .badge.good { background: #e8f5e9; color: #2e7d32; }
            .badge.average { background: #fff8e1; color: #f57c00; }
            .badge.poor { background: #ffebee; color: #d32f2f; }
            .badge.na { background: #f5f5f5; color: #9e9e9e; }
            .footer { text-align: center; padding: 16px; background: #f5f5f5; border-radius: 8px; margin-top: 16px; }
            .notes { font-size: 13px; color: #666; margin-top: 4px; background: #f9f9f9; padding: 8px; border-radius: 4px; }
            @media print {
              body { padding: 0; }
              .header { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .summary-card { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .badge { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${reportData.agency.name}</h1>
            <p>Inspection Report</p>
          </div>
          
          <div class="content">
            <div class="section">
              <div class="section-title">Property Details</div>
              <div class="grid">
                <div><strong>Property:</strong> ${reportData.property.name}</div>
                <div><strong>Type:</strong> ${reportData.property.propertyType}</div>
                <div><strong>Address:</strong> ${reportData.property.address}${reportData.property.unitNumber ? `, Unit ${reportData.property.unitNumber}` : ''}</div>
                <div><strong>Report Date:</strong> ${format(new Date(reportData.generatedAt), 'PPP')}</div>
              </div>
            </div>

            <div class="summary-cards">
              <div class="summary-card blue">
                <div class="value">${reportData.summary.completionPercentage}%</div>
                <div class="label">Completion</div>
              </div>
              <div class="summary-card green">
                <div class="value">${reportData.summary.conditionCounts.good}</div>
                <div class="label">Good Condition</div>
              </div>
              <div class="summary-card amber">
                <div class="value">${reportData.summary.conditionCounts.average}</div>
                <div class="label">Average</div>
              </div>
              <div class="summary-card red">
                <div class="value">${reportData.summary.conditionCounts.poor}</div>
                <div class="label">Needs Attention</div>
              </div>
            </div>

            ${reportData.itemsNeedingAttention.length > 0 ? `
              <div class="attention-box">
                <div class="section-title" style="color: #e65100;">Items Requiring Attention (${reportData.itemsNeedingAttention.length})</div>
                ${reportData.itemsNeedingAttention.map(item => `
                  <div class="attention-item">
                    <strong>${item.name}</strong> - ${item.roomName}
                    <span class="badge ${item.condition || 'na'}">${item.condition || 'Not Inspected'}</span>
                    ${item.notes ? `<div class="notes">${item.notes}</div>` : ''}
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="section" style="border-left: 4px solid #4caf50; background: #e8f5e9;">
                <strong style="color: #2e7d32;">✓ All inspection items are in good condition</strong>
              </div>
            `}

            <div class="section-title" style="margin-bottom: 12px;">Detailed Inspection by Room</div>
            ${reportData.rooms.map(room => `
              <div class="room">
                <div class="room-header">${room.name}</div>
                ${room.items.map(item => `
                  <div class="room-item">
                    <div>
                      <div>${item.isNotApplicable ? '○' : item.lastInspectedDate ? '✓' : '○'} <strong>${item.name}</strong></div>
                      ${item.notes ? `<div class="notes">${item.notes}</div>` : ''}
                    </div>
                    <span class="badge ${item.isNotApplicable ? 'na' : item.condition || 'na'}">
                      ${item.isNotApplicable ? 'N/A' : item.condition ? item.condition.charAt(0).toUpperCase() + item.condition.slice(1) : 'Not Inspected'}
                    </span>
                  </div>
                `).join('')}
              </div>
            `).join('')}

            <div class="footer">
              <strong>${reportData.agency.name}</strong><br>
              ${reportData.agency.email}${reportData.agency.phone ? ` | ${reportData.agency.phone}` : ''}
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Wait for content to load then trigger print dialog for PDF save
    // Use setTimeout for more reliable cross-browser behavior
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);

    toast({
      title: 'PDF Ready',
      description: 'Use "Save as PDF" in the print dialog to download your report.',
    });
  };

  const getConditionBadge = (condition: string | null) => {
    if (!condition) {
      return <Badge variant="outline" className="text-gray-500 border-gray-300">Not Inspected</Badge>;
    }
    switch (condition) {
      case 'good':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Good</Badge>;
      case 'average':
        return <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Average</Badge>;
      case 'poor':
        return <Badge className="bg-red-100 text-red-800 hover:bg-red-100">Poor</Badge>;
      default:
        return <Badge variant="outline">{condition}</Badge>;
    }
  };

  const brandingColor = reportData?.agency?.branding?.primaryColor || '#1976D2';

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <div 
          className="px-6 py-4 text-white"
          style={{ backgroundColor: brandingColor }}
        >
          <DialogHeader>
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Inspection Report
            </DialogTitle>
            <DialogDescription className="text-white/80">
              {propertyName}
            </DialogDescription>
          </DialogHeader>
        </div>

        <ScrollArea className="max-h-[calc(90vh-180px)]">
          <div className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Generating report...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <XCircle className="w-12 h-12 mx-auto text-red-400 mb-3" />
                <p className="text-gray-600">Failed to generate report</p>
              </div>
            ) : reportData ? (
              <div className="space-y-6 print:space-y-4" id="inspection-report">
                {/* Property Details */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Property Details
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Property:</span>
                      <span className="ml-2 font-medium">{reportData.property.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Type:</span>
                      <span className="ml-2 font-medium capitalize">{reportData.property.propertyType}</span>
                    </div>
                    <div className="col-span-2 flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span>{reportData.property.address}{reportData.property.unitNumber ? `, Unit ${reportData.property.unitNumber}` : ''}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">Generated:</span>
                      <span className="font-medium">{format(new Date(reportData.generatedAt), 'PPP')}</span>
                    </div>
                    {reportData.lastInspectionDate && (
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                        <span className="text-gray-500">Last Inspection:</span>
                        <span className="font-medium">{format(new Date(reportData.lastInspectionDate), 'PPP')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-blue-600">{reportData.summary.completionPercentage}%</p>
                    <p className="text-sm text-blue-700">Completion</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{reportData.summary.conditionCounts.good}</p>
                    <p className="text-sm text-green-700">Good Condition</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-amber-600">{reportData.summary.conditionCounts.average}</p>
                    <p className="text-sm text-amber-700">Average</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-red-600">{reportData.summary.conditionCounts.poor}</p>
                    <p className="text-sm text-red-700">Needs Attention</p>
                  </div>
                </div>

                {/* Items Needing Attention */}
                {reportData.itemsNeedingAttention.length > 0 && (
                  <div className="border-l-4 border-amber-500 bg-amber-50 rounded-r-lg p-4">
                    <h3 className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Items Requiring Attention ({reportData.itemsNeedingAttention.length})
                    </h3>
                    <div className="space-y-2">
                      {reportData.itemsNeedingAttention.map((item) => (
                        <div key={item.id} className="bg-white rounded p-3 border border-amber-200">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{item.name}</p>
                              <p className="text-sm text-gray-500">{item.roomName}</p>
                            </div>
                            {getConditionBadge(item.condition)}
                          </div>
                          {item.notes && (
                            <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded">{item.notes}</p>
                          )}
                          {item.photoUrl && (
                            <div className="mt-2">
                              <img 
                                src={item.photoUrl} 
                                alt={item.name}
                                className="max-h-32 rounded border object-cover"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {reportData.itemsNeedingAttention.length === 0 && reportData.summary.completedItems > 0 && (
                  <div className="border-l-4 border-green-500 bg-green-50 rounded-r-lg p-4">
                    <div className="flex items-center gap-2 text-green-800">
                      <CheckCircle2 className="w-5 h-5" />
                      <span className="font-semibold">All inspection items are in good condition</span>
                    </div>
                  </div>
                )}

                <Separator />

                {/* Room-by-Room Details */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Detailed Inspection by Room</h3>
                  <div className="space-y-4">
                    {reportData.rooms.map((room) => (
                      <div key={room.name} className="border rounded-lg overflow-hidden">
                        <div className="bg-gray-100 px-4 py-2 font-medium text-gray-800">
                          {room.name}
                        </div>
                        <div className="divide-y">
                          {room.items.map((item) => (
                            <div key={item.id} className="px-4 py-3 flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  {item.isNotApplicable ? (
                                    <Ban className="w-4 h-4 text-gray-400" />
                                  ) : item.lastInspectedDate ? (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  ) : (
                                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full" />
                                  )}
                                  <span className={`font-medium ${item.isNotApplicable ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                    {item.name}
                                  </span>
                                  {item.photoUrl && (
                                    <Camera className="w-3 h-3 text-blue-500" />
                                  )}
                                </div>
                                {item.notes && (
                                  <p className="text-sm text-gray-500 mt-1 ml-6">{item.notes}</p>
                                )}
                                {item.lastInspectedDate && (
                                  <p className="text-xs text-gray-400 mt-1 ml-6">
                                    Inspected: {format(new Date(item.lastInspectedDate), 'PP')}
                                  </p>
                                )}
                              </div>
                              <div className="flex-shrink-0">
                                {item.isNotApplicable ? (
                                  <Badge variant="outline" className="text-gray-400">N/A</Badge>
                                ) : (
                                  getConditionBadge(item.condition)
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agency Footer */}
                <div className="bg-gray-50 rounded-lg p-4 text-center text-sm text-gray-600">
                  <p className="font-medium text-gray-800">{reportData.agency.name}</p>
                  <p>{reportData.agency.email}{reportData.agency.phone ? ` | ${reportData.agency.phone}` : ''}</p>
                </div>
              </div>
            ) : null}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="border-t bg-gray-50 px-6 py-4">
          {showEmailForm ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="recipientEmail">Recipient Email</Label>
                  <Input
                    id="recipientEmail"
                    type="email"
                    placeholder="owner@example.com"
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="recipientName">Recipient Name (optional)</Label>
                  <Input
                    id="recipientName"
                    placeholder="Property Owner"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowEmailForm(false)}>
                  Cancel
                </Button>
                <Button 
                  onClick={() => sendReportMutation.mutate()}
                  disabled={!recipientEmail || sendReportMutation.isPending}
                >
                  {sendReportMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-center">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handlePrint}>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </Button>
                <Button variant="outline" onClick={handleDownloadPdf} disabled={!reportData}>
                  <Download className="w-4 h-4 mr-2" />
                  Download PDF
                </Button>
                <Button onClick={() => setShowEmailForm(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Email Report
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
