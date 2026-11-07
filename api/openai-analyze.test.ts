jest.mock('./_lib/auth', () => ({ requireUser: jest.fn(async () => ({ user: { id: 'u1' }, supabase: {} })) }));
jest.mock('./_lib/aiAccess', () => ({ enforceAiAccess: jest.fn(async () => true) }));
jest.mock('./_lib/aiUsageLog', () => ({ logAiUsage: jest.fn(async () => undefined) }));

import { estimateClaudeCostUsd } from '../lib/aiPricing';

function makeRes() {
    const res: any = { headers: {}, statusCode: 0, body: undefined };
    res.setHeader = (k: string, v: string) => { res.headers[k] = v; };
    res.status = (c: number) => { res.statusCode = c; return res; };
    res.json = (b: unknown) => { res.body = b; return res; };
    res.end = () => res;
    return res;
}
const req = (body: unknown) => ({ method: 'POST', body, headers: {} }) as any;

describe('api/openai-analyze (Claude)', () => {
    const realFetch = global.fetch;
    afterEach(() => { global.fetch = realFetch; jest.resetModules(); delete process.env.ANTHROPIC_API_KEY; });

    it('anahtar yoksa 500 ai_not_configured', async () => {
        delete process.env.ANTHROPIC_API_KEY;
        const handler = require('./openai-analyze').default;
        const res = makeRes();
        await handler(req({ prompt: 'merhaba' }), res);
        expect(res.statusCode).toBe(500);
        expect(res.body).toEqual({ error: 'ai_not_configured' });
    });

    it('Claude Messages API biçiminde çağırır ve metni döndürür', async () => {
        process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
        const fetchMock = jest.fn(async () => ({ ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'Harika bir oyun.' }], usage: { input_tokens: 100, output_tokens: 20 } }) }));
        global.fetch = fetchMock as any;
        const handler = require('./openai-analyze').default;
        const res = makeRes();
        await handler(req({ prompt: 'analiz et', generationConfig: { temperature: 0.2, maxOutputTokens: 500 } }), res);
        expect(res.statusCode).toBe(200);
        expect(res.body.text).toBe('Harika bir oyun.');
        const [url, init] = fetchMock.mock.calls[0] as any[];
        expect(url).toBe('https://api.anthropic.com/v1/messages');
        expect(init.headers['x-api-key']).toBe('sk-ant-test');
        expect(init.headers['anthropic-version']).toBe('2023-06-01');
        const sent = JSON.parse(init.body);
        expect(sent.max_tokens).toBe(500);
        expect(sent.messages).toEqual([{ role: 'user', content: 'analiz et' }]);
        expect(sent.temperature).toBeUndefined();
    });

    it('sağlayıcı hata ayrıntısını istemciye sızdırmaz', async () => {
        process.env.ANTHROPIC_API_KEY = 'sk-ant-test';
        global.fetch = jest.fn(async () => ({ ok: false, status: 401, json: async () => ({ error: { type: 'authentication_error', message: 'invalid x-api-key sk-ant-test' } }) })) as any;
        const handler = require('./openai-analyze').default;
        const res = makeRes();
        await handler(req({ prompt: 'x' }), res);
        expect(res.statusCode).toBe(502);
        expect(JSON.stringify(res.body)).not.toContain('sk-ant');
        expect(res.body).toEqual({ error: 'ai_upstream_error', status: 401 });
    });

    it('maliyet tahmini: bilinen ve bilinmeyen model', () => {
        expect(estimateClaudeCostUsd('claude-haiku-5-5', 1_000_000, 1_000_000)).toBeCloseTo(6);
        expect(estimateClaudeCostUsd('bilinmeyen', 1_000_000, 0)).toBeCloseTo(3);
    });
});
