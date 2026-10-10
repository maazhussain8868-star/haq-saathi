// Netlify Serverless Function: /.netlify/functions/ai
// Proxies Anthropic API with CORS, length limits, rate limiting, and server-side PII redaction

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;
const ipRequestCounts = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const clientData = ipRequestCounts.get(ip) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW_MS };

  if (now > clientData.resetTime) {
    clientData.count = 1;
    clientData.resetTime = now + RATE_LIMIT_WINDOW_MS;
    ipRequestCounts.set(ip, clientData);
    return false;
  }

  clientData.count += 1;
  ipRequestCounts.set(ip, clientData);
  return clientData.count > MAX_REQUESTS_PER_WINDOW;
}

// Server-side PII Redaction
function sanitizeServerPii(text) {
  if (!text || typeof text !== 'string') return text;
  return text
    .replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[EMAIL REDACTED]')
    .replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/gi, '[PAN REDACTED]')
    .replace(/\b[2-9]\d{3}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[AADHAAR REDACTED]')
    .replace(/(?:(?:\+91|91|0)[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/g, '[PHONE REDACTED]')
    .replace(/\b\d{9,18}\b/g, '[ACCOUNT NUMBER REDACTED]');
}

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
};

export const handler = async (event, context) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ok: true })
    };
  }

  const clientIp = (event.headers && (event.headers['x-forwarded-for'] || event.headers['client-ip'])) || 'anonymous';
  if (isRateLimited(clientIp)) {
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Too many requests. Please wait a minute before trying again.'
      })
    };
  }

  // Health check / GET support
  if (event.httpMethod === 'GET') {
    const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        service: 'haq-saathi-ai-proxy',
        status: 'online',
        hasApiKey: hasKey,
        model: process.env.MODEL || 'claude-3-5-sonnet-20241022',
        demoMode: !hasKey || process.env.DEMO_MODE === 'true',
        piiRedaction: 'active',
        timestamp: new Date().toISOString()
      })
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ ok: false, error: 'Method not allowed. Use POST.' })
    };
  }

  try {
    let body = {};
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    }

    const { prompt, messages, system, max_tokens = 1200, temperature = 0.2, demoMode = false } = body;

    // Input length limit (8,000 characters)
    const promptLength = (prompt ? prompt.length : 0) + (messages ? JSON.stringify(messages).length : 0);
    if (promptLength > 8000) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          ok: false,
          error: 'Input exceeds maximum allowed length of 8000 characters.'
        })
      };
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    const model = process.env.MODEL || 'claude-3-5-sonnet-20241022';

    // Sanitize user inputs on server side as well
    const sanitizedPrompt = prompt ? sanitizeServerPii(prompt) : '';
    let sanitizedMessages = messages;
    if (Array.isArray(messages)) {
      sanitizedMessages = messages.map(m => ({
        role: m.role,
        content: typeof m.content === 'string' ? sanitizeServerPii(m.content) : m.content
      }));
    }

    // Demo / fallback mode if no key or requested
    if (!apiKey || demoMode || process.env.DEMO_MODE === 'true') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          mode: 'demo_cached',
          model: `${model} (demo simulation)`,
          reply: `[Demo Mode / Haq Saathi Serverless AI Proxy]\nPrompt received and sanitized: "${sanitizedPrompt.slice(0, 100)}..."`,
          timestamp: new Date().toISOString()
        })
      };
    }

    // Prepare Anthropic messages payload
    const formattedMessages = sanitizedMessages || [{ role: 'user', content: sanitizedPrompt || 'Hello from Haq Saathi' }];

    const payload = {
      model,
      max_tokens,
      temperature,
      messages: formattedMessages
    };

    if (system) {
      payload.system = system;
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          ok: false,
          error: `Anthropic API error: ${response.status}`,
          details: errText
        })
      };
    }

    const data = await response.json();
    const replyText = data.content && data.content[0] ? data.content[0].text : '';

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        mode: 'live',
        model: data.model,
        reply: replyText,
        usage: data.usage,
        timestamp: new Date().toISOString()
      })
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        ok: false,
        error: 'Internal server error in AI proxy',
        details: err.message
      })
    };
  }
};
