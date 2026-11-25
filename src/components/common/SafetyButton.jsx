import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, Users, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Safety tools (Call 911, SOS, I'm Lost, Need Ride, Check In).
 * variant="header": compact red shield button for the top-right of a screen
 * header, away from the thumb zone so it isn't tapped by accident.
 * variant="overlay": same, styled for dark photo headers.
 * The old floating "SOS" bubble is retired: without a variant this renders
 * nothing, so leftover <SafetyButton /> usages are harmless.
 */
export default function SafetyButton({ onSOS, onCheckIn, className, variant }) {
  const [isOpen, setIsOpen] = useState(false);
  const [alertType, setAlertType] = useState(null);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  const alertTypes = [
    { type: 'sos', icon: AlertTriangle, label: 'Emergency SOS', color: 'bg-red-500 hover:bg-red-600', desc: 'Alert your group immediately' },
    { type: 'lost', icon: MapPin, label: 'I\'m Lost', color: 'bg-yellow-500 hover:bg-yellow-600', desc: 'Share location with group' },
    { type: 'ride_needed', icon: Phone, label: 'Need Ride', color: 'bg-blue-500 hover:bg-blue-600', desc: 'Request pickup from group' },
    { type: 'check_in', icon: Users, label: 'Check In', color: 'bg-green-500 hover:bg-green-600', desc: 'Let everyone know you\'re safe' },
  ];
  
  // Default behavior when a page doesn't pass onSOS/onCheckIn (no page does today).
  // Without a backend we can't push to the group, so hand the alert, with a map
  // link to the user's location, to the phone's share sheet / SMS app.
  const getLocation = () => new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
    );
  });

  const defaultSend = async (type, note) => {
    const label = alertTypes.find(a => a.type === type)?.label || 'Alert';
    const loc = await getLocation();
    const text = [
      `${type === 'sos' ? '🚨 ' : ''}GameDay ${label}`,
      note?.trim(),
      loc ? `My location: https://maps.google.com/?q=${loc.lat.toFixed(6)},${loc.lng.toFixed(6)}` : null,
    ].filter(Boolean).join('\n');

    if (navigator.share) {
      try {
        await navigator.share({ title: `GameDay ${label}`, text });
        toast.success('Alert shared');
        return;
      } catch (err) {
        if (err?.name === 'AbortError') throw err; // user cancelled the share sheet
      }
    }
    if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      window.location.href = `sms:?&body=${encodeURIComponent(text)}`;
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Alert copied. Paste it into a message to your group.');
    } catch {
      toast.error('Could not share automatically. Message your group directly.');
    }
  };

  const handleSend = async () => {
    if (!alertType) return;
    setIsSending(true);
    try {
      if (alertType === 'check_in' && onCheckIn) {
        await onCheckIn(message);
      } else if (alertType !== 'check_in' && onSOS) {
        await onSOS(alertType, message);
      } else {
        await defaultSend(alertType, message);
      }
      setIsOpen(false);
      setAlertType(null);
      setMessage('');
    } catch (err) {
      if (err?.name !== 'AbortError') toast.error('Could not send alert');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <>
      {variant && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          aria-label="Safety tools and SOS"
          title="Safety & SOS"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-full transition-colors',
            variant === 'overlay'
              ? 'rounded-xl bg-black/45 text-red-300 backdrop-blur hover:text-red-200'
              : 'text-red-600 hover:bg-red-500/10 dark:text-red-400',
            className
          )}
        >
          <ShieldAlert className="h-[22px] w-[22px]" strokeWidth={2.2} />
        </button>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Safety Tools
            </DialogTitle>
            <DialogDescription>
              Select an option to alert your group
            </DialogDescription>
          </DialogHeader>
          
          <a
            href="tel:911"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            <Phone className="w-5 h-5" />
            Call 911
          </a>

          {!alertType ? (
            <div className="grid grid-cols-2 gap-3 py-4">
              {alertTypes.map(({ type, icon: Icon, label, color, desc }) => (
                <button
                  key={type}
                  onClick={() => setAlertType(type)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl text-white transition-all hover:scale-105",
                    color
                  )}
                >
                  <Icon className="w-8 h-8" />
                  <span className="font-semibold text-sm">{label}</span>
                  <span className="text-xs text-white/80 text-center">{desc}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-4 space-y-4">
              <div className={cn(
                "flex items-center gap-3 p-3 rounded-xl text-white",
                alertTypes.find(a => a.type === alertType)?.color
              )}>
                {React.createElement(alertTypes.find(a => a.type === alertType)?.icon, { className: "w-6 h-6" })}
                <span className="font-semibold">{alertTypes.find(a => a.type === alertType)?.label}</span>
              </div>
              
              <Textarea
                placeholder="Add a message (optional)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-24"
              />
              
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  className="flex-1"
                  onClick={() => setAlertType(null)}
                >
                  Back
                </Button>
                <Button 
                  className={cn("flex-1", alertTypes.find(a => a.type === alertType)?.color)}
                  onClick={handleSend}
                  disabled={isSending}
                >
                  {isSending ? 'Sending...' : 'Send Alert'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}