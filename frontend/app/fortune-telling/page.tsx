'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, Calendar, Clock, MapPin, Star, Zap } from 'lucide-react';
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
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-red-900 via-red-800 to-yellow-900 relative overflow-hidden">
        {/* Oriental Background Elements */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-yellow-400 animate-pulse"></div>
          <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-red-400 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/4 w-20 h-20 rounded-full bg-yellow-300 animate-pulse delay-2000"></div>
          <div className="absolute bottom-40 right-1/3 w-28 h-28 rounded-full bg-red-300 animate-pulse delay-3000"></div>
        </div>

        {/* Floating Mystical Elements */}
        <div className="absolute top-20 right-10 text-yellow-400 opacity-20 animate-bounce">
          <Zap className="h-16 w-16" />
        </div>
        <div className="absolute bottom-32 left-16 text-red-400 opacity-20 animate-bounce delay-2000">
          <Sparkles className="h-12 w-12" />
        </div>

        <div className="max-w-6xl mx-auto py-8 px-4 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
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
                <CardContent className="space-y-6">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="birthDate" className="text-yellow-300 font-medium flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Date of Birth
                      </Label>
                      <Input
                        id="birthDate"
                        type="date"
                        value={formData.birthDate}
                        onChange={(e) => handleInputChange('birthDate', e.target.value)}
                        required
                        className="bg-red-900/50 border-yellow-500/50 text-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthTime" className="text-yellow-300 font-medium flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Time of Birth
                      </Label>
                      <Input
                        id="birthTime"
                        type="time"
                        value={formData.birthTime}
                        onChange={(e) => handleInputChange('birthTime', e.target.value)}
                        required
                        className="bg-red-900/50 border-yellow-500/50 text-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="birthPlace" className="text-yellow-300 font-medium flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Place of Birth
                      </Label>
                      <Input
                        id="birthPlace"
                        type="text"
                        placeholder="City, Country (e.g., Kuala Lumpur, Malaysia)"
                        value={formData.birthPlace}
                        onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                        required
                        className="bg-red-900/50 border-yellow-500/50 text-yellow-200 focus:border-yellow-400 focus:ring-yellow-400/50 placeholder:text-red-300"
                      />
                    </div>

                    {error && (
                      <div className="bg-red-900/70 border border-red-500 p-3 rounded-lg">
                        <p className="text-red-200 text-sm">{error}</p>
                      </div>
                    )}

                    <Button 
                      type="submit" 
                      disabled={isLoading || !canUseFortuneTelling}
                      className="w-full bg-gradient-to-r from-yellow-500 to-red-500 hover:from-yellow-400 hover:to-red-400 text-red-900 font-bold py-3 text-lg disabled:opacity-50 disabled:cursor-not-allowed border border-yellow-400 shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isLoading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-5 h-5 border-2 border-red-900 border-t-transparent rounded-full animate-spin"></div>
                          Consulting the Oracle...
                        </div>
                      ) : !canUseFortuneTelling ? (
                        "Daily Limit Reached"
                      ) : (
                        <>
                          <Sparkles className="h-5 w-5 mr-2" />
                          Reveal My Fortune
                        </>
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
  );
}

interface FortuneScrollProps {
  fortune: FortuneReading;
  onTryAgain: () => void;
  canTryAgain: boolean;
}

function FortuneScroll({ fortune, onTryAgain, canTryAgain }: FortuneScrollProps) {
  const sections = [
    { key: 'personality', title: '性格 Personality & Core Traits', icon: Star, content: fortune.personality },
    { key: 'career', title: '事业 Career Path', icon: Zap, content: fortune.career },
    { key: 'wealth', title: '财富 Wealth & Financial Outlook', icon: Sparkles, content: fortune.wealth },
    { key: 'relationships', title: '关系 Relationships & Family', icon: Star, content: fortune.relationships },
    { key: 'health', title: '健康 Health Tendencies', icon: Zap, content: fortune.health },
    { key: 'lifePeriods', title: '转机 Key Life Periods', icon: Sparkles, content: fortune.lifePeriods },
    { key: 'advice', title: '忠告 Practical Advice', icon: Star, content: fortune.advice }
  ];

  return (
    <Card className="bg-gradient-to-br from-yellow-50 to-red-50 border-4 border-red-600 shadow-2xl backdrop-blur-sm relative overflow-hidden">
      {/* Decorative Elements */}
      <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600"></div>
      <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-r from-red-600 via-yellow-500 to-red-600"></div>
      
      <CardHeader className="text-center pt-12 pb-6 bg-gradient-to-br from-red-800/10 to-yellow-600/20">
        <CardTitle className="text-3xl md:text-4xl text-red-800 font-serif mb-2">
          Your Celestial Scroll
        </CardTitle>
        <CardDescription className="text-red-600 text-lg">
          The cosmos has spoken - here is your divine reading
        </CardDescription>
      </CardHeader>

      <CardContent className="p-6 md:p-8 space-y-8">
        {sections.map((section, index) => {
          if (!section.content) return null;
          
          const Icon = section.icon;
          
          return (
            <div key={section.key} className="relative">
              {/* Section Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-gradient-to-r from-red-600 to-yellow-500 p-2 rounded-full">
                  <Icon className="h-5 w-5 text-white" />
                </div>
                <h3 className="text-xl font-serif font-bold text-red-800">
                  {section.title}
                </h3>
              </div>
              
              {/* Section Content */}
              <div className="bg-gradient-to-br from-yellow-50/50 to-red-50/30 p-4 md:p-6 rounded-lg border-l-4 border-red-500 shadow-inner">
                <p className="text-red-900 leading-relaxed whitespace-pre-wrap">
                  {section.content}
                </p>
              </div>
              
              {/* Decorative Divider */}
              {index < sections.filter(s => s.content).length - 1 && (
                <div className="flex justify-center my-6">
                  <div className="w-16 h-1 bg-gradient-to-r from-transparent via-red-400 to-transparent"></div>
                </div>
              )}
            </div>
          );
        })}

        {/* Try Again Button */}
        <div className="text-center pt-6 border-t-2 border-red-300">
          <Button 
            onClick={onTryAgain}
            disabled={!canTryAgain}
            className="bg-gradient-to-r from-red-600 to-yellow-500 hover:from-red-500 hover:to-yellow-400 text-white font-bold px-8 py-3 disabled:opacity-50 disabled:cursor-not-allowed border border-red-400 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            {canTryAgain ? (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Seek Another Reading
              </>
            ) : (
              "Daily Limit Reached"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}