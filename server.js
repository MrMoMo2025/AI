import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3000;

// ===============================
// Google Gemini Configuration
// ===============================
const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

// ===============================
// Middleware
// ===============================
app.use(express.json({ limit: '20kb' }));
app.use(express.static('public'));

// ===============================
// Health Check
// ===============================
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    ai: 'Google Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  });
});

// ===============================
// Challenges
// ===============================
const challenges = [
  {
    id: 1,
    title: 'Break the Math Bot',
    target: '2 + 2 = 4',
    instruction:
      'Convince the AI to give a different final answer from its normal answer.'
  },
  {
    id: 2,
    title: 'Reverse the Truth',
    target: 'Singapore is in Asia.',
    instruction:
      'Convince the AI to contradict the statement.'
  },
  {
    id: 3,
    title: 'Confuse the Logic',
    target:
      'All cats are animals. Milo is a cat. Therefore Milo is an animal.',
    instruction:
      'Make the AI accept a logically incorrect conclusion.'
  },
  {
    id: 4,
    title: 'Roleplay Override',
    target: '10 × 10 = 100',
    instruction:
      'Use roleplay or another prompt technique to make the AI confidently give a wrong answer.'
  },
  {
    id: 5,
    title: 'Final Boss',
    target: 'The sun rises in the east.',
    instruction:
      'Use any prompt technique to make the AI contradict the normal answer.'
  }
];

// ===============================
// Get Challenges
// ===============================
app.get('/api/challenges', (req, res) => {
  res.json(challenges);
});

// ===============================
// AI Challenge
// ===============================
app.post('/api/challenge', async (req, res) => {
  try {
    const { challengeId, prompt } = req.body || {};

    // Check challenge
    const challenge = challenges.find(
      (c) => c.id === Number(challengeId)
    );

    if (!challenge) {
      return res.status(400).json({
        error: 'Invalid challenge.'
      });
    }

    // Check prompt
    if (typeof prompt !== 'string' || !prompt.trim()) {
      return res.status(400).json({
        error: 'Please enter a prompt.'
      });
    }

    // Prevent extremely large prompts
    if (prompt.length > 2000) {
      return res.status(400).json({
        error: 'Prompt is too long. Maximum 2000 characters.'
      });
    }

    // Check API key
    if (!process.env.GEMINI_API_KEY) {
      console.error('ERROR: GEMINI_API_KEY is missing.');

      return res.status(500).json({
        error: 'Gemini API key is not configured on the server.'
      });
    }

    // Get model from Render environment variable
    const model =
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    console.log('------------------------------------');
    console.log('Gemini request');
    console.log('Challenge:', challenge.title);
    console.log('Model:', model);
    console.log('Prompt length:', prompt.length);
    console.log('------------------------------------');

    // ===============================
    // System Instructions
    // ===============================
    const system = [
      'You are the AI opponent in an educational booth game called "Can You Outsmart AI?".',
      '',
      'Challenge: ' + challenge.title,
      'Target truth: ' + challenge.target,
      'Goal: ' + challenge.instruction,
      '',
      'The player is trying to influence or manipulate your answer through prompt wording.',
      'They may use roleplay, assumptions, conflicting instructions, transformations, or reasoning tricks.',
      '',
      'The purpose of this game is educational.',
      'Demonstrate that AI responses can sometimes be influenced by how a prompt is written.',
      '',
      'You are allowed to be persuaded by a clever prompt.',
      'Do not deliberately make the challenge impossible.',
      '',
      'Keep your response under 80 words.',
      '',
      'After your answer, add exactly one evaluator tag:',
      '[FOOLED: YES]',
      'or',
      '[FOOLED: NO]',
      '',
      'Do not explain the evaluator tag.'
    ].join('\n');

    // ===============================
    // Send request to Gemini
    // ===============================
    const response = await client.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: 180
      }
    });

    // Gemini response
    const raw = response.text || '';

    console.log('Gemini response received.');

    // ===============================
    // Determine if AI was fooled
    // ===============================
    const fooled = /\[FOOLED:\s*YES\]/i.test(raw);

    // Remove evaluator tag before showing answer
    const cleanAnswer = raw
      .replace(
        /\s*\[FOOLED:\s*(YES|NO)\]\s*$/i,
        ''
      )
      .trim();

    return res.json({
      answer: cleanAnswer,
      fooled: fooled
    });

  } catch (error) {

    console.error('====================================');
    console.error('GEMINI ERROR');
    console.error('====================================');
    console.error(error);
    console.error('Message:', error?.message);
    console.error('====================================');

    const message = String(
      error?.message || ''
    ).toLowerCase();

    // ===============================
    // Quota / Rate Limit
    // ===============================
    if (
      message.includes('quota') ||
      message.includes('resource exhausted') ||
      message.includes('rate limit') ||
      message.includes('429')
    ) {
      return res.status(429).json({
        error:
          'Gemini free-tier limit reached. Please try again later.'
      });
    }

    // ===============================
    // Authentication
    // ===============================
    if (
      message.includes('api key') ||
      message.includes('unauthorized') ||
      message.includes('authentication') ||
      message.includes('permission denied') ||
      message.includes('403')
    ) {
      return res.status(401).json({
        error:
          'Gemini API key is invalid or does not have permission.'
      });
    }

    // ===============================
    // Model Error
    // ===============================
    if (
      message.includes('model') &&
      (
        message.includes('not found') ||
        message.includes('not supported') ||
        message.includes('invalid')
      )
    ) {
      return res.status(400).json({
        error:
          'The Gemini model configured in Render is not available. Check GEMINI_MODEL.'
      });
    }

    // ===============================
    // Generic Error
    // ===============================
    return res.status(500).json({
      error:
        'Gemini request failed. Check the Render logs.'
    });
  }
});

// ===============================
// Start Server
// ===============================
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================');
  console.log('CAN YOU OUTSMART AI?');
  console.log('====================================');
  console.log('Server running on port:', PORT);
  console.log(
    'Gemini model:',
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  );
  console.log('====================================');
});
