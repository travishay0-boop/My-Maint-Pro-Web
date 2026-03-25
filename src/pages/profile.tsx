import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import { ArrowLeft, User } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (!user) {
    setLocation('/login');
    return null;
  }

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
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
              <p className="text-gray-600">Manage your account information</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Your basic account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>First Name</Label>
                  <Input 
                    value={user.firstName || ''} 
                    disabled 
                    className="mt-1"
                    data-testid="input-first-name"
                  />
                </div>
                <div>
                  <Label>Last Name</Label>
                  <Input 
                    value={user.lastName || ''} 
                    disabled 
                    className="mt-1"
                    data-testid="input-last-name"
                  />
                </div>
              </div>

              <div>
                <Label>Username</Label>
                <Input 
                  value={user.username} 
                  disabled 
                  className="mt-1"
                  data-testid="input-username"
                />
              </div>

              <div>
                <Label>Email</Label>
                <Input 
                  value={user.email} 
                  disabled 
                  className="mt-1"
                  data-testid="input-email"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Role</Label>
                  <Input 
                    value={user.role.replace('_', ' ')} 
                    disabled 
                    className="mt-1 capitalize"
                    data-testid="input-role"
                  />
                </div>
                <div>
                  <Label>User Type</Label>
                  <Input 
                    value={user.userType.replace('_', ' ')} 
                    disabled 
                    className="mt-1 capitalize"
                    data-testid="input-user-type"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Status</CardTitle>
              <CardDescription>
                Your account activity information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <div className="mt-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    Active
                  </span>
                </div>
              </div>
              {user.createdAt && (
                <div>
                  <Label>Member Since</Label>
                  <Input 
                    value={new Date(user.createdAt).toLocaleDateString()} 
                    disabled 
                    className="mt-1"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button 
              onClick={() => setLocation('/settings')}
              data-testid="button-go-to-settings"
            >
              Go to Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
