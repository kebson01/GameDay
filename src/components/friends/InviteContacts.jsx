import React, { useState } from 'react';
import { client } from '@/api/client';
import { useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { UserPlus, Mail, Phone, Send, Check, Contact, Search, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Capacitor } from '@capacitor/core';

// Dynamic import for contacts - only works on native platforms
let Contacts = null;
if (Capacitor.isNativePlatform()) {
  import('@capacitor-community/contacts').then(module => {
    Contacts = module.Contacts;
  });
}

export default function InviteContacts({ groupId, groupName, inviteCode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [inviteMethod, setInviteMethod] = useState('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [isSent, setIsSent] = useState(false);
  
  // Contacts state
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [contactSearch, setContactSearch] = useState('');
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [selectedContacts, setSelectedContacts] = useState([]);

  // Fetch contacts from device
  const fetchContacts = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.error('Contact access is only available on mobile devices');
      return;
    }

    try {
      setLoadingContacts(true);
      
      // Request permission first
      const permissionResult = await Contacts.requestPermissions();
      
      if (permissionResult.contacts !== 'granted') {
        toast.error('Permission to access contacts was denied');
        return;
      }

      // Fetch contacts
      const result = await Contacts.getContacts({
        projection: {
          name: true,
          phones: true,
          emails: true,
          image: true,
        },
      });

      // Filter to only contacts with phones or emails
      const validContacts = result.contacts.filter(
        contact => (contact.phones?.length > 0 || contact.emails?.length > 0)
      ).map(contact => ({
        id: contact.contactId,
        name: contact.name?.display || contact.name?.given || 'Unknown',
        phone: contact.phones?.[0]?.number || null,
        email: contact.emails?.[0]?.address || null,
        image: contact.image?.base64String || null,
      }));

      setContacts(validContacts);
      setShowContactPicker(true);
    } catch (error) {
      console.error('Error fetching contacts:', error);
      toast.error('Failed to access contacts');
    } finally {
      setLoadingContacts(false);
    }
  };

  // Filter contacts based on search
  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(contactSearch.toLowerCase()) ||
    contact.phone?.includes(contactSearch) ||
    contact.email?.toLowerCase().includes(contactSearch.toLowerCase())
  );

  // Toggle contact selection
  const toggleContactSelection = (contact) => {
    setSelectedContacts(prev => {
      const exists = prev.find(c => c.id === contact.id);
      if (exists) {
        return prev.filter(c => c.id !== contact.id);
      }
      return [...prev, contact];
    });
  };

  // Use selected contact
  const useSelectedContact = (contact) => {
    setName(contact.name);
    if (contact.email && inviteMethod === 'email') {
      setEmail(contact.email);
    } else if (contact.phone) {
      setPhone(contact.phone);
      if (!contact.email) {
        setInviteMethod('phone');
      }
    }
    setShowContactPicker(false);
  };

  // Send invites to multiple selected contacts
  const sendBulkInvites = async () => {
    if (selectedContacts.length === 0) {
      toast.error('Please select at least one contact');
      return;
    }

    const inviteLink = `${window.location.origin}?joinCode=${inviteCode}`;
    const message = `Hey! Join my tailgate crew "${groupName}" on GameDay app. Use code: ${inviteCode} or click: ${inviteLink}`;

    let successCount = 0;
    
    for (const contact of selectedContacts) {
      try {
        if (contact.email) {
          await client.integrations.Core.SendEmail({
            to: contact.email,
            subject: `Join ${groupName} on GameDay!`,
            body: `Hi ${contact.name}!\n\n${message}\n\nSee you on game day! 🏈`,
          });
          successCount++;
        } else if (contact.phone) {
          // Open SMS for the first phone contact
          window.location.href = `sms:${contact.phone}?body=${encodeURIComponent(message)}`;
          successCount++;
        }
      } catch (error) {
        console.error(`Failed to invite ${contact.name}:`, error);
      }
    }

    if (successCount > 0) {
      toast.success(`Invited ${successCount} friend${successCount > 1 ? 's' : ''}!`);
      setSelectedContacts([]);
      setShowContactPicker(false);
    }
  };

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const inviteLink = `${window.location.origin}?joinCode=${inviteCode}`;
      const message = `Hey! Join my tailgate crew "${groupName}" on GameDay app. Use code: ${inviteCode} or click: ${inviteLink}`;

      if (inviteMethod === 'email' && email) {
        await client.integrations.Core.SendEmail({
          to: email,
          subject: `Join ${groupName} on GameDay!`,
          body: `Hi ${name || 'there'}!\n\n${message}\n\nSee you on game day! 🏈`,
        });
      } else if (inviteMethod === 'phone' && phone) {
        // For phone, we'll copy to clipboard and suggest SMS
        await navigator.clipboard.writeText(message);
        toast.success('Message copied! Paste into your SMS app');
        // Open SMS app (works on mobile)
        window.location.href = `sms:${phone}?body=${encodeURIComponent(message)}`;
      }

      return true;
    },
    onSuccess: () => {
      setIsSent(true);
      if (inviteMethod === 'email') {
        toast.success(`Invitation sent to ${email}!`);
      }
      setTimeout(() => {
        setIsOpen(false);
        setIsSent(false);
        setEmail('');
        setPhone('');
        setName('');
      }, 2000);
    },
    onError: (error) => {
      toast.error('Failed to send invitation');
    },
  });

  const handleInvite = () => {
    if (inviteMethod === 'email' && !email) {
      toast.error('Please enter an email');
      return;
    }
    if (inviteMethod === 'phone' && !phone) {
      toast.error('Please enter a phone number');
      return;
    }
    inviteMutation.mutate();
  };

  const handleShare = async () => {
    const inviteLink = `${window.location.origin}?joinCode=${inviteCode}`;
    const message = `Join my tailgate crew "${groupName}" on GameDay! Code: ${inviteCode}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${groupName}`,
          text: message,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled
      }
    } else {
      await navigator.clipboard.writeText(`${message}\n${inviteLink}`);
      toast.success('Invitation link copied!');
    }
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setIsOpen(true)}
        className="gap-2"
      >
        <UserPlus className="w-4 h-4" />
        Invite Friends
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Invite Friends to {groupName}</DialogTitle>
            <DialogDescription>
              Send an invitation via email, text, or from your contacts
            </DialogDescription>
          </DialogHeader>

          {!showContactPicker ? (
            <div className="space-y-4 py-4">
              {/* Import from Contacts Button */}
              {Capacitor.isNativePlatform() && (
                <Button
                  variant="outline"
                  onClick={fetchContacts}
                  disabled={loadingContacts}
                  className="w-full gap-2 border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700"
                >
                  {loadingContacts ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Contact className="w-5 h-5" />
                  )}
                  Import from Contacts
                </Button>
              )}

              {/* Method Selection */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setInviteMethod('email')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    inviteMethod === 'email'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Mail className="w-5 h-5" />
                  <span className="font-medium">Email</span>
                </button>
                <button
                  onClick={() => setInviteMethod('phone')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all ${
                    inviteMethod === 'phone'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Phone className="w-5 h-5" />
                  <span className="font-medium">Text</span>
                </button>
              </div>

              {/* Input Fields */}
              <div>
                <Label htmlFor="name">Friend's Name (optional)</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1"
                />
              </div>

              {inviteMethod === 'email' ? (
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="friend@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1"
                  />
                </div>
              ) : (
                <div>
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+1 (555) 123-4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1"
                  />
                </div>
              )}

              {/* Invite Code Display */}
              <div className="bg-slate-100 rounded-xl p-3 text-center">
                <p className="text-sm text-slate-500 mb-1">Group Code</p>
                <p className="text-2xl font-bold tracking-wider">{inviteCode}</p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleShare}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Share Link
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={handleInvite}
                  disabled={inviteMutation.isPending || isSent}
                >
                  {isSent ? (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Sent!
                    </>
                  ) : inviteMutation.isPending ? (
                    'Sending...'
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Invite
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            /* Contact Picker View */
            <div className="py-4">
              {/* Header with back button */}
              <div className="flex items-center gap-3 mb-4">
                <button
                  onClick={() => setShowContactPicker(false)}
                  className="p-2 hover:bg-slate-100 rounded-full"
                >
                  <X className="w-5 h-5" />
                </button>
                <h3 className="font-semibold">Select Contacts</h3>
                {selectedContacts.length > 0 && (
                  <span className="ml-auto text-sm text-orange-600 font-medium">
                    {selectedContacts.length} selected
                  </span>
                )}
              </div>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Search contacts..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Contact List */}
              <div className="max-h-[40vh] overflow-y-auto space-y-1">
                {filteredContacts.length === 0 ? (
                  <div className="text-center py-8 text-slate-500">
                    <Contact className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No contacts found</p>
                  </div>
                ) : (
                  filteredContacts.map((contact) => {
                    const isSelected = selectedContacts.some(c => c.id === contact.id);
                    return (
                      <div
                        key={contact.id}
                        className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                          isSelected
                            ? 'bg-orange-50 border-2 border-orange-300'
                            : 'hover:bg-slate-50 border-2 border-transparent'
                        }`}
                        onClick={() => toggleContactSelection(contact)}
                      >
                        {/* Avatar */}
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center text-white font-bold overflow-hidden">
                          {contact.image ? (
                            <img
                              src={`data:image/jpeg;base64,${contact.image}`}
                              alt={contact.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            contact.name.charAt(0).toUpperCase()
                          )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{contact.name}</p>
                          <p className="text-sm text-slate-500 truncate">
                            {contact.email || contact.phone}
                          </p>
                        </div>

                        {/* Checkbox */}
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'bg-orange-500 border-orange-500'
                            : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    if (selectedContacts.length === 1) {
                      useSelectedContact(selectedContacts[0]);
                    } else {
                      setShowContactPicker(false);
                    }
                  }}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={sendBulkInvites}
                  disabled={selectedContacts.length === 0}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Invite {selectedContacts.length > 0 ? `(${selectedContacts.length})` : ''}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
