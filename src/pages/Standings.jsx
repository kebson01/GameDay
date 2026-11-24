import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { client } from '@/api/client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import SafetyButton from '@/components/common/SafetyButton';
import { getCurrentSeason } from '@/lib/sportsApi';

const CONFERENCES = [
  { id: 'all', name: 'All Teams' },
  { id: 'SEC', name: 'SEC' },
  { id: 'Big Ten', name: 'Big Ten' },
  { id: 'ACC', name: 'ACC' },
  { id: 'Big 12', name: 'Big 12' },
  { id: 'American', name: 'American' },
  { id: 'Mountain West', name: 'Mountain West' },
  { id: 'MAC', name: 'MAC' },
  { id: 'Sun Belt', name: 'Sun Belt' },
  { id: 'Conference USA', name: 'C-USA' },
];

export default function Standings() {
  const navigate = useNavigate();
  const [selectedConference, setSelectedConference] = useState('all');
  
  const { data, isLoading } = useQuery({
    queryKey: ['standings', selectedConference],
    queryFn: async () => {
      const response = await client.functions.invoke('fetchStandings', { 
        conference: selectedConference === 'all' ? null : selectedConference 
      });
      return response.data;
    },
  });
  
  // Group standings by conference
  const groupedStandings = {};
  if (data?.standings) {
    data.standings.forEach(team => {
      if (!groupedStandings[team.conference]) {
        groupedStandings[team.conference] = [];
      }
      groupedStandings[team.conference].push(team);
    });
    
    // Sort teams within each conference by win percentage
    Object.keys(groupedStandings).forEach(conf => {
      groupedStandings[conf].sort((a, b) => b.win_percentage - a.win_percentage);
    });
  }
  
  const conferences = selectedConference === 'all' 
    ? Object.keys(groupedStandings).sort()
    : [selectedConference];
  
  return (
    <div className="gd-page">
      {/* Header */}
      <div className="gd-header px-4 pt-6 pb-4">
        <div className="flex items-center gap-3">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/20"
            onClick={() => navigate(createPageUrl('Home'))}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">College Football Standings</h1>
            <p className="text-white/80 text-sm">{getCurrentSeason()} Season</p>
          </div>
        </div>
      </div>
      
      {/* Conference Selector */}
      <div className="bg-surface-container border-b border-gray-200 px-4 py-3 overflow-x-auto">
        <div className="flex gap-2">
          {CONFERENCES.map(conf => (
            <Button
              key={conf.id}
              variant={selectedConference === conf.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedConference(conf.id)}
              className={selectedConference === conf.id ? 'bg-orange-500 hover:bg-orange-600' : ''}
            >
              {conf.name}
            </Button>
          ))}
        </div>
      </div>
      
      {/* Standings */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {conferences.map(conf => (
              <div key={conf} className="bg-surface-container rounded-2xl shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-ink-800 to-ink-700 text-white px-4 py-3 flex items-center justify-between">
                  <h2 className="font-bold text-lg">{conf}</h2>
                  <Trophy className="w-5 h-5 text-yellow-400" />
                </div>
                
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                  <div className="col-span-1">#</div>
                  <div className="col-span-5">Team</div>
                  <div className="col-span-2 text-center">Overall</div>
                  <div className="col-span-2 text-center">Conf</div>
                  <div className="col-span-2 text-center">Win %</div>
                </div>
                
                {/* Teams */}
                <div>
                  {groupedStandings[conf]?.map((team, idx) => (
                    <div 
                      key={idx}
                      className="grid grid-cols-12 gap-2 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 transition-colors"
                    >
                      <div className="col-span-1 flex items-center">
                        <span className="font-bold text-slate-700">{idx + 1}</span>
                      </div>
                      <div className="col-span-5 flex items-center">
                        <span className="font-semibold text-slate-900">{team.team_name}</span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-sm">
                          <span className="font-bold text-green-600">{team.wins}</span>
                          <span className="text-slate-400 mx-0.5">-</span>
                          <span className="font-bold text-red-600">{team.losses}</span>
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <span className="text-sm text-slate-600">
                          {team.conference_wins}-{team.conference_losses}
                        </span>
                      </div>
                      <div className="col-span-2 flex items-center justify-center">
                        <Badge 
                          variant="outline" 
                          className={`font-mono text-xs ${
                            team.win_percentage >= 0.7 ? 'bg-green-50 text-green-700 border-green-200' : 
                            team.win_percentage >= 0.5 ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                            'bg-slate-50 text-slate-600 border-slate-200'
                          }`}
                        >
                          {(team.win_percentage * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      <SafetyButton />
    </div>
  );
}