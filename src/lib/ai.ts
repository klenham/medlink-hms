import AISettings from '../models/AISettings.js';

export interface AISettingsDoc {
  groqApiKey: string;
  ollamaModel: string;
}

export interface HybridAIResult {
  provider: 'groq' | 'ollama';
  text: string;
  raw?: any;
}

const DEFAULT_OLLAMA_MODEL = 'llama2';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434/api/generate';
const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY || '';
const GROQ_API_URL = process.env.GROQ_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = process.env.GROQ_MODEL || 'mixtral-8x7b-instruct';

export async function getAiSettings(): Promise<AISettingsDoc> {
  const doc = await AISettings.findOne().lean() as any;
  if (!doc) {
    return { groqApiKey: '', ollamaModel: DEFAULT_OLLAMA_MODEL };
  }
  return {
    groqApiKey: String(doc.groqApiKey || '').trim(),
    ollamaModel: String(doc.ollamaModel || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL,
  };
}

export async function saveAiSettings(partial: Partial<AISettingsDoc>): Promise<AISettingsDoc> {
  const current = await getAiSettings();
  const updated = {
    groqApiKey: partial.groqApiKey !== undefined ? String(partial.groqApiKey).trim() : current.groqApiKey,
    ollamaModel: partial.ollamaModel !== undefined ? String(partial.ollamaModel).trim() || DEFAULT_OLLAMA_MODEL : current.ollamaModel,
  };
  const doc = await AISettings.findOneAndUpdate({}, updated, { upsert: true, new: true, setDefaultsOnInsert: true }).lean() as any;
  return {
    groqApiKey: String(doc.groqApiKey || '').trim(),
    ollamaModel: String(doc.ollamaModel || DEFAULT_OLLAMA_MODEL).trim() || DEFAULT_OLLAMA_MODEL,
  };
}

async function queryGroq(apiKey: string, prompt: string): Promise<string> {
  if (!apiKey) throw new Error('Missing Groq API key');
  
  const response = await fetch(GROQ_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: GROQ_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are a helpful medical assistant. Provide clear, accurate, and concise responses.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature: 0.3,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error?.error?.message || 
      error?.message || 
      `Groq API error: ${response.status}`
    );
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error('No content in Groq response');
  }
  return content;
}

async function queryOllama(model: string, prompt: string): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (OLLAMA_API_KEY) {
    headers.Authorization = `Bearer ${OLLAMA_API_KEY}`;
  }

  const response = await fetch(OLLAMA_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error?.error || `Ollama request failed (${response.status})`);
  }

  const data = await response.json();
  const text = data?.response;
  if (!text) {
    throw new Error('No response from Ollama');
  }
  return text;
}

export async function runHybridLLM(prompt: string): Promise<HybridAIResult> {
  const settings = await getAiSettings();
  const groqApiKey = settings.groqApiKey || process.env.GROQ_API_KEY || '';
  if (groqApiKey) {
    try {
      const text = await queryGroq(groqApiKey, prompt);
      if (text && text.trim()) {
        return { provider: 'groq', text, raw: text };
      }
    } catch (error: any) {
      console.warn('Groq AI failed, falling back to Ollama:', error?.message || error);
    }
  }

  const model = settings.ollamaModel || DEFAULT_OLLAMA_MODEL;
  const text = await queryOllama(model, prompt);
  return { provider: 'ollama', text, raw: text };
}

export function formatProviderLabel(provider: 'groq' | 'ollama'): string {
  return provider === 'groq' ? 'Using Groq AI...' : 'Using Local AI (Ollama - Offline)...';
}
