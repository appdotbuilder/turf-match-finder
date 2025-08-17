import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { PlusIcon, UsersIcon, StarIcon, CrownIcon, UserMinusIcon } from 'lucide-react';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Team, 
  TeamMember,
  Rating,
  CreateTeamInput, 
  AddTeamMemberInput,
  CreateRatingInput
} from '../../../server/src/schema';

interface TeamManagementProps {
  user: User;
}

export function TeamManagement({ user }: TeamManagementProps) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [teamMembers, setTeamMembers] = useState<{ [teamId: number]: TeamMember[] }>({});
  const [teamRatings, setTeamRatings] = useState<{ [teamId: number]: Rating[] }>({});
  const [teamAverages, setTeamAverages] = useState<{ [teamId: number]: number }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'my-teams' | 'all-teams' | 'rate-teams'>('my-teams');

  // Form states
  const [teamForm, setTeamForm] = useState<CreateTeamInput>({
    name: '',
    description: null,
    skill_level: 5
  });

  const [memberForm, setMemberForm] = useState<AddTeamMemberInput>({
    team_id: 0,
    user_id: 0
  });

  const [ratingForm, setRatingForm] = useState<CreateRatingInput>({
    rated_team_id: 0,
    rating: 5,
    comment: ''
  });

  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [showCreateTeamDialog, setShowCreateTeamDialog] = useState(false);
  const [showAddMemberDialog, setShowAddMemberDialog] = useState(false);
  const [showRateTeamDialog, setShowRateTeamDialog] = useState(false);

  // Load data
  const loadUserTeams = useCallback(async () => {
    try {
      const userTeams = await trpc.getTeamsByUser.query({ userId: user.id });
      setTeams(userTeams);
    } catch (error) {
      console.error('Failed to load user teams:', error);
    }
  }, [user.id]);

  const loadAllTeams = useCallback(async () => {
    try {
      const allTeamsData = await trpc.getTeams.query();
      setAllTeams(allTeamsData);
    } catch (error) {
      console.error('Failed to load all teams:', error);
    }
  }, []);

  const loadTeamMembers = useCallback(async (teamId: number) => {
    try {
      const members = await trpc.getTeamMembers.query({ teamId });
      setTeamMembers((prev) => ({ ...prev, [teamId]: members }));
    } catch (error) {
      console.error('Failed to load team members:', error);
    }
  }, []);

  const loadTeamRatings = useCallback(async (teamId: number) => {
    try {
      const [ratings, average] = await Promise.all([
        trpc.getRatingsByTeam.query({ teamId }),
        trpc.getAverageRatingByTeam.query({ teamId })
      ]);
      setTeamRatings((prev) => ({ ...prev, [teamId]: ratings }));
      setTeamAverages((prev) => ({ ...prev, [teamId]: average }));
    } catch (error) {
      console.error('Failed to load team ratings:', error);
    }
  }, []);

  useEffect(() => {
    loadUserTeams();
    loadAllTeams();
  }, [loadUserTeams, loadAllTeams]);

  useEffect(() => {
    teams.forEach((team: Team) => {
      loadTeamMembers(team.id);
      loadTeamRatings(team.id);
    });
  }, [teams, loadTeamMembers, loadTeamRatings]);

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newTeam = await trpc.createTeam.mutate({
        ...teamForm,
        description: teamForm.description || null
      });
      setTeams((prev: Team[]) => [...prev, newTeam]);
      setTeamForm({
        name: '',
        description: null,
        skill_level: 5
      });
      setShowCreateTeamDialog(false);
    } catch (error) {
      console.error('Failed to create team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeam) return;

    setIsLoading(true);
    try {
      const newMember = await trpc.addTeamMember.mutate({
        team_id: selectedTeam.id,
        user_id: memberForm.user_id
      });
      
      setTeamMembers((prev) => ({
        ...prev,
        [selectedTeam.id]: [...(prev[selectedTeam.id] || []), newMember]
      }));
      
      setMemberForm({ team_id: 0, user_id: 0 });
      setShowAddMemberDialog(false);
    } catch (error) {
      console.error('Failed to add team member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (teamId: number, userId: number) => {
    try {
      await trpc.removeTeamMember.mutate({ teamId, userId });
      setTeamMembers((prev) => ({
        ...prev,
        [teamId]: (prev[teamId] || []).filter((member: TeamMember) => member.user_id !== userId)
      }));
    } catch (error) {
      console.error('Failed to remove team member:', error);
    }
  };

  const handleRateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newRating = await trpc.createRating.mutate({
        ...ratingForm,
        comment: ratingForm.comment || undefined
      });
      
      // Refresh ratings for the rated team
      await loadTeamRatings(ratingForm.rated_team_id);
      
      setRatingForm({
        rated_team_id: 0,
        rating: 5,
        comment: ''
      });
      setShowRateTeamDialog(false);
    } catch (error) {
      console.error('Failed to rate team:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSkillLevelBadge = (level: number) => {
    if (level <= 3) return <Badge variant="secondary">Beginner</Badge>;
    if (level <= 6) return <Badge variant="default">Intermediate</Badge>;
    if (level <= 8) return <Badge variant="outline">Advanced</Badge>;
    return <Badge variant="destructive">Expert</Badge>;
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Team Management</h2>
          <p className="text-gray-600">Create teams, manage members, and rate opponents</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeSection === 'my-teams' ? 'default' : 'outline'}
            onClick={() => setActiveSection('my-teams')}
          >
            👥 My Teams
          </Button>
          <Button 
            variant={activeSection === 'all-teams' ? 'default' : 'outline'}
            onClick={() => setActiveSection('all-teams')}
          >
            🌍 All Teams
          </Button>
          <Button 
            variant={activeSection === 'rate-teams' ? 'default' : 'outline'}
            onClick={() => setActiveSection('rate-teams')}
          >
            ⭐ Rate Teams
          </Button>
        </div>
      </div>

      {/* My Teams Section */}
      {activeSection === 'my-teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">My Teams ({teams.length})</h3>
            <Dialog open={showCreateTeamDialog} onOpenChange={setShowCreateTeamDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Create Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="team-name">Team Name</Label>
                    <Input
                      id="team-name"
                      placeholder="e.g., Lightning Bolts FC"
                      value={teamForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setTeamForm((prev: CreateTeamInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-description">Description (Optional)</Label>
                    <Textarea
                      id="team-description"
                      placeholder="Tell us about your team..."
                      value={teamForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setTeamForm((prev: CreateTeamInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="team-skill-level">Team Skill Level (1-10)</Label>
                    <Select
                      value={teamForm.skill_level.toString()}
                      onValueChange={(value: string) =>
                        setTeamForm((prev: CreateTeamInput) => ({ 
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
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Team 🚀'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {teams.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  You haven't created any teams yet. Start by creating your first team! ⚽
                </CardContent>
              </Card>
            ) : (
              teams.map((team: Team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {team.captain_id === user.id && <CrownIcon className="h-5 w-5 text-yellow-500" />}
                          👥 {team.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {getSkillLevelBadge(team.skill_level)}
                          <div className="flex items-center gap-1">
                            {renderStars(Math.round(teamAverages[team.id] || 0))}
                            {teamAverages[team.id] && (
                              <span className="text-sm text-gray-600 ml-1">
                                ({teamAverages[team.id].toFixed(1)})
                              </span>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        <Dialog open={showAddMemberDialog && selectedTeam?.id === team.id} 
                                onOpenChange={(open) => {
                                  setShowAddMemberDialog(open);
                                  if (open) setSelectedTeam(team);
                                }}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <PlusIcon className="h-4 w-4 mr-1" />
                              Add Member
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Add Member to {team.name}</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleAddMember} className="space-y-4">
                              <div className="space-y-2">
                                <Label htmlFor="member-id">User ID</Label>
                                <Input
                                  id="member-id"
                                  type="number"
                                  placeholder="Enter user ID"
                                  value={memberForm.user_id || ''}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                    setMemberForm((prev: AddTeamMemberInput) => ({
                                      ...prev,
                                      user_id: parseInt(e.target.value) || 0
                                    }))
                                  }
                                  required
                                />
                                <p className="text-xs text-gray-500">
                                  In a real app, this would be a user search/selection
                                </p>
                              </div>
                              <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? 'Adding...' : 'Add Member'}
                              </Button>
                            </form>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {team.description && (
                      <p className="text-gray-700 mb-3">{team.description}</p>
                    )}
                    
                    {/* Team Members */}
                    <div className="space-y-2">
                      <h4 className="font-medium flex items-center gap-2">
                        <UsersIcon className="h-4 w-4" />
                        Members ({(teamMembers[team.id] || []).length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(teamMembers[team.id] || []).map((member: TeamMember) => (
                          <Badge key={member.id} variant="outline" className="flex items-center gap-1">
                            User #{member.user_id}
                            {team.captain_id === user.id && member.user_id !== user.id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-4 w-4 p-0 hover:bg-red-100"
                                onClick={() => handleRemoveMember(team.id, member.user_id)}
                              >
                                <UserMinusIcon className="h-3 w-3" />
                              </Button>
                            )}
                          </Badge>
                        ))}
                        {(teamMembers[team.id] || []).length === 0 && (
                          <span className="text-sm text-gray-500">No members yet</span>
                        )}
                      </div>
                    </div>

                    <Separator className="my-3" />

                    {/* Team Ratings */}
                    <div className="space-y-2">
                      <h4 className="font-medium">Recent Ratings</h4>
                      {(teamRatings[team.id] || []).length === 0 ? (
                        <p className="text-sm text-gray-500">No ratings yet</p>
                      ) : (
                        <div className="space-y-2">
                          {(teamRatings[team.id] || []).slice(0, 3).map((rating: Rating) => (
                            <div key={rating.id} className="bg-gray-50 p-2 rounded text-sm">
                              <div className="flex items-center gap-2 mb-1">
                                <div className="flex">{renderStars(rating.rating)}</div>
                                <span className="text-xs text-gray-500">
                                  by User #{rating.rater_id}
                                </span>
                              </div>
                              {rating.comment && <p className="text-gray-700">{rating.comment}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="mt-3 text-xs text-gray-400">
                      Created on {new Date(team.created_at).toLocaleDateString()}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* All Teams Section */}
      {activeSection === 'all-teams' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">All Teams ({allTeams.length})</h3>
          <div className="grid gap-4">
            {allTeams.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No teams found in the community yet 🌍
                </CardContent>
              </Card>
            ) : (
              allTeams.map((team: Team) => (
                <Card key={team.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          👥 {team.name}
                          {team.captain_id === user.id && (
                            <Badge variant="outline">Your Team</Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2 mt-1">
                          {getSkillLevelBadge(team.skill_level)}
                          <div className="flex items-center gap-1">
                            {renderStars(Math.round(teamAverages[team.id] || 0))}
                            {teamAverages[team.id] && (
                              <span className="text-sm text-gray-600 ml-1">
                                ({teamAverages[team.id].toFixed(1)})
                              </span>
                            )}
                          </div>
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  {team.description && (
                    <CardContent>
                      <p className="text-gray-700">{team.description}</p>
                      <div className="mt-3 text-xs text-gray-400">
                        Captain: User #{team.captain_id}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Rate Teams Section */}
      {activeSection === 'rate-teams' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Rate Teams</h3>
            <Dialog open={showRateTeamDialog} onOpenChange={setShowRateTeamDialog}>
              <DialogTrigger asChild>
                <Button>
                  <StarIcon className="h-4 w-4 mr-2" />
                  Rate a Team
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Rate a Team</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleRateTeam} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="rated-team">Select Team</Label>
                    <Select
                      value={ratingForm.rated_team_id.toString()}
                      onValueChange={(value: string) =>
                        setRatingForm((prev: CreateRatingInput) => ({
                          ...prev,
                          rated_team_id: parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a team to rate" />
                      </SelectTrigger>
                      <SelectContent>
                        {allTeams
                          .filter((team: Team) => team.captain_id !== user.id)
                          .map((team: Team) => (
                          <SelectItem key={team.id} value={team.id.toString()}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rating">Rating (1-5 stars)</Label>
                    <Select
                      value={ratingForm.rating.toString()}
                      onValueChange={(value: string) =>
                        setRatingForm((prev: CreateRatingInput) => ({
                          ...prev,
                          rating: parseInt(value)
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 5 }, (_, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>
                            <div className="flex items-center gap-2">
                              {i + 1} {renderStars(i + 1)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="rating-comment">Comment (Optional)</Label>
                    <Textarea
                      id="rating-comment"
                      placeholder="Share your experience playing against this team..."
                      value={ratingForm.comment || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setRatingForm((prev: CreateRatingInput) => ({
                          ...prev,
                          comment: e.target.value || ''
                        }))
                      }
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={isLoading || ratingForm.rated_team_id === 0}
                  >
                    {isLoading ? 'Submitting...' : 'Submit Rating ⭐'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardContent className="p-6">
              <h4 className="font-semibold mb-4">How Rating Works</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Rate teams after playing matches against them</li>
                <li>• Ratings help other teams find suitable opponents</li>
                <li>• Be fair and constructive in your ratings</li>
                <li>• You cannot rate your own teams</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}