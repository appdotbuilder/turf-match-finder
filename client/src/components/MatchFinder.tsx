import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPinIcon, UsersIcon, StarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  MatchRequest, 
  FieldSlot, 
  Field,
  CreateMatchRequestInput, 
  MatchRequestType,
  CreateInterestInput
} from '../../../server/src/schema';

interface MatchFinderProps {
  user: User;
}

export function MatchFinder({ user }: MatchFinderProps) {
  const [activeSection, setActiveSection] = useState<'browse' | 'post'>('browse');
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([]);
  const [fieldSlots, setFieldSlots] = useState<FieldSlot[]>([]);
  const [fields, setFields] = useState<Field[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>();

  // Form data for creating match requests
  const [matchRequestForm, setMatchRequestForm] = useState<CreateMatchRequestInput>({
    type: 'find_opponent',
    title: '',
    description: null,
    skill_level: 5,
    max_fee: undefined,
    players_needed: undefined,
    preferred_location: '',
    preferred_date: undefined
  });

  // Load data
  const loadMatchRequests = useCallback(async () => {
    try {
      const requests = await trpc.getMatchRequests.query();
      setMatchRequests(requests);
    } catch (error) {
      console.error('Failed to load match requests:', error);
    }
  }, []);

  const loadFieldSlots = useCallback(async () => {
    try {
      const slots = await trpc.getAvailableFieldSlots.query();
      setFieldSlots(slots);
    } catch (error) {
      console.error('Failed to load field slots:', error);
    }
  }, []);

  const loadFields = useCallback(async () => {
    try {
      const allFields = await trpc.getFields.query();
      setFields(allFields);
    } catch (error) {
      console.error('Failed to load fields:', error);
    }
  }, []);

  useEffect(() => {
    loadMatchRequests();
    loadFieldSlots();
    loadFields();
  }, [loadMatchRequests, loadFieldSlots, loadFields]);

  const handleCreateMatchRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const submitData = {
        ...matchRequestForm,
        description: matchRequestForm.description || null,
        preferred_location: matchRequestForm.preferred_location || undefined,
        preferred_date: selectedDate,
        max_fee: matchRequestForm.max_fee || undefined,
        players_needed: matchRequestForm.players_needed || undefined
      };
      
      const newRequest = await trpc.createMatchRequest.mutate(submitData);
      setMatchRequests((prev: MatchRequest[]) => [newRequest, ...prev]);
      
      // Reset form
      setMatchRequestForm({
        type: 'find_opponent',
        title: '',
        description: null,
        skill_level: 5,
        max_fee: undefined,
        players_needed: undefined,
        preferred_location: '',
        preferred_date: undefined
      });
      setSelectedDate(undefined);
      setActiveSection('browse');
    } catch (error) {
      console.error('Failed to create match request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpressInterest = async (type: 'match_request' | 'field_slot', itemId: number) => {
    try {
      const interestData: CreateInterestInput = {
        type: type === 'match_request' ? 'match_request' : 'field_slot',
        match_request_id: type === 'match_request' ? itemId : undefined,
        field_slot_id: type === 'field_slot' ? itemId : undefined,
        message: `Hi! I'm interested in this ${type === 'match_request' ? 'match' : 'field slot'}.`
      };
      
      await trpc.createInterest.mutate(interestData);
      // Show success message or update UI
      console.log('Interest expressed successfully');
    } catch (error) {
      console.error('Failed to express interest:', error);
    }
  };

  const getFieldName = (fieldId: number) => {
    const field = fields.find((f: Field) => f.id === fieldId);
    return field?.name || 'Unknown Field';
  };

  const getSkillLevelBadge = (level: number) => {
    if (level <= 3) return <Badge variant="secondary">Beginner</Badge>;
    if (level <= 6) return <Badge variant="default">Intermediate</Badge>;
    if (level <= 8) return <Badge variant="outline">Advanced</Badge>;
    return <Badge variant="destructive">Expert</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Match & Field Finder</h2>
          <p className="text-gray-600">Find opponents, players, or book field slots</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeSection === 'browse' ? 'default' : 'outline'}
            onClick={() => setActiveSection('browse')}
          >
            🔍 Browse
          </Button>
          <Button 
            variant={activeSection === 'post' ? 'default' : 'outline'}
            onClick={() => setActiveSection('post')}
          >
            ➕ Post Request
          </Button>
        </div>
      </div>

      {activeSection === 'browse' && (
        <div className="space-y-6">
          {/* Match Requests Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              ⚽ Match Requests ({matchRequests.length})
            </h3>
            <div className="grid gap-4">
              {matchRequests.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No match requests found. Be the first to post one! 🎯
                  </CardContent>
                </Card>
              ) : (
                matchRequests.map((request: MatchRequest) => (
                  <Card key={request.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            {request.type === 'find_opponent' ? '🆚' : '👥'} {request.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-1">
                            <Badge variant="outline">
                              {request.type === 'find_opponent' ? 'Looking for Opponent' : 'Looking for Players'}
                            </Badge>
                            {getSkillLevelBadge(request.skill_level)}
                          </CardDescription>
                        </div>
                        <Button 
                          size="sm"
                          onClick={() => handleExpressInterest('match_request', request.id)}
                        >
                          Express Interest 💬
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      {request.description && (
                        <p className="text-gray-700 mb-3">{request.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        {request.preferred_date && (
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="h-4 w-4" />
                            {format(request.preferred_date, 'PPP')}
                          </div>
                        )}
                        {request.preferred_location && (
                          <div className="flex items-center gap-1">
                            <MapPinIcon className="h-4 w-4" />
                            {request.preferred_location}
                          </div>
                        )}
                        {request.players_needed && (
                          <div className="flex items-center gap-1">
                            <UsersIcon className="h-4 w-4" />
                            Need {request.players_needed} players
                          </div>
                        )}
                        {request.max_fee && (
                          <div className="text-green-600 font-medium">
                            Max fee: ${request.max_fee}
                          </div>
                        )}
                      </div>
                      <div className="mt-3 text-xs text-gray-400">
                        Posted on {format(request.created_at, 'PPp')}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          <Separator />

          {/* Available Field Slots Section */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏟️ Available Field Slots ({fieldSlots.length})
            </h3>
            <div className="grid gap-4">
              {fieldSlots.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center text-gray-500">
                    No field slots available at the moment. Check back later! 🏟️
                  </CardContent>
                </Card>
              ) : (
                fieldSlots.map((slot: FieldSlot) => (
                  <Card key={slot.id} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            🏟️ {getFieldName(slot.field_id)}
                          </CardTitle>
                          <CardDescription>
                            {format(slot.start_time, 'PPP')} • {format(slot.start_time, 'p')} - {format(slot.end_time, 'p')}
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-green-600">${slot.price}</div>
                          <Button 
                            size="sm"
                            onClick={() => handleExpressInterest('field_slot', slot.id)}
                          >
                            Book Now 🎯
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-gray-600">
                        <div>Duration: {Math.round((slot.end_time.getTime() - slot.start_time.getTime()) / (1000 * 60 * 60))} hour(s)</div>
                        <Badge variant={slot.is_available ? 'default' : 'destructive'}>
                          {slot.is_available ? 'Available' : 'Booked'}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeSection === 'post' && (
        <Card>
          <CardHeader>
            <CardTitle>Post a Match Request</CardTitle>
            <CardDescription>
              Looking for opponents or players? Let the community know!
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreateMatchRequest} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="request-type">Request Type</Label>
                <Select
                  value={matchRequestForm.type}
                  onValueChange={(value: MatchRequestType) =>
                    setMatchRequestForm((prev: CreateMatchRequestInput) => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="What are you looking for?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="find_opponent">🆚 Find Opponent Team</SelectItem>
                    <SelectItem value="find_players">👥 Find Individual Players</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Looking for a competitive 7v7 match this weekend"
                  value={matchRequestForm.title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMatchRequestForm((prev: CreateMatchRequestInput) => ({ ...prev, title: e.target.value }))
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Provide more details about what you're looking for..."
                  value={matchRequestForm.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                    setMatchRequestForm((prev: CreateMatchRequestInput) => ({
                      ...prev,
                      description: e.target.value || null
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="skill-level">Skill Level (1-10)</Label>
                  <Select
                    value={matchRequestForm.skill_level.toString()}
                    onValueChange={(value: string) =>
                      setMatchRequestForm((prev: CreateMatchRequestInput) => ({ 
                        ...prev, 
                        skill_level: parseInt(value)
                      }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i + 1} value={(i + 1).toString()}>
                          Level {i + 1} {i + 1 <= 3 ? '(Beginner)' : i + 1 <= 6 ? '(Intermediate)' : i + 1 <= 8 ? '(Advanced)' : '(Expert)'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {matchRequestForm.type === 'find_players' && (
                  <div className="space-y-2">
                    <Label htmlFor="players-needed">Players Needed</Label>
                    <Input
                      id="players-needed"
                      type="number"
                      placeholder="How many players?"
                      min="1"
                      max="7"
                      value={matchRequestForm.players_needed || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setMatchRequestForm((prev: CreateMatchRequestInput) => ({
                          ...prev,
                          players_needed: parseInt(e.target.value) || undefined
                        }))
                      }
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="preferred-location">Preferred Location (Optional)</Label>
                <Input
                  id="preferred-location"
                  placeholder="e.g., Downtown Sports Complex"
                  value={matchRequestForm.preferred_location || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMatchRequestForm((prev: CreateMatchRequestInput) => ({
                      ...prev,
                      preferred_location: e.target.value || ''
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Preferred Date (Optional)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start text-left font-normal">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-fee">Maximum Fee (Optional)</Label>
                <Input
                  id="max-fee"
                  type="number"
                  placeholder="Maximum amount you're willing to pay ($)"
                  step="0.01"
                  min="0"
                  value={matchRequestForm.max_fee || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setMatchRequestForm((prev: CreateMatchRequestInput) => ({
                      ...prev,
                      max_fee: parseFloat(e.target.value) || undefined
                    }))
                  }
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Posting...' : 'Post Match Request 🚀'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}