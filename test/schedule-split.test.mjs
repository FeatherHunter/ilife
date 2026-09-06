import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseRegistryKey, ENVELOPE_SHAPES } from '../packages/base-link-core/dist/index.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const doc = readFileSync(join(root, 'docs/schedule-migration-split.md'), 'utf8');
const fence = doc.split('```schedule-keys')[1].split('```')[0].trim().split('\n');
const rows = fence.map((l) => l.split('|').map((s) => s.trim()));

describe('作息拆分确认 #15', () => {
  it('8 联动 key×shape 全合法（命名空间+6 形状）', () => {
    assert.equal(rows.length, 8);
    for (const [key, shape] of rows) {
      assert.equal(parseRegistryKey(key).key, key);
      assert.ok(ENVELOPE_SHAPES.includes(shape), '未知 shape：' + shape);
    }
  });
  it('定时出 scope 已定（Cron/定时不迁）', () => {
    assert.match(doc, /定时/);
    assert.match(doc, /出 scope/);
  });
  it('lark-cli 外置口径已定', () => {
    assert.match(doc, /lark-cli/);
  });
});
