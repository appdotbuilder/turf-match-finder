import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { MessageCircleIcon, SendIcon, UserIcon, PlusIcon } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Message, 
  Interest,
  SendMessageInput, 
  CreateInterestInput
} from '../../../server/src/schema';

interface Conversation {
  userId: number;
  userName: string;
  lastMessage: Message;
  unreadCount: number;
}

interface MessagingCenterProps {
  user: User;
}

export function MessagingCenter({ user }: MessagingCenterProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'conversations' | 'interests'>('conversations');

  // New conversation form
  const [newConversationForm, setNewConversationForm] = useState<SendMessageInput>({
    receiver_id: 0,
    content: ''
  });
  const [showNewConversationDialog, setShowNewConversationDialog] = useState(false);

  // Load conversations
  const loadConversations = useCallback(async () => {
    try {
      const convos = await trpc.getConversations.query({ userId: user.id });
      
      // Transform the data to match our Conversation interface
      const transformedConvos: Conversation[] = convos.map((convo: any) => ({
        userId: convo.other_user_id,
        userName: `User #${convo.other_user_id}`, // In a real app, you'd fetch user names
        lastMessage: convo.last_message,
        unreadCount: convo.unread_count
      }));
      
      setConversations(transformedConvos);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }, [user.id]);

  // Load messages for a specific conversation
  const loadMessages = useCallback(async (otherUserId: number) => {
    try {
      const conversationMessages = await trpc.getMessagesBetweenUsers.query({
        userId1: user.id,
        userId2: otherUserId
      });
      setMessages(conversationMessages);
      
      // Mark messages as read
      await trpc.markMessagesAsRead.mutate({
        senderId: otherUserId,
        receiverId: user.id
      });
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  }, [user.id]);

  // Load user interests
  const loadInterests = useCallback(async () => {
    try {
      const userInterests = await trpc.getInterestsByUser.query({ userId: user.id });
      setInterests(userInterests);
    } catch (error) {
      console.error('Failed to load interests:', error);
    }
  }, [user.id]);

  useEffect(() => {
    loadConversations();
    loadInterests();
  }, [loadConversations, loadInterests]);

  useEffect(() => {
    if (currentConversation) {
      loadMessages(currentConversation.userId);
    }
  }, [currentConversation, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentConversation || !newMessage.trim()) return;

    setIsLoading(true);
    try {
      const messageData: SendMessageInput = {
        receiver_id: currentConversation.userId,
        content: newMessage.trim()
      };

      const sentMessage = await trpc.sendMessage.mutate(messageData);
      setMessages((prev: Message[]) => [...prev, sentMessage]);
      setNewMessage('');

      // Update conversations list
      loadConversations();
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartNewConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const sentMessage = await trpc.sendMessage.mutate(newConversationForm);
      
      // Add to conversations and select it
      const newConvo: Conversation = {
        userId: newConversationForm.receiver_id,
        userName: `User #${newConversationForm.receiver_id}`,
        lastMessage: sentMessage,
        unreadCount: 0
      };
      
      setConversations((prev: Conversation[]) => [newConvo, ...prev]);
      setCurrentConversation(newConvo);
      
      setNewConversationForm({ receiver_id: 0, content: '' });
      setShowNewConversationDialog(false);
    } catch (error) {
      console.error('Failed to start new conversation:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversation(conversation);
    
    // Update unread count
    setConversations((prev: Conversation[]) =>
      prev.map((conv: Conversation) =>
        conv.userId === conversation.userId ? { ...conv, unreadCount: 0 } : conv
      )
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Messaging Center</h2>
          <p className="text-gray-600">Connect with players, teams, and field owners</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeSection === 'conversations' ? 'default' : 'outline'}
            onClick={() => setActiveSection('conversations')}
          >
            💬 Messages
          </Button>
          <Button 
            variant={activeSection === 'interests' ? 'default' : 'outline'}
            onClick={() => setActiveSection('interests')}
          >
            🎯 My Interests
          </Button>
        </div>
      </div>

      {activeSection === 'conversations' && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Conversations List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Conversations</h3>
              <Dialog open={showNewConversationDialog} onOpenChange={setShowNewConversationDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <PlusIcon className="h-4 w-4 mr-2" />
                    New
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Start New Conversation</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleStartNewConversation} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="receiver-id">User ID</Label>
                      <Input
                        id="receiver-id"
                        type="number"
                        placeholder="Enter user ID"
                        value={newConversationForm.receiver_id || ''}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setNewConversationForm((prev: SendMessageInput) => ({
                            ...prev,
                            receiver_id: parseInt(e.target.value) || 0
                          }))
                        }
                        required
                      />
                      <p className="text-xs text-gray-500">
                        In a real app, this would be a user search feature
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="first-message">Message</Label>
                      <Textarea
                        id="first-message"
                        placeholder="Hi! I'm interested in..."
                        value={newConversationForm.content}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                          setNewConversationForm((prev: SendMessageInput) => ({
                            ...prev,
                            content: e.target.value
                          }))
                        }
                        required
                      />
                    </div>
                    <Button type="submit" className="w-full" disabled={isLoading}>
                      {isLoading ? 'Sending...' : 'Send Message 📨'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {conversations.length === 0 ? (
                <Card>
                  <CardContent className="p-4 text-center text-gray-500">
                    No conversations yet. Start by expressing interest in matches or fields! 💬
                  </CardContent>
                </Card>
              ) : (
                conversations.map((conversation: Conversation) => (
                  <Card
                    key={conversation.userId}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      currentConversation?.userId === conversation.userId
                        ? 'ring-2 ring-blue-500 bg-blue-50'
                        : ''
                    }`}
                    onClick={() => selectConversation(conversation)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <UserIcon className="h-4 w-4" />
                          <span className="font-medium">{conversation.userName}</span>
                        </div>
                        {conversation.unreadCount > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {conversation.unreadCount}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 truncate">
                        {conversation.lastMessage.content}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {format(conversation.lastMessage.created_at, 'MMM d, p')}
                      </p>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {!currentConversation ? (
              <Card className="h-96 flex items-center justify-center">
                <CardContent className="text-center text-gray-500">
                  <MessageCircleIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a conversation to start messaging</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="h-96 flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <UserIcon className="h-5 w-5" />
                    {currentConversation.userName}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="flex-1 flex flex-col">
                  {/* Messages */}
                  <ScrollArea className="flex-1 pr-4">
                    <div className="space-y-4">
                      {messages.map((message: Message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender_id === user.id ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.sender_id === user.id
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-100 text-gray-900'
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>
                            <p className="text-xs opacity-75 mt-1">
                              {format(message.created_at, 'MMM d, p')}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  <Separator className="my-4" />

                  {/* Message Input */}
                  <form onSubmit={handleSendMessage} className="flex gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMessage(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={isLoading || !newMessage.trim()}>
                      <SendIcon className="h-4 w-4" />
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}

      {activeSection === 'interests' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">My Expressed Interests ({interests.length})</h3>
          <div className="grid gap-4">
            {interests.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  You haven't expressed interest in anything yet. Browse matches and field slots to get started! 🎯
                </CardContent>
              </Card>
            ) : (
              interests.map((interest: Interest) => (
                <Card key={interest.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {interest.type === 'match_request' ? '⚽' : '🏟️'} 
                          Interest in {interest.type === 'match_request' ? 'Match Request' : 'Field Slot'}
                        </CardTitle>
                        <CardDescription>
                          {interest.type === 'match_request' 
                            ? `Match Request ID: ${interest.match_request_id}`
                            : `Field Slot ID: ${interest.field_slot_id}`
                          }
                        </CardDescription>
                      </div>
                      <Badge variant="outline">
                        {format(interest.created_at, 'MMM d')}
                      </Badge>
                    </div>
                  </CardHeader>
                  {interest.message && (
                    <CardContent>
                      <p className="text-gray-700">{interest.message}</p>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}