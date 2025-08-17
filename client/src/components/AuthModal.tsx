import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { LoginInput, RegisterInput, UserRole } from '../../../server/src/schema';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (credentials: LoginInput) => Promise<void>;
  onRegister: (userData: RegisterInput) => Promise<void>;
}

export function AuthModal({ isOpen, onClose, onLogin, onRegister }: AuthModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [loginData, setLoginData] = useState<LoginInput>({
    email: '',
    password: ''
  });
  const [registerData, setRegisterData] = useState<RegisterInput>({
    email: '',
    password: '',
    first_name: '',
    last_name: '',
    role: 'player',
    phone: ''
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(loginData);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const submitData = {
        ...registerData,
        phone: registerData.phone || undefined // Convert empty string to undefined
      };
      await onRegister(submitData);
    } catch (error) {
      console.error('Registration error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ⚽ Join Football Community
          </DialogTitle>
          <DialogDescription>
            Connect with players, teams, and field owners in your area
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Welcome Back!</CardTitle>
                <CardDescription>
                  Enter your credentials to access your account
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="your@email.com"
                      value={loginData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setLoginData((prev: LoginInput) => ({ ...prev, password: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Logging in...' : 'Login 🚀'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Create Account</CardTitle>
                <CardDescription>
                  Join our community and start playing!
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="register-firstname">First Name</Label>
                      <Input
                        id="register-firstname"
                        placeholder="John"
                        value={registerData.first_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setRegisterData((prev: RegisterInput) => ({ ...prev, first_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="register-lastname">Last Name</Label>
                      <Input
                        id="register-lastname"
                        placeholder="Doe"
                        value={registerData.last_name}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setRegisterData((prev: RegisterInput) => ({ ...prev, last_name: e.target.value }))
                        }
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Email</Label>
                    <Input
                      id="register-email"
                      type="email"
                      placeholder="your@email.com"
                      value={registerData.email}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-phone">Phone (Optional)</Label>
                    <Input
                      id="register-phone"
                      type="tel"
                      placeholder="+1 (555) 123-4567"
                      value={registerData.phone || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-role">Role</Label>
                    <Select 
                      value={registerData.role} 
                      onValueChange={(value: UserRole) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, role: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select your role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="player">⚽ Player</SelectItem>
                        <SelectItem value="field_owner">🏟️ Field Owner</SelectItem>
                        <SelectItem value="admin">👨‍💼 Administrator</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="register-password">Password</Label>
                    <Input
                      id="register-password"
                      type="password"
                      placeholder="••••••••"
                      value={registerData.password}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setRegisterData((prev: RegisterInput) => ({ ...prev, password: e.target.value }))
                      }
                      minLength={6}
                      required
                    />
                    <p className="text-xs text-gray-500">
                      Password must be at least 6 characters long
                    </p>
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating Account...' : 'Create Account 🎉'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}