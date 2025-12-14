import React, { useState } from 'react';
import { AlertTriangle, Phone, MapPin, Users, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export default function SafetyButton({ onSOS, onCheckIn, className }) {
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
  
  const handleSend = async () => {
    if (!alertType) return;
    setIsSending(true);
    try {
      if (alertType === 'check_in') {
        await onCheckIn?.(message);
      } else {
        await onSOS?.(alertType, message);
      }
      setIsOpen(false);
      setAlertType(null);
      setMessage('');
    } finally {
      setIsSending(false);
    }
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={cn(
          "fixed bottom-24 right-4 z-40 w-14 h-14 rounded-full bg-gradient-to-br from-red-500 to-red-600 text-white shadow-lg flex items-center justify-center hover:scale-110 transition-transform active:scale-95",
          className
        )}
      >
        <AlertTriangle className="w-6 h-6" />
      </button>
      
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