// 票 #1302 ② · 首开不自动体检（作息这一半）：面板挂载只发 config.get，不再自动发 config.check；
// 屏上先画闲态「还没检测」，点「重新检测」才发那一通，且只发一通。
//
// 读法照 tabs-738：materialize 真产物、替身家渲真组件，桩传输口记录每一通电话。
// 先构建再跑（本包 dist/client.js 由 tsdown 打）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-schedule-ilife
//   cd packages/plugin-schedule-ilife && node node_modules/tsdown/dist/run.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { renderConfigTab } from '../../../test/helpers/panel-render.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 读整面的回执（形状照共用件的 ConfigSurfaceReply）。 */
const SURFACE = { path: 'C:/Users/x/.ilife/schedule.yaml', dataDir: 'C:/Users/x/.ilife', created: false, values: {}, resolved: {} };
/** 体检回执：只认 lark.cli 那一项（外加新技能多交的 `lark` 格，本行用它的路径与版本）。 */
const HEALTH = {
  items: [
    { id: 'db.dir', status: 'green', message: '数据目录可写', action: '' },
    { id: 'lark.cli', status: 'green', message: '已登录，日历可读。', action: '' },
  ],
  lark: { tier: 'full', cliPath: 'C:/bin/lark-cli.exe', version: '1.2.3' },
};
const call = async (base, channel, payload) => {
  const method = payload?.method;
  if (method === 'config.get') return { ok: true, value: SURFACE };
  if (method === 'config.check') return { ok: true, value: HEALTH };
  return { ok: false, error: { code: 'bad-request', message: '没料到的端点：' + method, details: {} } };
};

/** 把展开后的元素树里的文本收成一串（与 panel-render 同一个形状：{type, props:{...props, children}}）。 */
function collectText(node, out) {
  if (node === null || node === undefined || node === false || node === true) return;
  if (typeof node === 'string' || typeof node === 'number') { out.push(String(node)); return; }
  if (Array.isArray(node)) { for (const child of node) collectText(child, out); return; }
  if (typeof node !== 'object') return;
  collectText(node.props?.children, out);
}
const textOf = (node) => { const out = []; collectText(node, out); return out.join(' '); };
/** 找那枚字面恰好是 label 的动作按钮；找不到回 null（用例里 assert 它存在）。 */
function findButton(node, label) {
  if (node === null || node === undefined || typeof node !== 'object') return null;
  if (Array.isArray(node)) {
    for (const child of node) { const hit = findButton(child, label); if (hit) return hit; }
    return null;
  }
  if (node.type === 'button' && textOf(node.props?.children) === label) return node;
  return findButton(node.props?.children, label);
}

describe('#1302 ② 首开不自动体检 · 作息设置页', () => {
  it('挂载后只发 config.get：config.check 一通都不发，屏上先画「还没检测」', async () => {
    const panel = await renderConfigTab(PKG, { call, settleTicks: 8 });
    assert.deepEqual(panel.calls.map((entry) => entry.method), ['config.get'], '挂载期只许发读整面那一通');
    assert.match(panel.text, /还没检测/, '闲态要有一句人话');
    assert.doesNotMatch(panel.text, /检测中/, '不许画「检测中」假装在测（那会让人以为它在等回执）');
    assert.match(panel.text, /飞书 CLI/, '状态行照旧在');
  });

  it('点「重新检测」才发 config.check：恰好一通，回执落地后画就绪态', async () => {
    const panel = await renderConfigTab(PKG, { call, settleTicks: 8 });
    const button = findButton(panel.tree, '重新检测');
    assert.ok(button, '闲态上要有「重新检测」按钮');
    button.props.onClick();
    const after = await panel.settle(8);
    assert.deepEqual(panel.calls.map((entry) => entry.method), ['config.get', 'config.check'], '点一下只发一通体检');
    assert.match(after.text, /已登录，日历可读/, '体检回执落地后照三档文案画');
  });
});
