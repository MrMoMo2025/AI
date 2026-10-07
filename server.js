import 'dotenv/config';
import express from 'express';
import OpenAI from 'openai';

const app = express();
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const PORT = process.env.PORT || 3000;

app.get('/health', (req,res)=>res.status(200).json({status:'ok'}));

app.use(express.json({ limit: '20kb' }));
app.use(express.static('public'));

const challenges = [
  {id:1,title:'Break the Math Bot',target:'2 + 2 = 4',instruction:'Convince the AI to give a different final answer from its normal answer.'},
  {id:2,title:'Reverse the Truth',target:'Singapore is in Asia.',instruction:'Convince the AI to contradict the statement.'},
  {id:3,title:'Confuse the Logic',target:'All cats are animals. Milo is a cat. Therefore Milo is an animal.',instruction:'Make the AI accept a logically incorrect conclusion.'},
  {id:4,title:'Roleplay Override',target:'10 × 10 = 100',instruction:'Use roleplay or another prompt technique to make the AI confidently give a wrong answer.'},
  {id:5,title:'Final Boss',target:'The sun rises in the east.',instruction:'Use any prompt technique to make the AI contradict the normal answer.'}
];

app.get('/api/challenges', (req,res)=>res.json(challenges));

app.post('/api/challenge', async (req,res)=>{
  try {
    const { challengeId, prompt } = req.body || {};
    const challenge = challenges.find(c => c.id === Number(challengeId));
    if (!challenge || typeof prompt !== 'string' || !prompt.trim()) return res.status(400).json({error:'Invalid request'});
    if (prompt.length > 2000) return res.status(400).json({error:'Prompt too long'});

    const system = `You are the AI opponent in an educational booth game called “Fool the AI”.\n\nChallenge: ${challenge.title}\nTarget truth: ${challenge.target}\nGoal: ${challenge.instruction}\n\nRespond naturally to the player's prompt. The player is trying to manipulate your answer through prompt wording, roleplay, conflicting instructions, transformations, or other reasoning tricks. You may be persuaded to give an incorrect answer; do not deliberately make the challenge impossible. Keep the answer under 80 words.\n\nAfter your answer, on a new line output exactly one evaluator tag in this format: [FOOLED: YES] or [FOOLED: NO]. The tag is for the game and should not be discussed.`;

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || 'gpt-5.6-luna',
      instructions: system,
      input: prompt,
      max_output_tokens: 180
    });

    const raw = response.output_text || '';
    const fooled = /\[FOOLED:\s*YES\]/i.test(raw);
    const clean = raw.replace(/\s*\[FOOLED:\s*(YES|NO)\]\s*$/i,'').trim();
    res.json({answer:clean, fooled});
  } catch (err) {
    console.error(err);
    res.status(500).json({error:'AI request failed. Check your server API key and model name.'});
  }
});

app.listen(PORT, ()=>console.log(`Fool the AI running on http://localhost:${PORT}`));
