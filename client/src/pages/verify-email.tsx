import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Building2, MailCheck, RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';

export default function VerifyEmail() {
  const { user, updateUser, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(true);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verified, setVerified] = useState(false);
  const [devOtp, setDevOtp] = useState<string | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const hasSentRef = useRef(false);

  useEffect(() => {
    // Wait until auth has finished reading from localStorage
    if (isLoading) return;
    if (!user) {
      setLocation('/signup');
      return;
    }
    if ((user as any).emailVerified) {
      setLocation('/signup/plan');
      return;
    }
    // Only send once
    if (!hasSentRef.current) {
      hasSentRef.current = true;
      sendVerification();
    }
  }, [isLoading, user]);

  const sendVerification = async () => {
    if (!user) return;
    setSending(true);
    try {
      const res = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, email: user.email }),
      });
      const data = await res.json();
      if (data._devOtp) setDevOtp(data._devOtp);
      setResendCooldown(60);
    } catch {
      setError('Failed to send verification code. Please try resending.');
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    if (resendCooldown > 0) {
      const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [resendCooldown]);

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError('');
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
    if (next.every(d => d !== '') && digit) {
      submitOtp(next.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      submitOtp(pasted);
    }
  };

  const submitOtp = async (code: string) => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, token: code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Invalid code');
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setVerified(true);
        updateUser({ emailVerified: true, emailVerifiedAt: data.user?.emailVerifiedAt });
        localStorage.setItem('user', JSON.stringify({ ...user, emailVerified: true }));
        setTimeout(() => setLocation('/signup/plan'), 1500);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setDevOtp(null);
    setOtp(['', '', '', '', '', '']);
    setError('');
    await sendVerification();
    inputRefs.current[0]?.focus();
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          <span className="font-bold text-primary">My Maintenance Pro</span>
        </div>
      </header>

      <div className="flex-1 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 px-8">
            {verified ? (
              <div className="text-center space-y-4">
                <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />
                <h2 className="text-2xl font-bold text-gray-900">Email verified!</h2>
                <p className="text-gray-500">Taking you to your plan selection...</p>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="bg-blue-50 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <MailCheck className="w-8 h-8 text-primary" />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900">Check your email</h1>
                  <p className="text-gray-500 text-sm">
                    We sent a 6-digit code to
                  </p>
                  <p className="font-semibold text-gray-800">{user.email}</p>
                </div>

                {sending ? (
                  <div className="flex items-center justify-center gap-2 text-primary py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">Sending code...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {devOtp && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-2 text-center text-sm text-amber-800">
                        <span className="font-medium">Dev mode:</span> code is <span className="font-mono font-bold tracking-widest">{devOtp}</span>
                      </div>
                    )}
                    <div
                      className="flex gap-2 justify-center"
                      onPaste={handlePaste}
                    >
                      {otp.map((digit, i) => (
                        <input
                          key={i}
                          ref={el => { inputRefs.current[i] = el; }}
                          type="text"
                          inputMode="numeric"
                          maxLength={1}
                          value={digit}
                          onChange={e => handleOtpChange(i, e.target.value)}
                          onKeyDown={e => handleKeyDown(i, e)}
                          className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors
                            ${error ? 'border-red-400 bg-red-50' : digit ? 'border-primary bg-blue-50' : 'border-gray-200 focus:border-primary'}
                          `}
                          disabled={loading}
                          autoFocus={i === 0}
                        />
                      ))}
                    </div>

                    {loading && (
                      <div className="flex items-center justify-center gap-2 text-primary text-sm">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </div>
                    )}

                    {error && (
                      <p className="text-center text-red-500 text-sm font-medium">{error}</p>
                    )}
                  </div>
                )}

                <div className="border-t pt-4 text-center space-y-2">
                  <p className="text-sm text-gray-500">Didn't get the email?</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResend}
                    disabled={sending || resendCooldown > 0}
                    className="text-primary"
                  >
                    {sending ? (
                      <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Sending...</>
                    ) : resendCooldown > 0 ? (
                      `Resend in ${resendCooldown}s`
                    ) : (
                      <><RefreshCw className="w-3 h-3 mr-1" /> Resend code</>
                    )}
                  </Button>
                  <p className="text-xs text-gray-400">Codes expire after 15 minutes</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
