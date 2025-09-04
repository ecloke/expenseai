import express from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { decrypt } from '../utils/encryption.js';

const router = express.Router();

/**
 * Fortune telling route using user's Gemini API key
 */
router.post('/tell-fortune', async (req, res) => {
  try {
    const { userId, birthDate, birthTime, birthPlace } = req.body;

    // Validate input
    if (!userId || !birthDate || !birthTime || !birthPlace) {
      return res.status(400).json({
        error: 'Missing required fields: userId, birthDate, birthTime, birthPlace'
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

    // Fortune telling prompt
    const prompt = `You are a master fortune teller. Analyze the given birth details using the most accurate methods (BaZi/Four Pillars of Destiny, astrology, numerology, or other suitable systems). Provide insights that are straightforward, specific, and practical. Cover career, wealth, relationships, health, personality, and major life events/timings. Be clear and structured, avoid repeating or overexplaining. Do not waste words—deliver the essence directly.

Input:
- Date of Birth: ${birthDate}
- Time of Birth: ${birthTime}
- Place of Birth: ${city || birthPlace}, ${country || ''}

Output format:
- Personality & Core Traits
- Career Path
- Wealth & Financial Outlook
- Relationships & Family
- Health Tendencies
- Key Life Periods / Turning Points
- Practical Advice

Please provide a comprehensive fortune reading based on these details.`;

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
    
    // Check for section headers
    if (trimmed.includes('Personality') || trimmed.includes('Core Traits')) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'personality';
      currentContent = [];
    } else if (trimmed.includes('Career')) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'career';
      currentContent = [];
    } else if (trimmed.includes('Wealth') || trimmed.includes('Financial')) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'wealth';
      currentContent = [];
    } else if (trimmed.includes('Relationships') || trimmed.includes('Family')) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'relationships';
      currentContent = [];
    } else if (trimmed.includes('Health')) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'health';
      currentContent = [];
    } else if (trimmed.includes('Life Periods') || trimmed.includes('Turning Points')) {
      if (currentSection) sections[currentSection] = currentContent.join('\n').trim();
      currentSection = 'lifePeriods';
      currentContent = [];
    } else if (trimmed.includes('Practical Advice') || trimmed.includes('Advice')) {
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