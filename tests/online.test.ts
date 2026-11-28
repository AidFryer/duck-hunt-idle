import { describe, expect, it } from 'vitest';
import { cleanRestoreCode, restoreCode, showRestoreCode } from '../src/app/online';

describe('cloud save restore code', () => {
  it('is 8 easy-to-read characters that never change for a secret', () => {
    const secret = 'a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4';
    const code = restoreCode(secret);
    expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{8}$/);
    expect(restoreCode(secret)).toBe(code);
    expect(restoreCode(secret + 'x')).not.toBe(code);
  });
  it('reads back whatever way the player types it', () => {
    const code = restoreCode('some-long-secret-value-0123456789');
    expect(cleanRestoreCode(showRestoreCode(code).toLowerCase())).toBe(code);
    expect(cleanRestoreCode(' ab cd-ef o1 ')).toBe('ABCDEF01');
    expect(cleanRestoreCode('il')).toBe('11');
  });
});
