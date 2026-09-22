/**
 * #863 · 浏览选目录后保存能落盘（记账，六家样板）——隔离家目录里走一遍
 * 「读整面 → 模拟浏览改数据目录 → 保存 → 重读」：重读的值与重进面板看到的一致。
 * 六家共用同一套草稿约定（toDraft／fromDraft／脏检查只看可改行），故以记账为样板锁定。
 *
 * #909 起取值／填值收进共用件 `dsh-life-pack/config-panel`：这里按本家行表绑一次，
 * 判据（草稿态、只收可改行、浏览换了就该脏）逐条不变。
 * 运行：`node --test packages/plugin-bill-ilife/test/t863-浏览保存.test.mjs`。
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { setupConfigTestBase } from '../../../test/helpers/config-test-base.mjs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { toDraft as sharedToDraft, fromDraft as sharedFromDraft } from '../../plugin-manager/dist/config-panel-value.js';
import { CONFIG_ITEMS } from '../dist/index.js';
import { readConfigSurface, writeConfigValues } from '../dist/bridge.js';

const HERE = dirname(fileURLToPath(import.meta.url));

/** 取值／填值收进共用件（#909）：按本家行表绑一次，调用口径与改版前逐条相同。 */
const toDraft = (values, source = {}) => sharedToDraft(CONFIG_ITEMS, values, source);
const fromDraft = (draft) => sharedFromDraft(CONFIG_ITEMS, draft);

describe('#863 浏览选目录后保存能落盘（记账样板）', () => {
  let base;
  before(() => {
    base = setupConfigTestBase();
  });
  after(() => {
    base.cleanup();
  });

  it('模拟浏览改数据目录 → 保存 → 重读，值不变（重进面板看到的就是新值）', () => {
    const s0 = readConfigSurface();
    const draft0 = toDraft(s0.values, s0);
    const editable = CONFIG_ITEMS.filter((i) => i.readonly !== true);
    assert.deepEqual(editable.map((i) => i.key), ['db.dir']);
    // 模拟浏览：把草稿里数据目录换成一个新位置。
    const picked = join(base.dir, 'picked-data');
    const draft1 = { ...draft0, 'db.dir': picked };
    // 脏检查只看可改行：换了就该变真（保存按钮可用）。
    const base0 = toDraft(s0.values, s0);
    const dirty = editable.some((i) => (draft1[i.key] ?? '') !== (base0[i.key] ?? ''));
    assert.equal(dirty, true, '浏览换了目录就该是脏的，否则保存点不了');
    // 保存只带可改行（只读的显示值不写回）。
    const submitted = fromDraft(draft1);
    assert.deepEqual(Object.keys(submitted), ['db']);
    writeConfigValues(submitted);
    // 重读＝重进面板：看到的就是新选的目录。
    const s1 = readConfigSurface();
    assert.equal(s1.values.db.dir, picked);
    assert.equal(toDraft(s1.values, s1)['db.dir'], picked);
  });
});
