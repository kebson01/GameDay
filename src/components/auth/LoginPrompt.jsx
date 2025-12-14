// This component is deprecated - use AuthModal instead
// Kept for backwards compatibility, redirects to AuthModal

import React, { useEffect } from 'react';
import AuthModal from './AuthModal';

export default function LoginPrompt({ open, onOpenChange, feature = 'this feature', onSuccess }) {
  // Just render AuthModal with the same props
  return (
    <AuthModal
      open={open}
      onOpenChange={onOpenChange}
      feature={feature}
      onSuccess={onSuccess}
    />
  );
}
