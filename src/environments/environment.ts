/**
 * Runtime configuration.
 *
 * To connect a real backend later: set `useMock` to `false` and point `apiUrl`
 * at the server. No component needs to change (see docs/BACKEND-HANDOVER.md).
 */
export const environment = {
  production: false,
  /** true = serve data from in-memory mocks (static demo). false = call `apiUrl`. */
  useMock: true,
  apiUrl: 'https://api.example.com',
  supportWhatsAppE164: '18493616245',
  instagramUrl: 'https://www.instagram.com/rifasluxury_rd2/',
  /** Cloudflare Turnstile site key. Ignored while `useMock` is true. */
  turnstileSiteKey: '',
};
