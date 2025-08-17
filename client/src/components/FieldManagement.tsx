import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPinIcon, DollarSignIcon, ClockIcon, PlusIcon } from 'lucide-react';
import { format } from 'date-fns';
import { trpc } from '@/utils/trpc';
import type { 
  User, 
  Field, 
  FieldSlot,
  Booking,
  CreateFieldInput, 
  CreateFieldSlotInput,
  UpdateFieldInput,
  BookingStatus
} from '../../../server/src/schema';

interface FieldManagementProps {
  user: User;
}

export function FieldManagement({ user }: FieldManagementProps) {
  const [fields, setFields] = useState<Field[]>([]);
  const [fieldSlots, setFieldSlots] = useState<FieldSlot[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeSection, setActiveSection] = useState<'fields' | 'slots' | 'bookings'>('fields');

  // Form states
  const [fieldForm, setFieldForm] = useState<CreateFieldInput>({
    name: '',
    address: '',
    description: null,
    hourly_rate: 0
  });

  const [slotForm, setSlotForm] = useState<CreateFieldSlotInput>({
    field_id: 0,
    start_time: new Date(),
    end_time: new Date(),
    price: 0
  });

  const [selectedSlotDate, setSelectedSlotDate] = useState<Date>();
  const [selectedField, setSelectedField] = useState<Field | null>(null);
  const [showCreateFieldDialog, setShowCreateFieldDialog] = useState(false);
  const [showCreateSlotDialog, setShowCreateSlotDialog] = useState(false);

  // Load data
  const loadFields = useCallback(async () => {
    try {
      const userFields = await trpc.getFieldsByOwner.query({ ownerId: user.id });
      setFields(userFields);
    } catch (error) {
      console.error('Failed to load fields:', error);
    }
  }, [user.id]);

  const loadFieldSlots = useCallback(async () => {
    try {
      if (selectedField) {
        const slots = await trpc.getFieldSlotsByField.query({ fieldId: selectedField.id });
        setFieldSlots(slots);
      }
    } catch (error) {
      console.error('Failed to load field slots:', error);
    }
  }, [selectedField]);

  const loadBookings = useCallback(async () => {
    try {
      const ownerBookings = await trpc.getBookingsByFieldOwner.query({ ownerId: user.id });
      setBookings(ownerBookings);
    } catch (error) {
      console.error('Failed to load bookings:', error);
    }
  }, [user.id]);

  useEffect(() => {
    loadFields();
    loadBookings();
  }, [loadFields, loadBookings]);

  useEffect(() => {
    if (selectedField) {
      loadFieldSlots();
    }
  }, [selectedField, loadFieldSlots]);

  const handleCreateField = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const newField = await trpc.createField.mutate({
        ...fieldForm,
        description: fieldForm.description || null
      });
      setFields((prev: Field[]) => [...prev, newField]);
      setFieldForm({
        name: '',
        address: '',
        description: null,
        hourly_rate: 0
      });
      setShowCreateFieldDialog(false);
    } catch (error) {
      console.error('Failed to create field:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSlotDate || !selectedField) return;

    setIsLoading(true);
    try {
      const startTime = new Date(selectedSlotDate);
      startTime.setHours(9, 0, 0, 0); // Default start time
      const endTime = new Date(startTime);
      endTime.setHours(endTime.getHours() + 1); // 1 hour duration

      const newSlot = await trpc.createFieldSlot.mutate({
        field_id: selectedField.id,
        start_time: startTime,
        end_time: endTime,
        price: slotForm.price
      });

      setFieldSlots((prev: FieldSlot[]) => [...prev, newSlot]);
      setSlotForm({
        field_id: 0,
        start_time: new Date(),
        end_time: new Date(),
        price: 0
      });
      setSelectedSlotDate(undefined);
      setShowCreateSlotDialog(false);
    } catch (error) {
      console.error('Failed to create slot:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateBookingStatus = async (bookingId: number, status: BookingStatus) => {
    try {
      await trpc.updateBookingStatus.mutate({ bookingId, status });
      setBookings((prev: Booking[]) =>
        prev.map((booking: Booking) =>
          booking.id === bookingId ? { ...booking, status } : booking
        )
      );
    } catch (error) {
      console.error('Failed to update booking status:', error);
    }
  };

  const getStatusBadge = (status: BookingStatus) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pending</Badge>;
      case 'confirmed':
        return <Badge variant="default">Confirmed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Field Management</h2>
          <p className="text-gray-600">Manage your football fields, slots, and bookings</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant={activeSection === 'fields' ? 'default' : 'outline'}
            onClick={() => setActiveSection('fields')}
          >
            🏟️ Fields
          </Button>
          <Button 
            variant={activeSection === 'slots' ? 'default' : 'outline'}
            onClick={() => setActiveSection('slots')}
          >
            📅 Slots
          </Button>
          <Button 
            variant={activeSection === 'bookings' ? 'default' : 'outline'}
            onClick={() => setActiveSection('bookings')}
          >
            📊 Bookings
          </Button>
        </div>
      </div>

      {/* Fields Section */}
      {activeSection === 'fields' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Your Fields ({fields.length})</h3>
            <Dialog open={showCreateFieldDialog} onOpenChange={setShowCreateFieldDialog}>
              <DialogTrigger asChild>
                <Button>
                  <PlusIcon className="h-4 w-4 mr-2" />
                  Add Field
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Field</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateField} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="field-name">Field Name</Label>
                    <Input
                      id="field-name"
                      placeholder="e.g., Central Sports Complex Field 1"
                      value={fieldForm.name}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFieldForm((prev: CreateFieldInput) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field-address">Address</Label>
                    <Input
                      id="field-address"
                      placeholder="123 Sports Ave, City, State"
                      value={fieldForm.address}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFieldForm((prev: CreateFieldInput) => ({ ...prev, address: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field-description">Description (Optional)</Label>
                    <Textarea
                      id="field-description"
                      placeholder="Field features, amenities, etc."
                      value={fieldForm.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                        setFieldForm((prev: CreateFieldInput) => ({
                          ...prev,
                          description: e.target.value || null
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="field-rate">Hourly Rate ($)</Label>
                    <Input
                      id="field-rate"
                      type="number"
                      placeholder="50.00"
                      step="0.01"
                      min="0"
                      value={fieldForm.hourly_rate}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        setFieldForm((prev: CreateFieldInput) => ({
                          ...prev,
                          hourly_rate: parseFloat(e.target.value) || 0
                        }))
                      }
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Creating...' : 'Create Field'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="grid gap-4">
            {fields.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No fields registered yet. Add your first field to get started! 🏟️
                </CardContent>
              </Card>
            ) : (
              fields.map((field: Field) => (
                <Card key={field.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          🏟️ {field.name}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <MapPinIcon className="h-4 w-4" />
                          {field.address}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          ${field.hourly_rate}/hr
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedField(field);
                            setActiveSection('slots');
                          }}
                        >
                          Manage Slots
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  {field.description && (
                    <CardContent>
                      <p className="text-gray-700">{field.description}</p>
                      <div className="mt-3 text-xs text-gray-400">
                        Created on {format(field.created_at, 'PPP')}
                      </div>
                    </CardContent>
                  )}
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Slots Section */}
      {activeSection === 'slots' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">
                Field Slots {selectedField && `for ${selectedField.name}`} ({fieldSlots.length})
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Label htmlFor="field-select">Select Field:</Label>
                <Select
                  value={selectedField?.id.toString() || ''}
                  onValueChange={(value: string) => {
                    const field = fields.find((f: Field) => f.id === parseInt(value));
                    setSelectedField(field || null);
                  }}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Choose a field" />
                  </SelectTrigger>
                  <SelectContent>
                    {fields.map((field: Field) => (
                      <SelectItem key={field.id} value={field.id.toString()}>
                        {field.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {selectedField && (
              <Dialog open={showCreateSlotDialog} onOpenChange={setShowCreateSlotDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Add Slot
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Slot for {selectedField.name}</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleCreateSlot} className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" className="w-full justify-start text-left font-normal">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {selectedSlotDate ? format(selectedSlotDate, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={selectedSlotDate}
                            onSelect={setSelectedSlotDate}
                            initialFocus
                            disabled={(date) => date < new Date()}
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="slot-price">Price ($)</Label>
                      <Input
                        id="slot-price"
                        type="number"
                        placeholder="50.00"
                        step="0.01"
                        min="0"
                        value={slotForm.price}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          setSlotForm((prev: CreateFieldSlotInput) => ({
                            ...prev,
                            price: parseFloat(e.target.value) || 0
                          }))
                        }
                        required
                      />
                    </div>
                    <p className="text-sm text-gray-500">
                      Default time: 9:00 AM - 10:00 AM (1 hour duration)
                    </p>
                    <Button type="submit" className="w-full" disabled={isLoading || !selectedSlotDate}>
                      {isLoading ? 'Creating...' : 'Create Slot'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {!selectedField ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                Please select a field to view its slots 🏟️
              </CardContent>
            </Card>
          ) : fieldSlots.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center text-gray-500">
                No slots created for this field yet. Add your first slot! 📅
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {fieldSlots.map((slot: FieldSlot) => (
                <Card key={slot.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          📅 {format(slot.start_time, 'PPP')}
                        </CardTitle>
                        <CardDescription className="flex items-center gap-1 mt-1">
                          <ClockIcon className="h-4 w-4" />
                          {format(slot.start_time, 'p')} - {format(slot.end_time, 'p')}
                        </CardDescription>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">${slot.price}</div>
                        <Badge variant={slot.is_available ? 'default' : 'destructive'}>
                          {slot.is_available ? 'Available' : 'Booked'}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bookings Section */}
      {activeSection === 'bookings' && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Booking Requests ({bookings.length})</h3>
          <div className="grid gap-4">
            {bookings.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center text-gray-500">
                  No bookings yet. Your slots will appear here when booked! 📊
                </CardContent>
              </Card>
            ) : (
              bookings.map((booking: Booking) => (
                <Card key={booking.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          📊 Booking #{booking.id}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          User ID: {booking.user_id} • Total: ${booking.total_price}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(booking.status)}
                        {booking.status === 'pending' && (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                            >
                              Confirm ✅
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                            >
                              Decline ❌
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  {booking.notes && (
                    <CardContent>
                      <p className="text-gray-700">{booking.notes}</p>
                      <div className="mt-3 text-xs text-gray-400">
                        Booked on {format(booking.created_at, 'PPp')}
                      </div>
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