// eslint-disable-next-line no-control-regex
const ANSI = /\u001b\[[0-9;]*m/g;
const JWT = /eyJ[\w-]{10,}\.[\w-]{10,}\.[\w-]{10,}/g;
const BEARER = /Bearer\s+[\w.-]{10,}/gi;
const API_KEY = /sk-ant-[\w-]{10,}/g;

/**
 * Removes terminal colour codes and anything that looks like a credential
 * before error text is written to a report or sent to an external API.
 */
export function sanitize(text: string, maxLength = 4000): string {
  const cleaned = text
    .replace(ANSI, '')
    .replace(JWT, '<redacted-jwt>')
    .replace(BEARER, 'Bearer <redacted>')
    .replace(API_KEY, '<redacted-api-key>');
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}\n…[truncated]` : cleaned;
}
