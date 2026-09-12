import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegistryKey, ENVELOPE_SHAPES } from '../packages/base-link-core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = readFileSync(join(root, 'docs/memo-migration-split.md'), 'utf8');
const fence = doc.split('```memo-keys')[1].split('```')[0].trim().split('\n');
const rows = fence.map((l) => l.split('|').map((s) => s.trim()));

describe('备忘录拆分确认 M1', () => {
  it('11 联动 key×shape 全合法（命名空间+6 形状）', () => {
    assert.equal(rows.length, 11);
    for (const [key, shape] of rows) {
      assert.equal(parseRegistryKey(key).key, key);
      assert.ok(ENVELOPE_SHAPES.includes(shape), '未知 shape：' + shape);
    }
  });
  it('定时出 scope 已定（reminder_scheduler 不迁）', () => {
    assert.match(doc, /reminder_scheduler/);
    assert.match(doc, /出 scope/);
  });
});
