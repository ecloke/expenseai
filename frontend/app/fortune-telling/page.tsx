'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Calendar, Clock, MapPin, Star, Zap, ChevronLeft, ChevronRight, ChevronUp, ChevronDown } from 'lucide-react';
import { apiClient } from '@/lib/apiClient';

interface FortuneReading {
  personality: string;
  career: string;
  wealth: string;
  relationships: string;
  health: string;
  lifePeriods: string;
  advice: string;
}

interface FortuneUsage {
  count: number;
  date: string;
}

export default function FortuneTelling() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({
    birthDate: '',
    birthTime: '',
    birthPlace: '',
    gender: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [fortune, setFortune] = useState<FortuneReading | null>(null);
  const [error, setError] = useState('');
  const [dailyUsage, setDailyUsage] = useState<FortuneUsage>({ count: 0, date: '' });

  // Check authentication and load user
  useEffect(() => {
    loadUserData();
  }, []);

  // Check daily usage on component mount
  useEffect(() => {
    if (user) {
      checkDailyUsage();
    }
  }, [user]);

  const loadUserData = async () => {
    try {
      const supabase = createSupabaseClient();
      
      // Get current session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.log('❌ No active session, redirecting to login');
        router.push('/login');
        return;
      }

      setUser(session.user);
    } catch (error) {
      console.error('Error loading user data:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const checkDailyUsage = () => {
    const today = new Date().toLocaleDateString();
    const saved = localStorage.getItem('fortune-usage');
    
    if (saved) {
      const usage = JSON.parse(saved);
      if (usage.date === today) {
        setDailyUsage(usage);
      } else {
        // Reset for new day
        const newUsage = { count: 0, date: today };
        localStorage.setItem('fortune-usage', JSON.stringify(newUsage));
        setDailyUsage(newUsage);
      }
    } else {
      const newUsage = { count: 0, date: today };
      localStorage.setItem('fortune-usage', JSON.stringify(newUsage));
      setDailyUsage(newUsage);
    }
  };

  const updateDailyUsage = () => {
    const newUsage = { count: dailyUsage.count + 1, date: dailyUsage.date };
    localStorage.setItem('fortune-usage', JSON.stringify(newUsage));
    setDailyUsage(newUsage);
  };

  const canUseFortuneTelling = dailyUsage.count < 2;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canUseFortuneTelling) {
      setError('You have reached your daily limit of 2 fortune readings. Please try again tomorrow.');
      return;
    }

    if (!user?.id) {
      setError('You must be logged in to use fortune telling.');
      return;
    }

    if (!formData.gender) {
      setError('Please select your gender for accurate Zi Wei Dou Shu reading.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/fortune/tell-fortune', {
        userId: user.id,
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        birthPlace: formData.birthPlace,
        gender: formData.gender
      });

      if (response.success) {
        setFortune(response.fortune);
        updateDailyUsage();
      } else {
        setError(response.error || 'Failed to generate fortune reading');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating your fortune');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTryAgain = () => {
    setFortune(null);
    setError('');
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 pt-16 lg:pt-0">
          <div className="min-h-screen flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
              <p className="text-yellow-200">Loading fortune teller...</p>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pt-16 lg:pt-0">
        {/* Oriental Theme Styling */}
        <style jsx global>{`
          @keyframes gradient {
            0%, 100% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
          }
          @keyframes shimmer {
            0% { transform: translateX(-100%) skewX(-12deg); }
            100% { transform: translateX(200%) skewX(-12deg); }
          }
        `}</style>

        {/* Main Content */}
        <div className="bg-gradient-to-br from-red-900 via-red-800 to-yellow-900 -m-4 sm:-m-6 lg:-m-8 p-4 sm:p-6 lg:p-8 min-h-screen relative">
          {/* Enhanced Oriental Background Elements */}
          <div className="absolute inset-0 opacity-15 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 animate-pulse blur-sm pointer-events-none"></div>
            <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-yellow-500 animate-pulse delay-1000 blur-sm pointer-events-none"></div>
            <div className="absolute bottom-20 left-1/4 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-red-400 animate-pulse delay-2000 blur-sm pointer-events-none"></div>
            <div className="absolute bottom-40 right-1/3 w-28 h-28 rounded-full bg-gradient-to-br from-red-300 to-yellow-400 animate-pulse delay-3000 blur-sm pointer-events-none"></div>
            
            {/* Additional mystical orbs */}
            <div className="absolute top-1/2 left-5 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-red-600 animate-pulse delay-500 blur-sm pointer-events-none"></div>
            <div className="absolute top-1/4 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-yellow-600 animate-pulse delay-1500 blur-sm pointer-events-none"></div>
          </div>

          {/* Floating Mystical Elements with Enhanced Animation */}
          <div className="absolute top-20 right-10 text-yellow-400 opacity-30 animate-bounce pointer-events-none">
            <Zap className="h-16 w-16 drop-shadow-lg" />
          </div>
          <div className="absolute bottom-32 left-16 text-red-400 opacity-30 animate-bounce delay-2000 pointer-events-none">
            <Sparkles className="h-12 w-12 drop-shadow-lg" />
          </div>
          <div className="absolute top-32 left-1/2 text-yellow-300 opacity-25 animate-spin pointer-events-none" style={{ animationDuration: '8s' }}>
            <Star className="h-10 w-10 drop-shadow-lg" />
          </div>
          <div className="absolute bottom-1/4 right-1/4 text-red-300 opacity-25 animate-spin pointer-events-none" style={{ animationDuration: '12s' }}>
            <Sparkles className="h-8 w-8 drop-shadow-lg" />
          </div>

          {/* Mystical particles */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className={`absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping pointer-events-none`}
                style={{
                  top: `${Math.random() * 100}%`,
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>

          {/* Header */}
          <div className="text-center mb-12 pt-8 relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold text-yellow-300 mb-4 font-serif tracking-wide">
              <Sparkles className="inline h-8 w-8 md:h-10 md:w-10 mr-3 text-yellow-400" />
              东方占卜
              <Sparkles className="inline h-8 w-8 md:h-10 md:w-10 ml-3 text-yellow-400" />
            </h1>
            <h2 className="text-2xl md:text-3xl font-semibold text-red-200 mb-2 font-serif">
              Oriental Fortune Telling
            </h2>
            <p className="text-yellow-200 text-lg max-w-2xl mx-auto leading-relaxed">
              Unlock the mysteries of your destiny through ancient Eastern wisdom. 
              Discover your path through the harmony of time, place, and cosmic energy.
            </p>
            
            {/* Daily Usage Display */}
            <div className="mt-4 inline-flex items-center gap-2 bg-red-800/50 px-4 py-2 rounded-full border border-yellow-400/30">
              <Star className="h-4 w-4 text-yellow-400" />
              <span className="text-yellow-200 text-sm">
                Daily Readings: {dailyUsage.count}/2
              </span>
            </div>
          </div>

          {!fortune ? (
            <Card className="max-w-2xl mx-auto bg-gradient-to-br from-red-800/90 to-yellow-800/70 border-2 border-yellow-400/70 shadow-2xl backdrop-blur-sm relative z-10">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-yellow-300 font-serif flex items-center justify-center gap-3">
                  <Calendar className="h-6 w-6" />
                  Your Birth Details
                </CardTitle>
                <CardDescription className="text-red-200">
                  Enter your birth information to reveal your cosmic blueprint
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-8 p-8">
                <form onSubmit={handleSubmit} className="space-y-8">
                  {/* Birth Date */}
                  <div className="space-y-4">
                    <Label className="text-yellow-300 font-medium flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5" />
                      诞生之日 • Date of Birth
                    </Label>
                    <div className="relative">
                      <Input
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        required
                        className="bg-gradient-to-r from-red-900/60 to-yellow-900/40 border-2 border-yellow-500/50 text-yellow-100 text-lg p-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 placeholder:text-red-300/70 rounded-xl"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/10 to-red-400/10 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Birth Time */}
                  <div className="space-y-4">
                    <Label className="text-yellow-300 font-medium flex items-center gap-2 text-lg">
                      <Clock className="h-5 w-5" />
                      时辰 • Time of Birth
                    </Label>
                    <div className="relative">
                      <Input
                        type="time"
                        value={formData.birthTime}
                        onChange={(e) => handleInputChange('birthTime', e.target.value)}
                        required
                        className="bg-gradient-to-r from-red-900/60 to-yellow-900/40 border-2 border-yellow-500/50 text-yellow-100 text-lg p-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 placeholder:text-red-300/70 rounded-xl"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/10 to-red-400/10 pointer-events-none"></div>
                    </div>
                  </div>

                  {/* Birth Place */}
                  <div className="space-y-4">
                    <Label className="text-yellow-300 font-medium flex items-center gap-2 text-lg">
                      <MapPin className="h-5 w-5" />
                      诞生之地 • Place of Birth
                    </Label>
                    <div className="relative">
                      <Input
                        type="text"
                        placeholder="Enter your birth city and country..."
                        value={formData.birthPlace}
                        onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                        required
                        className="bg-gradient-to-r from-red-900/60 to-yellow-900/40 border-2 border-yellow-500/50 text-yellow-100 text-lg p-4 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/50 placeholder:text-red-300/70 rounded-xl"
                      />
                      <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-yellow-400/10 to-red-400/10 pointer-events-none"></div>
                      <MapPin className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-yellow-400/70" />
                    </div>
                    <p className="text-red-200/80 text-sm italic">
                      例如: Kuala Lumpur, Malaysia • Singapore • Hong Kong • London, UK
                    </p>
                  </div>

                  {/* Gender */}
                  <div className="space-y-4">
                    <Label className="text-yellow-300 font-medium flex items-center gap-2 text-lg">
                      <Star className="h-5 w-5" />
                      性别 • Gender
                    </Label>
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => handleInputChange('gender', 'male')}
                        className={`p-4 rounded-xl border-2 transition-all text-lg font-medium ${
                          formData.gender === 'male'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-400 text-white shadow-lg scale-105'
                            : 'bg-gradient-to-r from-red-900/40 to-yellow-900/30 border-yellow-500/50 text-yellow-200 hover:border-yellow-400/70 hover:bg-red-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">♂</span>
                          <div>
                            <div className="font-bold">男性</div>
                            <div className="text-sm opacity-80">Male</div>
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('gender', 'female')}
                        className={`p-4 rounded-xl border-2 transition-all text-lg font-medium ${
                          formData.gender === 'female'
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white shadow-lg scale-105'
                            : 'bg-gradient-to-r from-red-900/40 to-yellow-900/30 border-yellow-500/50 text-yellow-200 hover:border-yellow-400/70 hover:bg-red-800/50'
                        }`}
                      >
                        <div className="flex items-center justify-center gap-2">
                          <span className="text-2xl">♀</span>
                          <div>
                            <div className="font-bold">女性</div>
                            <div className="text-sm opacity-80">Female</div>
                          </div>
                        </div>
                      </button>
                    </div>
                    <p className="text-red-200/80 text-sm italic text-center">
                      性别对紫微斗数解读很重要 • Gender is essential for accurate Zi Wei readings
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-900/70 border border-red-500 p-3 rounded-lg">
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={isLoading || !canUseFortuneTelling}
                    className="w-full bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 hover:from-yellow-400 hover:via-red-400 hover:to-yellow-400 text-red-900 font-bold py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-400 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:rotate-1 relative overflow-hidden"
                    style={{
                      backgroundSize: '200% 200%',
                      animation: canUseFortuneTelling && !isLoading ? 'gradient 3s ease infinite' : 'none'
                    }}
                  >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 animate-shimmer"></div>
                    
                    {isLoading ? (
                      <MysticalLoadingState />
                    ) : !canUseFortuneTelling ? (
                      <div className="flex items-center justify-center gap-2 relative z-10">
                        <Star className="h-5 w-5" />
                        今日已达上限 • Daily Limit Reached
                      </div>
                    ) : (
                      <div className="flex items-center justify-center gap-3 relative z-10">
                        <Sparkles className="h-6 w-6 animate-bounce" />
                        <span className="bg-gradient-to-r from-red-900 to-yellow-900 bg-clip-text text-transparent font-black">
                          揭示我的命运 • Reveal My Fortune
                        </span>
                        <Star className="h-6 w-6 animate-bounce delay-200" />
                      </div>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          ) : (
            <div className="max-w-5xl mx-auto relative z-10">
              {/* Results would go here */}
              <Card className="bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 border-8 border-amber-600">
                <CardContent className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-red-800 mb-4">Your Fortune Reading</h2>
                  </div>
                  
                  <div className="space-y-6">
                    {Object.entries(fortune).map(([key, content]) => (
                      <div key={key} className="bg-white/95 rounded-xl p-6">
                        <h3 className="text-xl font-bold text-red-800 mb-4 capitalize">{key}</h3>
                        <p className="text-red-900 text-lg leading-relaxed">{content}</p>
                      </div>
                    ))}
                  </div>

                  <div className="text-center mt-8">
                    <Button 
                      onClick={handleTryAgain}
                      disabled={!canUseFortuneTelling}
                      className="bg-gradient-to-r from-yellow-500 to-amber-500 text-red-900 font-bold px-8 py-4"
                    >
                      {canUseFortuneTelling ? 'Another Reading' : 'Daily Limit Reached'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

// Oriental Loading Bar Component
function MysticalLoadingState() {
  const [progress, setProgress] = useState(0);
  const [loadingText, setLoadingText] = useState(0);
  const messages = [
    "正在连接天庭... Connecting to Heaven...",
    "神谕降临中... Divine Oracle Descending...", 
    "星象对齐中... Aligning the Stars...",
    "解析命运... Decoding Your Destiny...",
    "天机即将显现... Celestial Secrets Revealing..."
  ];

  useEffect(() => {
    // Progress bar animation
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 100;
        return prev + 2;
      });
    }, 80);

    // Text rotation
    const textInterval = setInterval(() => {
      setLoadingText((prev) => (prev + 1) % messages.length);
    }, 1200);

    return () => {
      clearInterval(progressInterval);
      clearInterval(textInterval);
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center gap-8 py-12 relative z-10">
      {/* Oriental Loading Bar */}
      <div className="w-full max-w-md">
        {/* Decorative Dragons */}
        <div className="flex justify-between items-center mb-4">
          <div className="text-yellow-400 text-2xl animate-pulse">🐲</div>
          <div className="text-yellow-400 text-2xl animate-pulse" style={{ animationDelay: '0.5s' }}>🐲</div>
        </div>
        
        {/* Progress Bar Container */}
        <div className="relative bg-red-900/30 rounded-full h-4 border-2 border-yellow-500/50 overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 bg-gradient-to-r from-red-800/20 via-yellow-800/20 to-red-800/20"></div>
          
          {/* Progress Fill */}
          <div 
            className="h-full bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-600 transition-all duration-200 ease-out relative overflow-hidden"
            style={{ width: `${progress}%` }}
          >
            {/* Shimmer Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer"></div>
          </div>
          
          {/* Decorative Elements */}
          <div className="absolute inset-0 flex justify-center items-center">
            <div className="text-yellow-300 text-xs font-bold drop-shadow">{Math.round(progress)}%</div>
          </div>
        </div>
        
        {/* Mystical Orbs */}
        <div className="flex justify-center gap-4 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"
              style={{ animationDelay: `${i * 0.3}s` }}
            />
          ))}
        </div>
      </div>

      {/* Loading Message */}
      <div className="text-center">
        <p className="text-yellow-200 font-medium text-lg mb-2">
          {messages[loadingText]}
        </p>
        <p className="text-red-200 text-sm opacity-80">
          请耐心等候，神谕正在显现... Please wait patiently...
        </p>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Sparkles className="absolute top-4 right-8 h-5 w-5 text-yellow-400 animate-ping" />
        <Star className="absolute bottom-8 left-12 h-4 w-4 text-red-400 animate-pulse" />
        <Zap className="absolute top-12 left-6 h-6 w-6 text-yellow-300 animate-bounce" />
      </div>
    </div>
  );
}