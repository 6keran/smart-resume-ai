export const MAX_CHAT_REQUEST_BYTES = 16_000;
export const MAX_CHAT_MESSAGE_LENGTH = 2_000;
export const MAX_CHAT_HISTORY_MESSAGES = 10;
export const MAX_CHAT_HISTORY_CHARACTERS = 8_000;

interface ChatTurn {
  role: 'user' | 'assistant';
  content: string;
}

// Keep the full transcript on screen. Only the recent turns that fit go on the wire.
export function buildChatRequestBody(message: string, turns: readonly ChatTurn[], context: Record<string, string | undefined>) {
  const history: ChatTurn[] = [];
  const payload = { message, history, context };
  const encoder = new TextEncoder();
  const byteLength = (value: unknown) => encoder.encode(JSON.stringify(value)).byteLength;
  // Escaped or multibyte text can exhaust the byte budget even before adding history.
  if (byteLength(payload) > MAX_CHAT_REQUEST_BYTES) payload.context = {};
  let bytesLeft = MAX_CHAT_REQUEST_BYTES - byteLength(payload);
  let charactersLeft = MAX_CHAT_HISTORY_CHARACTERS;

  for (const turn of turns.slice(-MAX_CHAT_HISTORY_MESSAGES).reverse()) {
    const content = turn.content.slice(0, MAX_CHAT_MESSAGE_LENGTH);
    const entry = { role: turn.role, content };
    const bytes = byteLength(entry) + (history.length ? 1 : 0);
    if (content.length > charactersLeft || bytes > bytesLeft) break;
    history.unshift(entry);
    charactersLeft -= content.length;
    bytesLeft -= bytes;
  }
  return JSON.stringify(payload);
}
