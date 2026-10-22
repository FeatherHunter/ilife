// 票 #1302 ② · 首开不自动体检（备忘录这一半）：挂载只发 config.get，不再自动发 config.check。
// 两条路都咬：新技能回执（没有 `lark` 格）画「还没检测」；旧技能回执（带 `lark` 格）直接照旧格画，
// 两条路都只在点「重新检测」时发那一通体检。
//
// 先构建再跑（本包 dist/client.js 由 tsdown 打）：
//   node node_modules/typescript/bin/tsc -b packages/plugin-memo-ilife
//   cd packages/plugin-memo-ilife && node node_modules/tsdown/dist/run.mjs
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findButton, renderConfigTab } from '../../../test/helpers/panel-render.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

/** 读整面的回执（形状照共用件的 ConfigSurfaceReply）。 */
const SURFACE = { path: 'C:/Users/x/.ilife/memo.db', dataDir: 'C:/Users/x/.ilife', created: false, values: {}, resolved: {} };
/** 旧技能回执自带的那一格「飞书 CLI」（#936 形状；新技能不再带，只作回退）。 */
const OLD_LARK = {
  tier: 'full',
  cliPath: 'C:/bin/lark-cli.exe',
  version: '1.2.3',
  prompt: '安装指引文本',
  websiteLine: '飞书CLI官网为：https://www.feishu.cn/feishu-cli',
  websiteUrl: 'https://www.feishu.cn/feishu-cli',
};
const HEALTH = { items: [{ id: 'lark.cli', status: 'green', message: '体检通过（stub）', action: '' }] };
const makeCall = (surface) => async (base, channel, payload) => {
  const method = payload?.method;
  if (method === 'config.get') return { ok: true, value: surface };
  if (method === 'config.check') return { ok: true, value: HEALTH };
  return { ok: false, error: { code: 'bad-request', message: '没料到的端点：' + method, details: {} } };
};

describe('#1302 ② 首开不自动体检 · 备忘录设置页', () => {
  it('新技能回执（无 lark 格）：挂载只发 config.get，屏上画「还没检测」', async () => {
    const panel = await renderConfigTab(PKG, { call: makeCall(SURFACE), settleTicks: 8 });
    assert.deepEqual(panel.calls.map((entry) => entry.method), ['config.get'], '挂载期只许发读整面那一通');
    assert.match(panel.text, /还没检测/, '新技能没有 lark 格，闲态要有一句人话');
    assert.doesNotMatch(panel.text, /检测中/, '不许画「检测中」假装在测');
  });

  it('新技能回执：点「重新检测」才发一通 config.check，回执落地后画体检那行', async () => {
    const panel = await renderConfigTab(PKG, { call: makeCall(SURFACE), settleTicks: 8 });
    const button = findButton(panel.tree, '重新检测');
    assert.ok(button, '闲态上要有「重新检测」按钮');
    button.props.onClick();
    const after = await panel.settle(8);
    assert.deepEqual(panel.calls.map((entry) => entry.method), ['config.get', 'config.check'], '点一下只发一通体检');
    assert.match(after.text, /体检通过（stub）/, '体检回执落地后画体检那行');
  });

  it('旧技能回执（带 lark 格）：照回执自带读数画，不花额外电话；点「重新检测」才发一通', async () => {
    const oldSurface = { ...SURFACE, lark: OLD_LARK };
    const panel = await renderConfigTab(PKG, { call: makeCall(oldSurface), settleTicks: 8 });
    assert.deepEqual(panel.calls.map((entry) => entry.method), ['config.get'], '回执自带的读数不许再花电话去确认');
    assert.match(panel.text, /已登录，task 域可写/, '旧回执的 lark 格照旧画出来');
    const button = findButton(panel.tree, '重新检测');
    assert.ok(button, '旧回执那一支也要有「重新检测」按钮');
    button.props.onClick();
    await panel.settle(8);
    assert.deepEqual(panel.calls.map((entry) => entry.method), ['config.get', 'config.check'], '点一下只发一通体检');
  });
});
