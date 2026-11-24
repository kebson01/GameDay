import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MapPin, Users, Car, PartyPopper, Shield, ChevronRight, 
  ChevronLeft, Sparkles, Check
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const ONBOARDING_KEY = 'gameday_onboarding_complete';

const slides = [
  {
    id: 1,
    icon: PartyPopper,
    title: "Welcome to GameDay! 🏈",
    description: "Your ultimate companion for college football game days. Let's show you around!",
    color: "from-orange-500 to-red-600",
    features: []
  },
  {
    id: 2,
    icon: Users,
    title: "Find Your Friends",
    description: "Create or join a group, share your location in real-time, and never lose track of your crew.",
    color: "from-blue-500 to-purple-600",
    features: [
      "Real-time location sharing",
      "Create private groups",
      "Navigate to friends instantly"
    ]
  },
  {
    id: 3,
    icon: Car,
    title: "Never Lose Your Car",
    description: "Drop a pin when you park and find your car easily after the game. Add photos and notes!",
    color: "from-emerald-500 to-teal-600",
    features: [
      "One-tap parking save",
      "Photo & notes support",
      "Works offline too"
    ]
  },
  {
    id: 4,
    icon: MapPin,
    title: "Discover Tailgates",
    description: "Find public tailgates near you or create your own. Connect with fellow fans!",
    color: "from-pink-500 to-rose-600",
    features: [
      "Browse nearby tailgates",
      "RSVP and join events",
      "Host your own party"
    ]
  },
  {
    id: 5,
    icon: Shield,
    title: "Stay Safe",
    description: "Quick access to safety features. Send an SOS, check in with your group, or request a ride.",
    color: "from-amber-500 to-orange-600",
    features: [
      "Emergency SOS button",
      "Quick check-ins",
      "Ride request feature"
    ]
  }
];

export default function OnboardingFlow({ onComplete }) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [direction, setDirection] = useState(1);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setDirection(1);
      setCurrentSlide(prev => prev + 1);
    } else {
      completeOnboarding();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setDirection(-1);
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    onComplete?.();
  };

  const slide = slides[currentSlide];
  const Icon = slide.icon;
  const isLastSlide = currentSlide === slides.length - 1;

  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0
    })
  };

  return (
    <div className="fixed inset-0 z-50 bg-ink-900">
      <div className="h-full flex flex-col">
        {/* Skip Button */}
        <div className="p-4 flex justify-end">
          <Button 
            variant="ghost" 
            className="text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleSkip}
          >
            Skip
          </Button>
        </div>

        {/* Slide Content */}
        <div className="flex-1 flex items-center justify-center px-6 pb-8">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={currentSlide}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-sm text-center"
            >
              {/* Icon */}
              <div className={`w-24 h-24 mx-auto mb-8 rounded-3xl bg-gradient-to-br ${slide.color} flex items-center justify-center shadow-2xl`}>
                <Icon className="w-12 h-12 text-white" />
              </div>

              {/* Title */}
              <h1 className="text-3xl font-bold text-white mb-4">
                {slide.title}
              </h1>

              {/* Description */}
              <p className="text-lg text-white/80 mb-8">
                {slide.description}
              </p>

              {/* Features */}
              {slide.features.length > 0 && (
                <div className="space-y-3 text-left bg-white/10 rounded-2xl p-4 backdrop-blur">
                  {slide.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-white/90">
                      <div className={`w-6 h-6 rounded-full bg-gradient-to-br ${slide.color} flex items-center justify-center`}>
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm">{feature}</span>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center gap-2 mb-6">
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                setDirection(idx > currentSlide ? 1 : -1);
                setCurrentSlide(idx);
              }}
              className={`w-2 h-2 rounded-full transition-all ${
                idx === currentSlide 
                  ? 'w-8 bg-surface-container' 
                  : 'bg-white/30 hover:bg-white/50'
              }`}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="px-6 pb-8 flex gap-3">
          {currentSlide > 0 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="flex-1 h-14 border-white/30 text-white hover:bg-white/10"
            >
              <ChevronLeft className="w-5 h-5 mr-2" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className={`flex-1 h-14 bg-gradient-to-r ${slide.color} hover:opacity-90 text-white font-semibold`}
          >
            {isLastSlide ? (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Get Started
              </>
            ) : (
              <>
                Next
                <ChevronRight className="w-5 h-5 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// Hook to check if onboarding should be shown
export function useOnboarding() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem(ONBOARDING_KEY);
    setShowOnboarding(!hasCompletedOnboarding);
    setIsChecking(false);
  }, []);

  const completeOnboarding = () => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setShowOnboarding(false);
  };

  const resetOnboarding = () => {
    localStorage.removeItem(ONBOARDING_KEY);
    setShowOnboarding(true);
  };

  return { showOnboarding, isChecking, completeOnboarding, resetOnboarding };
}


