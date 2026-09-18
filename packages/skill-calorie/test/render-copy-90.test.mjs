/** #90 · 复制交互走 Base P0 双通道（裁决 Q13／契约 §3.3）· 接线自证。
 *
 * 三条验收：① 双通道（含降级路径）可执行；② 与 base- 控件层接口一致（`CopyPorts`／
 * `CopyActionHostPort`／`bindCopyAction`，不绕过）；③ 变异自证——把接线改回单通道／内联
 * `onclick`／技能侧自造复制实现，本文件必须变红（每条用例的红点写在用例名后的「红点」里）。
 *
 * **#654／#664 口径变更（换对象，不放宽）**：公共层 #336 那条「有数据位、无日志位就自动补一颗
 * **禁用态**复制日志」的兜底已被 #654 撤掉（`base-render/src/controls.ts` 的 `renderActionBar`
 * 现在只渲染**真存在**的动作；单颗时挂 `action-row-ghost-single` 铺满整行）。故本文件的期望从
 * 「数据那一颗 ＋ 一颗点不动的日志占位」改成**只有一颗真胶囊**——判据**不许**放宽成「至少一颗」：
 * 逐处仍写**恰好一颗**、且断言页内 0 颗 `disabled` 复制按钮（假控件回潮即红）。
 *
 * 运行：先 `pnpm --filter skill-calorie build`，再
 *       `node --test packages/skill-calorie/test/render-copy-90.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  ACTION_BAR_DEFAULTS, ACTION_ID_ATTR, COPY_ACTION_IDS, COPY_TEXT_DEFAULTS, DEFAULT_DATA_ATTR,
  HELP_COPY_ACTIONS, bindCopyAction, buildSharedHelpersJs,
} from 'base-paint';
import {
  CALORIE_COPY_ACTION, COPY_BUTTON_ATTRS, COPY_RUNTIME_JS,
  copyActionHtml, copyRuntimeScriptHtml,
  renderHelpLookupHtml,
} from '../dist/render/index.js';
import { calorieConfigDir, configTestBase } from './helpers/config-test.mjs';
// #676 · 测试隔离基座：配置目录（库目录／训记状态目录一并）指到本次运行的临时目录，真库与真实家目录零接触。
process.env.ILIFE_CONFIG_DIR = configTestBase();

const HERE = dirname(fileURLToPath(import.meta.url));
const BIN = join(HERE, '..', 'dist', 'cli', 'cmd_read.js');
const NODE_BIN = /node(\.exe)?$/i.test(process.execPath) ? process.execPath : 'node';
const COPY_SRC = readFileSync(join(HERE, '..', 'src', 'render', 'copy.ts'), 'utf8');

/** HTML 五字符实体还原（浏览器 `getAttribute` 的等价物，用于把渲染期文本读回）。 */
function decodeEntities(s) {
  return s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

/** 从渲染产出的 HTML 解析出全部按钮（顺序 = 文档序）：`{ actionId, text, disabled }`。
 *
 *  `disabled` 仍要读：#654 撤掉 #336 兜底之后，页内**本不该**再有点不动的复制按钮，
 *  这几条用例正是靠它把「假控件回潮」钉成红的。 */
function parseButtons(html) {
  return [...html.matchAll(/<button\b[^>]*>/g)].map((m) => {
    const id = /\bdata-action-id="([^"]*)"/.exec(m[0]);
    const t = /\bdata-t="([^"]*)"/.exec(m[0]);
    return {
      actionId: id === null ? undefined : decodeEntities(id[1]),
      text: t === null ? undefined : decodeEntities(t[1]),
      disabled: /\sdisabled(?=[\s>])/.test(m[0]),
    };
  });
}

/** 数据／载荷按钮＝带 `data-t` 的按钮；**禁用假控件**＝带 `disabled` 的按钮（#654 起页内恒 0 颗）。 */
const dataButtons = (buttons) => buttons.filter((b) => b.text !== undefined);
const disabledPills = (buttons) => buttons.filter((b) => b.disabled);

/**
 * 契约 §3.3 端到端示例同款 DOM 适配器（`CopyActionHostPort` 三方法），跑在**渲染产出**上。
 * R27：页面内同 id 多按钮时，`readDataText` 按「最近一次激活元素」关联（页面侧 helpers 委派同口径）。
 */
function hostFromHtml(html) {
  const buttons = parseButtons(html);
  let last = -1;
  const subs = new Map();
  return {
    buttons,
    subscriptions: () => [...subs.keys()],
    activate: (index) => {
      last = index;
      const list = subs.get(buttons[index].actionId) ?? [];
      for (const h of list) h();
      return list.length > 0;
    },
    listActionIds: () => buttons.map((b) => b.actionId),
    readDataText: (actionId) => {
      if (last >= 0 && buttons[last].actionId === actionId) return buttons[last].text;
      const hit = buttons.find((b) => b.actionId === actionId);
      return hit === undefined ? undefined : hit.text;
    },
    onActivate: (actionId, handler) => {
      const list = subs.get(actionId) ?? [];
      list.push(handler);
      subs.set(actionId, list);
      return () => {
        const cur = subs.get(actionId) ?? [];
        const i = cur.indexOf(handler);
        if (i >= 0) cur.splice(i, 1);
      };
    },
  };
}

/** 假 `CopyPorts`：clipboard 可注入行为，fallback 记账，toast 收集挂载的 HTML。 */
function fakePorts(clipboard) {
  const fallbackCalls = [];
  const mounted = [];
  return {
    fallbackCalls,
    mounted,
    ports: {
      clipboard,
      fallback: (text) => { fallbackCalls.push(text); return true; },
      toast: { mount: (html) => { mounted.push(html); return { remove: () => {} }; } },
    },
  };
}

/** 拷贝通道夹具：两行统一 lookup 合成行（内容任意，通道只管逐字搬运；
 * 照片 HELP 数据源已随 #652 删单移除，同文件 194 行即此做法）。 */
const HELP_ROWS = [
  { wake_word: '看今日主页', category: '主页', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home', desc: '今日总览' },
  { wake_word: '记一餐', category: '饮食', key: 'calorie.diet.add', cli: 'calorie-cmd-read calorie.diet.add', desc: '记一餐' },
];
const HELP_HTML = () => renderHelpLookupHtml(HELP_ROWS, '看今日主页');

/* ── ① 接线同源：页面运行时恒是 base-paint 唯一产出者 ─────────────────────── */

test('COPY_RUNTIME_JS 逐字等于 buildSharedHelpersJs()（红点：技能侧自造第二套复制实现）', () => {
  assert.equal(COPY_RUNTIME_JS, buildSharedHelpersJs());
  assert.ok(COPY_RUNTIME_JS.length > 0, '产出恒非空');
  assert.equal(copyRuntimeScriptHtml(), '<script>' + COPY_RUNTIME_JS + '</script>');
});

test('页面运行时是双通道：clipboard 主通道 ＋ execCommand 兜底（红点：改回单通道）', () => {
  assert.ok(COPY_RUNTIME_JS.includes('navigator.clipboard'), '通道 1 必须在产出里');
  assert.ok(COPY_RUNTIME_JS.includes('writeText'), '通道 1 必须调用 writeText');
  assert.ok(COPY_RUNTIME_JS.includes('execCommand'), '通道 2 必须在产出里');
  assert.ok(COPY_RUNTIME_JS.includes('"copy"') || COPY_RUNTIME_JS.includes("'copy'"), '通道 2 必须执行 execCommand("copy")');
  // 通道 2 只在通道 1 失败后执行（Q13「不得只留 execCommand」）
  assert.ok(COPY_RUNTIME_JS.indexOf('navigator.clipboard') < COPY_RUNTIME_JS.indexOf('execCommand'), '通道 1 必须先于通道 2');
});

test('技能侧零复制实现：copy.ts 不出现 navigator／document／execCommand／addEventListener（红点：技能侧自造）', () => {
  const code = COPY_SRC.replace(/\/\*\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  for (const banned of ['navigator', 'document.', 'execCommand', 'addEventListener', 'writeText']) {
    assert.equal(code.includes(banned), false, 'copy.ts 不得出现 ' + banned + '（复制只归 base-paint）');
  }
});

/* ── ② 渲染产出：按钮带冻结承载属性、零内联脚本 ───────────────────────────── */

test('HELP 速查每行恰一颗真胶囊、页内 0 颗禁用假控件（红点：自造 id／丢属性／补回假占位）', () => {
  const html = HELP_HTML();
  const buttons = parseButtons(html);
  const data = dataButtons(buttons);
  const check = (html2) => {
    const bs = parseButtons(html2);
    const ds = dataButtons(bs);
    // 两行 → 恰好两颗（#654：有数据位、无日志位时**不再**补禁用占位）。
    assert.equal(ds.length, 2, '两行 → 两行各一颗数据复制按钮');
    assert.equal(bs.length, 2, '按钮总数按新口径写死（恰 2 颗，不用 >= 放过）');
    assert.equal(disabledPills(bs).length, 0, '不许再出现点不动的禁用占位（#654 撤了 #336 兜底）');
    for (const b of ds) {
      assert.equal(b.actionId, HELP_COPY_ACTIONS.prompt.actionId, 'actionId 必须取 HELP_COPY_ACTIONS.prompt（冻结表）');
      assert.equal(typeof b.text, 'string', '复制文本必须在渲染期写入 data-t');
      assert.equal(b.disabled, false, '数据按钮不得是禁用态');
    }
  };
  check(html);
  for (const b of data) {
    assert.equal(b.actionId, HELP_COPY_ACTIONS.prompt.actionId, 'actionId 必须取冻结表');
  }
  assert.equal(COPY_BUTTON_ATTRS.actionId, ACTION_ID_ATTR);
  assert.equal(COPY_BUTTON_ATTRS.text, DEFAULT_DATA_ATTR);
  assert.equal(CALORIE_COPY_ACTION.actionId, HELP_COPY_ACTIONS.prompt.actionId);
  assert.equal(CALORIE_COPY_ACTION.label, HELP_COPY_ACTIONS.prompt.label);
  // 复制文本逐字等于该行 CLI（不做 trim／改写）
  assert.equal(data[0].text, HELP_ROWS[0].cli);
  assert.equal(data[1].text, HELP_ROWS[1].cli);
  // 页面内同 id 重复是 R27 记账形态（HELP 壳逐卡写同一 actionId）
  assert.equal(data[0].actionId, data[1].actionId);
  // 变异两向：把 #336 那颗禁用占位塞回第一行后面 ⇒ 上面的判据必红（红点＝假控件回潮）；摘掉再绿。
  const mutant = html.replace('</button>', '</button><button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" '
    + ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.actionBar.copyLog + '" disabled>' + ACTION_BAR_DEFAULTS.copyLogLabel + '</button>');
  assert.notEqual(mutant, html, '变异未生效（占位没塞进去）');
  assert.throws(() => check(mutant), /禁用占位|按钮总数/, '变异未红：塞回禁用占位后判据应当红');
  check(html);
  console.log('MUTATION-GREEN #90 HELP 行：恰 ' + data.length + ' 颗真胶囊、0 颗禁用占位');
});

test('零内联事件处理器 ＋ 运行时恰注入一次（红点：内联 onclick／漏注入运行时）', () => {
  const html = HELP_HTML();
  assert.equal((html.match(/\son[a-z]+\s*=/gi) ?? []).length, 0, '不得出现内联事件处理器属性');
  assert.equal((html.match(/<script>/g) ?? []).length, 1, '页面恰注入一次运行时');
  assert.ok(html.includes(COPY_RUNTIME_JS), '注入的必须是 base-paint 产出文本');
  assert.equal(html.includes('window.copyText'), false, '不得引入旧全局（AC-7）');
  assert.equal(/window\.[A-Za-z_$][\w$]*\s*=/.test(COPY_RUNTIME_JS), false, '产出运行时禁向 window.<id> 赋值');
  assert.equal(COPY_RUNTIME_JS.includes('node:'), false, '产出运行时禁 node: 内建');
});

test('唤醒词 HELP 速查（renderHelpLookupHtml）走同一套接线（红点：漏第二处落点）', () => {
  const html = renderHelpLookupHtml([
    { wake_word: '看今日主页', category: '主页', key: 'calorie.view.home', cli: 'calorie-cmd-read calorie.view.home', desc: '今日总览' },
  ], '看今日主页');
  const buttons = parseButtons(html);
  const data = dataButtons(buttons);
  assert.equal(data.length, 1, '一行 → 一颗数据复制按钮');
  assert.equal(buttons.length, 1, '一行 → 恰一颗真胶囊（#654 起不再补禁用日志占位）');
  assert.equal(disabledPills(buttons).length, 0, '不许再出现点不动的禁用占位');
  assert.equal(data[0].actionId, HELP_COPY_ACTIONS.prompt.actionId);
  assert.equal(data[0].text, 'calorie-cmd-read calorie.view.home');
  assert.equal((html.match(/\son[a-z]+\s*=/gi) ?? []).length, 0);
  assert.ok(html.includes(COPY_RUNTIME_JS), '同一份运行时');
  assert.match(html, /ilife-page/);
  // 出口接线（`cmd_read.ts:443-456` 仍为内联 HTML）归 #93 的 owner —— 本票只交付可消费的渲染器。
});

test('copyActionHtml：单按钮走 renderActionBar 产出（不自造按钮 HTML；单颗时挂单颗修饰类）', () => {
  const html = copyActionHtml('TEXT');
  // #654：单颗真位不再补禁用占位，改挂 `ilife-action-row-ghost-single`（`style.ts` 让它在整行轨道铺满）。
  assert.equal(html, '<div class="ilife-action-bar"><div class="ilife-action-row ilife-action-row-ghost ilife-action-row-ghost-single">'
    + '<button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" ' + ACTION_ID_ATTR + '="'
    + HELP_COPY_ACTIONS.prompt.actionId + '" ' + DEFAULT_DATA_ATTR + '="TEXT">'
    + HELP_COPY_ACTIONS.prompt.label + '</button></div></div>');
  assert.throws(() => copyActionHtml('T', { actionId: '' }), /bad-input|actionId/, '非法 actionId 由 base-paint 拦');
  // 变异两向：把 #336 那颗禁用占位塞回去 ⇒ 上面的逐字期望必红；原产物再比一次必绿。
  const mutant = html.replace('</button>', '</button><button type="button" class="ilife-copy-btn ilife-copy-btn-ghost" '
    + ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.actionBar.copyLog + '" disabled>' + ACTION_BAR_DEFAULTS.copyLogLabel + '</button>')
    .replace(' ilife-action-row-ghost-single', '');
  assert.notEqual(mutant, html, '变异未生效（占位没塞回去）');
  assert.notEqual(mutant, copyActionHtml('TEXT'), '变异未红：塞回禁用占位后产物不该还等于原产物');
  assert.equal(copyActionHtml('TEXT'), html, '原产物再比一次必须逐字相同（还原必绿）');
  console.log('MUTATION-GREEN #90 copyActionHtml：单颗真胶囊逐字相符、0 颗禁用占位');
});

/* ── ③ 与 base- 接口一致：发现 → 激活 → readDataText → copyText → 反馈 ──── */

test('bindCopyAction 端到端：通道 1（clipboard）成功 → 复制文本逐字、反馈取冻结文案', async () => {
  const host = hostFromHtml(HELP_HTML());
  const writes = [];
  const fake = fakePorts({ writeText: (t) => { writes.push(t); return Promise.resolve(); } });
  const handle = bindCopyAction(host, fake.ports);
  // #654：两行各一颗真胶囊、同一个冻结 id（R27），去重后只剩一个订阅 id——不再有禁用占位那一份。
  assert.deepEqual(host.subscriptions(), [HELP_COPY_ACTIONS.prompt.actionId],
    '只订阅 listActionIds() 列出的 id（去重后 1 个：两行共用冻结 id）');
  assert.equal(host.activate(0), true, '首行数据按钮必须已订阅');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(writes, [HELP_ROWS[0].cli], '通道 1 收到逐字 data-t');
  assert.equal(fake.fallbackCalls.length, 0, '通道 1 成功不得触碰通道 2');
  assert.equal(fake.mounted.length, 1, '成功反馈经 ports.toast 挂载');
  assert.ok(fake.mounted[0].includes(COPY_TEXT_DEFAULTS.okMessage));
  // 第二行按钮（同 id）读到的是**自己**的文本（R27：页面侧按最近激活元素关联）
  assert.equal(host.activate(1), true, '第二行数据按钮必须已订阅');
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(writes, [HELP_ROWS[0].cli, HELP_ROWS[1].cli]);
  handle.dispose();
  handle.dispose();
  assert.equal(host.activate(0), false, 'dispose 后解绑且幂等');
});

test('bindCopyAction 端到端：通道 1 失败 → 降级通道 2（fallback）成功，channel === fallback', async () => {
  const host = hostFromHtml(HELP_HTML());
  const fake = fakePorts({ writeText: () => Promise.reject(new Error('denied')) });
  const handle = bindCopyAction(host, fake.ports);
  host.activate(0);
  await new Promise((r) => setTimeout(r, 0));
  assert.deepEqual(fake.fallbackCalls, [HELP_ROWS[0].cli], '通道 1 reject → 通道 2 收到同一文本');
  assert.equal(fake.mounted.length, 1, '降级成功仍出反馈');
  assert.ok(fake.mounted[0].includes(COPY_TEXT_DEFAULTS.okMessage));
  handle.dispose();
});

test('bindCopyAction 端到端：两通道皆失败 → 不抛错 ＋ 失败徽章恒在（danger）', async () => {
  const host = hostFromHtml(HELP_HTML());
  const mounted = [];
  const handle = bindCopyAction(host, {
    clipboard: null,
    fallback: () => false,
    toast: { mount: (html) => { mounted.push(html); return { remove: () => {} }; } },
  });
  host.activate(0);
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(mounted.length, 1, '失败徽章恒在（不受 silent 影响）');
  assert.ok(mounted[0].includes(COPY_TEXT_DEFAULTS.failMessage));
  assert.ok(mounted[0].includes(COPY_TEXT_DEFAULTS.failDetail));
  assert.ok(mounted[0].includes('ilife-toast-chip-danger'), '失败态必须带 danger 徽章');
  handle.dispose();
});

test('非复制按钮（无 data-t）被跳过：readDataText → undefined 不复制、不抛错', async () => {
  const html = '<button type="button" ' + ACTION_ID_ATTR + '="ilife-demo-open">打开</button>';
  const host = hostFromHtml(html);
  const fake = fakePorts({ writeText: () => Promise.resolve() });
  const handle = bindCopyAction(host, fake.ports);
  assert.equal(host.activate(0), true, '非复制按钮同样被订阅（不设白名单，S-9）');
  await new Promise((r) => setTimeout(r, 0));
  assert.equal(fake.fallbackCalls.length, 0);
  assert.equal(fake.mounted.length, 0, '无 data-t 不得产反馈');
  handle.dispose();
});

test('冻结表与既有 actionBar／errorReceipt id 不撞名（页面内唯一性口径）', () => {
  const frozen = [COPY_ACTION_IDS.actionBar.copyData, COPY_ACTION_IDS.actionBar.copyLog,
    COPY_ACTION_IDS.errorReceipt.copyData, COPY_ACTION_IDS.errorReceipt.copyLog,
    HELP_COPY_ACTIONS.prompt.actionId, HELP_COPY_ACTIONS.wakeWord.actionId, HELP_COPY_ACTIONS.params.actionId];
  assert.equal(new Set(frozen).size, frozen.length, '冻结 id 两两不同');
  assert.ok(HELP_COPY_ACTIONS.prompt.actionId.startsWith('ilife-'), '前缀恒 ilife-');
});

/* ── ④ 出口接线：CLI 写盘的 HTML 带按钮 ＋ 运行时（红点：接线只落在 render 层未到出口） ── */

test('calorie.help.center q 支已下线：exit 2＋指路 lookup（红点：q 支回潮）', () => {
  const dir = mkdtempSync(join(tmpdir(), 't90-cli2-'));
  const r = spawnSync(NODE_BIN, [BIN, 'calorie.help.center', '--params', JSON.stringify({ q: '记身材照' })],
    { encoding: 'utf8', env: { ...process.env, ILIFE_CONFIG_DIR: calorieConfigDir(dir) } });
  assert.equal(r.status, 2, 'exit ' + r.status + ' stderr=' + (r.stderr || '').slice(-400));
  assert.match(String(r.stderr), /下线/);
  assert.match(String(r.stderr), /calorie\.help\.lookup/);
  assert.equal(String(r.stdout), '', 'stdout 纯净');
});
