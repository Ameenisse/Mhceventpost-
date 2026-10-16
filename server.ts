import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Body parsers with high payload capacity for batch photo analysis / large configs
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Initialize Google Gemini SDK on the server per system guidelines
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to strip markdown JSON code block formatting
function cleanJsonOutput(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Executes a Gemini request with automatic fallback across allowed modern models
 * if a specific preview model is temporarily experiencing capacity spikes (503).
 */
async function generateContentWithFallback(params: {
  contents: any;
  preferredModel?: string;
}) {
  const modelsToTry = [
    params.preferredModel || 'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
    'gemini-flash-latest',
  ];

  let lastError: any = null;
  for (const model of modelsToTry) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: params.contents,
      });
      if (response && response.text) {
        return response;
      }
    } catch (err: any) {
      console.warn(`[Gemini Model ${model} encountered error, trying next]:`, err?.message || err);
      lastError = err;
    }
  }

  throw lastError || new Error('All model attempts failed.');
}

// ============================================================================
// 1. HEALTH & SYSTEM METRICS
// ============================================================================
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Event Photo Branding Studio Backend',
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
    environment: isProduction ? 'production' : 'development',
    aiEnabled: Boolean(apiKey),
    version: '2.0.0',
    capabilities: [
      'MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API',
      'EVENT_METADATA_SYNTHESIS',
      'DHIVEHI_THAANA_TRANSLATION',
      'PHOTO_COMPOSITION_VISION_ANALYSIS',
      'BRAND_PALETTE_GENERATION',
      'SOCIAL_ANNOUNCEMENT_GENERATOR',
    ],
  });
});

// ============================================================================
// 2. AI EVENT DETAILS & MAGIC GENERATOR
// ============================================================================
app.post('/api/ai/suggest-event-details', async (req: Request, res: Response) => {
  try {
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const {
      topic = 'Corporate Conference',
      theme = 'modern corporate',
      organizationName = 'Maldives Event Co',
      currentTitle = '',
      category = 'conference',
    } = req.body;

    const prompt = `You are an expert bilingual creative director and event branding specialist for events in the Maldives and international symposiums.
Create cohesive branding details for this event:
- Event Topic / Concept: "${topic}"
- Theme / Tone: "${theme}"
- Organization: "${organizationName}"
- Current Working Title: "${currentTitle || topic}"
- Category: "${category}"

Return ONLY valid JSON (no markdown formatting, no code block backticks) with the following exact keys:
{
  "title": "Short, punchy English event title (max 60 chars)",
  "titleDhivehi": "The Dhivehi Thaana translation or transliteration for this title in proper Thaana script (Unicode)",
  "subtitle": "Informative subtitle with year or edition (e.g. 'National Conference 2026')",
  "subtitleDhivehi": "Dhivehi Thaana equivalent for the subtitle",
  "venue": "Suggested prestigious Maldivian venue (e.g. 'Dharubaaruge, Male'', 'Crossroads Maldives', 'Synthetic Track Hulhumale'') if appropriate",
  "themeDescription": "One sentence summary of the visual vibe",
  "bannerColor": "Hex code for banner starting dark shade (e.g. #0F172A, #0D2B4E, #14532D)",
  "bannerEndColor": "Hex code for gradient end shade (e.g. #030712, #041020, #052e16)",
  "recommendedPosition": "top-right",
  "suggestedSponsorLabel": "Official Partners & Sponsors",
  "hashtags": ["#Tag1", "#Tag2", "#Tag3"]
}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      preferredModel: 'gemini-3.8-flash',
    });

    const textOutput = response.text || '';
    const parsed = JSON.parse(cleanJsonOutput(textOutput));
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[API /api/ai/suggest-event-details Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate event branding suggestions.',
    });
  }
});

// ============================================================================
// 3. AI DHIVEHI / THAANA TRANSLATION & PHONETICS
// ============================================================================
app.post('/api/ai/translate-dhivehi', async (req: Request, res: Response) => {
  try {
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const { text, target = 'dhivehi', context = 'event_title' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text parameter is required.' });
    }

    const prompt = `You are a linguist specializing in the Maldivian language (Dhivehi) and Thaana script, as well as English event titling.
Context: "${context}"
Target Language: "${target}"
Input Text: "${text}"

Provide the translation. If translating to Dhivehi, use authentic Maldivian vocabulary and correct Thaana Unicode characters.
Return ONLY valid JSON (no markdown backticks):
{
  "original": "${text.replace(/"/g, '\\"')}",
  "translatedText": "Translated text in target language/script",
  "phonetic": "Latin phonetic transliteration if target is Dhivehi, or empty if target is English",
  "fontFamilyRecommendation": "Mv_Eamaan_XP"
}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      preferredModel: 'gemini-3.8-flash',
    });

    const textOutput = response.text || '';
    const parsed = JSON.parse(cleanJsonOutput(textOutput));
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[API /api/ai/translate-dhivehi Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to translate Dhivehi text.',
    });
  }
});

// ============================================================================
// 4. AI PHOTO COMPOSITION & VISION ANALYSIS
// ============================================================================
app.post('/api/ai/analyze-photo', async (req: Request, res: Response) => {
  try {
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const { image, eventTitle = 'Event' } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ error: 'Image base64 data URL is required.' });
    }

    // Extract mime type and base64 string
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const prompt = `You are a professional photography editor and graphic designer specializing in batch photo overlays and watermarking.
Analyze this event photograph in the context of overlaying event branding headers and sponsor bars for "${eventTitle}".

Key evaluation goals:
1. Detect where faces, heads, or primary focal subjects are positioned (e.g. top-center, bottom, left, right).
2. Determine which header placement ('top-left', 'top-right', 'bottom-left', 'bottom-right') will LEAST obstruct human faces or crucial action.
3. Recommend whether dark or light scrim / gradient is needed based on background brightness.
4. Suggest Lightroom-style tuning adjustments (exposure -100 to +100, contrast -100 to +100, warmth -100 to +100).

Return ONLY valid JSON (no markdown backticks):
{
  "recommendedPosition": "top-right",
  "detectedSubjectArea": "Center and lower half of frame",
  "dominantTone": "bright or dark or warm or cool",
  "recommendedScrimOpacity": 55,
  "lightroomPreset": "vibrant",
  "exposureAdjustment": 0,
  "contrastAdjustment": 10,
  "warmthAdjustment": 5,
  "rationale": "Clear open space in the top-right corner allows prominent branding without occluding subjects."
}`;

    const response = await generateContentWithFallback({
      preferredModel: 'gemini-3.8-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
    });

    const textOutput = response.text || '';
    const parsed = JSON.parse(cleanJsonOutput(textOutput));
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[API /api/ai/analyze-photo Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to analyze photo composition.',
    });
  }
});

// ============================================================================
// 5. AI SOCIAL CAPTION & ANNOUNCEMENT GENERATOR
// ============================================================================
app.post('/api/ai/generate-captions', async (req: Request, res: Response) => {
  try {
    if (!apiKey) {
      return res.status(503).json({
        error: 'Gemini API key is not configured on the server.',
      });
    }

    const {
      eventName,
      organizationName,
      venue,
      date,
      keySponsors = [],
      photoCount = 1,
    } = req.body;

    const prompt = `You are a social media copywriter for events and sports in the Maldives.
Generate publishing announcements for this batch of ${photoCount} branded photos:
- Event: "${eventName}"
- Organization: "${organizationName}"
- Venue: "${venue || 'Maldives'}"
- Date: "${date || 'Today'}"
- Sponsors to credit: ${JSON.stringify(keySponsors)}

Return ONLY valid JSON (no markdown backticks):
{
  "englishCaption": "Exciting, polished social media copy in English with emojis, acknowledging the venue, date, and thanking sponsors.",
  "dhivehiCaption": "Natural Thaana script social media announcement in Dhivehi covering the event highlights and sponsor credits.",
  "hashtags": ["#MaldivesEvents", "#Photography", "#EventName"]
}`;

    const response = await generateContentWithFallback({
      contents: prompt,
      preferredModel: 'gemini-3.8-flash',
    });

    const textOutput = response.text || '';
    const parsed = JSON.parse(cleanJsonOutput(textOutput));
    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('[API /api/ai/generate-captions Error]:', error);
    return res.status(500).json({
      error: error?.message || 'Failed to generate event social captions.',
    });
  }
});

// ============================================================================
// 6. WORKSPACE EXPORT & CONFIGURATION VALIDATION
// ============================================================================
app.post('/api/workspace/validate-export', (req: Request, res: Response) => {
  const { event, organization, logos = [] } = req.body;

  const errors: string[] = [];
  const warnings: string[] = [];

  if (!event) {
    errors.push('Event configuration is missing.');
  } else {
    if (!event.title || event.title.trim().length === 0) {
      errors.push('Event title cannot be empty.');
    }
    if (!event.primaryOrgId && !organization?.id) {
      warnings.push('No primary organization associated with this event.');
    }
  }

  if (Array.isArray(logos) && logos.length === 0) {
    warnings.push('No sponsor or partner logos configured in this event.');
  }

  return res.json({
    valid: errors.length === 0,
    errors,
    warnings,
    summary: {
      eventTitle: event?.title || 'Unknown',
      logoCount: logos.length,
      hasHeader: Boolean(event?.headerPosition),
      hasFooterBanner: Boolean(event?.footerBanner),
    },
  });
});

// ============================================================================
// 7. VITE / STATIC SERVING
// ============================================================================
async function startServer() {
  if (!isProduction) {
    // Dynamic import vite for dev mode
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // In production serve dist directory
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `[Event Photo Branding Studio] Full-stack server running on http://0.0.0.0:${PORT} (${
        isProduction ? 'production' : 'development'
      })`
    );
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup failure:', err);
  process.exit(1);
});
