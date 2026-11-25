import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { createPageUrl } from '@/utils';
import AppHeader from '@/components/layout/AppHeader';
import TeamFeed from '@/components/teams/TeamFeed';

export default function TeamSocial() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const urlParams = new URLSearchParams(window.location.search);
  const teamName = urlParams.get('team');

  useEffect(() => {
    client.auth.me()
      .then(setUser)
      .catch(() => navigate(createPageUrl('Home')));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (!user || !teamName) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="gd-page">
      <AppHeader
        eyebrow="Fan Feed"
        title={teamName}
        subtitle="Connect with fellow supporters"
        back="MyTeams"
      />

      <main className="space-y-4 px-4 pt-4">
        <TeamFeed teamName={teamName} user={user} />
      </main>
    </div>
  );
}
