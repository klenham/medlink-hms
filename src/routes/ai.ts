import express from 'express';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';
import { getAiSettings, saveAiSettings, runHybridLLM } from '../lib/ai.js';

const router = express.Router();

function extractICD10Codes(text: string): string[] {
  const matches = Array.from(new Set(text.match(/[A-Z][0-9]{1,2}(?:\.[0-9]{1,4})?/g) || []));
  return matches.slice(0, 5);
}

function tryParseJson(text: string): any | null {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/(\{[\s\S]*\})/m);
    if (match) {
      try { return JSON.parse(match[1]); } catch { return null; }
    }
    return null;
  }
}

router.get('/settings', authenticateToken, authorizeRole(['admin']), async (_req, res) => {
  try {
    const settings = await getAiSettings();
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/settings', authenticateToken, authorizeRole(['admin']), async (req: any, res) => {
  try {
    const settings = await saveAiSettings({
      groqApiKey: req.body.groqApiKey || '',
      ollamaModel: req.body.ollamaModel || 'llama2',
    });
    res.json(settings);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/consultation/improve', authenticateToken, async (req: any, res) => {
  const { illness = '', treatment = '', notes = '' } = req.body;
  const before = [illness.trim(), treatment.trim(), notes.trim()].filter(Boolean).join('\n\n');
  if (!before) return res.status(400).json({ error: 'Provide at least one clinical field to improve' });

  try {
    const prompt = `You are a clinical documentation assistant. Convert the following consultation draft into a clean structured clinical note for medical staff. Include the key findings, assessment, and plan. Also suggest up to three likely ICD-10 codes based on the diagnosis. Return the response in JSON with keys \"improved_note\" and \"icd10_codes\" when possible.\n\nInput:\n${before}`;
    const result = await runHybridLLM(prompt);
    const parsed = tryParseJson(result.text);
    const improved = parsed?.improved_note || parsed?.summary || result.text;
    const codes = parsed?.icd10_codes || extractICD10Codes(result.text);
    res.json({
      provider: result.provider,
      before,
      after: improved,
      icd10Codes: Array.isArray(codes) ? codes : [],
      raw: result.text,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/consultation/medications', authenticateToken, async (req: any, res) => {
  const { illness = '', treatment = '', notes = '' } = req.body;
  const source = [illness.trim(), treatment.trim(), notes.trim()].filter(Boolean).join('\n\n');
  if (!source) return res.status(400).json({ error: 'Provide at least one clinical field to suggest medications' });

  try {
    const prompt = `You are a clinical decision support assistant. Based on the consultation draft below, suggest a list of appropriate medications or drug classes for the diagnosis, including general dose guidance and route of administration when applicable. Return the result as JSON with keys \"suggested_medications\" and \"rationale\" when possible.\n\nConsultation draft:\n${source}`;
    const result = await runHybridLLM(prompt);
    const parsed = tryParseJson(result.text);
    const meds = Array.isArray(parsed?.suggested_medications)
      ? parsed.suggested_medications.map(String)
      : (parsed?.medications || parsed?.recommendations || []).map(String);
    res.json({
      provider: result.provider,
      suggestedMedications: meds.length ? meds : [result.text],
      raw: result.text,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/consultation/discharge', authenticateToken, async (req: any, res) => {
  const { patientName = 'Patient', illness = '', treatment = '', notes = '', followUp = '' } = req.body;
  const source = [illness.trim(), treatment.trim(), notes.trim()].filter(Boolean).join('\n\n');
  if (!source) return res.status(400).json({ error: 'Provide consultation details for discharge summary' });

  try {
    const prompt = `You are a clinical assistant. Create a patient-friendly discharge note for ${patientName} based on the consultation summary below. Include a simple statement of the diagnosis, a short summary of the treatment plan, and clear follow-up instructions the patient can understand. Use accessible language and keep the note concise. If follow-up guidance is not included in the input, add a general follow-up recommendation.\n\nConsultation summary:\n${source}`;
    const result = await runHybridLLM(prompt);
    const parsed = tryParseJson(result.text);
    const summary = parsed?.discharge_note || parsed?.summary || result.text;
    const followUpInstructions = parsed?.follow_up || parsed?.followUp || '';
    res.json({
      provider: result.provider,
      dischargeSummary: summary,
      followUpInstructions: followUpInstructions || '',
      raw: result.text,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
