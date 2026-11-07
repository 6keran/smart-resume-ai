import assert from 'node:assert/strict';
import Module from 'node:module';

// Intercept server-only for standalone script execution
const origLoad = Module._load;
Module._load = function (id, ...args) {
  if (id === 'server-only') return {};
  return origLoad.apply(this, [id, ...args]);
};

const BASE_URL = 'http://localhost:3000';

console.log('================================================================');
console.log('🤖 SMART RESUME AI: CHATBOT IDENTITY VERIFICATION SUITE');
console.log('================================================================\n');

let passed = 0;
let failed = 0;

function pass(name, detail = '') {
  passed++;
  console.log(`  ✅ [PASS] Test ${passed}: ${name}${detail ? ` (${detail})` : ''}`);
}

function fail(name, error) {
  failed++;
  console.error(`  ❌ [FAIL] ${name}:`, error);
}

async function runTests() {
  const { getDeterministicCareerChatResponse } = await import('../src/server/services/careerIntelligence.ts');
  const { getChatPolicyRefusal } = await import('../src/server/services/chatSafety.ts');

  // Test 1: Policy Guard allows "What is your name?"
  try {
    const refusal = getChatPolicyRefusal('What is your name?', []);
    assert.strictEqual(refusal, null, 'Identity question should not be refused by policy guard');
    pass('Policy guard permits "What is your name?" without refusal');
  } catch (err) {
    fail('Policy guard check for "What is your name?"', err);
  }

  // Test 2: Policy Guard allows "Who are you?"
  try {
    const refusal = getChatPolicyRefusal('Who are you?', []);
    assert.strictEqual(refusal, null, 'Identity question should not be refused by policy guard');
    pass('Policy guard permits "Who are you?" without refusal');
  } catch (err) {
    fail('Policy guard check for "Who are you?"', err);
  }

  // Test 3: Response to "What is your name?"
  try {
    const reply = getDeterministicCareerChatResponse('What is your name?');
    assert.ok(reply.includes("I'm your AI Assistant"), `Response must say "I'm your AI Assistant", got: ${reply}`);
    assert.ok(!reply.toLowerCase().includes('alex'), `Response must never mention Alex, got: ${reply}`);
    pass('Chatbot responds to "What is your name?" with "I\'m your AI Assistant."');
  } catch (err) {
    fail('Name inquiry response', err);
  }

  // Test 4: Response to "Who are you?"
  try {
    const reply = getDeterministicCareerChatResponse('Who are you?');
    assert.ok(reply.includes("I'm your AI Assistant"), `Response must say "I'm your AI Assistant", got: ${reply}`);
    assert.ok(!reply.toLowerCase().includes('alex'), `Response must never mention Alex, got: ${reply}`);
    pass('Chatbot responds to "Who are you?" with "I\'m your AI Assistant."');
  } catch (err) {
    fail('Identity inquiry response', err);
  }

  // Test 5: Response to "Are you Alex?"
  try {
    const reply = getDeterministicCareerChatResponse('Are you Alex?');
    assert.ok(reply.includes("I'm your AI Assistant"), `Response must say "I'm your AI Assistant", got: ${reply}`);
    pass('Chatbot clarifies identity when asked "Are you Alex?"');
  } catch (err) {
    fail('Alex inquiry response', err);
  }

  // Test 6: Fallback overview title
  try {
    const reply = getDeterministicCareerChatResponse('Hello there!');
    assert.ok(reply.includes('Smart Resume AI Assistant'), 'Overview must header with Smart Resume AI Assistant');
    assert.ok(!reply.includes('Career Mentor') || reply.includes('Smart Resume AI Assistant'), 'Uses AI Assistant header');
    pass('Overview fallback uses "Smart Resume AI Assistant" header');
  } catch (err) {
    fail('Overview fallback title', err);
  }

  // Test 7: Live HTTP API test for "What is your name?" with authenticated user session
  try {
    const timestamp = Date.now();
    const testIp = `127.0.5.${Math.floor(Math.random() * 200) + 1}`;
    const regRes = await fetch(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-forwarded-for': testIp,
      },
      body: JSON.stringify({
        fullName: 'Taylor Student',
        email: `taylor.identity.${timestamp}@mit.edu`,
        password: 'Password123!',
        confirmPassword: 'Password123!',
      }),
    });
    assert.strictEqual(regRes.status, 200, `Reg failed with status ${regRes.status}`);
    const setCookies = regRes.headers.getSetCookie ? regRes.headers.getSetCookie() : [regRes.headers.get('set-cookie') || ''];
    const sessionCookie = setCookies.find((c) => c.includes('sra_user_session='));
    const token = sessionCookie?.match(/sra_user_session=([^;]+)/)?.[1] || '';
    assert.ok(token, 'Session token extracted');

    const res = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: `sra_user_session=${token}`,
      },
      body: JSON.stringify({ message: 'What is your name?' }),
    });
    const data = await res.json();
    assert.strictEqual(res.status, 200, `Expected status 200, got ${res.status}`);
    const reply = data.reply || data.response || data.message || '';
    assert.ok(
      reply.includes('AI Assistant') || reply.includes('Assistant'),
      `Live chat response should identify as AI Assistant, got: "${reply}"`
    );
    assert.ok(!reply.toLowerCase().includes('alex'), `Live response must not contain "Alex", got: "${reply}"`);
    pass('Live HTTP POST /api/chat responds identifying as AI Assistant without "Alex"', `Reply: "${reply.slice(0, 80)}..."`);
  } catch (err) {
    fail('Live HTTP API chatbot name check', err);
  }

  console.log('\n================================================================');
  console.log(`RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log('================================================================');
  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
