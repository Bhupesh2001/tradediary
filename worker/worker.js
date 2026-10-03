// Cloudflare Worker: AI proxy. Add secret ANTHROPIC_KEY in the Worker settings.
// Change ALLOWED_ORIGIN to your GitHub Pages origin.
const ALLOWED_ORIGIN = 'https://bhupesh2001.github.io';

export default {
  async fetch(req, env) {
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: cors });

    const { system, prompt } = await req.json();
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1000,
        system: String(system || '').slice(0, 60000),
        messages: [{ role: 'user', content: String(prompt).slice(0, 4000) }],
      }),
    });
    return new Response(await r.text(), { status: r.status, headers: { ...cors, 'Content-Type': 'application/json' } });
  },
};
