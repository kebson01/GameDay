import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, X, Send, Loader2, Sparkles, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Smart AI responses - uses built-in knowledge base
// Note: Direct OpenAI API calls require a backend server due to CORS
// For now, we use comprehensive built-in responses
async function getAIResponse(userMessage) {
  // Simulate a brief delay for natural feel
  await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 500));
  return getSmartResponse(userMessage);
}

// Smart response system with comprehensive knowledge base
function getSmartResponse(message) {
  const lowerMessage = message.toLowerCase();
  
  // Parking & Car
  if (lowerMessage.includes('park') || lowerMessage.includes('car') || lowerMessage.includes('lot')) {
    return "🚗 **Parking Tips:**\n\n• Arrive 3-4 hours before kickoff for the best spots\n• Use the 'Find My Car' feature to save your location with a photo\n• Park near a landmark you'll remember\n• Consider paying for reserved parking to reduce stress\n• Keep your keys in a secure pocket\n\nPro tip: Take a photo of your parking spot number AND the surrounding area!";
  }
  
  // Tailgate & Food
  if (lowerMessage.includes('tailgate') || lowerMessage.includes('bring') || lowerMessage.includes('essentials') || lowerMessage.includes('checklist')) {
    return "🎉 **Tailgate Essentials Checklist:**\n\n✅ Grill & propane/charcoal\n✅ Cooler with ice\n✅ Folding chairs & table\n✅ Canopy/tent for shade\n✅ Team flags & decorations\n✅ Plates, cups, utensils\n✅ Trash bags\n✅ Hand sanitizer\n✅ Sunscreen & bug spray\n✅ Phone charger\n✅ Cash for vendors\n\nDon't forget your game tickets!";
  }
  
  // Food specific
  if (lowerMessage.includes('food') || lowerMessage.includes('grill') || lowerMessage.includes('cook') || lowerMessage.includes('eat')) {
    return "🍔 **Game Day Food Ideas:**\n\n**Easy Grilling:**\n• Burgers & hot dogs\n• Brats & sausages\n• Chicken wings\n• Kebabs\n\n**No-Cook Options:**\n• Chips & dips\n• Sandwich platters\n• Veggie trays\n• Cheese boards\n\n**Pro Tips:**\n• Prep marinades the night before\n• Bring extra aluminum foil\n• Pack condiments in a separate bag";
  }
  
  // Weather
  if (lowerMessage.includes('weather') || lowerMessage.includes('rain') || lowerMessage.includes('cold') || lowerMessage.includes('hot') || lowerMessage.includes('sun')) {
    return "☀️ **Weather Prep Guide:**\n\n**Hot/Sunny:**\n• Sunscreen SPF 30+\n• Wide-brim hat\n• Cooling towels\n• Extra water\n\n**Rainy:**\n• Poncho (easier than umbrella)\n• Waterproof bag for phone\n• Extra socks\n\n**Cold:**\n• Layer up!\n• Hand/toe warmers\n• Warm beverages in thermos\n\n🌡️ Rule of thumb: Dress like it's 10° warmer - you'll be moving around!";
  }
  
  // Friends & Groups
  if (lowerMessage.includes('friend') || lowerMessage.includes('group') || lowerMessage.includes('meet') || lowerMessage.includes('lost')) {
    return "👥 **Finding Your Friends:**\n\n1. Use the 'Find Friends' feature to share locations\n2. Create a group before game day\n3. Set a meeting spot with a landmark\n4. Exchange phone numbers as backup\n5. Agree on a 'lost friend' meeting point\n\n📍 **Pro Tips:**\n• Screenshot your meeting spot\n• Charge phones fully before leaving\n• Consider walkie-talkies for large crowds";
  }
  
  // Safety
  if (lowerMessage.includes('safe') || lowerMessage.includes('emergency') || lowerMessage.includes('security') || lowerMessage.includes('first aid')) {
    return "🛡️ **Safety Tips:**\n\n• Know where first aid stations are located\n• Stay hydrated - drink water regularly\n• Use the buddy system\n• Keep valuables hidden\n• Know your stadium's security number\n\n🆘 **In Emergency:**\n• Text/call 911\n• Find nearest security guard\n• Go to a first aid station\n• Use the app's SOS feature\n\nStay aware of your surroundings!";
  }
  
  // Drinks & Alcohol
  if (lowerMessage.includes('drink') || lowerMessage.includes('alcohol') || lowerMessage.includes('beer') || lowerMessage.includes('water')) {
    return "🍺 **Drinks & Hydration:**\n\n**If Drinking:**\n• Designate a driver or plan rideshare\n• Alternate with water\n• Eat food throughout\n• Know stadium alcohol cutoff times\n\n**Stay Hydrated:**\n• Bring extra water bottles\n• Empty bottles allowed through security\n• Most stadiums have water fountains\n\n⚠️ Most stadiums stop alcohol sales at end of 3rd quarter.";
  }
  
  // Schedule & Games
  if (lowerMessage.includes('game') || lowerMessage.includes('schedule') || lowerMessage.includes('score') || lowerMessage.includes('time')) {
    return "🏈 **Game Day Info:**\n\nCheck the 'Game Day Live' section for:\n• Live scores and updates\n• Game schedules\n• TV broadcast info\n\n📺 **Before the Game:**\n• Know your gate number\n• Arrive 30 min before kickoff\n• Check bag policy\n\nUse the 'This Week' view to see all upcoming games!";
  }
  
  // Teams
  if (lowerMessage.includes('team') || lowerMessage.includes('follow') || lowerMessage.includes('favorite')) {
    return "🏆 **Following Teams:**\n\n1. Go to 'My Teams' section\n2. Tap '+' to add teams\n3. Search by name or conference\n\n**Benefits:**\n• Get schedule updates\n• See team news\n• Quick access to game info\n\nYou can follow multiple teams!";
  }
  
  // Greetings
  if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey') || lowerMessage.includes('help')) {
    return "👋 Hey there, fan! I'm your GameDay Assistant!\n\n**I can help with:**\n• 🚗 Parking tips\n• 🍔 Tailgate planning\n• 👥 Finding friends\n• ☀️ Weather prep\n• 🛡️ Safety tips\n• 🏈 Game schedules\n\nJust ask me anything about your game day experience!";
  }
  
  // Thanks
  if (lowerMessage.includes('thank') || lowerMessage.includes('thanks') || lowerMessage.includes('awesome') || lowerMessage.includes('great')) {
    return "🎉 You're welcome! Have an amazing game day! 🏈\n\nRemember:\n• Stay hydrated\n• Stick with your group\n• Cheer loud!\n\nGo team! 📣";
  }
  
  // Default response
  return "🏈 Great question! I'm here to help with:\n\n• **Parking** - Finding & remembering your spot\n• **Tailgating** - Food, gear, and setup tips\n• **Friends** - Meeting up and staying connected\n• **Weather** - What to wear and bring\n• **Safety** - Staying safe and having fun\n• **Games** - Scores, schedules, and teams\n\nWhat would you like to know more about?";
}

const quickPrompts = [
  "What should I bring to a tailgate?",
  "Best parking tips?",
  "How do I find my friends?",
  "Game day safety tips",
];

export default function GameDayAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { 
      text: "Hey there! 🏈 I'm your GameDay Assistant. Ask me anything about tailgating, parking, finding friends, or making your game day experience amazing!", 
      isUser: false 
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { text: userMessage, isUser: true }]);
    setIsLoading(true);

    try {
      const response = await getAIResponse(userMessage);
      setMessages(prev => [...prev, { text: response, isUser: false }]);
    } catch (error) {
      setMessages(prev => [...prev, { 
        text: "Oops! I had trouble with that. Try asking again!", 
        isUser: false 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPrompt = (prompt) => {
    setInput(prompt);
    setTimeout(() => handleSend(), 100);
  };

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            onClick={() => setIsOpen(true)}
            aria-label="Ask the GameDay AI assistant"
            className="fixed bottom-[10.5rem] right-4 z-40 h-11 px-4 rounded-full flex items-center gap-1.5 bg-surface-container/95 backdrop-blur border border-orange-500/50 text-orange-600 dark:text-brand-soft font-display text-lg font-bold uppercase tracking-wide shadow-[0_0_18px_-4px_rgb(var(--gd-brand)/0.55)]"
          >
            {/* Pill sits above the SOS button (bottom-24) so it never covers it */}
            <Sparkles className="w-5 h-5" />
            Ask AI
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Panel - Full screen overlay */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/50 z-[60]"
            />
            
            {/* Chat Window */}
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="fixed left-4 right-4 bottom-4 top-[20%] z-[70] bg-surface-container rounded-2xl shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-surface-container">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">GameDay Assistant</h3>
                    <p className="text-xs text-slate-500">Powered by AI</p>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              {/* Messages - Scrollable area */}
              <div className="flex-1 overflow-y-auto p-4 bg-slate-50" ref={scrollRef}>
                <div className="space-y-4">
                  {messages.map((msg, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                        msg.isUser 
                          ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white' 
                          : 'bg-surface-container text-slate-900 shadow-sm border border-slate-100'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </motion.div>
                  ))}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-surface-container rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Quick Prompts */}
                {messages.length === 1 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs text-slate-500 font-medium">Try asking:</p>
                    <div className="flex flex-wrap gap-2">
                      {quickPrompts.map((prompt, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuickPrompt(prompt)}
                          className="text-xs bg-surface-container text-orange-700 px-3 py-1.5 rounded-full hover:bg-orange-50 transition-colors border border-orange-200"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Input - Fixed at bottom */}
              <div className="p-4 bg-surface-container border-t">
                <div className="flex gap-2">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-base"
                    disabled={isLoading}
                    autoComplete="off"
                  />
                  <Button 
                    type="button"
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 px-4 h-12"
                  >
                    <Send className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
