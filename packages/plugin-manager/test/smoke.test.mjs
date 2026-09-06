// dsh-life-pack 烟囱：6 tab 定案 + 只导航（无单品 import 由 boundaries 覆盖）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { MANAGER_TABS, tabsForPresence, reconcileBundles, assertDualBundles } from '../dist/index.js';

describe('manager 烟囱', () => {
  it('6 tab id 与 order 与 P3 定案一致', () => {
    assert.deepEqual(MANAGER_TABS.map((t) => t.slotId), ['ilife:memo', 'ilife:calorie', 'ilife:schedule', 'ilife:home', 'ilife:chef', 'ilife:cookie']);
    assert.deepEqual(MANAGER_TABS.map((t) => t.order), [70, 75, 80, 85, 90, 95]);
  });
  it('缺席回 reco 带补装命令', () => {
    const rows = tabsForPresence(new Set(['ilife:memo']));
    const reco = rows.find((r) => r.slotId === 'ilife:calorie');
    assert.equal(reco.kind, 'reco');
    assert.match(reco.installCmd, /dsh plugin add dsh-life-pack dsh-calorie/);
  });
  it('双包 reconcile 双含', () => {
    assertDualBundles(reconcileBundles(['dsh-life-pack', 'dsh-calorie']), 'dsh-calorie');
  });
});
