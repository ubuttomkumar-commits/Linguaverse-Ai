import 'dotenv/config';
import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  evaluateSpeakingTurnWithGemini,
  SPEAKING_GEMINI_MODEL,
  SpeakingApiError,
} from './server/geminiSpeaking.ts';
import { evaluateTransferChallengeWithGemini } from './server/geminiTransfer.ts';
import { analyzeLandingSentenceWithGemini } from './server/geminiSampleAnalyze.ts';
import { sendOtpEmailFromServer } from './server/emailService.ts';
import { analyzeSampleSentence } from './src/domain/sampleAnalyzer.ts';
import type { SpeakingEvaluationRequest } from './src/domain/speakingEvaluation.ts';
import type { TransferEvaluationRequest } from './src/domain/transferLabEngine.ts';
import { normalizePressureLevel } from './src/domain/pressureLadder.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // Server health & configuration check (never leaks secrets)
  app.get('/api/speaking/health', (_req, res) => {
    const rawKey = process.env.GEMINI_API_KEY?.trim() ?? '';
    const configured = Boolean(rawKey) && rawKey !== 'MY_GEMINI_API_KEY';
    res.json({
      ok: true,
      configured,
      model: SPEAKING_GEMINI_MODEL,
    });
  });

  // Strict JSON Gemini evaluation endpoint for AI Speaking Studio
  app.post('/api/speaking/evaluate', async (req, res) => {
    try {
      const body = req.body as Partial<SpeakingEvaluationRequest> | undefined;
      if (!body || typeof body.userTranscript !== 'string' || !body.userTranscript.trim()) {
        res.status(400).json({
          error: 'Please speak or type a response before submitting.',
          code: 'EMPTY_TRANSCRIPT',
        });
        return;
      }

      const payload: SpeakingEvaluationRequest = {
        modeId: body.modeId ?? 'daily_conversations',
        pressureLevel: body.pressureLevel ?? 'level_2_guided',
        userTranscript: body.userTranscript.trim().slice(0, 2000),
        inputChannel: body.inputChannel ?? 'text_fallback',
        learnerLevel: body.learnerLevel ?? 'A2',
        explanationLanguage: body.explanationLanguage ?? 'both',
        history: Array.isArray(body.history) ? body.history.slice(-10) : [],
        timedOut: Boolean(body.timedOut),
      };

      const result = await evaluateSpeakingTurnWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }

      const fallbackMessage =
        err instanceof Error ? err.message : 'Unexpected server error during evaluation.';
      res.status(500).json({
        error: fallbackMessage,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Strict 4-Rubric Gemini Grading endpoint for Transfer Lab
  app.post('/api/transfer/evaluate', async (req, res) => {
    try {
      const body = req.body as Partial<TransferEvaluationRequest> | undefined;
      if (!body || typeof body.userResponse !== 'string' || !body.userResponse.trim()) {
        res.status(400).json({
          error: 'Please speak or type your scenario response before submitting.',
          code: 'EMPTY_RESPONSE',
        });
        return;
      }

      const payload: TransferEvaluationRequest = {
        scenarioId: body.scenarioId ?? 'job_interview_followup',
        pressureLevel: normalizePressureLevel(body.pressureLevel),
        stage: body.stage === 'twist_followup' ? 'twist_followup' : 'initial',
        userResponse: body.userResponse.trim().slice(0, 2500),
        twistPromptShown:
          typeof body.twistPromptShown === 'string'
            ? body.twistPromptShown.trim().slice(0, 800)
            : undefined,
        twistResponse:
          typeof body.twistResponse === 'string'
            ? body.twistResponse.trim().slice(0, 2000)
            : undefined,
        targetSkillLabelEn:
          typeof body.targetSkillLabelEn === 'string' && body.targetSkillLabelEn.trim()
            ? body.targetSkillLabelEn.trim().slice(0, 300)
            : 'Accurate Real-World English Transfer',
        linkedMistakePattern:
          typeof body.linkedMistakePattern === 'string'
            ? body.linkedMistakePattern.trim().slice(0, 300)
            : undefined,
        inputChannel: body.inputChannel ?? 'text_fallback',
        learnerLevel: body.learnerLevel ?? 'A2',
        explanationLanguage: body.explanationLanguage ?? 'both',
        timedOut: Boolean(body.timedOut),
      };

      const result = await evaluateTransferChallengeWithGemini(payload);
      res.json(result);
    } catch (err) {
      if (err instanceof SpeakingApiError) {
        res.status(err.statusCode).json({
          error: err.message,
          code: err.code,
        });
        return;
      }

      const fallbackMessage =
        err instanceof Error ? err.message : 'Unexpected server error during Transfer Lab grading.';
      res.status(500).json({
        error: fallbackMessage,
        code: 'INTERNAL_ERROR',
      });
    }
  });

  // Public landing page sandbox sentence analyzer (zero-signup live preview)
  app.post('/api/landing/analyze', async (req, res) => {
    try {
      const body = req.body as { sentence?: unknown } | undefined;
      const sentence = typeof body?.sentence === 'string' ? body.sentence.trim().slice(0, 300) : '';
      if (!sentence) {
        res.status(400).json({ error: 'Please type an English sentence to analyze.' });
        return;
      }

      // First check instant deterministic Bangla-to-English interference rules
      const ruleResult = analyzeSampleSentence(sentence);
      if (ruleResult.hasDetectedMistake) {
        res.json({ analysis: ruleResult });
        return;
      }

      // For arbitrary custom sentences, attempt live Gemini bilingual analysis
      const geminiResult = await analyzeLandingSentenceWithGemini(sentence);
      if (geminiResult) {
        res.json({ analysis: geminiResult });
        return;
      }

      // Graceful honest fallback if server key is unavailable
      res.json({ analysis: ruleResult });
    } catch {
      const fallback = analyzeSampleSentence(
        typeof req.body?.sentence === 'string' ? req.body.sentence : ''
      );
      res.json({ analysis: fallback });
    }
  });

  // Server-side transactional OTP email dispatch (Resend / Brevo via env keys; honest local preview fallback when unset)
  app.post('/api/auth/send-otp', async (req, res) => {
    try {
      const body = req.body as { email?: unknown; name?: unknown; otpCode?: unknown } | undefined;
      const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
      const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 120) : 'Learner';
      const otpCode = typeof body?.otpCode === 'string' ? body.otpCode.replace(/\D/g, '').slice(0, 6) : '';
      if (!email || otpCode.length !== 6) {
        res.status(400).json({ error: 'Valid email and 6-digit OTP code are required.' });
        return;
      }

      const result = await sendOtpEmailFromServer({
        toEmail: email,
        recipientName: name,
        otpCode,
      });

      res.json({
        delivered: result.delivered,
        provider: result.provider,
        deliveryMode: result.delivered ? 'email_provider' : 'local_dev_preview',
      });
    } catch {
      res.json({
        delivered: false,
        provider: 'none',
        deliveryMode: 'local_dev_preview',
      });
    }
  });

  if (!IS_PROD) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) {
        next();
        return;
      }
      const indexHtml = path.join(distDir, 'index.html');
      if (fs.existsSync(indexHtml)) {
        res.sendFile(indexHtml);
      } else {
        res.status(404).send('Build output not found. Run npm run build first.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`LINGUAVERSE AI server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start LINGUAVERSE AI server:', err);
  process.exit(1);
});
