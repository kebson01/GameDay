import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
  }, []);

  if (!user || !teamName) {
    return (
      <div className="gd-page flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('MyTeams'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{teamName} Fans</h1>
            <p className="text-white/80 text-sm">Connect with fellow supporters</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4">
        <TeamFeed teamName={teamName} user={user} />
      </div>
    </div>
  );
}