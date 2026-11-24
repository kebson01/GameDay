import './App.css'
import { useState, useEffect } from 'react'
import Pages from "@/pages/index.jsx"
import { Toaster } from "@/components/ui/toaster"
import ErrorBoundary from "@/components/ErrorBoundary"
import OnboardingFlow, { useOnboarding } from "@/components/onboarding/OnboardingFlow"

function App() {
  const { showOnboarding, isChecking, completeOnboarding } = useOnboarding();

  // Don't render anything while checking onboarding status
  if (isChecking) {
    return (
      <div className="min-h-screen bg-ink-900 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      {showOnboarding && (
        <OnboardingFlow onComplete={completeOnboarding} />
      )}
      {!showOnboarding && (
    <>
      <Pages />
      <Toaster />
    </>
      )}
    </ErrorBoundary>
  )
}

export default App 
