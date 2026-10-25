const fs = require('fs');
const readline = require('readline');

async function processFile() {
  const fileStream = fs.createReadStream('C:/Users/SAI/.gemini/antigravity-ide/brain/b9142b0b-dd3f-40c5-9cc6-d0acca78c124/.system_generated/logs/transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    if (line.includes('VISUAL REDESIGN CORRECTION')) {
      const data = JSON.parse(line);
      fs.writeFileSync('C:/Users/SAI/.gemini/antigravity-ide/brain/b9142b0b-dd3f-40c5-9cc6-d0acca78c124/scratch/correction.md', data.content || JSON.stringify(data), 'utf8');
      console.log('Saved correction prompt successfully');
      return;
    }
  }
  console.log('Not found');
}

processFile();
