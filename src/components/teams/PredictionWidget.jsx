import React, { useState } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function PredictionWidget({ game, user, onPredict }) {
  const [showDialog, setShowDialog] = useState(false);
  const [prediction, setPrediction] = useState({
    winner: '',
    homeScore: '',
    awayScore: '',
    confidence: 'medium'
  });
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!prediction.winner) {
      toast.error('Please select a winner');
      return;
    }

    setSubmitting(true);
    try {
      await onPredict({
        game_id: game.id,
        home_team: game.home_team || game.opponent,
        away_team: game.away_team || game.opponent,
        predicted_winner: prediction.winner,
        predicted_score_home: prediction.homeScore ? parseInt(prediction.homeScore) : undefined,
        predicted_score_away: prediction.awayScore ? parseInt(prediction.awayScore) : undefined,
        confidence: prediction.confidence,
        game_date: game.date || game.game_date,
        user_email: user.email,
        user_name: user.full_name
      });
      
      toast.success('Prediction saved! 🎯');
      setShowDialog(false);
      setPrediction({ winner: '', homeScore: '', awayScore: '', confidence: 'medium' });
    } catch (error) {
      toast.error('Failed to save prediction');
    } finally {
      setSubmitting(false);
    }
  };

  const homeTeam = game.home_team || game.opponent;
  const awayTeam = game.away_team || game.opponent;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowDialog(true)}
        className="gap-2"
      >
        <Target className="w-4 h-4" />
        Make Prediction
      </Button>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-500" />
              Make Your Prediction
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Game Info */}
            <div className="text-center p-3 bg-slate-50 rounded-lg">
              <p className="text-sm font-semibold text-slate-900">
                {awayTeam} @ {homeTeam}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {game.date || game.game_date} • {game.time || game.game_time}
              </p>
            </div>

            {/* Winner Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Who will win?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setPrediction(p => ({ ...p, winner: awayTeam }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    prediction.winner === awayTeam
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{awayTeam}</p>
                  <p className="text-xs text-slate-600 mt-1">Away</p>
                </button>
                <button
                  onClick={() => setPrediction(p => ({ ...p, winner: homeTeam }))}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    prediction.winner === homeTeam
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <p className="font-semibold text-slate-900">{homeTeam}</p>
                  <p className="text-xs text-slate-600 mt-1">Home</p>
                </button>
              </div>
            </div>

            {/* Score Prediction (Optional) */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Predicted Score (optional)
              </label>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs text-slate-600 mb-1 block">{awayTeam}</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={prediction.awayScore}
                    onChange={(e) => setPrediction(p => ({ ...p, awayScore: e.target.value }))}
                    className="text-center text-2xl font-bold"
                  />
                </div>
                <span className="text-2xl text-slate-400 font-bold">-</span>
                <div className="flex-1">
                  <label className="text-xs text-slate-600 mb-1 block">{homeTeam}</label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={prediction.homeScore}
                    onChange={(e) => setPrediction(p => ({ ...p, homeScore: e.target.value }))}
                    className="text-center text-2xl font-bold"
                  />
                </div>
              </div>
            </div>

            {/* Confidence Level */}
            <div>
              <label className="text-sm font-semibold text-slate-700 mb-2 block">
                Confidence Level
              </label>
              <div className="flex gap-2">
                {['low', 'medium', 'high'].map(level => (
                  <Badge
                    key={level}
                    variant={prediction.confidence === level ? 'default' : 'outline'}
                    className={`flex-1 justify-center cursor-pointer capitalize py-2 ${
                      prediction.confidence === level ? 'bg-orange-500' : ''
                    }`}
                    onClick={() => setPrediction(p => ({ ...p, confidence: level }))}
                  >
                    {level}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Submit */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowDialog(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-orange-500 hover:bg-orange-600"
                onClick={handleSubmit}
                disabled={!prediction.winner || submitting}
              >
                {submitting ? 'Saving...' : 'Submit Prediction'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}