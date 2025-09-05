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
          {/* Background Elements */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="absolute top-10 left-10 w-32 h-32 rounded-full bg-gradient-to-br from-yellow-400 to-red-500 animate-pulse blur-sm"></div>
            <div className="absolute top-40 right-20 w-24 h-24 rounded-full bg-gradient-to-br from-red-400 to-yellow-500 animate-pulse delay-1000 blur-sm"></div>
            <div className="absolute bottom-20 left-1/4 w-20 h-20 rounded-full bg-gradient-to-br from-yellow-300 to-red-400 animate-pulse delay-2000 blur-sm"></div>
            <div className="absolute bottom-40 right-1/3 w-28 h-28 rounded-full bg-gradient-to-br from-red-300 to-yellow-400 animate-pulse delay-3000 blur-sm"></div>
          </div>

          {/* Header */}
          <div className="text-center mb-12 relative z-10">
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
            </p>
          </div>

          {!fortune ? (
            <Card className="max-w-2xl mx-auto bg-gradient-to-br from-red-800/90 to-yellow-800/70 border-2 border-yellow-400/70 relative z-10">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl text-yellow-300 font-serif">Your Birth Details</CardTitle>
                <CardDescription className="text-red-200">
                  Enter your birth information for Zi Wei Dou Shu reading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Birth Date */}
                  <div>
                    <Label className="text-yellow-300 font-medium text-lg">Birth Date</Label>
                    <Input
                      type="date"
                      value={formData.birthDate}
                      onChange={(e) => handleInputChange('birthDate', e.target.value)}
                      required
                      className="bg-gradient-to-r from-red-900/60 to-yellow-900/40 border-2 border-yellow-500/50 text-yellow-100 text-lg p-4 focus:border-yellow-400"
                    />
                  </div>

                  {/* Birth Time */}
                  <div>
                    <Label className="text-yellow-300 font-medium text-lg">Birth Time</Label>
                    <Input
                      type="time"
                      value={formData.birthTime}
                      onChange={(e) => handleInputChange('birthTime', e.target.value)}
                      required
                      className="bg-gradient-to-r from-red-900/60 to-yellow-900/40 border-2 border-yellow-500/50 text-yellow-100 text-lg p-4 focus:border-yellow-400"
                    />
                  </div>

                  {/* Birth Place */}
                  <div>
                    <Label className="text-yellow-300 font-medium text-lg">Birth Place</Label>
                    <Input
                      type="text"
                      placeholder="e.g., Kuala Lumpur, Malaysia"
                      value={formData.birthPlace}
                      onChange={(e) => handleInputChange('birthPlace', e.target.value)}
                      required
                      className="bg-gradient-to-r from-red-900/60 to-yellow-900/40 border-2 border-yellow-500/50 text-yellow-100 text-lg p-4 focus:border-yellow-400"
                    />
                  </div>

                  {/* Gender */}
                  <div>
                    <Label className="text-yellow-300 font-medium text-lg">Gender</Label>
                    <div className="grid grid-cols-2 gap-4 mt-2">
                      <button
                        type="button"
                        onClick={() => handleInputChange('gender', 'male')}
                        className={`p-4 rounded-xl border-2 transition-all text-lg font-medium ${
                          formData.gender === 'male'
                            ? 'bg-gradient-to-r from-blue-600 to-cyan-600 border-blue-400 text-white'
                            : 'bg-gradient-to-r from-red-900/40 to-yellow-900/30 border-yellow-500/50 text-yellow-200 hover:border-yellow-400/70'
                        }`}
                      >
                        ♂ Male
                      </button>
                      <button
                        type="button"
                        onClick={() => handleInputChange('gender', 'female')}
                        className={`p-4 rounded-xl border-2 transition-all text-lg font-medium ${
                          formData.gender === 'female'
                            ? 'bg-gradient-to-r from-pink-600 to-rose-600 border-pink-400 text-white'
                            : 'bg-gradient-to-r from-red-900/40 to-yellow-900/30 border-yellow-500/50 text-yellow-200 hover:border-yellow-400/70'
                        }`}
                      >
                        ♀ Female
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-red-900/70 border border-red-500 p-3 rounded-lg">
                      <p className="text-red-200 text-sm">{error}</p>
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    disabled={isLoading || !canUseFortuneTelling}
                    className="w-full bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500 text-red-900 font-bold py-4 text-xl disabled:opacity-50"
                  >
                    {isLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-900"></div>
                        Reading your fortune...
                      </div>
                    ) : !canUseFortuneTelling ? (
                      'Daily Limit Reached'
                    ) : (
                      '揭示我的命运 • Reveal My Fortune'
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