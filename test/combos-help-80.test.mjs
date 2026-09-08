/** #80 · base-combos HELP 生成缺陷 + 键名一致性门（单测；构建期断言见 scripts/build-help.mjs）。
 * 两道门各自可变异自证：
 *   ① 段头正则失配（含数字段名 `l6_slots`）→ 生成块出现 `undefined` / L6 段为空 → 本文件红；
 *   ② channels 键回到下划线形（渲染层 VIEW_KEYS 内部名）→ 键形/注册一致性断言红。
 * 为什么旧门漏了：test/combos-p8.test.mjs 只 `assert.match(text, /L6\.1/)`，而 HELP.md 末尾注
 * 行自带 `L6.1～L6.6` 字样，于是“L6 段为空 + 6 行 undefined”照样全绿（本文件按生成块逐行钉死）。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpBlock, assertHelpBlock, assertChannelKeys, START, END } from '../packages/base-combos/scripts/build-help.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const yamlPath = join(root, 'packages/base-combos/combos.yaml');
const helpPath = join(root, 'packages/base-combos/HELP.md');
const yaml = readFileSync(yamlPath, 'utf8');

/** registry 合法键（与 tooling/check-combos.mjs 的 KEY_RE、link-core KEY_RE 同值）。 */
const REGISTRY_KEY_RE = /^[a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]*$/;
const L6_IDS = ['L6.1', 'L6.2', 'L6.3', 'L6.4', 'L6.5', 'L6.6'];

/** 冻结格式扫描（与 check-combos 同形，仅供测试自用）：取某段全部 `  - key: x`。 */
function keysOf(text, secName) {
  const out = [];
  let cur = '';
  for (const ln of text.replace(/\r\n/g, '\n').split('\n')) {
    if (/^\s*#/.test(ln) || /^\s*$/.test(ln)) continue;
    const h = ln.match(/^([A-Za-z_][A-Za-z0-9_]*):\s*$/);
    if (h) { cur = h[1]; continue; }
    const m = ln.match(/^  - key: (\S+)\s*$/);
    if (m && cur === secName) out.push(m[1]);
  }
  return out;
}

function blockOf(text) {
  const si = text.indexOf(START), ei = text.indexOf(END);
  assert.ok(si >= 0 && ei > si, 'HELP.md 缺 HELP 标记块');
  return text.slice(si + START.length, ei);
}

describe('#80 HELP 生成与键名一致性', () => {
  it('① 生成块无 undefined（段头正则失配即红）', () => {
    const block = buildHelpBlock(yaml);
    const bad = block.split('\n').filter((ln) => /undefined/.test(ln));
    assert.deepEqual(bad, [], '生成块含 undefined 行：' + JSON.stringify(bad));
  });

  it('① L6 段有内容：六个空位 id 全列，降级区不越界', () => {
    const block = buildHelpBlock(yaml);
    const l6 = block.split('\n').filter((ln) => ln.startsWith('L6 空位'));
    assert.equal(l6.length, 1, 'L6 空位行缺失或重复：' + JSON.stringify(l6));
    for (const id of L6_IDS) assert.ok(l6[0].includes(id), 'L6 空位行漏 ' + id + '：' + l6[0]);
    // 段头失配时 l6_slots 条目会被 fallbacks 段吞掉，渲染成 `- undefined：undefined（undefined）`
    const dash = block.split('\n').filter((ln) => ln.startsWith('- '));
    assert.equal(dash.length, 6, '降级条数应为 6，实 ' + dash.length);
    assert.ok(!dash.some((ln) => /L6\.[1-5]/.test(ln)), 'l6 条目越界进 fallbacks：' + dash.join(' | '));
  });

  it('① 含数字段名必须成段（合成 yaml，不依赖 combos.yaml 内容）', () => {
    const synth = [
      'channels:',
      '  - key: demo.ch',
      '    shape: list',
      '    backing: skilllink-cmd',
      'scenarios:',
      '  - id: L1.1',
      '    name: 演示',
      '    wake_word: 演示词',
      '    external: 演示技能',
      '    present: 一句话',
      'fallbacks:',
      '  - for: L1.1',
      '    reason: 演示原因',
      '    while_degraded: 演示降级',
      'l6_slots:',
      '  - id: L6.1',
      '    reserved: true',
      '',
    ].join('\n');
    const block = buildHelpBlock(synth);
    assert.match(block, /L6\.1/, '含数字段名未成段：' + block);
    assert.ok(!/undefined/.test(block), '合成 yaml 生成 undefined：' + block);
    assert.equal(block.split('\n').filter((ln) => ln.startsWith('- ')).length, 1, 'l6 条目越界：' + block);
  });

  it('① 构建期断言 assertHelpBlock：含 undefined 的块必须抛（生成器拒发）', () => {
    assert.throws(() => assertHelpBlock('- undefined：undefined（undefined）'), /undefined/);
    assert.equal(assertHelpBlock('- L1.1：x（y）'), '- L1.1：x（y）');
  });

  it('② channels 键一律 registry 点号键（无下划线）且逐键在 combos 注册', () => {
    const chans = keysOf(yaml, 'channels');
    const combos = keysOf(yaml, 'combos');
    assert.equal(chans.length, 15, 'channels 须 15 对，实 ' + chans.length);
    for (const k of chans) {
      assert.match(k, REGISTRY_KEY_RE, 'channels 键非 registry 点号键：' + k);
      assert.ok(!k.includes('_'), 'channels 键含下划线（渲染层内部名）：' + k);
      assert.ok(combos.includes(k), 'channels 键未在 combos 注册：' + k);
    }
  });

  it('② 构建期断言 assertChannelKeys：下划线键必须抛', () => {
    assert.throws(() => assertChannelKeys([{ key: 'calorie.view_home' }]), /registry 点号键/);
    assert.doesNotThrow(() => assertChannelKeys([{ key: 'calorie.view.home' }]));
  });

  it('② HELP.md 通道表展示的 key == combos.yaml channels 键（展示键即注册键）', () => {
    const chans = keysOf(yaml, 'channels');
    const block = blockOf(readFileSync(helpPath, 'utf8'));
    const shown = block.split('\n')
      .filter((ln) => /^\| [a-z][a-z0-9-]*\.[a-z0-9][a-z0-9-.]* \|/.test(ln))
      .map((ln) => ln.split('|')[1].trim());
    assert.deepEqual(shown, chans);
    for (const k of shown) assert.match(k, REGISTRY_KEY_RE, 'HELP 展示非注册键：' + k);
  });

  it('③ 仓内 HELP.md == 生成器输出（产物不新鲜即红）', () => {
    assert.equal(blockOf(readFileSync(helpPath, 'utf8')).trim(), buildHelpBlock(yaml).trim());
  });

  it('③ check-combos 全绿（键形/注册一致性构建期门）', () => {
    const r = spawnSync(process.execPath, ['tooling/check-combos.mjs'], { cwd: root, encoding: 'utf8' });
    assert.equal(r.status, 0, 'exit=' + r.status + ' stderr=' + r.stderr + ' stdout=' + r.stdout);
  });
});
