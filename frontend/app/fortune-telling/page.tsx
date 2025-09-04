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
    birthPlace: ''
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

    setIsLoading(true);
    setError('');

    try {
      const response = await apiClient.post('/fortune/tell-fortune', {
        userId: user.id,
        birthDate: formData.birthDate,
        birthTime: formData.birthTime,
        birthPlace: formData.birthPlace
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

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Input Form */}
            {!fortune && (
              <Card className="bg-gradient-to-br from-red-800/80 to-yellow-800/60 border-2 border-yellow-500/50 shadow-2xl backdrop-blur-sm">
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
                        <div className="flex items-center justify-center gap-3 relative z-10">
                          <div className="relative">
                            <div className="w-6 h-6 border-3 border-red-900 border-t-transparent rounded-full animate-spin"></div>
                            <div className="absolute inset-0 w-6 h-6 border-3 border-yellow-300 border-b-transparent rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDelay: '0.5s' }}></div>
                          </div>
                          <span className="animate-pulse">正在咨询神谕... Consulting the Oracle...</span>
                          <Sparkles className="h-5 w-5 animate-pulse" />
                        </div>
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

            {/* Guidance Card - When no results yet */}
            {!fortune && !isLoading && (
              <Card className="bg-gradient-to-br from-yellow-800/60 to-red-800/80 border-2 border-red-500/50 shadow-2xl backdrop-blur-sm">
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-red-200 font-serif flex items-center justify-center gap-3">
                    <Zap className="h-6 w-6 text-yellow-400" />
                    Ancient Wisdom Awaits
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-6">
                    <div className="mb-6">
                      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-yellow-400 to-red-500 rounded-full flex items-center justify-center animate-pulse">
                        <Sparkles className="h-12 w-12 text-red-900" />
                      </div>
                    </div>
                    <p className="text-yellow-200 mb-6 leading-relaxed">
                      The cosmic energies are aligned and ready to reveal your destiny. 
                      Provide your birth details to unlock the secrets written in the stars.
                    </p>
                    <div className="bg-red-900/50 p-4 rounded-lg border border-yellow-500/30">
                      <p className="text-yellow-300 text-sm mb-2 font-semibold">✨ Your Reading Will Include:</p>
                      <ul className="text-red-200 text-sm space-y-1 text-left">
                        <li>• Personality & Core Traits Analysis</li>
                        <li>• Career Path Guidance</li>
                        <li>• Wealth & Financial Outlook</li>
                        <li>• Relationships & Family Destiny</li>
                        <li>• Health Tendencies & Warnings</li>
                        <li>• Key Life Periods & Turning Points</li>
                        <li>• Practical Wisdom for Your Journey</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fortune Results */}
            {fortune && (
              <div className="lg:col-span-2">
                <FortuneScroll fortune={fortune} onTryAgain={handleTryAgain} canTryAgain={canUseFortuneTelling} />
              </div>
            )}
          </div>
        </div>
      </div>
      </DashboardLayout>
    </>
  );
}

interface FortuneScrollProps {
  fortune: FortuneReading;
  onTryAgain: () => void;
  canTryAgain: boolean;
}

function FortuneScroll({ fortune, onTryAgain, canTryAgain }: FortuneScrollProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const sections = [
    { key: 'personality', title: '性格特质', subtitle: 'Personality & Core Traits', icon: Star, content: fortune.personality, color: 'from-red-600 to-pink-500', bgColor: 'from-red-50 to-pink-50' },
    { key: 'career', title: '事业前程', subtitle: 'Career Path & Success', icon: Zap, content: fortune.career, color: 'from-yellow-600 to-orange-500', bgColor: 'from-yellow-50 to-orange-50' },
    { key: 'wealth', title: '财运机遇', subtitle: 'Wealth & Financial Fortune', icon: Sparkles, content: fortune.wealth, color: 'from-green-600 to-emerald-500', bgColor: 'from-green-50 to-emerald-50' },
    { key: 'relationships', title: '情感姻缘', subtitle: 'Love & Relationships', icon: Star, content: fortune.relationships, color: 'from-purple-600 to-violet-500', bgColor: 'from-purple-50 to-violet-50' },
    { key: 'health', title: '健康运势', subtitle: 'Health & Vitality', icon: Zap, content: fortune.health, color: 'from-blue-600 to-cyan-500', bgColor: 'from-blue-50 to-cyan-50' },
    { key: 'lifePeriods', title: '人生转机', subtitle: 'Life Turning Points', icon: Sparkles, content: fortune.lifePeriods, color: 'from-indigo-600 to-purple-500', bgColor: 'from-indigo-50 to-purple-50' },
    { key: 'advice', title: '神谕指引', subtitle: 'Divine Guidance & Wisdom', icon: Star, content: fortune.advice, color: 'from-amber-600 to-yellow-500', bgColor: 'from-amber-50 to-yellow-50' }
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
    const paragraphs = cleaned.split('\n\n').filter(p => p.trim());
    
    return paragraphs.map((paragraph, idx) => {
      // Check if paragraph contains bullet points
      if (paragraph.includes('• ')) {
        const items = paragraph.split('• ').filter(item => item.trim());
        return (
          <div key={idx} className="space-y-2">
            {items.map((item, itemIdx) => (
              <div key={itemIdx} className="flex items-start gap-3">
                <div className="w-2 h-2 bg-gradient-to-r from-red-500 to-yellow-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-red-900 leading-relaxed">{item.trim()}</p>
              </div>
            ))}
          </div>
        );
      }
      
      return (
        <p key={idx} className="text-red-900 leading-relaxed mb-3">
          {paragraph}
        </p>
      );
    });
  };

  return (
    <div className="space-y-6">
      {/* Mystical Header */}
      <div className="text-center mb-8">
        <div className="relative inline-block">
          <h2 className="text-4xl md:text-5xl font-serif font-bold bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 bg-clip-text text-transparent mb-2">
            天命神谕
          </h2>
          <h3 className="text-2xl md:text-3xl text-yellow-600 font-serif">
            Your Celestial Destiny
          </h3>
          <div className="absolute -top-2 -right-2">
            <Sparkles className="h-6 w-6 text-yellow-400 animate-pulse" />
          </div>
          <div className="absolute -bottom-2 -left-2">
            <Star className="h-4 w-4 text-red-400 animate-ping" />
          </div>
        </div>
        <div className="mt-4 w-32 h-1 bg-gradient-to-r from-red-500 via-yellow-400 to-red-500 mx-auto rounded-full"></div>
      </div>

      {/* Fortune Sections */}
      <div className="grid gap-6">
        {sections.map((section, index) => {
          if (!section.content) return null;
          
          const Icon = section.icon;
          const isExpanded = expandedSection === section.key;
          
          return (
            <Card 
              key={section.key} 
              className="bg-gradient-to-br from-white/90 to-yellow-50/80 border-2 border-yellow-300/50 shadow-xl hover:shadow-2xl transition-all duration-500 overflow-hidden relative group cursor-pointer"
              onClick={() => setExpandedSection(isExpanded ? null : section.key)}
            >
              {/* Mystical Background Pattern */}
              <div className="absolute inset-0 opacity-5">
                <div className="absolute top-4 right-4 text-6xl">✦</div>
                <div className="absolute bottom-4 left-4 text-4xl">❋</div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-8xl">☯</div>
              </div>
              
              {/* Section Header */}
              <CardHeader className="relative z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`bg-gradient-to-r ${section.color} p-3 rounded-full shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-serif font-bold text-red-800 mb-1">
                        {section.title}
                      </h3>
                      <p className="text-red-600 opacity-80">
                        {section.subtitle}
                      </p>
                    </div>
                  </div>
                  <div className={`transform transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                    <ChevronDown className="h-5 w-5 text-red-600" />
                  </div>
                </div>
              </CardHeader>

              {/* Expandable Content */}
              <div className={`overflow-hidden transition-all duration-500 ${isExpanded ? 'max-h-[2000px] pb-6' : 'max-h-0'}`}>
                <CardContent className="pt-0 px-6 relative z-10">
                  <div className={`bg-gradient-to-br ${section.bgColor} p-6 rounded-xl border border-red-200/50 shadow-inner`}>
                    <div className="space-y-4">
                      {formatContent(section.content)}
                    </div>
                  </div>
                </CardContent>
              </div>
              
              {/* Preview when collapsed */}
              {!isExpanded && (
                <CardContent className="pt-0 px-6 pb-4 relative z-10">
                  <p className="text-red-700 opacity-70 text-sm line-clamp-2">
                    {cleanContent(section.content).substring(0, 120)}...
                  </p>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Interactive Footer */}
      <Card className="bg-gradient-to-r from-red-800/90 to-yellow-800/90 border-2 border-yellow-400 shadow-2xl relative overflow-hidden">
        {/* Mystical Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-red-900/20 to-yellow-900/20"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-yellow-300 to-red-400"></div>
        <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-red-400 via-yellow-300 to-red-400"></div>
        
        <CardContent className="text-center py-8 relative z-10">
          <div className="mb-6">
            <h4 className="text-xl font-serif text-yellow-200 mb-2">
              愿此神谕指引您的人生之路
            </h4>
            <p className="text-red-200 opacity-90">
              May this divine reading guide your life's journey
            </p>
          </div>
          
          <Button 
            onClick={onTryAgain}
            disabled={!canTryAgain}
            className="bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-red-900 font-bold px-8 py-4 text-lg disabled:opacity-50 disabled:cursor-not-allowed border-2 border-yellow-300 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:scale-105 relative overflow-hidden"
          >
            {/* Shimmer effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shimmer"></div>
            
            {canTryAgain ? (
              <div className="flex items-center gap-3 relative z-10">
                <Sparkles className="h-5 w-5" />
                <span>再求一卦 • Seek Another Reading</span>
                <Star className="h-5 w-5" />
              </div>
            ) : (
              <span className="relative z-10">今日已达上限 • Daily Limit Reached</span>
            )}
          </Button>
        </CardContent>
      </Card>
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
    <div className="bg-gradient-to-br from-red-800/40 to-yellow-800/30 border-2 border-yellow-500/60 rounded-xl p-6 space-y-6">
      {/* Year Selector */}
      <div className="text-center space-y-3">
        <p className="text-yellow-300 text-sm font-medium">年份 Year</p>
        <div className="flex items-center justify-center gap-4">
          <button
            type="button"
            onClick={() => setSelectedYear(prev => prev - 1)}
            className="p-2 bg-red-700/50 hover:bg-red-600/70 border border-yellow-500/30 rounded-full transition-colors"
          >
            <ChevronLeft className="h-4 w-4 text-yellow-300" />
          </button>
          
          {isEditingYear ? (
            <input
              type="number"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value) || new Date().getFullYear())}
              onBlur={() => setIsEditingYear(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  setIsEditingYear(false);
                }
              }}
              autoFocus
              className="bg-gradient-to-r from-yellow-600 to-red-600 px-6 py-3 rounded-lg text-white font-bold text-xl min-w-[100px] text-center border-2 border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-300"
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
                  type="number"
                  min="0"
                  max="23"
                  value={selectedHour}
                  onChange={(e) => {
                    const hour = parseInt(e.target.value);
                    if (hour >= 0 && hour <= 23) {
                      setSelectedHour(hour);
                    }
                  }}
                  onBlur={() => setIsEditingHour(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingHour(false);
                    }
                  }}
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
                  type="number"
                  min="0"
                  max="59"
                  value={selectedMinute}
                  onChange={(e) => {
                    const minute = parseInt(e.target.value);
                    if (minute >= 0 && minute <= 59) {
                      setSelectedMinute(minute);
                    }
                  }}
                  onBlur={() => setIsEditingMinute(false)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      setIsEditingMinute(false);
                    }
                  }}
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