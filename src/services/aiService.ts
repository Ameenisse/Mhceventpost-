/**
 * Client service to interface with full-stack backend routes (/api/*)
 * Note: Never imports @google/genai directly in browser code per security rules.
 */

export interface EventSuggestionInput {
  topic?: string;
  theme?: string;
  organizationName?: string;
  currentTitle?: string;
  category?: string;
}

export interface EventSuggestionOutput {
  title: string;
  titleDhivehi: string;
  subtitle: string;
  subtitleDhivehi: string;
  venue?: string;
  themeDescription?: string;
  bannerColor?: string;
  bannerEndColor?: string;
  recommendedPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  suggestedSponsorLabel?: string;
  hashtags?: string[];
}

export interface DhivehiTranslationOutput {
  original: string;
  translatedText: string;
  phonetic?: string;
  fontFamilyRecommendation?: string;
}

export interface PhotoAnalysisOutput {
  recommendedPosition: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'linear-bottom';
  detectedSubjectArea: string;
  dominantTone: 'bright' | 'dark' | 'warm' | 'cool';
  recommendedScrimOpacity: number;
  lightroomPreset: string;
  exposureAdjustment: number;
  contrastAdjustment: number;
  warmthAdjustment: number;
  rationale: string;
}

export interface SocialCaptionsOutput {
  englishCaption: string;
  dhivehiCaption: string;
  hashtags: string[];
}

export const BackendAIService = {
  /**
   * Check backend health and capabilities
   */
  async checkHealth(): Promise<{ status: string; aiEnabled: boolean }> {
    try {
      const res = await fetch('/api/health');
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return await res.json();
    } catch (e) {
      console.warn('Backend health check warning:', e);
      return { status: 'offline', aiEnabled: false };
    }
  },

  /**
   * AI Suggestion for event titles, Dhivehi script, colors, and layout
   */
  async suggestEventDetails(input: EventSuggestionInput): Promise<EventSuggestionOutput | null> {
    try {
      const res = await fetch('/api/ai/suggest-event-details', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      return json.data;
    } catch (error: any) {
      console.error('Failed to fetch event suggestions from backend:', error);
      throw error;
    }
  },

  /**
   * AI Dhivehi / Thaana translation
   */
  async translateToDhivehi(text: string, context = 'event_title'): Promise<DhivehiTranslationOutput | null> {
    try {
      const res = await fetch('/api/ai/translate-dhivehi', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, target: 'dhivehi', context }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      return json.data;
    } catch (error: any) {
      console.error('Failed to translate Dhivehi:', error);
      throw error;
    }
  },

  /**
   * AI Photo vision analysis: recommends banner positioning without occluding faces
   */
  async analyzePhotoComposition(
    imageDataUrl: string,
    eventTitle?: string
  ): Promise<PhotoAnalysisOutput | null> {
    try {
      const res = await fetch('/api/ai/analyze-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl, eventTitle }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      return json.data;
    } catch (error: any) {
      console.error('Failed to analyze photo composition:', error);
      throw error;
    }
  },

  /**
   * Generate ready-to-post social captions in English and Dhivehi Thaana
   */
  async generateCaptions(params: {
    eventName: string;
    organizationName: string;
    venue?: string;
    date?: string;
    keySponsors?: string[];
    photoCount?: number;
  }): Promise<SocialCaptionsOutput | null> {
    try {
      const res = await fetch('/api/ai/generate-captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${res.status}`);
      }

      const json = await res.json();
      return json.data;
    } catch (error: any) {
      console.error('Failed to generate captions:', error);
      throw error;
    }
  },
};
