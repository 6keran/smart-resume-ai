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

async function checkModels() {
  if (!apiKey) {
    console.log('No GEMINI_API_KEY configured in .env.local');
    return;
  }
  console.log('Connecting to Google GenAI with configured key...');
  const ai = new GoogleGenAI({ apiKey });
  
  try {
    const pager = await ai.models.list();
    console.log('Available models from API:');
    let count = 0;
    for await (const m of pager) {
      if (m.name.includes('gemini') && m.name.includes('flash')) {
        console.log(` - ${m.name}`);
        count++;
      }
    }
    console.log(`Total flash models: ${count}`);
  } catch (err) {
    console.error('Error querying models.list():', err.message);
  }
}

checkModels();
