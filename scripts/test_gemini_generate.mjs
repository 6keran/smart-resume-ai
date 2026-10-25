import { GoogleGenAI } from '@google/genai';
import fs from 'fs';
import path from 'path';

function loadEnv() {
  const envFile = path.join(process.cwd(), '.env.local');
  if (fs.existsSync(envFile)) {
    const content = fs.readFileSync(envFile, 'utf8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}
loadEnv();

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

async function testGeneration() {
  const ai = new GoogleGenAI({ apiKey });
  const testModels = ['gemini-2.5-flash', 'gemini-3.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];

  for (const model of testModels) {
    try {
      const start = Date.now();
      const res = await ai.models.generateContent({
        model,
        contents: 'Respond with exactly: "OK"',
      });
      console.log(`[PASS] ${model} responded in ${Date.now() - start}ms: "${res.text?.trim()}"`);
    } catch (err) {
      console.log(`[FAIL] ${model} failed: ${err.message}`);
    }
  }
}

testGeneration();
