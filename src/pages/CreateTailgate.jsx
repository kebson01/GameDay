import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import {
  MapPin, Clock, Users, Camera, PartyPopper, X, Locate, Sparkles, Info, Loader2, CheckCircle2, Lock, Globe,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import AppHeader from '@/components/layout/AppHeader';
import SafetyButton from '@/components/common/SafetyButton';
import GameDayAssistant from '@/components/ai/GameDayAssistant';
import LoginPrompt from '@/components/auth/LoginPrompt';
import { GdSwitch, Field } from '@/components/crew-v2/ui';

const TAILGATE_TYPES = [
  { value: 'open', label: 'Open to All', emoji: '🎉' },
  { value: 'student', label: 'Student', emoji: '🎓' },
  { value: 'alumni', label: 'Alumni', emoji: '🏛️' },
  { value: 'greek', label: 'Greek Life', emoji: '🏛️' },
  { value: 'family', label: 'Family Friendly', emoji: '👨‍👩‍👧‍👦' },
  { value: 'sponsor', label: 'Sponsored', emoji: '⭐' },
  { value: 'private', label: 'Private', emoji: '🔒' },
];

const AMENITIES = [
  { value: 'grill', label: 'Grill', emoji: '🍖' },
  { value: 'tent', label: 'Tent', emoji: '⛺' },
  { value: 'games', label: 'Games', emoji: '🎮' },
  { value: 'tv', label: 'TV', emoji: '📺' },
  { value: 'music', label: 'Music', emoji: '🎵' },
  { value: 'drinks', label: 'Drinks', emoji: '🍺' },
  { value: 'food', label: 'Food', emoji: '🍔' },
  { value: 'cornhole', label: 'Cornhole', emoji: '🎯' },
];

function FormSection({ icon: Icon, title, children }) {
  return (
    <section className="gd-card space-y-4 p-4">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface">
        {Icon && <Icon className="h-5 w-5 text-orange-600 dark:text-brand-soft" />}
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function CreateTailgate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  // ?edit=<id>: edit an existing tailgate instead of creating a new one
  const editId = new URLSearchParams(window.location.search).get('edit');
  const [existingPhoto, setExistingPhoto] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    type: 'open',
    description: '',
    game_date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '10:00',
    end_time: '14:00',
    location: {
      lat: null,
      lng: null,
      lot_name: '',
      description: '',
    },
    is_public: true,
    password: '',
    capacity: '',
    amenities: [],
  });

  useEffect(() => {
    client.auth.me().then(user => {
      setUser(user);
    }).catch(() => {
      setShowLoginPrompt(true);
    });
  }, []);

  // Load the tailgate being edited
  useEffect(() => {
    if (!editId) return;
    client.entities.Tailgate.filter({ id: editId }).then(([t]) => {
      if (!t) return;
      setExistingPhoto(t.photo_url || null);
      setFormData(prev => ({
        ...prev,
        name: t.name || '',
        type: t.type || 'open',
        description: t.description || '',
        game_date: t.game_date || prev.game_date,
        start_time: t.start_time || '',
        end_time: t.end_time || '',
        location: { lat: null, lng: null, lot_name: '', description: '', ...(t.location || {}) },
        is_public: t.is_public !== false,
        capacity: t.capacity ? String(t.capacity) : '',
        amenities: t.amenities || [],
      }));
    }).catch(() => toast.error('Could not load this tailgate'));
  }, [editId]);

  // Preview URL for a newly picked photo (revoked when replaced)
  const photoPreview = useMemo(() => (photoFile ? URL.createObjectURL(photoFile) : null), [photoFile]);
  useEffect(() => () => { if (photoPreview) URL.revokeObjectURL(photoPreview); }, [photoPreview]);
  const shownPhoto = photoPreview || existingPhoto;

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation not supported');
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(loc);
        setFormData(prev => ({
          ...prev,
          location: { ...prev.location, lat: loc.lat, lng: loc.lng }
        }));
        setIsGettingLocation(false);
        toast.success('Location captured!');
      },
      () => {
        setIsGettingLocation(false);
        toast.error('Could not get location');
      },
      { enableHighAccuracy: true }
    );
  };

  const toggleAmenity = (value) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(value)
        ? prev.amenities.filter(a => a !== value)
        : [...prev.amenities, value]
    }));
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      if (!formData.name) throw new Error('Name is required');
      if (!formData.location.lat) throw new Error('Location is required');

      let photoUrl = existingPhoto;
      if (photoFile) {
        const { file_url } = await client.integrations.Core.UploadFile({ file: photoFile });
        photoUrl = file_url;
      }

      if (editId) {
        const { password: _pw, ...fields } = formData;
        return client.entities.Tailgate.update(editId, {
          ...fields,
          photo_url: photoUrl,
          capacity: formData.capacity ? parseInt(formData.capacity) : null,
        });
      }

      return client.entities.Tailgate.create({
        ...formData,
        host_id: user?.id,
        host_name: user?.full_name || user?.email?.split('@')[0] || 'Anonymous',
        photo_url: photoUrl,
        capacity: formData.capacity ? parseInt(formData.capacity) : null,
        rsvp_count: 0,
        checklist: [],
      });
    },
    onSuccess: (tailgate) => {
      toast.success(editId ? 'Tailgate updated!' : 'Tailgate created!');
      // Show the saved version right away, and refresh cached lists
      if (tailgate?.id) queryClient.setQueryData(['tailgate', tailgate.id], tailgate);
      queryClient.invalidateQueries({ queryKey: ['tailgate'] });
      queryClient.invalidateQueries({ queryKey: ['tailgates'] });
      navigate(createPageUrl('TailgateDetail') + `?id=${tailgate?.id || editId}`, { replace: !!editId });
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const set = (key) => (e) => setFormData(prev => ({ ...prev, [key]: e.target.value }));
  const setLoc = (key) => (e) => setFormData(prev => ({ ...prev, location: { ...prev.location, [key]: e.target.value } }));
  const hasLocation = formData.location.lat != null && formData.location.lng != null;

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow={editId ? 'Edit Tailgate' : 'Host a Tailgate'}
        title={editId ? formData.name || 'Edit Tailgate' : 'Set Up Your Tent'}
        subtitle="Share your party with others"
        back
      />

      <form
        className="space-y-4 px-4 pt-4"
        onSubmit={(e) => {
          e.preventDefault();
          createMutation.mutate();
        }}
      >
        {/* Photo */}
        <section className="gd-card overflow-hidden">
          {shownPhoto ? (
            <div className="relative">
              <img src={shownPhoto} alt="" className="h-48 w-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent p-3">
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-black/50 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">
                  <Camera className="h-4 w-4" />Change photo
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && setPhotoFile(e.target.files[0])} />
                </label>
                <button
                  type="button"
                  aria-label="Remove photo"
                  onClick={() => { setPhotoFile(null); setExistingPhoto(null); }}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <label className="m-3 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-outline-variant px-4 py-8 text-center transition-colors hover:border-brand/60 dark:border-white/[0.12]">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/15 text-orange-600 dark:text-brand-soft">
                <Camera className="h-6 w-6" />
              </span>
              <span className="font-display text-lg font-bold uppercase text-on-surface">Add a cover photo</span>
              <span className="text-xs text-on-surface-variant">A shot of your setup helps your crew find you</span>
              <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files[0] && setPhotoFile(e.target.files[0])} />
            </label>
          )}
        </section>

        {/* Basic Info */}
        <FormSection icon={Info} title="Basic info">
          <Field label="Tailgate name *" htmlFor="name">
            <input id="name" className="gd-input" placeholder="e.g., The Dawg House" value={formData.name} onChange={set('name')} />
          </Field>

          <div>
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-on-surface-variant" id="type-label">Type</p>
            <div className="flex flex-wrap gap-2" role="group" aria-labelledby="type-label">
              {TAILGATE_TYPES.map(({ value, label, emoji }) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={formData.type === value}
                  onClick={() => setFormData(prev => ({ ...prev, type: value }))}
                  className="gd-chip normal-case"
                >
                  <span aria-hidden="true">{emoji}</span>{label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Description" htmlFor="description">
            <textarea
              id="description"
              className="gd-input h-auto min-h-24 py-3"
              placeholder="Tell people about your tailgate..."
              value={formData.description}
              onChange={set('description')}
            />
          </Field>
        </FormSection>

        {/* Date & Time */}
        <FormSection icon={Clock} title="Date & time">
          <Field label="Game date" htmlFor="date">
            <input id="date" type="date" className="gd-input" value={formData.game_date} onChange={set('game_date')} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start" htmlFor="start">
              <input id="start" type="time" className="gd-input" value={formData.start_time} onChange={set('start_time')} />
            </Field>
            <Field label="End" htmlFor="end">
              <input id="end" type="time" className="gd-input" value={formData.end_time} onChange={set('end_time')} />
            </Field>
          </div>
        </FormSection>

        {/* Location */}
        <FormSection icon={MapPin} title="Location">
          <button
            type="button"
            onClick={getLocation}
            disabled={isGettingLocation}
            className={`flex h-14 w-full items-center justify-center gap-2 rounded-xl border text-[15px] font-semibold transition-colors disabled:opacity-60 ${
              hasLocation
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-brand-win'
                : 'border-brand/50 bg-brand/10 text-orange-700 dark:text-brand-soft'
            }`}
          >
            {isGettingLocation ? <Loader2 className="h-5 w-5 animate-spin" /> : hasLocation ? <CheckCircle2 className="h-5 w-5" /> : <Locate className="h-5 w-5" />}
            {isGettingLocation
              ? 'Getting location...'
              : userLocation
                ? 'Location captured · tap to update'
                : hasLocation
                  ? 'Location set · tap to use current'
                  : 'Use my current location *'}
          </button>

          <Field label="Lot name" htmlFor="lot">
            <input id="lot" className="gd-input" placeholder="e.g., Lot 4B, North Zone" value={formData.location.lot_name} onChange={setLoc('lot_name')} />
          </Field>
          <Field label="Location details" htmlFor="locDesc">
            <input id="locDesc" className="gd-input" placeholder="e.g., Near the big oak tree" value={formData.location.description} onChange={setLoc('description')} />
          </Field>
        </FormSection>

        {/* Amenities */}
        <FormSection icon={PartyPopper} title="What you're bringing">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Amenities">
            {AMENITIES.map(({ value, label, emoji }) => (
              <button
                key={value}
                type="button"
                aria-pressed={formData.amenities.includes(value)}
                onClick={() => toggleAmenity(value)}
                className="gd-chip h-10 px-4 normal-case"
              >
                <span aria-hidden="true" className="text-base">{emoji}</span>{label}
              </button>
            ))}
          </div>
        </FormSection>

        {/* Capacity & Privacy */}
        <FormSection icon={Users} title="Capacity & privacy">
          <Field label="Max capacity (optional)" htmlFor="capacity">
            <input
              id="capacity"
              type="number"
              min="1"
              inputMode="numeric"
              className="gd-input"
              placeholder="Leave empty for unlimited"
              value={formData.capacity}
              onChange={set('capacity')}
            />
          </Field>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface-container-high p-3 dark:bg-surface">
            <div className="flex min-w-0 items-center gap-3">
              {formData.is_public
                ? <Globe className="h-5 w-5 shrink-0 text-emerald-600 dark:text-brand-win" />
                : <Lock className="h-5 w-5 shrink-0 text-amber-600 dark:text-brand-highlight" />}
              <div className="min-w-0">
                <p className="font-semibold text-on-surface">Public listing</p>
                <p className="text-xs text-on-surface-variant">
                  {formData.is_public ? 'Shown in the tailgate directory' : 'Invite only: guests need the passcode'}
                </p>
              </div>
            </div>
            <GdSwitch
              aria-label="Public listing"
              checked={formData.is_public}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_public: checked }))}
            />
          </div>

          {/* Passcode is set when creating (stored hashed; can't be changed here) */}
          {!formData.is_public && !editId && (
            <Field label="Private passcode" htmlFor="password">
              <input id="password" type="text" className="gd-input" placeholder="Password to join" value={formData.password} onChange={set('password')} />
            </Field>
          )}
        </FormSection>

        {/* Submit */}
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="gd-btn-primary flex h-14 w-full items-center justify-center gap-2 rounded-xl font-display text-xl font-bold uppercase disabled:opacity-60"
        >
          {createMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <PartyPopper className="h-5 w-5" />}
          {createMutation.isPending ? (editId ? 'Saving...' : 'Creating...') : (editId ? 'Save Changes' : 'Create Tailgate')}
        </button>

        {/* AI Help Button */}
        <div className="pb-2 text-center">
          <GameDayAssistant
            trigger={
              <button type="button" className="mx-auto flex items-center gap-2 text-sm font-semibold text-orange-600 hover:underline dark:text-brand-soft">
                <Sparkles className="h-4 w-4" />
                Need help planning? Ask AI
              </button>
            }
            defaultPrompt="What should I bring to host a great tailgate for 30 people?"
          />
        </div>
      </form>

      <LoginPrompt
        open={showLoginPrompt}
        onOpenChange={(open) => {
          setShowLoginPrompt(open);
          if (!open && !user) navigate(createPageUrl('Home'));
        }}
        feature="creating tailgates"
      />

      <SafetyButton />
    </div>
  );
}
