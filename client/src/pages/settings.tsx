import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useLocation } from 'wouter';
import { ArrowLeft, Settings as SettingsIcon, Lock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/api';
import { queryClient } from '@/lib/queryClient';

export default function Settings() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!user) setLocation('/login');
  }, [user]);

  if (!user) return null;

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "New passwords don't match",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Password must be at least 6 characters",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest('/api/auth/change-password', 'POST', {
        currentPassword,
        newPassword
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Your password has been changed successfully",
        });
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: data.message || "Failed to change password",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to change password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast({
        variant: "destructive",
        title: "Password required",
        description: "Please enter your password to confirm deletion.",
      });
      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiRequest('/api/auth/account', 'DELETE', {
        password: deletePassword,
      });

      if (response.ok) {
        queryClient.clear();
        setDeleteDialogOpen(false);
        setLocation('/login?deleted=1');
      } else {
        const data = await response.json();
        toast({
          variant: "destructive",
          title: "Deletion failed",
          description: data.message || "Could not delete your account. Please try again.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Something went wrong. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
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
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
              <SettingsIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600">Manage your account preferences</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Lock className="w-5 h-5 mr-2" />
                Change Password
              </CardTitle>
              <CardDescription>
                Update your password to keep your account secure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    className="mt-1"
                    data-testid="input-current-password"
                  />
                </div>

                <div>
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1"
                    data-testid="input-new-password"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Must be at least 6 characters
                  </p>
                </div>

                <div>
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    className="mt-1"
                    data-testid="input-confirm-password"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isLoading}
                    data-testid="button-change-password"
                  >
                    {isLoading ? 'Changing Password...' : 'Change Password'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                View your account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-gray-500">Username</Label>
                  <p className="font-medium mt-1">{user.username}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Email</Label>
                  <p className="font-medium mt-1">{user.email}</p>
                </div>
                <div>
                  <Label className="text-gray-500">Role</Label>
                  <p className="font-medium mt-1 capitalize">{user.role.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-gray-500">User Type</Label>
                  <p className="font-medium mt-1 capitalize">{user.userType.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/profile')}
                  data-testid="button-view-profile"
                >
                  View Full Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center text-red-600">
                <Trash2 className="w-5 h-5 mr-2" />
                Danger Zone
              </CardTitle>
              <CardDescription>
                Permanently delete your account and all associated data. This cannot be undone.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800 font-medium mb-1">Before you delete your account:</p>
                <ul className="text-sm text-red-700 list-disc list-inside space-y-1">
                  <li>All your properties and inspection data will be permanently removed</li>
                  <li>Your subscription will be cancelled immediately</li>
                  <li>This action is irreversible — your data cannot be recovered</li>
                </ul>
              </div>
              <Button
                variant="destructive"
                onClick={() => {
                  setDeletePassword('');
                  setDeleteDialogOpen(true);
                }}
                data-testid="button-delete-account-open"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete My Account
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-red-600">
              Permanently delete your account?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  This will immediately and permanently delete your account, all your properties,
                  inspection records, certificates, and any other data associated with your account.
                  Your subscription will be cancelled.
                </p>
                <p className="font-medium text-gray-900">This cannot be undone.</p>
                <div className="pt-2">
                  <Label htmlFor="delete-confirm-password" className="text-gray-700">
                    Enter your password to confirm
                  </Label>
                  <Input
                    id="delete-confirm-password"
                    type="password"
                    placeholder="Your current password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className="mt-1"
                    data-testid="input-delete-password"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isDeleting) handleDeleteAccount();
                    }}
                  />
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={isDeleting}
              data-testid="button-delete-cancel"
            >
              Cancel
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={isDeleting || !deletePassword}
              data-testid="button-delete-confirm"
            >
              {isDeleting ? 'Deleting...' : 'Yes, permanently delete my account'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
