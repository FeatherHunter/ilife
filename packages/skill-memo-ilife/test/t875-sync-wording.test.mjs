/**
 * #875 · 飞书四门不过时，回执文案零内部命令名（家族债，源 #832 §六／#829 记账）。
 *
 * 票面「要做的 3」：远端四门不过时，回执 `message` 与 `errors` 里**零内部命令名**。
 * 本件逐门各判三样（三条都是**外部读数**，不读源码）：
 *   ① 零内部名与内部标识符：`lark-cli`／`auth status`／`openId`／`scope`／`auth login`／`auth check`；
 *   ② 零 ASCII 字母与零半角标点 —— 判据同 `docs/skills/skill-memo-ilife/t869-机审.mjs` 的 ⑥ 列
 *      （该列把「载荷 message（副标题）」算进文案面，家族债就是它扫出来的）；
 *   ③ 四门各自卡在哪一步仍读得出来：没装／没登录／授权不足／超时，各点名各的（含义不许丢）。
 *
 * 接缝与布景同 `test/t832-sync-domain.test.mjs`：只打唯一出口 `dist/cli/cmd_read.js`，两个注入点分别是
 * 临时库（配置项 `db.dir`）与 PATH 首位的 lark 落点。四门各摆一态：
 *   - 存在门：复用 t832 的 `envNoLark`（PATH 里不放任何 lark 落点）；
 *   - 登录门／授权门：`.scratch` 无关的**本文件自带挡板**（`makeFakeCli`），按 mode 摆出三种登录失败样态；
 *   - 超时门：回执路径覆盖不到（`larkReady` 不抛超时那一支），改直调取数层 `runLark` 并把时限压到 400 毫秒。
 *
 * 跑法（**cwd 必须是包目录**：出口依赖包内 `node_modules` 的 junction 依赖 `base-paint`，
 * 从仓根跑会 `ERR_MODULE_NOT_FOUND`，那是跑法问题不是被测行为——同 t832）：
 *   node tooling/run-locked.mjs --ticket 875 -- node .scratch/t875/run-in-pkg.mjs --test test/t875-sync-wording.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { mkMemoConfig, noLarkPathEnv, stubPathEnv } from './helpers/config-base.mjs';
import { seedNote } from './helpers/memo-sqlite.mjs';
import { runLark } from '../dist/sync/feishu.js';

const SYNC_KEY = 'memo.sync';
/** 内部名与内部标识符（票面列的那一族）：上屏即红。 */
const INTERNAL = ['lark-cli', 'auth status', 'openId', 'scope', 'auth login', 'auth check'];
/** ⑥ 列的另外两半：ASCII 字母（英文裸词）与半角标点（判据集照 `t869-机审.mjs` 的 `HALF`）。 */
const ASCII = /[A-Za-z]/;
const HALF = /[,;:!?()[\]{}"'<>/\\~.`]/;

/** 判「这一串是给用户看的」：三条一起判，每条都点名命中处（变异自证时要靠它点名）。 */
function assertUserFacing(text, where) {
  assert.equal(typeof text, 'string', where + ' 须是字符串');
  assert.ok(text.length > 0, where + ' 不许是空串');
  for (const token of INTERNAL) {
    assert.ok(!text.includes(token), where + ' 里出现内部名「' + token + '」：' + text);
  }
  assert.ok(!ASCII.test(text), where + ' 里出现 ASCII 字母（机审 ⑥ 英文裸词）：' + text);
  assert.ok(!HALF.test(text), where + ' 里出现半角标点（机审 ⑥）：' + text);
}

/** 本文件自带的替身飞书命令行工具：`mode` 决定四门里哪一门不过。
 *  `hang` 那一档永不返回（等超时把它掐掉），其余档照挡板形状应答。 */
function makeFakeCli(mode) {
  const dir = mkdtempSync(join(tmpdir(), 't875-fake-'));
  const logic = [
    "const MODE = " + JSON.stringify(mode) + ';',
    "const a = process.argv.slice(2);",
    "const say = (o, code = 0) => { process.stdout.write(JSON.stringify(o) + '\\n'); process.exit(code); };",
    "if (MODE === 'hang') {",
    '  setInterval(() => {}, 1000);',
    '} else {',
    "  if (a[0] === '--version') { process.stdout.write('lark-cli 9.9.9-fake\\n'); process.exit(0); }",
    "  if (a[0] === 'auth' && a[1] === 'status') {",
    "    if (MODE === 'status-fail') { process.stderr.write('fake: auth status 退出 1\\n'); process.exit(1); }",
    "    if (MODE === 'not-json') { process.stdout.write('登录状态：未知\\n'); process.exit(0); }",
    "    if (MODE === 'no-openid') say({ identities: { user: { status: 'ready' } } });",
    "    say({ identities: { user: { openId: 'ou_fake' } } });",
    '  }',
    "  if (a[0] === 'auth' && a[1] === 'check') { process.exit(MODE === 'no-scope' ? 1 : 0); }",
    "  process.stderr.write('fake: 没这条子命令\\n'); process.exit(2);",
    '}',
    '',
  ].join('\n');
  if (process.platform === 'win32') {
    const mjs = join(dir, 'fake-lark.mjs');
    writeFileSync(mjs, logic, 'utf8');
    writeFileSync(join(dir, 'lark-cli.cmd'), '@node "' + mjs + '" %*\r\n', 'utf8');
  } else {
    writeFileSync(join(dir, 'lark-cli'), '#!/usr/bin/env node\n' + logic, 'utf8');
    chmodSync(join(dir, 'lark-cli'), 0o755);
  }
  return dir;
}

/** 挡板在场：临时库写 `db.dir`、挡板目录放 PATH 首位（隔离口是家目录注入）。 */
function envFake(s, dir) {
  return stubPathEnv(mkMemoConfig({ db: { dir: s.dbPath } }, 't875-cfg-'), dir);
}
/** 挡板缺席（存在门）：PATH 里没有任何 lark 落点 ⇒ 四门必关（本机真命令行工具在也不干扰）。 */
function envNoLark(s) {
  return noLarkPathEnv(mkMemoConfig({ db: { dir: s.dbPath } }, 't875-nolark-'));
}

/** 四门各摆一态：`needle` 是「卡在哪一步」那句话的特征串，逐门不同（含义不许丢的读数）。 */
const GATES = [
  { id: '存在门·没装', mode: null, gate: '飞书命令行工具未找到' },
  { id: '登录门·查询失败', mode: 'status-fail', gate: '飞书登录状态查询失败' },
  { id: '登录门·读不出内容', mode: 'not-json', gate: '飞书登录状态读不出内容' },
  { id: '登录门·没登录', mode: 'no-openid', gate: '飞书未登录' },
  { id: '授权门·权限不足', mode: 'no-scope', gate: '飞书授权不足' },
];

/** 跑一次 `memo.sync`：远端必关，回执与退出码一次取齐。 */
function runSyncWith(s, noLark) {
  const r = s.runNew(SYNC_KEY, {}, { extraEnv: noLark });
  return { r, env: envelope(r), exit: r.status };
}

describe('#875 远端四门不过：回执文案零内部命令名', () => {
  for (const [i, g] of GATES.entries()) {
    it('① ' + g.id + '：message 与 errors 零内部名，且点名卡在哪一步', () => {
      const s = makeSeam('memo', { prefix: 't875-gate' + i + '-' });
      seedNote(s.dbPath, { content: '学会做提拉米苏', category: '心愿', sub: '个人' });
      const noLark = g.mode === null ? envNoLark(s) : envFake(s, makeFakeCli(g.mode));

      const x = runSyncWith(s, noLark);
      assert.equal(x.exit, 4, '远端侧没成 ⇒ 退出码非 0（stderr=' + String(x.r.stderr).slice(0, 200) + '）');
      assert.equal(x.env.data.remote, 'unavailable');
      assert.equal(x.env.data.ok, false);

      const message = x.env.data.message;
      // 先判「给用户看的那三样」，再判「卡在哪一步」——判据那句话先响，点名才落在这条债自己身上。
      assertUserFacing(message, g.id + ' 的 message');
      assert.match(message, new RegExp(g.gate), '这一门须点名「' + g.gate + '」：' + message);
      assert.equal(Array.isArray(x.env.data.errors), true, 'errors 须是数组');
      assert.equal(x.env.data.errors.length, 1);
      for (const [j, e] of x.env.data.errors.entries()) assertUserFacing(e, g.id + ' 的 errors[' + j + ']');
      // 副标题就是回执 message 那一格（`t869-机审.mjs` 的载荷面 `message（副标题）`）。
      assert.equal(x.env.data.message, message);
    });
  }

  it('② 心愿类合成写也走同一条闸门文案：memo.create 回执零内部名', () => {
    const s = makeSeam('memo', { prefix: 't875-wish-' });
    const c = s.runNew('memo.create', { title: '飞书用例', body: '', category: '心愿' }, { extraEnv: envNoLark(s) });
    const cenv = envelope(c);
    assert.equal(c.status, 4, '本地成了远端没成 ⇒ exit 4');
    assert.equal(cenv.data.remote, 'unavailable');
    assertUserFacing(cenv.data.message, '合成写回执 message');
    assert.match(cenv.data.message, /飞书命令行工具未找到/, '同一条闸门文案：' + cenv.data.message);
  });

  it('③ 工具不可用与超时两条文案也零内部名（回执路径覆盖不到这两支，直调取数层）', () => {
    // 存在但起不来：路径指到一个不存在的位置 ⇒ ENOENT 那一支（`larkReady` 的四门不会走到它）。
    assert.throws(() => runLark(join(tmpdir(), 't875-no-such-cli', 'nope'), ['task', '+search']), (e) => {
      assertUserFacing(e.message, '工具不可用文案');
      assert.match(e.message, /飞书命令行工具不可用/, '这一支须点名「不可用」：' + e.message);
      return true;
    });
    // 超时：挡板永不返回，时限压到 400 毫秒（真档 30 秒，测试不等它）。
    const hang = join(makeFakeCli('hang'), process.platform === 'win32' ? 'lark-cli.cmd' : 'lark-cli');
    assert.throws(() => runLark(hang, ['task', '+search'], 400), (e) => {
      assertUserFacing(e.message, '超时文案');
      assert.match(e.message, /飞书命令行工具超时/, '这一支须点名「超时」：' + e.message);
      return true;
    });
  });
});
