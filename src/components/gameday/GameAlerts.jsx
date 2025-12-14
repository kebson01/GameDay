import React, { useEffect, useState } from 'react';
import { Bell, X, TrendingUp, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function GameAlerts({ plays = [], gameId }) {
  const [alerts, setAlerts] = useState([]);
  const [lastProcessedPlayId, setLastProcessedPlayId] = useState(null);

  useEffect(() => {
    if (!plays || plays.length === 0) return;

    // Check for new key plays
    const latestPlay = plays[0];
    if (latestPlay?.id !== lastProcessedPlayId && latestPlay?.is_key_play) {
      // Create alert for key moment
      const alertType = latestPlay.is_scoring ? 'scoring' : latestPlay.is_turnover ? 'turnover' : 'big_play';
      
      const newAlert = {
        id: latestPlay.id,
        type: alertType,
        title: latestPlay.is_scoring ? '🎉 TOUCHDOWN!' : latestPlay.is_turnover ? '🔄 TURNOVER!' : '⚡ BIG PLAY!',
        description: latestPlay.description,
        timestamp: new Date().toISOString(),
      };

      setAlerts(prev => [newAlert, ...prev].slice(0, 5));
      setLastProcessedPlayId(latestPlay.id);

      // Show toast notification
      toast(newAlert.title, {
        description: newAlert.description,
        duration: 5000,
      });
    }
  }, [plays, lastProcessedPlayId]);

  const removeAlert = (id) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  };

  return (
    <div className="fixed top-20 right-4 left-4 z-50 pointer-events-none">
      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100 }}
            className="mb-2 pointer-events-auto"
          >
            <div className={`rounded-2xl shadow-lg p-4 ${
              alert.type === 'scoring' 
                ? 'bg-gradient-to-r from-green-500 to-emerald-600' 
                : alert.type === 'turnover'
                ? 'bg-gradient-to-r from-red-500 to-orange-600'
                : 'bg-gradient-to-r from-blue-500 to-purple-600'
            } text-white`}>
              <div className="flex items-start gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {alert.type === 'scoring' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <AlertCircle className="w-5 h-5" />
                    )}
                    <p className="font-bold text-sm">{alert.title}</p>
                  </div>
                  <p className="text-sm text-white/90">{alert.description}</p>
                </div>
                <button
                  onClick={() => removeAlert(alert.id)}
                  className="text-white/80 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}