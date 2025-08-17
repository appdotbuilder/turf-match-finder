import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { UserIcon, MailIcon, PhoneIcon, CalendarIcon, ShieldIcon } from 'lucide-react';
import { format } from 'date-fns';
import type { User } from '../../../server/src/schema';

interface ProfileSettingsProps {
  user: User;
  onUserUpdate: (user: User) => void;
}

export function ProfileSettings({ user, onUserUpdate }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: user.first_name,
    last_name: user.last_name,
    phone: user.phone || '',
    avatar_url: user.avatar_url || ''
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // In a real app, this would call a tRPC mutation to update the user profile
      // For demo purposes, we'll simulate the update
      const updatedUser: User = {
        ...user,
        first_name: profileForm.first_name,
        last_name: profileForm.last_name,
        phone: profileForm.phone || null,
        avatar_url: profileForm.avatar_url || null,
        updated_at: new Date()
      };
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onUserUpdate(updatedUser);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setProfileForm({
      first_name: user.first_name,
      last_name: user.last_name,
      phone: user.phone || '',
      avatar_url: user.avatar_url || ''
    });
    setIsEditing(false);
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'player':
        return {
          icon: '⚽',
          label: 'Player',
          description: 'Can join teams, find matches, and book fields',
          color: 'bg-blue-100 text-blue-800'
        };
      case 'field_owner':
        return {
          icon: '🏟️',
          label: 'Field Owner',
          description: 'Can manage fields, create slots, and handle bookings',
          color: 'bg-green-100 text-green-800'
        };
      case 'admin':
        return {
          icon: '👨‍💼',
          label: 'Administrator',
          description: 'Full platform access and moderation capabilities',
          color: 'bg-purple-100 text-purple-800'
        };
      default:
        return {
          icon: '👤',
          label: 'User',
          description: 'Basic user account',
          color: 'bg-gray-100 text-gray-800'
        };
    }
  };

  const roleInfo = getRoleInfo(user.role);
  const initials = `${user.first_name.charAt(0)}${user.last_name.charAt(0)}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Profile Settings</h2>
          <p className="text-gray-600">Manage your account information and preferences</p>
        </div>
        {!isEditing && (
          <Button onClick={() => setIsEditing(true)}>
            Edit Profile ✏️
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex flex-col items-center space-y-4">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.avatar_url || ''} alt={`${user.first_name} ${user.last_name}`} />
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <h3 className="text-xl font-semibold">{user.first_name} {user.last_name}</h3>
                  <p className="text-gray-600">{user.email}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-center">
                <Badge className={roleInfo.color}>
                  {roleInfo.icon} {roleInfo.label}
                </Badge>
              </div>
              
              <Separator />
              
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <MailIcon className="h-4 w-4" />
                  {user.email}
                </div>
                {user.phone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <PhoneIcon className="h-4 w-4" />
                    {user.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-gray-600">
                  <CalendarIcon className="h-4 w-4" />
                  Joined {format(user.created_at, 'MMMM yyyy')}
                </div>
              </div>

              <Separator />

              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <ShieldIcon className="h-4 w-4 mt-0.5 text-gray-500" />
                  <div>
                    <p className="font-medium text-sm">Role Permissions</p>
                    <p className="text-xs text-gray-600 mt-1">
                      {roleInfo.description}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Profile Form */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Account Information</CardTitle>
              <CardDescription>
                Update your personal information and contact details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <form onSubmit={handleSaveProfile} className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="first_name">First Name</Label>
                      <Input
                        id="first_name"
                        value={profileForm.first_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProfileForm(prev => ({ ...prev, first_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="last_name">Last Name</Label>
                      <Input
                        id="last_name"
                        value={profileForm.last_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setProfileForm(prev => ({ ...prev, last_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={user.email}
                      disabled
                      className="bg-gray-100"
                    />
                    <p className="text-xs text-gray-500">
                      Email address cannot be changed for security reasons
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number (Optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={profileForm.phone}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProfileForm(prev => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Avatar URL (Optional)</Label>
                    <Input
                      id="avatar_url"
                      type="url"
                      placeholder="https://example.com/avatar.jpg"
                      value={profileForm.avatar_url}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setProfileForm(prev => ({ ...prev, avatar_url: e.target.value }))
                      }
                    />
                    <p className="text-xs text-gray-500">
                      Enter a URL to your profile picture
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Account Role</Label>
                    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span>{roleInfo.icon}</span>
                        <div>
                          <span className="font-medium">{roleInfo.label}</span>
                          <p className="text-xs text-gray-600">{roleInfo.description}</p>
                        </div>
                      </div>
                      <Badge variant="outline">Cannot Change</Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-3">
                    <Button type="submit" disabled={isLoading}>
                      {isLoading ? 'Saving...' : 'Save Changes 💾'}
                    </Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={handleCancelEdit}
                      disabled={isLoading}
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-sm text-gray-600">First Name</Label>
                      <p className="font-medium">{user.first_name}</p>
                    </div>
                    <div>
                      <Label className="text-sm text-gray-600">Last Name</Label>
                      <p className="font-medium">{user.last_name}</p>
                    </div>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Email Address</Label>
                    <p className="font-medium">{user.email}</p>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Phone Number</Label>
                    <p className="font-medium">{user.phone || 'Not provided'}</p>
                  </div>

                  <div>
                    <Label className="text-sm text-gray-600">Account Role</Label>
                    <div className="mt-1">
                      <Badge className={roleInfo.color}>
                        {roleInfo.icon} {roleInfo.label}
                      </Badge>
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Account Statistics</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-blue-600">Member since</p>
                        <p className="font-medium text-blue-900">
                          {format(user.created_at, 'MMMM d, yyyy')}
                        </p>
                      </div>
                      <div>
                        <p className="text-blue-600">Last updated</p>
                        <p className="font-medium text-blue-900">
                          {format(user.updated_at, 'MMMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Additional Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Account Security</CardTitle>
          <CardDescription>
            Manage your account security settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Change Password</h4>
                <p className="text-sm text-gray-600">Update your account password</p>
              </div>
              <Button variant="outline" disabled>
                Change Password 🔒
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <h4 className="font-medium">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-600">Add an extra layer of security</p>
              </div>
              <Button variant="outline" disabled>
                Setup 2FA 🔐
              </Button>
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg border-red-200">
              <div>
                <h4 className="font-medium text-red-700">Delete Account</h4>
                <p className="text-sm text-red-600">Permanently delete your account</p>
              </div>
              <Button variant="destructive" disabled>
                Delete Account ⚠️
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-gray-500 mt-4">
            * Security features are disabled in this demo version
          </p>
        </CardContent>
      </Card>
    </div>
  );
}