'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Calendar, Clock, MapPin, Star } from 'lucide-react';
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
  const [user, setUser] = useState<any>(null);
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

  // Load user from DashboardLayout context (authentication is handled there)
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
      
      // Get current session (DashboardLayout already verified authentication)
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Error loading user data:', error);
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
    console.log('🎯 Form submitted - preventing default and starting fortune telling process');
    
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
    console.log('✨ Starting fortune telling API call with data:', formData);

    try {
      const response = await apiClient.post('/fortune/tell-fortune', {
        userId: user.id,
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        birthPlace: formData.birthPlace,
        gender: formData.gender
      });

      console.log('🔮 Fortune telling response:', response);

      if (response.success) {
        console.log('🎊 Fortune received, setting fortune state');
        setFortune(response.fortune);
        updateDailyUsage();
      } else {
        setError(response.error || 'Failed to generate fortune reading');
      }
    } catch (err: any) {
      console.error('❌ Fortune telling error:', err);
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


  return (
    <DashboardLayout>
      <div className="space-y-6 pt-16 lg:pt-0">
        {/* Oriental Fortune Telling Container */}
        <div className="bg-gradient-to-br from-red-900 via-red-800 to-yellow-900 rounded-lg relative overflow-hidden" style={{ minHeight: '80vh', padding: '2rem' }}>
          <style dangerouslySetInnerHTML={{
            __html: `
              @keyframes gradient {
                0%, 100% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
              }
              @keyframes shimmer {
                0% { transform: translateX(-100%) skewX(-12deg); }
                100% { transform: translateX(200%) skewX(-12deg); }
              }
              @keyframes float {
                0%, 100% { transform: translateY(0px); }
                50% { transform: translateY(-20px); }
              }
              .animate-gradient {
                background-size: 200% 200%;
                animation: gradient 3s ease infinite;
              }
              .animate-shimmer {
                animation: shimmer 2s infinite;
              }
              .animate-float {
                animation: float 6s ease-in-out infinite;
              }
            `
          }} />

          {/* Simplified Background Elements - Positioned within container */}
          <div className="absolute inset-0 pointer-events-none opacity-10 overflow-hidden rounded-lg">
            <div className="absolute top-20 right-20 w-32 h-32 rounded-full bg-yellow-400 animate-pulse"></div>
            <div className="absolute bottom-20 right-10 w-24 h-24 rounded-full bg-red-400 animate-pulse delay-1000"></div>
            <div className="absolute top-1/2 left-1/2 w-16 h-16 rounded-full bg-yellow-300 animate-pulse delay-2000"></div>
          </div>

          <div className="max-w-4xl mx-auto relative">
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

            {/* Clean Oriental Input Form */}
            {!fortune && (
              <div className="w-full max-w-3xl mx-auto">
                <Card className="bg-gradient-to-br from-red-800/95 to-yellow-800/80 border-2 border-yellow-400/80 shadow-2xl backdrop-blur-sm">
                  <CardHeader className="text-center pb-6">
                    <CardTitle className="text-2xl md:text-3xl text-yellow-300 font-serif flex items-center justify-center gap-3 mb-2">
                      <Calendar className="h-6 w-6 md:h-7 md:w-7" />
                      Your Birth Details
                    </CardTitle>
                    <CardDescription className="text-red-200 text-base md:text-lg">
                      Enter your birth information to reveal your cosmic blueprint
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6 md:p-8">
                    <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
                      {/* Date of Birth - Mobile Optimized */}
                      <div className="space-y-3">
                        <Label className="text-yellow-300 font-medium flex items-center gap-2 text-base md:text-lg">
                          <Calendar className="h-4 w-4 md:h-5 md:w-5" />
                          诞生之日 • Date of Birth
                        </Label>
                        <div className="relative">
                          <Input
                            type="date"
                            value={formData.birthDate}
                            onChange={(e) => handleInputChange('birthDate', e.target.value)}
                            required
                            className="bg-red-900/50 border-2 border-yellow-500/60 text-yellow-100 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 h-12 text-base md:text-lg rounded-lg [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200"
                          />
                        </div>
                      </div>

                      {/* Time of Birth - Mobile Optimized */}
                      <div className="space-y-3">
                        <Label className="text-yellow-300 font-medium flex items-center gap-2 text-base md:text-lg">
                          <Clock className="h-4 w-4 md:h-5 md:w-5" />
                          时辰 • Time of Birth
                        </Label>
                        <div className="relative">
                          <Input
                            type="time"
                            value={formData.birthTime}
                            onChange={(e) => handleInputChange('birthTime', e.target.value)}
                            required
                            className="bg-red-900/50 border-2 border-yellow-500/60 text-yellow-100 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 h-12 text-base md:text-lg rounded-lg [&::-webkit-calendar-picker-indicator]:invert [&::-webkit-calendar-picker-indicator]:brightness-200"
                          />
                        </div>
                      </div>

                      {/* Place of Birth - Clean Design */}
                      <div className="space-y-3">
                        <Label className="text-yellow-300 font-medium flex items-center gap-2 text-base md:text-lg">
                          <MapPin className="h-4 w-4 md:h-5 md:w-5" />
                          诞生之地 • Place of Birth
                        </Label>
                        <div className="relative">
                          <Input
                            type="text"
                            placeholder="e.g. Kuala Lumpur, Malaysia"
                            value={formData.birthPlace}
                            onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                            required
                            className="bg-red-900/50 border-2 border-yellow-500/60 text-yellow-100 placeholder:text-red-300/70 focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30 h-12 text-base md:text-lg rounded-lg"
                          />
                          <MapPin className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 md:h-5 md:w-5 text-yellow-400/70 pointer-events-none" />
                        </div>
                        <p className="text-red-200/70 text-xs md:text-sm">
                          Examples: Singapore • Hong Kong • London, UK • New York, USA
                        </p>
                      </div>

                      {/* Gender Selection - Mobile Responsive */}
                      <div className="space-y-3">
                        <Label className="text-yellow-300 font-medium flex items-center gap-2 text-base md:text-lg">
                          <Star className="h-4 w-4 md:h-5 md:w-5" />
                          性别 • Gender
                        </Label>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                          <button
                            type="button"
                            onClick={() => handleInputChange('gender', 'male')}
                            className={`p-3 md:p-4 rounded-lg border-2 transition-all font-medium text-sm md:text-base ${
                              formData.gender === 'male'
                                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-400 text-white shadow-lg'
                                : 'bg-red-900/40 border-yellow-500/50 text-yellow-200 hover:border-yellow-400/70 hover:bg-red-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl md:text-2xl">♂</span>
                              <div>
                                <div className="font-bold">男性</div>
                                <div className="text-xs md:text-sm opacity-80">Male</div>
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleInputChange('gender', 'female')}
                            className={`p-3 md:p-4 rounded-lg border-2 transition-all font-medium text-sm md:text-base ${
                              formData.gender === 'female'
                                ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white shadow-lg'
                                : 'bg-red-900/40 border-yellow-500/50 text-yellow-200 hover:border-yellow-400/70 hover:bg-red-800/50'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-2">
                              <span className="text-xl md:text-2xl">♀</span>
                              <div>
                                <div className="font-bold">女性</div>
                                <div className="text-xs md:text-sm opacity-80">Female</div>
                              </div>
                            </div>
                          </button>
                        </div>
                        <p className="text-red-200/70 text-xs md:text-sm text-center">
                          性别对紫微斗数解读很重要 • Gender is essential for accurate readings
                        </p>
                      </div>

                      {/* Error Message */}
                      {error && (
                        <div className="bg-red-900/80 border-l-4 border-red-500 p-4 rounded-lg">
                          <p className="text-red-200 text-sm md:text-base">{error}</p>
                        </div>
                      )}

                      {/* Submit Button - Clean Design */}
                      <div className="pt-2">
                        <Button 
                          type="submit" 
                          disabled={isLoading || !canUseFortuneTelling}
                          className="w-full bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-white font-bold py-3 md:py-4 text-base md:text-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-400/80 shadow-xl hover:shadow-2xl transition-all duration-300 rounded-lg relative overflow-hidden group"
                        >
                          {/* Subtle shimmer effect */}
                          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 group-hover:animate-shimmer"></div>
                          
                          {isLoading ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              <span>Consulting the Stars...</span>
                            </div>
                          ) : !canUseFortuneTelling ? (
                            <div className="flex items-center justify-center gap-2">
                              <Star className="h-4 w-4 md:h-5 md:w-5" />
                              <span>今日已达上限 • Daily Limit Reached</span>
                            </div>
                          ) : (
                            <div className="flex items-center justify-center gap-2 md:gap-3 relative z-10">
                              <Sparkles className="h-4 w-4 md:h-5 md:w-5" />
                              <span className="font-bold">
                                揭示我的命运 • Reveal My Fortune
                              </span>
                              <Star className="h-4 w-4 md:h-5 md:w-5" />
                            </div>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Fortune Results - Full Width */}
            {fortune && (
              <div className="mt-8 md:mt-12">
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
        <Star className="absolute top-12 left-6 h-6 w-6 text-yellow-300 animate-bounce" />
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
    { key: 'career', title: '事业前程', subtitle: 'Career Path & Success', icon: Star, content: fortune.career },
    { key: 'wealth', title: '财运机遇', subtitle: 'Wealth & Financial Fortune', icon: Sparkles, content: fortune.wealth },
    { key: 'relationships', title: '情感姻缘', subtitle: 'Love & Relationships', icon: Star, content: fortune.relationships },
    { key: 'health', title: '健康运势', subtitle: 'Health & Vitality', icon: Star, content: fortune.health },
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
    
    // Simple formatting with proper line breaks and age highlighting
    const lines = cleaned.split('\n').filter(line => line.trim());
    const formattedText = lines.map((line, idx) => {
      const trimmedLine = line.trim();
      
      // Check if line starts with age pattern and make it bold
      const agePattern = /^(Age \d+(?:-\d+)?|大限|流年|\d{4}年)/i;
      const ageMatch = trimmedLine.match(agePattern);
      
      if (ageMatch) {
        return (
          <div key={idx} className="mb-4">
            <h4 className="text-xl md:text-2xl font-bold text-red-800 mb-2 flex items-center gap-2">
              <Star className="h-5 w-5 text-red-600" />
              {ageMatch[1]}
            </h4>
            <p className="text-red-900 text-lg md:text-xl leading-relaxed pl-7">
              {trimmedLine.replace(ageMatch[1], '').replace(/^[:\-\s]+/, '')}
            </p>
          </div>
        );
      }
      
      // Regular paragraph
      if (trimmedLine) {
        return (
          <p key={idx} className="text-red-900 text-lg md:text-xl leading-relaxed mb-4">
            {trimmedLine}
          </p>
        );
      }
      
      return null;
    }).filter(Boolean);
    
    return formattedText;
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