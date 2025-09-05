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
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto mb-4"></div>
            <p className="text-yellow-200">Loading fortune teller...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <>
      <style jsx global>{`
        @keyframes gradient {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%) skewX(-12deg); }
          100% { transform: translateX(200%) skewX(-12deg); }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }
      `}</style>
      <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-yellow-900 relative overflow-hidden">
        {/* Enhanced Oriental Background Elements */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 animate-pulse blur-sm"></div>
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-yellow-500 animate-pulse delay-1000 blur-sm"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-red-400 animate-pulse delay-2000 blur-sm"></div>
          <div className="absolute bottom-40 right-1/3 w-28 h-28 rounded-full bg-gradient-to-br from-red-300 to-yellow-400 animate-pulse delay-3000 blur-sm"></div>
          
          {/* Additional mystical orbs */}
          <div className="absolute top-1/2 left-5 w-16 h-16 rounded-full bg-gradient-to-br from-yellow-500 to-red-600 animate-pulse delay-500 blur-sm"></div>
          <div className="absolute top-1/4 right-5 w-12 h-12 rounded-full bg-gradient-to-br from-red-500 to-yellow-600 animate-pulse delay-1500 blur-sm"></div>
        </div>

        {/* Floating Mystical Elements with Enhanced Animation */}
        <div className="absolute top-20 right-10 text-yellow-400 opacity-30 animate-bounce">
          <Zap className="h-16 w-16 drop-shadow-lg" />
        </div>
        <div className="absolute bottom-32 left-16 text-red-400 opacity-30 animate-bounce delay-2000">
          <Sparkles className="h-12 w-12 drop-shadow-lg" />
        </div>
        <div className="absolute top-32 left-1/2 text-yellow-300 opacity-25 animate-spin" style={{ animationDuration: '8s' }}>
          <Star className="h-10 w-10 drop-shadow-lg" />
        </div>
        <div className="absolute bottom-1/4 right-1/4 text-red-300 opacity-25 animate-spin" style={{ animationDuration: '12s' }}>
          <Sparkles className="h-8 w-8 drop-shadow-lg" />
        </div>

        {/* Mystical particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className={`absolute w-1 h-1 bg-yellow-400 rounded-full animate-ping`}
              style={{
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        <div className="max-w-6xl mx-auto py-12 px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-12 pt-8">
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

          <div className="flex justify-center">
            {/* Centered Input Form */}
            {!fortune && (
              <Card className="w-full max-w-2xl bg-gradient-to-br from-red-800/90 to-yellow-800/70 border-2 border-yellow-400/70 shadow-2xl backdrop-blur-sm">
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
                    {/* Custom Date Picker */}
                    <div className="space-y-4">
                      <Label className="text-yellow-300 font-medium flex items-center gap-2 text-lg">
                        <Calendar className="h-5 w-5" />
                        诞生之日 • Date of Birth
                      </Label>
                      <OrientalDatePicker 
                        value={formData.birthDate}
                        onChange={(date) => handleInputChange('birthDate', date)}
                      />
                    </div>

                    {/* Custom Time Picker */}
                    <div className="space-y-4">
                      <Label className="text-yellow-300 font-medium flex items-center gap-2 text-lg">
                        <Clock className="h-5 w-5" />
                        时辰 • Time of Birth
                      </Label>
                      <OrientalTimePicker
                        value={formData.birthTime}
                        onChange={(time) => handleInputChange('birthTime', time)}
                      />
                    </div>

                    {/* Enhanced Place Input */}
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

                    {/* Gender Selection */}
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
                      className="w-full bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 hover:from-yellow-400 hover:via-red-400 hover:to-yellow-400 text-red-900 font-bold py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-400 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 hover:rotate-1 bg-size-200 animate-gradient relative overflow-hidden"
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
            )}

          </div>

          {/* Fortune Results - Full Width */}
          {fortune && (
            <div className="mt-12">
              <FortuneScroll 
                fortune={fortune} 
                onTryAgain={handleTryAgain} 
                canTryAgain={canUseFortuneTelling}
                birthDetails={formData}
              />
            </div>
          )}
        </div>
      </div>
      </DashboardLayout>
    </>
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

interface FortuneScrollProps {
  fortune: FortuneReading;
  onTryAgain: () => void;
  canTryAgain: boolean;
  birthDetails: {
    birthDate: string;
    birthTime: string;
    birthPlace: string;
    gender: string;
  };
}

function FortuneScroll({ fortune, onTryAgain, canTryAgain, birthDetails }: FortuneScrollProps) {
  const sections = [
    { key: 'personality', title: '性格特质', subtitle: 'Personality & Core Traits', icon: Star, content: fortune.personality },
    { key: 'career', title: '事业前程', subtitle: 'Career Path & Success', icon: Zap, content: fortune.career },
    { key: 'wealth', title: '财运机遇', subtitle: 'Wealth & Financial Fortune', icon: Sparkles, content: fortune.wealth },
    { key: 'relationships', title: '情感姻缘', subtitle: 'Love & Relationships', icon: Star, content: fortune.relationships },
    { key: 'health', title: '健康运势', subtitle: 'Health & Vitality', icon: Zap, content: fortune.health },
    { key: 'lifePeriods', title: '人生转机', subtitle: 'Life Turning Points', icon: Sparkles, content: fortune.lifePeriods },
    { key: 'advice', title: '神谕指引', subtitle: 'Divine Guidance & Wisdom', icon: Star, content: fortune.advice }
  ];

  const cleanContent = (content: string) => {
    return content
      .replace(/\*+/g, '') // Remove all asterisks
      .replace(/^\s*[-•]\s*/gm, '• ') // Normalize bullet points
      .replace(/\n\s*\n/g, '\n\n') // Clean up extra newlines
      .trim();
  };

  const formatContent = (content: string) => {
    const cleaned = cleanContent(content);
    
    // Split by sentences and age mentions for better readability
    const processedContent = cleaned
      .split(/(?<=\.)\s+/)
      .map(sentence => sentence.trim())
      .filter(sentence => sentence.length > 0);
    
    const formattedSections: string[][] = [];
    let currentGroup: string[] = [];
    
    processedContent.forEach((sentence, idx) => {
      // Check if this sentence starts a new age/period mention
      if (sentence.match(/^(Age \d+|大限|流年|\d{4}年|Your \d+-year)/i) && currentGroup.length > 0) {
        // Save the previous group
        formattedSections.push(currentGroup);
        currentGroup = [sentence];
      } else {
        currentGroup.push(sentence);
      }
      
      // If this is the last sentence, save the current group
      if (idx === processedContent.length - 1 && currentGroup.length > 0) {
        formattedSections.push(currentGroup);
      }
    });
    
    // If no age-based splitting occurred, fall back to paragraph splitting
    if (formattedSections.length === 0) {
      const paragraphs = cleaned.split('\n\n').filter(p => p.trim());
      formattedSections.push(...paragraphs.map(p => [p]));
    }
    
    return formattedSections.map((group, idx) => {
      const groupText = group.join(' ');
      
      // Check for bullet points
      if (groupText.includes('• ')) {
        const items = groupText.split('• ').filter(item => item.trim());
        return (
          <div key={idx} className="space-y-3 mb-6">
            {items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-start gap-4">
                <div className="w-2 h-2 bg-red-600 rounded-full mt-3 flex-shrink-0"></div>
                <p className="text-red-900 text-lg md:text-xl leading-relaxed font-medium">{item.trim()}</p>
              </div>
            ))}
          </div>
        );
      }
      
      // Check if this group starts with an age mention - make it stand out
      const startsWithAge = groupText.match(/^(Age \d+|大限|流年|\d{4}年|Your \d+-year)/i);
      
      return (
        <div key={idx} className={`mb-6 ${startsWithAge ? 'bg-amber-100/50 p-4 rounded-lg border-l-4 border-red-500' : ''}`}>
          {startsWithAge && (
            <div className="flex items-center gap-2 mb-3">
              <Star className="h-4 w-4 text-red-600" />
              <span className="font-bold text-red-800 text-lg">{startsWithAge[0]}</span>
            </div>
          )}
          <p className="text-red-900 text-lg md:text-xl leading-relaxed font-medium">
            {startsWithAge ? groupText.replace(startsWithAge[0], '').trim() : groupText}
          </p>
        </div>
      );
    });
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4">
      {/* Oriental Scroll Container */}
      <div className="relative bg-gradient-to-br from-yellow-100 via-amber-50 to-yellow-100 border-8 border-amber-600 rounded-3xl shadow-2xl overflow-hidden">
        {/* Decorative Oriental Border Pattern */}
        <div className="absolute inset-0 border-4 border-red-700 rounded-2xl m-2"></div>
        <div className="absolute top-4 left-4 right-4 h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-full"></div>
        <div className="absolute bottom-4 left-4 right-4 h-2 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 rounded-full"></div>
        
        {/* Corner Decorations - Responsive */}
        <div className="absolute top-4 left-4 md:top-6 md:left-6 text-xl md:text-3xl text-red-600">🐲</div>
        <div className="absolute top-4 right-4 md:top-6 md:right-6 text-xl md:text-3xl text-red-600">🐲</div>
        <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6 text-xl md:text-3xl text-red-600">🐉</div>
        <div className="absolute bottom-4 right-4 md:bottom-6 md:right-6 text-xl md:text-3xl text-red-600">🐉</div>
        
        {/* Main Content Area */}
        <div className="relative z-10 p-4 md:p-8 lg:p-12 pt-12 md:pt-16 pb-12 md:pb-16">
          
          {/* Scroll Header with High Contrast */}
          <div className="text-center mb-12">
            <div className="bg-red-800 text-white px-8 py-4 rounded-full inline-block shadow-lg mb-6">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-serif font-bold">
                天命神谕
              </h2>
            </div>
            <div className="bg-amber-600 text-white px-6 py-2 rounded-full inline-block shadow-md">
              <h3 className="text-lg md:text-xl lg:text-2xl font-serif">
                Your Celestial Destiny
              </h3>
            </div>
            
            {/* Birth Details Summary */}
            <div className="mt-8 bg-white/90 rounded-2xl p-4 md:p-6 shadow-lg border-2 border-amber-300 max-w-2xl mx-auto">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Calendar className="h-5 w-5 text-red-600" />
                <h4 className="text-lg font-serif font-bold text-red-800">Your Birth Details</h4>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="text-red-700 font-medium">Date:</span>
                    <span className="text-red-900 ml-2">{new Date(birthDetails.birthDate).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="text-red-700 font-medium">Time:</span>
                    <span className="text-red-900 ml-2">{birthDetails.birthTime}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="text-red-700 font-medium">Place:</span>
                    <span className="text-red-900 ml-2">{birthDetails.birthPlace}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Star className="h-4 w-4 text-amber-600 flex-shrink-0" />
                  <div>
                    <span className="text-red-700 font-medium">Gender:</span>
                    <span className="text-red-900 ml-2">
                      {birthDetails.gender === 'male' ? '♂ 男性 Male' : '♀ 女性 Female'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Decorative Elements */}
            <div className="flex justify-center gap-4 mt-6">
              <Star className="h-6 w-6 text-red-600 animate-pulse" />
              <Sparkles className="h-8 w-8 text-amber-600 animate-bounce" />
              <Star className="h-6 w-6 text-red-600 animate-pulse" />
            </div>
          </div>

          {/* Fortune Content Sections */}
          <div className="space-y-12">
            {sections.map((section, index) => {
              if (!section.content) return null;
              
              const Icon = section.icon;
              
              return (
                <div key={section.key}>
                  {/* Section Header */}
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="bg-red-600 p-3 rounded-full shadow-lg">
                      <Icon className="h-6 w-6 md:h-8 md:w-8 text-white" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-2xl md:text-3xl font-serif font-bold text-red-800 mb-1">
                        {section.title}
                      </h3>
                      <p className="text-amber-700 text-base md:text-lg font-medium">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>
                  
                  {/* Section Content with High Contrast */}
                  <div className="bg-white/95 rounded-2xl p-4 md:p-6 lg:p-8 shadow-lg border-2 border-amber-300">
                    <div className="space-y-4">
                      {formatContent(section.content)}
                    </div>
                  </div>
                  
                  {/* Decorative Divider */}
                  {index < sections.filter(s => s.content).length - 1 && (
                    <div className="flex justify-center my-12">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-1 bg-gradient-to-r from-transparent to-red-500"></div>
                        <div className="text-red-600 text-2xl">❋</div>
                        <div className="w-16 h-1 bg-gradient-to-r from-red-500 to-transparent"></div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action Footer */}
          <div className="text-center mt-16">
            <div className="bg-red-800 text-white px-8 py-6 rounded-2xl shadow-xl inline-block">
              <div className="mb-4">
                <h4 className="text-xl md:text-2xl font-serif mb-2">
                  愿此神谕指引您的人生之路
                </h4>
                <p className="text-red-200 text-base md:text-lg opacity-90">
                  May this divine reading guide your life's journey
                </p>
              </div>
              
              <Button 
                onClick={onTryAgain}
                disabled={!canTryAgain}
                className="bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-red-900 font-bold px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-300 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 relative overflow-hidden"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer"></div>
                
                {canTryAgain ? (
                  <div className="flex items-center justify-center gap-3 relative z-10">
                    <Sparkles className="h-5 w-5" />
                    <span>再求一卦 • Seek Another Reading</span>
                    <Star className="h-5 w-5" />
                  </div>
                ) : (
                  <span className="relative z-10">今日已达上限 • Daily Limit Reached</span>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Custom Oriental Date Picker Component
interface OrientalDatePickerProps {
  value: string;
  onChange: (date: string) => void;
}

function OrientalDatePicker({ value, onChange }: OrientalDatePickerProps) {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const [isEditingYear, setIsEditingYear] = useState(false);

  useEffect(() => {
    if (value) {
      const [year, month, day] = value.split('-').map(Number);
      setSelectedYear(year);
      setSelectedMonth(month);
      setSelectedDay(day);
    }
  }, []);

  useEffect(() => {
    const formattedDate = `${selectedYear}-${selectedMonth.toString().padStart(2, '0')}-${selectedDay.toString().padStart(2, '0')}`;
    onChange(formattedDate);
  }, [selectedYear, selectedMonth, selectedDay, onChange]);

  const months = [
    { num: 1, name: '正月', eng: 'January' },
    { num: 2, name: '二月', eng: 'February' },
    { num: 3, name: '三月', eng: 'March' },
    { num: 4, name: '四月', eng: 'April' },
    { num: 5, name: '五月', eng: 'May' },
    { num: 6, name: '六月', eng: 'June' },
    { num: 7, name: '七月', eng: 'July' },
    { num: 8, name: '八月', eng: 'August' },
    { num: 9, name: '九月', eng: 'September' },
    { num: 10, name: '十月', eng: 'October' },
    { num: 11, name: '十一月', eng: 'November' },
    { num: 12, name: '十二月', eng: 'December' },
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);

  return (
    <div className="bg-gradient-to-br from-red-800/40 to-yellow-800/30 border-2 border-yellow-500/60 rounded-xl p-4 md:p-6 space-y-4 md:space-y-6">
      {/* Year Selector */}
      <div className="text-center space-y-3">
        <p className="text-yellow-300 text-sm font-medium">年份 Year</p>
        <div className="flex items-center justify-center gap-2 md:gap-4">
          <button
            type="button"
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors flex-shrink-0"
          >
            <ChevronLeft className="h-4 w-4 text-yellow-300" />
          </button>
          
          {isEditingYear ? (
            <input
              type="text"
              value={selectedYear.toString()}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '' || /^\d{1,4}$/.test(value)) {
                  setSelectedYear(value === '' ? new Date().getFullYear() : parseInt(value) || new Date().getFullYear());
                }
              }}
              onBlur={() => setIsEditingYear(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingYear(false);
                }
              }}
              onFocus={(e) => e.target.select()}
              autoFocus
              className="bg-gradient-to-r from-yellow-600 to-red-600 px-4 md:px-6 py-2 md:py-3 rounded-lg text-white font-bold text-lg md:text-xl min-w-[80px] md:min-w-[100px] text-center border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
            />
          ) : (
            <button
              type="button"
              onClick={() => setIsEditingYear(true)}
              className="bg-gradient-to-r from-yellow-600 to-red-600 px-6 py-3 rounded-lg text-white font-bold text-xl min-w-[100px] hover:from-yellow-500 hover:to-red-500 transition-all cursor-pointer"
            >
              {selectedYear}
            </button>
          )}
          
          <button
            type="button"
            onClick={() => setSelectedYear(prev => prev + 1)}
            className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors"
          >
            <ChevronRight className="h-4 w-4 text-yellow-300" />
          </button>
        </div>
        <p className="text-yellow-200/60 text-xs">点击年份直接编辑 • Click year to edit directly</p>
      </div>

      {/* Month Selector */}
      <div className="space-y-3">
        <p className="text-yellow-300 text-sm font-medium text-center">月份 Month</p>
        <div className="grid grid-cols-3 gap-2">
          {months.map((month) => (
            <button
              key={month.num}
              type="button"
              onClick={() => setSelectedMonth(month.num)}
              className={`p-3 rounded-lg border-2 transition-all text-center ${
                selectedMonth === month.num
                  ? 'bg-gradient-to-r from-yellow-500 to-red-500 border-yellow-400 text-red-900 font-bold scale-105'
                  : 'bg-red-900/30 border-yellow-500/30 text-yellow-200 hover:bg-red-800/50 hover:border-yellow-400/60'
              }`}
            >
              <div className="text-sm leading-tight">
                <div className="font-medium">{month.name}</div>
                <div className="text-xs opacity-80">{month.eng}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Day Selector */}
      <div className="space-y-3">
        <p className="text-yellow-300 text-sm font-medium text-center">日期 Day</p>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`p-2 rounded-lg border transition-all text-center ${
                selectedDay === day
                  ? 'bg-gradient-to-r from-yellow-500 to-red-500 border-yellow-400 text-red-900 font-bold scale-110'
                  : 'bg-red-900/30 border-yellow-500/20 text-yellow-200 hover:bg-red-800/50 hover:border-yellow-400/60'
              }`}
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-yellow-200/80 text-sm">
          选择的日期: <span className="font-bold text-yellow-300">{selectedYear}年 {selectedMonth}月 {selectedDay}日</span>
        </p>
      </div>
    </div>
  );
}

// Custom Oriental Time Picker Component
interface OrientalTimePickerProps {
  value: string;
  onChange: (time: string) => void;
}

function OrientalTimePicker({ value, onChange }: OrientalTimePickerProps) {
  const [selectedHour, setSelectedHour] = useState(12);
  const [selectedMinute, setSelectedMinute] = useState(0);
  const [isEditingHour, setIsEditingHour] = useState(false);
  const [isEditingMinute, setIsEditingMinute] = useState(false);

  useEffect(() => {
    if (value) {
      const [hour, minute] = value.split(':').map(Number);
      setSelectedHour(hour);
      setSelectedMinute(minute);
    }
  }, []);

  useEffect(() => {
    const formattedTime = `${selectedHour.toString().padStart(2, '0')}:${selectedMinute.toString().padStart(2, '0')}`;
    onChange(formattedTime);
  }, [selectedHour, selectedMinute, onChange]);

  const chineseHours = [
    { num: 0, name: '子时', period: '23:00-01:00', western: 'Midnight' },
    { num: 1, name: '丑时', period: '01:00-03:00', western: 'Late Night' },
    { num: 2, name: '寅时', period: '03:00-05:00', western: 'Pre-Dawn' },
    { num: 3, name: '卯时', period: '05:00-07:00', western: 'Dawn' },
    { num: 4, name: '辰时', period: '07:00-09:00', western: 'Morning' },
    { num: 5, name: '巳时', period: '09:00-11:00', western: 'Late Morning' },
    { num: 6, name: '午时', period: '11:00-13:00', western: 'Noon' },
    { num: 7, name: '未时', period: '13:00-15:00', western: 'Afternoon' },
    { num: 8, name: '申时', period: '15:00-17:00', western: 'Late Afternoon' },
    { num: 9, name: '酉时', period: '17:00-19:00', western: 'Evening' },
    { num: 10, name: '戌时', period: '19:00-21:00', western: 'Night' },
    { num: 11, name: '亥时', period: '21:00-23:00', western: 'Late Night' },
  ];

  const getChineseHour = (hour: number) => {
    if (hour === 23 || hour === 0) return chineseHours[0];
    return chineseHours[Math.floor((hour + 1) / 2)] || chineseHours[0];
  };

  const currentChineseHour = getChineseHour(selectedHour);

  return (
    <div className="bg-gradient-to-br from-red-800/40 to-yellow-800/30 border-2 border-yellow-500/60 rounded-xl p-6 space-y-6">
      {/* Chinese Hour Display */}
      <div className="text-center bg-gradient-to-r from-yellow-600/20 to-red-600/20 p-4 rounded-lg border border-yellow-500/30">
        <p className="text-yellow-300 text-sm font-medium">当前时辰</p>
        <p className="text-2xl font-bold text-yellow-200 mt-1">{currentChineseHour.name}</p>
        <p className="text-red-200 text-sm">{currentChineseHour.western} • {currentChineseHour.period}</p>
      </div>

      {/* Hour Selector */}
      <div className="space-y-4">
        <div className="flex items-center justify-center gap-4">
          <div className="text-center">
            <p className="text-yellow-300 text-sm font-medium mb-2">小时 Hour</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedHour(prev => prev === 0 ? 23 : prev - 1)}
                className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors"
              >
                <ChevronUp className="h-4 w-4 text-yellow-300" />
              </button>
              
              {isEditingHour ? (
                <input
                  type="text"
                  value={selectedHour.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d{1,2}$/.test(value) && parseInt(value) <= 23)) {
                      setSelectedHour(value === '' ? 0 : parseInt(value));
                    }
                  }}
                  onBlur={() => setIsEditingHour(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingHour(false);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  autoFocus
                  className="bg-gradient-to-r from-yellow-600 to-red-600 px-4 py-3 rounded-lg text-white font-bold text-xl min-w-[60px] text-center border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingHour(true)}
                  className="bg-gradient-to-r from-yellow-600 to-red-600 px-4 py-3 rounded-lg text-white font-bold text-xl min-w-[60px] hover:from-yellow-500 hover:to-red-500 transition-all cursor-pointer"
                >
                  {selectedHour.toString().padStart(2, '0')}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setSelectedHour(prev => prev === 23 ? 0 : prev + 1)}
                className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-yellow-300" />
              </button>
            </div>
          </div>

          <div className="text-yellow-200 text-2xl font-bold">:</div>

          {/* Minute Selector */}
          <div className="text-center">
            <p className="text-yellow-300 text-sm font-medium mb-2">分钟 Minute</p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setSelectedMinute(prev => prev === 0 ? 59 : prev - 1)}
                className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors"
              >
                <ChevronUp className="h-4 w-4 text-yellow-300" />
              </button>
              
              {isEditingMinute ? (
                <input
                  type="text"
                  value={selectedMinute.toString().padStart(2, '0')}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || (/^\d{1,2}$/.test(value) && parseInt(value) <= 59)) {
                      setSelectedMinute(value === '' ? 0 : parseInt(value));
                    }
                  }}
                  onBlur={() => setIsEditingMinute(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingMinute(false);
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  autoFocus
                  className="bg-gradient-to-r from-yellow-600 to-red-600 px-4 py-3 rounded-lg text-white font-bold text-xl min-w-[60px] text-center border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setIsEditingMinute(true)}
                  className="bg-gradient-to-r from-yellow-600 to-red-600 px-4 py-3 rounded-lg text-white font-bold text-xl min-w-[60px] hover:from-yellow-500 hover:to-red-500 transition-all cursor-pointer"
                >
                  {selectedMinute.toString().padStart(2, '0')}
                </button>
              )}
              
              <button
                type="button"
                onClick={() => setSelectedMinute(prev => prev === 59 ? 0 : prev + 1)}
                className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors"
              >
                <ChevronDown className="h-4 w-4 text-yellow-300" />
              </button>
            </div>
          </div>
        </div>
        <p className="text-yellow-200/60 text-xs text-center">点击时间直接编辑 • Click time to edit directly</p>
      </div>

      {/* Quick Time Buttons */}
      <div className="space-y-3">
        <p className="text-yellow-300 text-sm font-medium text-center">快速选择</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { time: '06:00', label: '卯时 • Dawn' },
            { time: '12:00', label: '午时 • Noon' },
            { time: '18:00', label: '酉时 • Evening' },
            { time: '00:00', label: '子时 • Midnight' },
          ].map((preset) => (
            <button
              key={preset.time}
              type="button"
              onClick={() => {
                const [hour, minute] = preset.time.split(':').map(Number);
                setSelectedHour(hour);
                setSelectedMinute(minute);
              }}
              className="p-3 bg-red-900/30 border border-yellow-500/30 rounded-lg text-yellow-200 hover:bg-red-800/50 hover:border-yellow-400/60 transition-all text-center text-sm"
            >
              <div className="font-medium">{preset.time}</div>
              <div className="text-xs opacity-80">{preset.label}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="text-center pt-2">
        <p className="text-yellow-200/80 text-sm">
          选择的时间: <span className="font-bold text-yellow-300">{selectedHour.toString().padStart(2, '0')}:{selectedMinute.toString().padStart(2, '0')}</span>
        </p>
      </div>
    </div>
  );
}