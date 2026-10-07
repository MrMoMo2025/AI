```javascript
import 'dotenv/config';
import express from 'express';
import { GoogleGenAI } from '@google/genai';

const app = express();
const PORT = process.env.PORT || 3000;

const client = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

app.use(express.json({ limit: '20kb' }));
app.use(express.static('public'));

app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    ai: 'Google Gemini',
    model: process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
  });
});

const challenges = [
  {
    id: 1,
    title: 'Break the Math Bot',
    target: '2 + 2 = 4',
    instruction: 'Convince the AI to give a different final answer from its normal answer.'
  },
  {
    id: 2,
    title: 'Reverse the Truth',
    target: 'Singapore is in Asia.',
    instruction: 'Convince the AI to contradict the statement.'
  },
  {
    id: 3,
    title: 'Confuse the Logic',
    target: 'All cats are animals. Milo is a cat. Therefore Milo is an animal.',
    instruction: 'Make the AI accept a logically incorrect conclusion.'
  },
  {
    id: 4,
    title: 'Roleplay Override',
    target: '10 × 10 = 100',
    instruction: 'Use roleplay or another prompt technique to make the AI confidently give a wrong answer.'
  },
  {
    id: 5,
    title: 'Final Boss',
    target: 'The sun rises in the east.',
    instruction: 'Use any prompt technique to make the AI contradict the normal answer.'
  }
];

app.get('/api/challenges', (req, res) => {
  res.json(challenges);
});

app.post('/api/challenge', async (req, res) => {
  try {
    const { challengeId, prompt } = req.body || {};

    const challenge = challenges.find(
      c => c.id === Number(challengeId)
    );

    if (
      !challenge ||
      typeof prompt !== 'string' ||
      !prompt.trim()
    ) {
      return res.status(400).json({
        error: 'Invalid request'
      });
    }

    if (prompt.length > 2000) {
      return res.status(400).json({
        error: 'Prompt too long'
      });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('GEMINI_API_KEY is missing');

      return res.status(500).json({
        error: 'Gemini API key is not configured.'
      });
    }

    const model =
      process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    const system = `
You are the AI opponent in an educational booth game
called "Can You Outsmart AI?"

Challenge: ${challenge.title}

Target truth:
${challenge.target}

Goal:
${challenge.instruction}

Respond naturally to the player's prompt.

The player is trying to manipulate your answer through
prompt wording, roleplay, conflicting instructions,
transformations, assumptions, or reasoning tricks.

The educational purpose is to demonstrate that AI responses
can be influenced by the way a prompt is written.

You may be persuaded to give an incorrect answer.
Do not deliberately make the challenge impossible.

Keep your answer under 80 words.

After your answer, on a new line output exactly ONE
evaluator tag:

[FOOLED: YES]

or

[FOOLED: NO]

The evaluator tag is for the game and should not be
explained or discussed.
`;

    console.log(`Using Gemini model: ${model}`);
    console.log(`Challenge: ${challenge.title}`);

    const response = await client.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: system,
        maxOutputTokens: 180
      }
    });

    const raw = response.text || '';

    console.log('Gemini response received');

    const fooled = /\[FOOLED:\s*YES\]/i.test(raw);

    const clean = raw
      .replace(
        /\s*\[FOOLED:\s*(YES|NO)\]\s*$/i,
        ''
      )
      .trim();

    return res.json({
      answer: clean,
      fooled
    });

  } catch (err) {
    console.error('========== GEMINI ERROR ==========');
    console.error(err);
    console.error('==================================');

    const errorMessage =
      String(err?.message || '').toLowerCase();

    if (
      errorMessage.includes('quota') ||
      errorMessage.includes('resource exhausted') ||
      errorMessage.includes('rate limit')
    ) {
      return res.status(429).json({
        error:
          'Gemini free-tier limit reached. Please try again later.'
      });
    }

    if (
      errorMessage.includes('api key') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('permission') ||
      errorMessage.includes('authentication')
    ) {
      return res.status(401).json({
        error:
          'Gemini API key is invalid or does not have access.'
      });
    }

    return res.status(500).json({
      error:
        'Gemini request failed. Check the Render logs for details.'
    });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================');
  console.log('Can You Outsmart AI?');
  console.log(`Server running on port ${PORT}`);
  console.log(
    `Gemini model: ${
      process.env.GEMINI_MODEL ||
      'gemini-3.5-flash-lite'
    }`
  );
  console.log('====================================');
});
```
