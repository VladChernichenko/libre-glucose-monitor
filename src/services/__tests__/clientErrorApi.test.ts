import { buildErrorPayload } from '../clientErrorApi';

describe('client error payload', () => {
  it('includes diagnostic fields', () => {
    const p = buildErrorPayload(new Error('boom'), { route: '/dashboard' });
    expect(p.name).toBe('Error');
    expect(p.message).toBe('boom');
    expect(p.route).toBe('/dashboard');
    expect(p.appVersion).toBeTruthy();
    expect(p.sessionId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('caps message and stack length', () => {
    const long = new Error('x'.repeat(5000));
    long.stack = 'y'.repeat(20000);
    const p = buildErrorPayload(long, { route: '/dashboard' });
    expect(p.message.length).toBeLessThanOrEqual(500);
    expect((p.stack ?? '').length).toBeLessThanOrEqual(4000);
  });

  it('carries no health data or identity fields', () => {
    const p = buildErrorPayload(new Error('boom'), { route: '/dashboard' });
    const keys = Object.keys(p).map((k) => k.toLowerCase());

    // Health terms are banned as substrings — no key may mention them at all.
    [
      'glucose',
      'reading',
      'notes',
      'note',
      'meal',
      'carbs',
      'insulin',
      'username',
      'email',
      'photo',
    ].forEach((forbidden) => {
      expect(keys.some((k) => k.includes(forbidden))).toBe(false);
    });

    // Identity terms are banned as whole keys. 'userAgent' is a browser string
    // carrying no identity, so a substring ban on 'user' would be a false
    // positive rather than a real protection.
    ['user', 'userid', 'patient', 'subject'].forEach((forbidden) => {
      expect(keys).not.toContain(forbidden);
    });
  });

  it('redacts a message that embeds a glucose reading', () => {
    const p = buildErrorPayload(new Error('failed to render 8.7 mmol/L for vlad'), {
      route: '/dashboard',
    });
    expect(p.message).not.toContain('8.7');
    expect(p.message).toContain('[redacted]');
  });
});
