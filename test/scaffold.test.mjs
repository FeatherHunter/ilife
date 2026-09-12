import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

describe('scaffold', () => {
  it('boundaries 冻结不断言失败', () => {
    execFileSync(process.execPath, ['tooling/check-boundaries.mjs'], { cwd: new URL('..', import.meta.url), stdio: 'pipe' });
    assert.ok(true);
  });
});
