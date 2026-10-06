// 票 1171 · 批量入口门禁（0.5.4 #49 到达）：一颗按钮看七家聚合，manual 桥接已删。
//
// 先构建再跑：node node_modules/typescript/bin/tsc -b packages/plugin-manager
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mountLifeBatchEntry } from '../dist/update-dialog.js';

const KEYS = ['bill', 'calorie', 'memo', 'schedule', 'home', 'chef', 'life-pack'];

function sevenRows() {
  return KEYS.map((key) => ({
    key,
    title: key,
    phase: 'pending',
    targetVersion: null,
    restartRequired: false,
    error: null,
    snapshot: null,
    manual: null,
    queue: null,
    profileName: null,
    phoneNames: null,
    pluginId: null,
    diag: null,
  }));
}

describe('1171 批量入口（一颗按钮看七家）', () => {
  it('前缀直调批量五电话：首查即 life.batchStatus（非手拼）', async () => {
    const seen = [];
    const container = { innerHTML: '' };
    const entry = mountLifeBatchEntry(container, async (name) => {
      seen.push(name);
      return { ok: true, session: null, rows: sevenRows(), progress: null };
    });
    try {
      await entry.refresh();
      assert.ok(seen.includes('life.batchStatus'));
      assert.ok(!seen.some((name) => name.startsWith('ilife-')), '入口件只调批量电话，不碰单插件三电话');
    } finally {
      entry.unmount();
    }
  });
  it('聚合读数即七家：summary().total 为 7，文案为字符串', async () => {
    const container = { innerHTML: '' };
    const entry = mountLifeBatchEntry(container, async () => (
      { ok: true, session: null, rows: sevenRows(), progress: null }
    ));
    try {
      await entry.refresh();
      assert.equal(entry.summary().total, 7);
      assert.equal(typeof entry.label(), 'string');
    } finally {
      entry.unmount();
    }
  });
});
