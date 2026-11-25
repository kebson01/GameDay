import React, { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Send, Trash2, Lock } from 'lucide-react';
import { format } from 'date-fns';
import { TailgateMessage } from '@/lib/cloudEntities';
import { toast } from 'sonner';

/** Realtime chat for a tailgate's host and RSVP'd guests */
export default function CrewChat({ tailgateId, isCrew, isHost }) {
  const queryClient = useQueryClient();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [live, setLive] = useState(false);
  const listRef = useRef(null);
  const key = ['tailgate-chat', tailgateId];

  const { data: messages = [], isLoading } = useQuery({
    queryKey: key,
    queryFn: () => TailgateMessage.list(tailgateId),
    enabled: isCrew,
    refetchInterval: isCrew && !live ? 15000 : false,
  });

  useEffect(() => {
    if (!isCrew) return undefined;
    return TailgateMessage.subscribe(tailgateId, () => queryClient.invalidateQueries({ queryKey: key }), setLive);
  }, [tailgateId, isCrew]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages.length]);

  const send = async () => {
    const content = text.trim();
    if (!content) return;
    setSending(true);
    try {
      await TailgateMessage.send(tailgateId, content);
      setText('');
      queryClient.invalidateQueries({ queryKey: key });
    } catch (e) {
      toast.error(e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="gd-card overflow-hidden" aria-labelledby="crew-chat">
      <div className="flex items-center justify-between border-b border-outline-variant/60 px-4 py-3 dark:border-white/[0.06]">
        <h2 id="crew-chat" className="flex items-center gap-2 font-display text-lg font-bold uppercase text-on-surface">
          <MessageSquare className="h-5 w-5 text-orange-500" />Crew chat
        </h2>
        {isCrew && (
          <span className={`flex items-center gap-1.5 text-xs font-semibold ${live ? 'text-emerald-600 dark:text-brand-win' : 'text-on-surface-variant'}`}>
            <span className={`h-2 w-2 rounded-full ${live ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`} />{live ? 'Live' : 'Connecting…'}
          </span>
        )}
      </div>

      {!isCrew ? (
        <div className="flex items-center gap-3 px-4 py-5 text-sm text-on-surface-variant">
          <Lock className="h-5 w-5 shrink-0" />
          RSVP to join this tailgate's crew chat: plan the food run, find each other, share updates.
        </div>
      ) : (
        <>
          <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto px-4 py-3" aria-live="polite">
            {isLoading ? (
              <p className="py-4 text-center text-sm text-on-surface-variant">Loading messages…</p>
            ) : messages.length === 0 ? (
              <p className="py-4 text-center text-sm text-on-surface-variant">No messages yet. Say hi to the crew 👋</p>
            ) : messages.map(m => (
              <div key={m.id} className={`flex items-end gap-2 ${m.is_own ? 'flex-row-reverse' : ''}`}>
                {!m.is_own && (
                  m.user_avatar
                    ? <img src={m.user_avatar} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full object-cover" />
                    : <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface-container-high text-xs font-bold text-on-surface">{m.user_name?.charAt(0) || '?'}</span>
                )}
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 ${m.is_own ? 'rounded-br-md bg-brand text-white' : 'rounded-bl-md bg-surface-container-high text-on-surface'}`}>
                  {!m.is_own && <p className="text-[11px] font-bold text-orange-600 dark:text-brand-soft">{m.user_name || 'Fan'}</p>}
                  <p className="whitespace-pre-wrap break-words text-sm">{m.content}</p>
                  <p className={`mt-0.5 text-right text-[10px] ${m.is_own ? 'text-white/75' : 'text-on-surface-variant'}`}>{format(new Date(m.created_date), 'h:mm a')}</p>
                </div>
                {(m.is_own || isHost) && (
                  <button
                    type="button"
                    aria-label="Delete message"
                    className="p-1 text-on-surface-variant hover:text-red-500"
                    onClick={async () => {
                      try { await TailgateMessage.delete(m.id); queryClient.invalidateQueries({ queryKey: key }); }
                      catch (e) { toast.error(e.message); }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          <form
            className="flex gap-2 border-t border-outline-variant/60 p-3 dark:border-white/[0.06]"
            onSubmit={(e) => { e.preventDefault(); send(); }}
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={500}
              placeholder="Message the tailgate crew…"
              className="gd-input h-11 flex-1"
              aria-label="Message"
            />
            <button type="submit" disabled={sending || !text.trim()} aria-label="Send"
              className="gd-btn-primary flex h-11 w-11 items-center justify-center rounded-xl disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          </form>
        </>
      )}
    </section>
  );
}
