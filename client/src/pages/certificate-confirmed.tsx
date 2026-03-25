import { CheckCircle, Home, FileText } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function CertificateConfirmed() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white flex items-center justify-center p-4">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto bg-green-100 rounded-full p-4 w-20 h-20 flex items-center justify-center mb-4">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          <CardTitle className="text-2xl text-green-700">Certificate Submitted!</CardTitle>
          <CardDescription className="text-base mt-2">
            Your compliance certificate has been verified and linked to the property. 
            The property manager has been notified.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-4 text-left">
            <h3 className="font-medium text-gray-900 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              What happens next?
            </h3>
            <ul className="mt-2 text-sm text-gray-600 space-y-1">
              <li>• The certificate is now linked to the property's inspection records</li>
              <li>• Relevant inspection items have been marked as compliant</li>
              <li>• A reminder will be set before the certificate expires</li>
            </ul>
          </div>
          
          <p className="text-sm text-gray-500">
            You can close this page now. Thank you for your submission!
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
