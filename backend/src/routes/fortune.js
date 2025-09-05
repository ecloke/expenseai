import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { decrypt } from '../utils/encryption.js';

const router = express.Router();

/**
 * Fortune telling route using user's Gemini API key
 */
router.post('/tell-fortune', async (req, res) => {
  try {
    const { userId, birthDate, birthTime, birthPlace, gender } = req.body;

    // Validate input
    if (!userId || !birthDate || !birthTime || !birthPlace || !gender) {
      return res.status(400).json({
        error: 'Missing required fields: userId, birthDate, birthTime, birthPlace, gender'
      });
    }

    // Get user configuration with Gemini API key
    const { data: userConfig, error: configError } = await req.supabase
      .from('user_configs')
      .select('gemini_api_key')
      .eq('user_id', userId)
      .single();

    if (configError || !userConfig) {
      return res.status(404).json({
        error: 'User configuration not found'
      });
    }

    if (!userConfig.gemini_api_key) {
      return res.status(400).json({
        error: 'Gemini API key not configured for this user'
      });
    }

    // Decrypt the Gemini API key
    const geminiApiKey = decrypt(userConfig.gemini_api_key);
    if (!geminiApiKey) {
      return res.status(500).json({
        error: 'Failed to decrypt Gemini API key'
      });
    }

    // Initialize Gemini AI
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });

    // Parse birth place
    const [city, country] = birthPlace.split(',').map(s => s.trim());

    // Refined 紫微斗数 Fortune telling prompt
    const prompt = `You are a master of 紫微斗数 (Zi Wei Dou Shu). Using the provided birth details, build the Zi Wei chart and interpret it with accuracy. Speak directly to the person. Anchor the reading to their current age and life stage. Identify not only the general life areas but also specific ages or years of major turning points. Include both 大限 (10-year cycles) and 流年 (yearly influences). Provide practical, straightforward guidance. Avoid vague advice or generic wording.

Input:
• Date of Birth: ${birthDate}
• Time of Birth: ${birthTime}
• Gender: ${gender}
• Place of Birth: ${city || birthPlace}, ${country || ''}

Output format (second person, direct):

1. Personality & Core Traits

2. Career & Life Path

3. Wealth & Finances

4. Relationships & Marriage

5. Health & Well-being

6. Luck Cycles & Major Turning Points
• Don't need to show before the person's age
• Highlight specific years/ages that matter most (e.g. "Age 35: big career change")

7. Practical Advice (direct, sharp, 3–5 clear points)`;

    // Generate fortune telling response
    const result = await model.generateContent([prompt]);
    const response = await result.response;
    const fortuneText = response.text();

    // Parse the fortune into sections
    const fortuneSections = parseFortuneResponse(fortuneText);

    res.json({
      success: true,
      fortune: fortuneSections,
      rawText: fortuneText
    });

  } catch (error) {
    console.error('Fortune telling error:', error);
    res.status(500).json({
      error: 'Failed to generate fortune reading',
      details: error.message
    });
  }
});

/**
 * Parse fortune response into structured sections
 */
function parseFortuneResponse(text) {
  const sections = {
    personality: '',
    career: '',
    wealth: '',
    relationships: '',
    health: '',
    lifePeriods: '',
    advice: ''
  };

  // Split by sections
  const lines = text.split('\n').filter(line => line.trim());
  let currentSection = '';
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();
    
    // Check for section headers - updated for new format
    if (trimmed.includes('1.') && (trimmed.includes('Personality') || trimmed.includes('Core Traits'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'personality';
      currentContent = [];
    } else if (trimmed.includes('2.') && (trimmed.includes('Career') || trimmed.includes('Life Path'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'career';
      currentContent = [];
    } else if (trimmed.includes('3.') && (trimmed.includes('Wealth') || trimmed.includes('Finances'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'wealth';
      currentContent = [];
    } else if (trimmed.includes('4.') && (trimmed.includes('Relationships') || trimmed.includes('Marriage'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'relationships';
      currentContent = [];
    } else if (trimmed.includes('5.') && (trimmed.includes('Health') || trimmed.includes('Well-being'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'health';
      currentContent = [];
    } else if (trimmed.includes('6.') && (trimmed.includes('Luck Cycles') || trimmed.includes('Turning Points') || trimmed.includes('Major'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'lifePeriods';
      currentContent = [];
    } else if (trimmed.includes('7.') && (trimmed.includes('Practical Advice') || trimmed.includes('Advice'))) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'advice';
      currentContent = [];
    } else if (currentSection) {
      // Add content to current section
      currentContent.push(line);
    }
  }

  // Save the last section
  if (currentSection && currentContent.length > 0) {
    sections[currentSection] = currentContent.join('\n').trim();
  }

  return sections;
}

export default router;