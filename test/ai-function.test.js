import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { handler } from '../netlify/functions/ai.js';

describe('Netlify Serverless AI Function (/.netlify/functions/ai)', () => {
  it('handles GET health check requests', async () => {
    const event = {
      httpMethod: 'GET',
      headers: {}
    };

    const res = await handler(event, {});
    assert.equal(res.statusCode, 200);

    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.equal(body.service, 'haq-saathi-ai-proxy');
    assert.equal(body.status, 'online');
    assert.ok(body.timestamp);
  });

  it('handles OPTIONS preflight with CORS headers', async () => {
    const event = {
      httpMethod: 'OPTIONS',
      headers: {}
    };

    const res = await handler(event, {});
    assert.equal(res.statusCode, 200);
    assert.equal(res.headers['Access-Control-Allow-Origin'], '*');
    assert.ok(res.headers['Access-Control-Allow-Methods'].includes('POST'));
  });

  it('handles POST test prompt and returns a model reply', async () => {
    const event = {
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        prompt: 'Farmer hailstorm test prompt',
        demoMode: true
      })
    };

    const res = await handler(event, {});
    assert.equal(res.statusCode, 200);

    const body = JSON.parse(res.body);
    assert.equal(body.ok, true);
    assert.ok(body.reply.length > 0);
    assert.ok(body.model);
  });

  it('rejects oversized prompts (>8000 characters) with 400', async () => {
    const longPrompt = 'a'.repeat(8500);
    const event = {
      httpMethod: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prompt: longPrompt })
    };

    const res = await handler(event, {});
    assert.equal(res.statusCode, 400);

    const body = JSON.parse(res.body);
    assert.equal(body.ok, false);
    assert.match(body.error, /exceeds maximum allowed length/);
  });
});
