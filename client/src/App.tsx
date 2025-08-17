import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { trpc } from '@/utils/trpc';
// Import types from server
import type { 
  User, 
  LoginInput, 
  RegisterInput, 
  MatchRequest, 
  Field, 
  FieldSlot, 
  Team 
} from '../../server/src/schema';

// Import feature components
import { AuthModal } from '@/components/AuthModal';
import { MatchFinder } from '@/components/MatchFinder';
import { FieldManagement } from '@/components/FieldManagement';
import { TeamManagement } from '@/components/TeamManagement';
import { MessagingCenter } from '@/components/MessagingCenter';
import { ProfileSettings } from '@/components/ProfileSettings';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('matches');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  const loadAppData = useCallback(async () => {
    try {
      setIsLoading(true);
      // For demo purposes, we'll simulate a logged-in user
      // In a real app, this would check for stored auth tokens
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error('Failed to load app data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAppData();
  }, [loadAppData]);

  const handleLogin = async (credentials: LoginInput) => {
    try {
      const result = await trpc.login.mutate(credentials);
      // In a real app, you'd store the auth token and user info
      console.log('Login successful:', result);
      setShowAuthModal(false);
      // For demo, simulate setting user data
      const mockUser: User = {
        id: 1,
        email: credentials.email,
        password_hash: '',
        first_name: 'John',
        last_name: 'Doe',
        role: 'player',
        phone: null,
        avatar_url: null,
        created_at: new Date(),
        updated_at: new Date()
      };
      setUser(mockUser);
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleRegister = async (userData: RegisterInput) => {
    try {
      const result = await trpc.register.mutate(userData);
      console.log('Registration successful:', result);
      setShowAuthModal(false);
      // Auto-login after registration
      await handleLogin({ email: userData.email, password: userData.password });
    } catch (error) {
      console.error('Registration failed:', error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setActiveTab('matches');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-gray-700">Loading Football Community...</h2>
        </div>
      </div>
    );
  }

  // Landing page for non-authenticated users
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50">
        <div className="container mx-auto px-4 py-8">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-gray-900 mb-4 flex items-center justify-center gap-2">
              ⚽ Football Community
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Connect with teams, find opponents, book fields, and build the ultimate 7v7 football experience
            </p>
            <div className="flex gap-4 justify-center">
              <Button 
                onClick={() => setShowAuthModal(true)} 
                size="lg" 
                className="bg-green-600 hover:bg-green-700"
              >
                Get Started 🚀
              </Button>
            </div>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-6 mb-12">
            <Card className="border-green-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  🏟️ Field Booking
                </CardTitle>
                <CardDescription>
                  Book artificial turf fields directly through our platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Real-time availability</li>
                  <li>• Instant booking confirmation</li>
                  <li>• Competitive pricing</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-blue-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  👥 Match Finding
                </CardTitle>
                <CardDescription>
                  Find opponents or players for your next 7v7 match
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Skill-level matching</li>
                  <li>• Location preferences</li>
                  <li>• Flexible scheduling</li>
                </ul>
              </CardContent>
            </Card>

            <Card className="border-purple-200 hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  ⭐ Team Management
                </CardTitle>
                <CardDescription>
                  Create teams, manage members, and track your performance
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="text-sm space-y-1 text-gray-600">
                  <li>• Team ratings & reviews</li>
                  <li>• Member management</li>
                  <li>• Match history</li>
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Role-based Features */}
          <div className="bg-white rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">Choose Your Role</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-3">⚽</div>
                <h3 className="font-semibold mb-2">Player</h3>
                <p className="text-sm text-gray-600">Join teams, find matches, book fields</p>
                <Badge variant="secondary" className="mt-2">Most Popular</Badge>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-3">🏟️</div>
                <h3 className="font-semibold mb-2">Field Owner</h3>
                <p className="text-sm text-gray-600">List your fields, manage bookings</p>
                <Badge variant="outline" className="mt-2">Business</Badge>
              </div>
              <div className="text-center p-4 border rounded-lg">
                <div className="text-3xl mb-3">👨‍💼</div>
                <h3 className="font-semibold mb-2">Administrator</h3>
                <p className="text-sm text-gray-600">Manage platform, moderate content</p>
                <Badge variant="destructive" className="mt-2">Admin Only</Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onLogin={handleLogin}
          onRegister={handleRegister}
        />
      </div>
    );
  }

  // Main application for authenticated users
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              ⚽ Football Community
            </h1>
            <div className="flex items-center gap-4">
              <Badge variant="outline">{user.role}</Badge>
              <span className="text-sm text-gray-600">
                Welcome, {user.first_name}!
              </span>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-5 mb-6">
            <TabsTrigger value="matches">🎯 Find Matches</TabsTrigger>
            {user.role === 'field_owner' && (
              <TabsTrigger value="fields">🏟️ My Fields</TabsTrigger>
            )}
            {user.role !== 'field_owner' && (
              <TabsTrigger value="teams">👥 Teams</TabsTrigger>
            )}
            <TabsTrigger value="messages">💬 Messages</TabsTrigger>
            <TabsTrigger value="profile">⚙️ Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="matches">
            <MatchFinder user={user} />
          </TabsContent>

          {user.role === 'field_owner' && (
            <TabsContent value="fields">
              <FieldManagement user={user} />
            </TabsContent>
          )}

          {user.role !== 'field_owner' && (
            <TabsContent value="teams">
              <TeamManagement user={user} />
            </TabsContent>
          )}

          <TabsContent value="messages">
            <MessagingCenter user={user} />
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings user={user} onUserUpdate={setUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

export default App;