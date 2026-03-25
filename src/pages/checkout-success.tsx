import { useEffect } from 'react';
import { useLocation } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CheckoutSuccess() {
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const sessionId = params.get('session_id');

  const confirm = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('GET', `/api/stripe/checkout-success?session_id=${sessionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/user/me'] });
    },
  });

  useEffect(() => {
    if (sessionId) confirm.mutate();
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center space-y-6">
        {confirm.isPending ? (
          <>
            <Loader2 className="w-16 h-16 text-primary animate-spin mx-auto" />
            <h1 className="text-2xl font-bold text-gray-900">Confirming your payment...</h1>
          </>
        ) : (
          <>
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">You're all set!</h1>
            <p className="text-gray-600">
              Payment confirmed. Your My Maintenance Pro account is now active.
            </p>
            <div className="bg-blue-50 rounded-lg p-4 text-left text-sm text-blue-800">
              <p className="font-medium mb-1">Next steps:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>Add your first property</li>
                <li>Download the mobile app to inspect on the go</li>
                <li>Set up rooms and inspection items</li>
              </ul>
            </div>
            <Button
              className="w-full bg-primary hover:bg-primary/90 text-white"
              onClick={() => setLocation('/dashboard')}
            >
              Go to Dashboard
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
