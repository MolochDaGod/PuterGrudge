import { useState, useEffect } from 'react';
import { AIVMDesktop } from '@/components/grudgeos/AIVMDesktop';
import { UserOnboarding } from '@/components/grudgeos/UserOnboarding';

export default function GrudgeStudio() {
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [loaded, setLoaded] = useState(false);
  
  useEffect(() => {
    const hasCompletedOnboarding = localStorage.getItem('grudgeos_onboarding_complete');
    if (!hasCompletedOnboarding) {
      setShowOnboarding(true);
    }
    setLoaded(true);
  }, []);
  
  const handleOnboardingComplete = () => {
    localStorage.setItem('grudgeos_onboarding_complete', 'true');
    setShowOnboarding(false);
  };
  
  if (!loaded) {
    return <div className="h-screen w-screen bg-[#0a0a12]" />;
  }
  
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a12]" data-testid="grudge-studio-page">
      {showOnboarding && (
        <UserOnboarding onComplete={handleOnboardingComplete} />
      )}
      <AIVMDesktop />
    </div>
  );
}
