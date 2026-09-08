// #76 控件层守卫测试（node:test；随 root `pnpm test` 跑）。
//
// 覆盖（对齐旧基线 31 个控件用例的行为面 ＋ 补 actionBar，见施工单 C-6）：
//   旧基线行为面 31：toast 11／copyText 8／statusBadge 3／emptyState 3／errorReceipt 5／ghost 1
//   本票用例 64：toast 14／copyText 14／statusBadge 3／emptyState 4／errorReceipt 5／actionBar＋ghost 6
//                ／bindCopyAction 9／helpers 6／无宿主可用性表 1／无宿主可执行证据 2
//   ＋ `bindCopyAction` 接线（S-4）＋ `buildSharedHelpersJs` 产出契约（S-3）
//   ＋ **无宿主可执行证据**（D4／A2：独立 HTML 页面 ＋ headless Chrome；≤820px 视口收窄 FX-76-2）
//   ＋ 返修 FX-76-1（fallback 抛错）／FX-76-3（边界与断言质量）／FX-76-5（macOS 路径＋不静默变绿）
//     ／FX-76-6（无未处理拒绝）／FX-76-7③（静态 toast role／aria／data-max 回读）
//
// 纪律：断言只读冻结常量（不硬编码第二份值）；不删、不放宽、不恒真化任何断言。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from 'node:http';
import { existsSync, readFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

import {
  ACTION_BAR_DEFAULTS,
  ACTION_BAR_KINDS,
  ACTION_ID_ATTR,
  COPY_ACTION_IDS,
  COPY_TEXT_DEFAULTS,
  CONTROLS_HOST_REQUIREMENT,
  CONTROL_AVAILABILITY,
  CONTROL_NAMES,
  DEFAULT_DATA_ATTR,
  RenderError,
  SHARED_HELPERS_JS_RULE,
  STATUS_DEFAULT_TEXT,
  TOAST_DEFAULTS,
  bindCopyAction,
  buildSharedHelpersJs,
  copyText,
  createCopyRuntime,
  createToastController,
  renderActionBar,
  renderEmptyState,
  renderErrorReceipt,
  renderStatusBadge,
  renderToast,
} from '../dist/index.js';

const LF = String.fromCharCode(10);
const DIST_DIR = fileURLToPath(new URL('../dist/', import.meta.url));
/** 必须**异步**执行浏览器：同步 spawn 会阻塞事件循环，托管夹具的 HTTP 服务将无法响应。 */
const execFileAsync = promisify(execFile);

/* ── 测试小件 ─────────────────────────────────────────────── */

/** 假 `ToastHostPort`：记录挂载的 HTML 与 remove 调用（不动 DOM）。 */
function fakeToastHost() {
  const mounted = [];
  const port = {
    mount(html) {
      const entry = { html, removed: false };
      mounted.push(entry);
      return {
        remove() {
          entry.removed = true;
        },
      };
    },
  };
  return {
    port,
    mounted,
    live: () => mounted.filter((m) => !m.removed),
    titles: () => mounted.filter((m) => !m.removed).map((m) => (m.html.match(/toast-title">([^<]*)</) ?? [])[1]),
  };
}

/** 假 `CopyPorts`：默认 clipboard 为 null（直接走通道 2）。 */
function fakePorts(overrides = {}) {
  const host = fakeToastHost();
  const fallbackCalls = [];
  const ports = {
    clipboard: null,
    fallback(text) {
      fallbackCalls.push(text);
      return true;
    },
    toast: host.port,
    ...overrides,
  };
  return { ports, host, fallbackCalls };
}

/** 取 `renderToast` 产出里的图标字形（`toast-icon` 的内容）。
 *  用于「icon 覆盖真的生效」这类断言——**不**在测试里抄第二份字形表，改与 `renderToast` 自身产出对拍。 */
function iconGlyph(html) {
  return (html.match(/toast-icon" aria-hidden="true">([^<]*)</) ?? [])[1];
}

/** 取 `renderToast` 产出里的关闭按钮文案（同口径：对拍而非抄字面）。 */
function closeLabelOf(html) {
  return (html.match(/toast-close">([^<]*)</) ?? [])[1];
}

/** 捕获 `ControlsError` 并断言形态（并列、互不继承 RenderError）。 */
function expectBadInput(fn, label) {
  let err;
  try {
    fn();
  } catch (caught) {
    err = caught;
  }
  assert.ok(err, label + '：必须抛错');
  assert.equal(err.name, 'ControlsError', label + '：name 必须是 ControlsError');
  assert.equal(err.code, 'bad-input', label + '：code 必须是 bad-input');
  assert.equal(typeof err.message, 'string', label + '：message 必须是字符串');
  assert.ok(err.message.length > 0, label + '：message 不得为空');
  assert.ok(!(err instanceof RenderError), label + '：ControlsError 不得是 RenderError');
  assert.ok(!RenderError.prototype.isPrototypeOf(err), label + '：原型链不得含 RenderError');
  return err;
}

async function expectBadInputAsync(fn, label) {
  let err;
  try {
    await fn();
  } catch (caught) {
    err = caught;
  }
  assert.ok(err, label + '：必须抛错');
  assert.equal(err.name, 'ControlsError', label + '：name 必须是 ControlsError');
  assert.equal(err.code, 'bad-input', label + '：code 必须是 bad-input');
  return err;
}

/** 假 `CopyActionHostPort`：三个方法可观测（不订阅未列出的 id）。 */
function fakeActionHost(ids, texts) {
  const handlers = new Map();
  const subscriptions = [];
  const unsubscribed = [];
  const host = {
    listActionIds: () => ids,
    readDataText: (actionId) => texts[actionId],
    onActivate: (actionId, handler) => {
      subscriptions.push(actionId);
      handlers.set(actionId, handler);
      return () => {
        unsubscribed.push(actionId);
        handlers.delete(actionId);
      };
    },
  };
  return {
    host,
    subscriptions,
    unsubscribed,
    activate: (actionId) => {
      const handler = handlers.get(actionId);
      if (handler !== undefined) handler();
      return handler !== undefined;
    },
    activeIds: () => [...handlers.keys()],
  };
}

/* ── toast（旧层 11 用例行为面） ───────────────────────────── */

describe('#76 toast：renderToast ＋ createToastController', () => {
  it('向后兼容文案与无障碍属性（role／aria-live／data-max）', () => {
    const html = renderToast({ msg: COPY_TEXT_DEFAULTS.okMessage, detail: COPY_TEXT_DEFAULTS.okDetail });
    assert.ok(html.includes(COPY_TEXT_DEFAULTS.okMessage), '缺 ok 主文案');
    assert.ok(html.includes(COPY_TEXT_DEFAULTS.okDetail), '缺 ok 详情文案');
    assert.ok(html.includes('✓ 知道了'), '缺关闭按钮文案（旧基线逐字）');
    assert.ok(html.includes('role="' + TOAST_DEFAULTS.role + '"'), 'role 必须取 TOAST_DEFAULTS.role');
    assert.ok(html.includes('aria-live="' + TOAST_DEFAULTS.ariaLive + '"'), 'aria-live 必须取 TOAST_DEFAULTS.ariaLive');
    assert.ok(html.includes('data-max="' + TOAST_DEFAULTS.maxStack + '"'), 'data-max 必须取 TOAST_DEFAULTS.maxStack');
  });

  it('badge 文本与类型渲染', () => {
    const html = renderToast({ msg: 'm', badge: { type: 'danger', text: STATUS_DEFAULT_TEXT.danger } });
    assert.ok(html.includes(STATUS_DEFAULT_TEXT.danger), '缺徽章文本');
    assert.ok(html.includes('toast-chip-danger'), '缺徽章类型类名');
  });

  it('非法 badge.type 回落 ok；非法 icon 回落 defaultIcon（文档无规定，实现记账）', () => {
    const badge = renderToast({ msg: 'm', badge: { type: 'nope', text: 't' } });
    assert.ok(badge.includes('toast-chip-ok'), '非法 badge.type 必须回落 ok');
    assert.ok(!badge.includes('toast-chip-nope'), '不得产出非法徽章类名');
    assert.ok(badge.includes('t'), '回落类型不影响徽章文本');
    const badIcon = renderToast({ msg: 'm', icon: 'nope' });
    assert.equal(iconGlyph(badIcon), iconGlyph(renderToast({ msg: 'm', icon: TOAST_DEFAULTS.defaultIcon })), '非法 icon 必须回落 defaultIcon');
    assert.equal(iconGlyph(renderToast({ msg: 'm' })), iconGlyph(renderToast({ msg: 'm', icon: TOAST_DEFAULTS.defaultIcon })), '缺省 icon 必须等于 defaultIcon');
  });

  it('actions 不截断（渲染全部，旧层 slice(0,2) 未进冻结面）', () => {
    const actions = [
      { label: 'a1', actionId: 'ilife-a1' },
      { label: 'a2', actionId: 'ilife-a2' },
      { label: 'a3', actionId: 'ilife-a3' },
    ];
    const html = renderToast({ msg: 'm', actions });
    assert.equal((html.match(/toast-act/g) ?? []).length, actions.length, '必须渲染全部 action（不截断）');
    for (const action of actions) {
      assert.ok(html.includes(ACTION_ID_ATTR + '="' + action.actionId + '"'), action.actionId + ' 必须渲染');
      assert.ok(html.includes(action.label), action.label + ' 文案必须渲染');
    }
  });

  it('count／lines／code／detail 渲染且逐项转义', () => {
    const html = renderToast({ msg: 'm', count: '5 条', lines: ['<a>', '&b'], code: '<script>' });
    assert.ok(html.includes('5 条'), '缺 count');
    assert.ok(html.includes('&lt;a&gt;<br>&amp;b'), 'lines 必须逐行转义并 &lt;br&gt; 连接');
    assert.ok(html.includes('&lt;script&gt;'), 'code 必须转义');
    assert.ok(!html.includes('<script>'), '产出不得含可执行 script 片段');
  });

  it('actions 只接受 actionId：写入 ACTION_ID_ATTR，零内联 onclick', () => {
    const html = renderToast({ msg: 'm', actions: [{ label: '撤销', actionId: 'ilife-demo-undo' }] });
    assert.ok(html.includes(ACTION_ID_ATTR + '="ilife-demo-undo"'), '动作按钮必须写入 ACTION_ID_ATTR');
    assert.ok(html.includes('撤销'), '缺动作按钮文案');
    assert.ok(!/onclick/i.test(html), '不得出现内联 onclick');
  });

  it('含内联 onclick 的 actions 入参一律拒（bad-input）', () => {
    expectBadInput(() => renderToast({ msg: 'm', actions: [{ label: 'x', actionId: 'ilife-a', onClick: () => {} }] }), 'actions[0].onClick');
    expectBadInput(() => renderToast({ msg: 'm', actions: [{ label: 'x' }] }), 'actions[0] 缺 actionId');
    expectBadInput(() => renderToast({ msg: 'm', actions: [{ label: 'x', actionId: '' }] }), 'actions[0].actionId 空串');
  });

  it('msg 非字符串 → ControlsError bad-input', () => {
    expectBadInput(() => renderToast({}), 'msg 缺失');
    expectBadInput(() => renderToast({ msg: 42 }), 'msg 非字符串');
    expectBadInput(() => renderToast(null), 'input 非对象');
  });

  it('堆叠顺序：新条追加在后（老上旧下由样式区承载）', () => {
    const host = fakeToastHost();
    const controller = createToastController(host.port);
    controller.show({ msg: 'A' });
    controller.show({ msg: 'B' });
    assert.deepEqual(host.titles(), ['A', 'B'], '栈内顺序必须与 show 顺序一致');
    controller.dispose();
  });

  it('超 maxStack 挤最旧（FIFO）', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const host = fakeToastHost();
    const controller = createToastController(host.port);
    for (const msg of ['A', 'B', 'C', 'D', 'E', 'F']) controller.show({ msg });
    assert.deepEqual(host.titles(), ['B', 'C', 'D', 'E', 'F'], '超容量必须挤出最旧');
    assert.equal(host.live().length, TOAST_DEFAULTS.maxStack, '存活条数必须等于 maxStack');
    controller.dispose();
    t.mock.timers.reset();
  });

  it('单条 maxStack 生效（容量取栈内最大值）', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const host = fakeToastHost();
    const controller = createToastController(host.port);
    controller.show({ msg: 'A', maxStack: 2 });
    controller.show({ msg: 'B', maxStack: 2 });
    controller.show({ msg: 'C', maxStack: 2 });
    assert.deepEqual(host.titles(), ['B', 'C'], 'maxStack=2 时只留 2 条');
    controller.dispose();
    t.mock.timers.reset();
  });

  it('单条独立计时（各自 timeoutMs）', (t) => {
    t.mock.timers.enable({ apis: ['setTimeout'] });
    const host = fakeToastHost();
    const controller = createToastController(host.port);
    controller.show({ msg: 'A', timeoutMs: 100 });
    controller.show({ msg: 'B', timeoutMs: 5000 });
    t.mock.timers.tick(200);
    assert.deepEqual(host.titles(), ['B'], '只有先到期的 A 消失');
    t.mock.timers.tick(6000);
    assert.deepEqual(host.titles(), [], 'B 到期后清空');
    controller.dispose();
    t.mock.timers.reset();
  });

  it('flush() 清栈，dispose() 幂等且之后 show 为 no-op', () => {
    const host = fakeToastHost();
    const controller = createToastController(host.port);
    controller.show({ msg: 'A' });
    controller.show({ msg: 'B' });
    controller.flush();
    assert.equal(host.live().length, 0, 'flush 必须清空栈');
    controller.show({ msg: 'C' });
    assert.equal(host.live().length, 1, 'flush 后仍可继续 show');
    controller.dispose();
    controller.dispose();
    assert.equal(host.live().length, 0, 'dispose 必须清空栈且幂等');
    controller.show({ msg: 'D' });
    assert.equal(host.live().length, 0, 'dispose 之后 show 必须为 no-op');
  });

  it('port 非法 → bad-input', () => {
    expectBadInput(() => createToastController(null), 'port=null');
    expectBadInput(() => createToastController({}), 'port 缺 mount');
  });
});

/* ── copyText 双通道（旧层 8 用例行为面） ──────────────────── */

describe('#76 copyText：双通道与反馈', () => {
  it('clipboard 通道优先，成功文案取 COPY_TEXT_DEFAULTS', async () => {
    const host = fakeToastHost();
    const writes = [];
    const outcome = await copyText('hello', {
      clipboard: { writeText: (text) => { writes.push(text); return Promise.resolve(); } },
      fallback: () => false,
      toast: host.port,
    });
    assert.deepEqual(outcome, { ok: true, channel: 'clipboard' });
    assert.deepEqual(writes, ['hello'], '通道 1 必须先被调用');
    assert.equal(host.mounted.length, 1, '成功必须弹一条 toast');
    assert.ok(host.mounted[0].html.includes(COPY_TEXT_DEFAULTS.okMessage), 'ok 主文案必须取默认值');
    assert.ok(host.mounted[0].html.includes(COPY_TEXT_DEFAULTS.okDetail), 'ok 详情文案必须取默认值');
  });

  it('clipboard 抛错／reject → 降级 fallback，channel === fallback', async () => {
    const rejected = fakePorts({ clipboard: { writeText: () => Promise.reject(new Error('denied')) } });
    const outcome = await copyText('x', rejected.ports);
    assert.deepEqual(outcome, { ok: true, channel: 'fallback' });
    assert.deepEqual(rejected.fallbackCalls, ['x'], '通道 2 必须收到原文');

    const thrown = fakePorts({ clipboard: { writeText: () => { throw new Error('sync'); } } });
    const outcome2 = await copyText('y', thrown.ports);
    assert.deepEqual(outcome2, { ok: true, channel: 'fallback' }, '同步抛错同样降级');
  });

  it('clipboard === null → 直接走 fallback（真值即成功，旧层口径）', async () => {
    const fake = fakePorts();
    const outcome = await copyText('x', fake.ports);
    assert.deepEqual(outcome, { ok: true, channel: 'fallback' });
    assert.deepEqual(fake.fallbackCalls, ['x']);

    const truthy = fakePorts({ fallback: () => 1 });
    assert.deepEqual(await copyText('x', truthy.ports), { ok: true, channel: 'fallback' }, '真值返回必须算成功（旧层 `? :` 口径）');
    const falsy = fakePorts({ fallback: () => 0 });
    const failed = await copyText('x', falsy.ports);
    assert.equal(failed.ok, false, '假值返回必须算失败');
  });

  it('两通道皆失败 → ok:false／channel:null／不抛错，且失败徽章恒在', async () => {
    const host = fakeToastHost();
    const outcome = await copyText('x', { clipboard: null, fallback: () => false, toast: host.port });
    assert.equal(outcome.ok, false);
    assert.equal(outcome.channel, null);
    assert.equal(typeof outcome.reason, 'string');
    assert.ok(outcome.reason.length > 0, 'reason 不得为空');
    assert.equal(host.mounted.length, 1, '失败必须挂一条徽章 toast');
    assert.ok(host.mounted[0].html.includes(COPY_TEXT_DEFAULTS.failMessage), 'fail 主文案必须取默认值');
    assert.ok(host.mounted[0].html.includes(COPY_TEXT_DEFAULTS.failDetail), 'fail 详情文案必须取默认值');
    assert.ok(host.mounted[0].html.includes('toast-chip-danger'), '失败徽章 type 必须 danger');
    assert.ok(host.mounted[0].html.includes(STATUS_DEFAULT_TEXT.danger), '失败徽章文案必须取 STATUS_DEFAULT_TEXT.danger');
    // 图标字形：与 `renderToast({icon:'danger'})` 对拍（原 `includes('danger')` 被上一行的 `toast-chip-danger` 蕴含，无鉴别力 → FX-76-3①）
    assert.equal(iconGlyph(host.mounted[0].html), iconGlyph(renderToast({ msg: 'm', icon: 'danger' })), '失败图标必须取 danger 字形');
    assert.notEqual(iconGlyph(host.mounted[0].html), iconGlyph(renderToast({ msg: 'm', icon: TOAST_DEFAULTS.defaultIcon })), '失败图标不得是缺省图标');
  });

  it('fallback 同步抛错 → 返回 outcome 不抛错，且失败徽章恒在（FX-76-1）', async () => {
    const host = fakeToastHost();
    const outcome = await copyText('x', { clipboard: null, fallback: () => { throw new Error('boom'); }, toast: host.port });
    assert.deepEqual(outcome, { ok: false, channel: null, reason: 'fallback-threw' }, '通道 2 抛错必须降级为 outcome');
    assert.equal(host.mounted.length, 1, '通道 2 抛错同样必须挂失败徽章（失败徽章恒在）');
    assert.ok(host.mounted[0].html.includes('toast-chip-danger'), '失败徽章 type 必须 danger');
    assert.ok(host.mounted[0].html.includes(STATUS_DEFAULT_TEXT.danger), '失败徽章文案必须取 STATUS_DEFAULT_TEXT.danger');

    // 通道 1 与通道 2 双抛错：同样不抛错、同样出徽章
    const bothHost = fakeToastHost();
    const both = await copyText('y', {
      clipboard: { writeText: () => { throw new Error('c1'); } },
      fallback: () => { throw new Error('c2'); },
      toast: bothHost.port,
    });
    assert.deepEqual(both, { ok: false, channel: null, reason: 'fallback-threw' }, '双通道皆抛错必须降级为 outcome');
    assert.equal(bothHost.mounted.length, 1, '双通道皆抛错同样必须挂失败徽章');
  });

  it('fallback 返回 false → reason 与抛错路径可区分，且同样出徽章（FX-76-1）', async () => {
    const host = fakeToastHost();
    const outcome = await copyText('x', { clipboard: null, fallback: () => false, toast: host.port });
    assert.deepEqual(outcome, { ok: false, channel: null, reason: 'fallback-failed' }, '返回假值 → fallback-failed');
    assert.equal(host.mounted.length, 1, '返回假值同样必须挂失败徽章');
    assert.ok(host.mounted[0].html.includes('toast-chip-danger'), '失败徽章 type 必须 danger');
    assert.notDeepEqual(outcome, { ok: false, channel: null, reason: 'fallback-threw' }, '两条失败路径的 reason 必须可区分');
  });

  it('fallback 抛错不影响通道 1 成功路径（通道 1 优先）', async () => {
    const host = fakeToastHost();
    const calls = [];
    const outcome = await copyText('x', {
      clipboard: { writeText: () => Promise.resolve() },
      fallback: () => { calls.push('fallback'); throw new Error('boom'); },
      toast: host.port,
    });
    assert.deepEqual(outcome, { ok: true, channel: 'clipboard' }, '通道 1 成功不得触碰通道 2');
    assert.deepEqual(calls, [], '通道 1 成功时通道 2 不得被调用');
    assert.equal(host.mounted.length, 1, '成功反馈仍必须挂载');
  });

  it("copyText('', null) 先校验端口 → bad-input（次序文档无规定，实现记账）", async () => {
    await expectBadInputAsync(() => copyText('', null), "ports=null 且 text=''");
    await expectBadInputAsync(() => copyText('', {}), "ports.fallback 缺失 且 text=''");
    const host = fakeToastHost();
    const outcome = await copyText('', { clipboard: null, fallback: () => true, toast: host.port });
    assert.deepEqual(outcome, { ok: false, channel: null, reason: 'empty' }, '端口合法时空串仍短路');
    assert.equal(host.mounted.length, 0, '空串短路不得弹 toast');
  });

  it('空串短路：无 toast、无回调（reason === empty）', async () => {
    const host = fakeToastHost();
    let called = 0;
    const outcome = await copyText('', {
      clipboard: { writeText: () => Promise.resolve() },
      fallback: () => { called += 1; return true; },
      toast: host.port,
    }, { onOk: () => { called += 1; }, onFail: () => { called += 1; } });
    assert.deepEqual(outcome, { ok: false, channel: null, reason: 'empty' });
    assert.equal(host.mounted.length, 0, '空串不得弹 toast');
    assert.equal(called, 0, '空串不得触发回调、不得走通道');
  });

  it('silent 只静默成功 toast，回调仍触发；失败徽章不受 silent 影响', async () => {
    const okHost = fakeToastHost();
    const okCalls = [];
    await copyText('x', { clipboard: { writeText: () => Promise.resolve() }, fallback: () => false, toast: okHost.port }, {
      silent: true,
      onOk: (channel) => okCalls.push(channel),
    });
    assert.equal(okHost.mounted.length, 0, 'silent 必须静默成功 toast');
    assert.deepEqual(okCalls, ['clipboard'], 'silent 不得抑制 onOk');

    const failHost = fakeToastHost();
    const failCalls = [];
    await copyText('x', { clipboard: null, fallback: () => false, toast: failHost.port }, {
      silent: true,
      onFail: (reason) => failCalls.push(reason),
    });
    assert.equal(failHost.mounted.length, 1, '失败徽章恒在，silent 不得抑制');
    assert.equal(failCalls.length, 1, 'silent 不得抑制 onFail');
  });

  it('onOk／onFail 互斥且各触发一次', async () => {
    const ok = { onOk: 0, onFail: 0 };
    await copyText('x', { clipboard: null, fallback: () => true }, { onOk: () => { ok.onOk += 1; }, onFail: () => { ok.onFail += 1; } });
    assert.deepEqual(ok, { onOk: 1, onFail: 0 }, '成功只触发 onOk');

    const fail = { onOk: 0, onFail: 0 };
    await copyText('x', { clipboard: null, fallback: () => false }, { onOk: () => { fail.onOk += 1; }, onFail: () => { fail.onFail += 1; } });
    assert.deepEqual(fail, { onOk: 0, onFail: 1 }, '失败只触发 onFail');
  });

  it('opts.toast.ok／fail 逐字段覆盖，未提供字段回落默认', async () => {
    const host = fakeToastHost();
    await copyText('x', { clipboard: null, fallback: () => true, toast: host.port }, {
      toast: { ok: { msg: '已存剪贴板' } },
    });
    assert.ok(host.mounted[0].html.includes('已存剪贴板'), 'msg 必须被覆盖');
    assert.ok(host.mounted[0].html.includes(COPY_TEXT_DEFAULTS.okDetail), 'detail 未提供必须回落默认');

    const failHost = fakeToastHost();
    await copyText('x', { clipboard: null, fallback: () => false, toast: failHost.port }, {
      toast: { fail: { msg: '复制失败啦', detail: '请长按手动复制', icon: 'warn' } },
    });
    assert.ok(failHost.mounted[0].html.includes('复制失败啦'), 'fail msg 必须被覆盖');
    assert.ok(failHost.mounted[0].html.includes('请长按手动复制'), 'fail detail 必须被覆盖');
    assert.ok(failHost.mounted[0].html.includes('toast-chip-danger'), '徽章恒在，不可被覆盖移除');
    // 图标覆盖真的落到产出（旧层第 4 条 copyText 用例的行为面）：与 renderToast 自身产出对拍
    const glyph = iconGlyph(failHost.mounted[0].html);
    assert.equal(glyph, iconGlyph(renderToast({ msg: 'm', icon: 'warn' })), 'opts.toast.fail.icon 必须真的生效');
    assert.notEqual(glyph, iconGlyph(renderToast({ msg: 'm', icon: 'danger' })), 'icon 覆盖必须与缺省 danger 不同');
  });

  it('ports 缺失／fallback 非函数 → bad-input；缺 ports.toast → 降级只回调', async () => {
    await expectBadInputAsync(() => copyText('x', null), 'ports=null');
    await expectBadInputAsync(() => copyText('x', {}), 'ports.fallback 缺失');
    await expectBadInputAsync(() => copyText('x', { clipboard: null, fallback: 'nope' }), 'ports.fallback 非函数');
    await expectBadInputAsync(() => copyText(42, { clipboard: null, fallback: () => true }), 'text 非字符串');

    const calls = [];
    const outcome = await copyText('x', { clipboard: null, fallback: () => true }, { onOk: (c) => calls.push(c) });
    assert.deepEqual(outcome, { ok: true, channel: 'fallback' }, '缺 toast 端口仍必须返回 outcome');
    assert.deepEqual(calls, ['fallback'], '缺 toast 端口仍必须回调');
  });

  it('createCopyRuntime：转发 copyText 且 dispose 回收自己挂的反馈节点', async () => {
    const host = fakeToastHost();
    const runtime = createCopyRuntime({ clipboard: null, fallback: () => true, toast: host.port });
    const outcome = await runtime.copyText('x');
    assert.deepEqual(outcome, { ok: true, channel: 'fallback' });
    assert.equal(host.live().length, 1, 'runtime 的反馈节点应已挂载');
    runtime.dispose();
    assert.equal(host.live().length, 0, 'dispose 必须回收本 runtime 挂的节点');
    runtime.dispose();
    expectBadInput(() => createCopyRuntime(null), 'createCopyRuntime: ports=null');
  });
});

/* ── statusBadge（旧层 3 用例） ────────────────────────────── */

describe('#76 statusBadge', () => {
  it('四个合法状态映射语义默认文案与类名', () => {
    for (const status of ['ok', 'warn', 'danger', 'empty']) {
      const html = renderStatusBadge({ status });
      assert.ok(html.includes(STATUS_DEFAULT_TEXT[status]), status + '：必须取 STATUS_DEFAULT_TEXT');
      assert.ok(html.includes('status-badge-' + status), status + '：必须带语义类名');
    }
  });

  it('非法 status 降级 empty（不抛错，防无样式徽章）', () => {
    const html = renderStatusBadge({ status: 'fail' });
    assert.ok(html.includes('status-badge-empty'), 'fail 必须降级 empty（票面 fail ＝ 契约 danger／此处非法）');
    assert.ok(html.includes(STATUS_DEFAULT_TEXT.empty), '降级后取 empty 默认文案');
    assert.ok(!html.includes('status-badge-fail'), '不得产出非法类名');
  });

  it('text 覆盖与 XSS 转义', () => {
    const html = renderStatusBadge({ status: 'ok', text: '<img src=x onerror=alert(1)>' });
    assert.ok(html.includes('&lt;img'), 'text 必须转义');
    assert.ok(!html.includes('<img'), '不得透传 HTML');
  });
});

/* ── emptyState（旧层 3 用例） ─────────────────────────────── */

describe('#76 emptyState', () => {
  it('icon／text／hint 渲染且一律转义', () => {
    const html = renderEmptyState({ icon: '<i>', text: '<b>暂无</b>', hint: '&hint' });
    assert.ok(html.includes('&lt;i&gt;'), 'icon 必须转义');
    assert.ok(html.includes('&lt;b&gt;暂无&lt;/b&gt;'), 'text 必须转义');
    assert.ok(html.includes('&amp;hint'), 'hint 必须转义');
  });

  it('actionHtml 为受信 HTML 透传（不转义）', () => {
    const html = renderEmptyState({ text: '空', actionHtml: '<button type="button" data-action-id="ilife-demo-add">添加</button>' });
    assert.ok(html.includes('<button type="button" data-action-id="ilife-demo-add">添加</button>'), 'actionHtml 必须原样透传');
  });

  it('actionHtml 的受信边界显式：调用方片段原样透传，本层自产标记零内联处理器（FX-76-7①）', () => {
    // 「零注入面」只约束 base-paint **自产**标记；actionHtml 是契约明写的**受信输入**（调用方负责其内容安全）。
    // 本用例把这条边界钉死：受信片段里的 onclick 必须原样保留（否则契约的「不转义」被破坏），
    // 而**本层自己拼**的标记里不得出现任何内联事件处理器。
    const trusted = '<button type="button" onclick="ilifeTrusted()">受信</button>';
    const html = renderEmptyState({ text: '空', actionHtml: trusted });
    assert.ok(html.includes(trusted), '受信 HTML 必须原样透传（含调用方自己的内联处理器）');
    const own = html.replace(trusted, '');
    assert.ok(!/\son[a-z]+\s*=/i.test(own), 'base-paint 自产标记不得含内联事件处理器');
    assert.ok(!/\son[a-z]+\s*=/i.test(renderEmptyState({ text: '空' })), '无 actionHtml 时产出必须零内联处理器');
  });

  it('text 缺失／非字符串 → bad-input', () => {
    expectBadInput(() => renderEmptyState({}), 'text 缺失');
    expectBadInput(() => renderEmptyState({ text: 7 }), 'text 非字符串');
    expectBadInput(() => renderEmptyState(null), 'input 非对象');
  });
});

/* ── errorReceipt（旧层 5 用例） ───────────────────────────── */

describe('#76 errorReceipt', () => {
  it('三按钮 ＋ 修正重试 wide ＋ 单容器（旧基线结构面）', () => {
    const html = renderErrorReceipt({ message: '炸了', dataText: 'd', logText: 'l' });
    assert.equal((html.match(/<button /g) ?? []).length, 3, '必须渲染 3 个按钮');
    assert.ok(html.includes('ilife-copy-btn-wide'), '修正重试必须 wide');
    assert.ok(html.includes('修正重试'), '缺修正重试文案');
    assert.equal((html.match(/class="ilife-error-actions"/g) ?? []).length, 1, '按钮容器只应有一个');
    assert.ok(!/onclick/i.test(html), '不得出现内联 onclick');
  });

  it('dataText／logText 渲染期写入 data-t，id 缺省取 COPY_ACTION_IDS.errorReceipt.*', () => {
    const html = renderErrorReceipt({ message: 'm', dataText: 'payload', logText: 'log' });
    assert.ok(html.includes(ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.errorReceipt.copyData + '"'), '复制数据 id 必须取冻结表');
    assert.ok(html.includes(ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.errorReceipt.copyLog + '"'), '复制日志 id 必须取冻结表');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="payload"'), 'dataText 必须写入 DEFAULT_DATA_ATTR');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="log"'), 'logText 必须写入 DEFAULT_DATA_ATTR');
  });

  it('缺 dataText／logText → 不渲染对应按钮且不抛错', () => {
    const only = renderErrorReceipt({ message: 'm', dataText: 'd' });
    assert.equal((only.match(/<button /g) ?? []).length, 2, '只应渲染修正重试 ＋ 复制数据');
    assert.ok(!only.includes(COPY_ACTION_IDS.errorReceipt.copyLog), '缺 logText 不得渲染复制日志');
    const none = renderErrorReceipt({ message: 'm' });
    assert.equal((none.match(/<button /g) ?? []).length, 1, '无复制文本时只渲染修正重试');
    assert.ok(!none.includes(ACTION_ID_ATTR), '无复制按钮时不得出现 ACTION_ID_ATTR');
  });

  it('message／dataText／logText 一律转义（含属性值）', () => {
    const html = renderErrorReceipt({ message: '<b>m</b>', dataText: 'a"b<c', logText: "'q'" });
    assert.ok(html.includes('&lt;b&gt;m&lt;/b&gt;'), 'message 必须转义');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="a&quot;b&lt;c"'), 'dataText 属性值必须转义');
    assert.ok(html.includes("&#39;q&#39;"), 'logText 必须转义单引号');
  });

  it('重复 actionId ／空串 → bad-input；message 缺失 → bad-input', () => {
    expectBadInput(() => renderErrorReceipt({ message: 'm', dataText: 'd', logText: 'l', dataActionId: 'ilife-same', logActionId: 'ilife-same' }), '重复 id');
    expectBadInput(() => renderErrorReceipt({ message: 'm', dataText: 'd', dataActionId: '' }), '空串 id');
    expectBadInput(() => renderErrorReceipt({}), 'message 缺失');
  });
});

/* ── actionBar（旧层无专门用例，本票补） ＋ ghost 样式口径（旧层 1 用例） ── */

describe('#76 actionBar ＋ ghost 口径', () => {
  it('场景按钮按 kind 产类名并写入 ACTION_ID_ATTR', () => {
    const html = renderActionBar({
      buttons: [
        { label: '打开', kind: 'primary', actionId: 'ilife-demo-open' },
        { label: '删除', kind: 'red', actionId: 'ilife-demo-del' },
      ],
    });
    for (const kind of ACTION_BAR_KINDS) {
      if (kind === 'ghost') continue;
      assert.ok(html.includes('action-btn-' + kind), kind + '：必须带 kind 类名');
    }
    assert.ok(html.includes(ACTION_ID_ATTR + '="ilife-demo-open"'), '场景按钮必须带 ACTION_ID_ATTR');
    assert.ok(html.includes(ACTION_ID_ATTR + '="ilife-demo-del"'));
  });

  it('复制数据／日志：ghost 独立一行、id 与 COPY_ACTION_IDS 逐字一致、文本写入 data-t', () => {
    const html = renderActionBar({
      buttons: [{ label: '打开', kind: 'primary', actionId: 'ilife-demo-open' }],
      copyData: { actionId: COPY_ACTION_IDS.actionBar.copyData, text: 'DATA' },
      copyLog: { actionId: COPY_ACTION_IDS.actionBar.copyLog, text: 'LOG' },
    });
    assert.equal(ACTION_BAR_DEFAULTS.ghostOwnRow, true, '冻结值：ghost 独立一行');
    const rows = html.split('<div class="ilife-action-row');
    assert.equal(rows.length - 1, 2, 'ghostOwnRow 为真时必须两行');
    assert.ok(html.includes('ilife-action-row-ghost'), 'ghost 行必须带独立行类名');
    assert.ok(html.includes('ilife-copy-btn-ghost'), '复制按钮必须 ghost 类名');
    assert.ok(html.includes(ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.actionBar.copyData + '"'), '复制数据 id 必须逐字一致');
    assert.ok(html.includes(ACTION_ID_ATTR + '="' + COPY_ACTION_IDS.actionBar.copyLog + '"'), '复制日志 id 必须逐字一致');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="DATA"'), '复制文本必须在渲染期写入 data-t');
    assert.ok(html.includes(DEFAULT_DATA_ATTR + '="LOG"'));
    assert.ok(!/onclick/i.test(html), '零注入面：不得出现内联 onclick');
    assert.ok(!/\sstyle="/i.test(html), '不得内联样式（样式唯一真相源是 #75 的共享样式区）');
  });

  it('复制按钮文案可配（C-4），缺省取 ACTION_BAR_DEFAULTS', () => {
    const custom = renderActionBar({ copyData: { actionId: 'ilife-a', label: '拷数据', text: 'x' } });
    assert.ok(custom.includes('拷数据'), 'label 必须可配');
    const defaults = renderActionBar({ copyData: { actionId: 'ilife-a' }, copyLog: { actionId: 'ilife-b' } });
    assert.ok(defaults.includes(ACTION_BAR_DEFAULTS.copyDataLabel), '缺省必须取 copyDataLabel');
    assert.ok(defaults.includes(ACTION_BAR_DEFAULTS.copyLogLabel), '缺省必须取 copyLogLabel');
    assert.ok(!defaults.includes(DEFAULT_DATA_ATTR + '='), 'text 缺席不得写 data-t（binder 靠 undefined 跳过）');
  });

  it('缺 actionId ／空串 ／同次渲染内重复 → bad-input', () => {
    expectBadInput(() => renderActionBar({ copyData: { text: 'x' } }), 'copyData 缺 actionId');
    expectBadInput(() => renderActionBar({ copyData: { actionId: '' } }), 'copyData 空串 actionId');
    expectBadInput(() => renderActionBar({ copyData: { actionId: 'ilife-a' }, copyLog: { actionId: 'ilife-a' } }), '复制按钮之间重复');
    expectBadInput(() => renderActionBar({
      buttons: [{ label: 'x', kind: 'primary', actionId: 'ilife-a' }],
      copyData: { actionId: 'ilife-a' },
    }), '场景按钮与复制按钮重复');
    expectBadInput(() => renderActionBar({ buttons: [{ label: 'x', kind: 'primary', actionId: 'ilife-a', onClick: () => {} }] }), '场景按钮含 onclick');
    expectBadInput(() => renderActionBar({ buttons: [{ label: 'x', kind: 'nope', actionId: 'ilife-a' }] }), '非法 kind');
    expectBadInput(() => renderActionBar(null), 'input 非对象');
  });

  it('空输入产出空骨架（不抛错）', () => {
    const html = renderActionBar({});
    assert.ok(html.includes('ilife-action-bar'), '必须仍产出容器');
    assert.equal((html.match(/<button /g) ?? []).length, 0, '无按钮时不渲染按钮');
  });

  it('text === \'\' 仍写 data-t=""；场景按钮 kind:ghost 被接受（ACTION_BAR_KINDS 全量）', () => {
    const emptyText = renderActionBar({ copyData: { actionId: 'ilife-a', text: '' } });
    assert.ok(emptyText.includes(DEFAULT_DATA_ATTR + '=""'), 'text 为空串仍写 data-t=""（binder 送进空串短路，无反馈）');
    const ghost = renderActionBar({ buttons: [{ label: '幽灵', kind: 'ghost', actionId: 'ilife-g' }] });
    assert.ok(ghost.includes('action-btn-ghost'), 'kind:ghost 必须被接受（冻结 ACTION_BAR_KINDS 全量，不以表格 primary／red 为限）');
    assert.ok(ghost.includes(ACTION_ID_ATTR + '="ilife-g"'), '场景按钮必须带 ACTION_ID_ATTR');
    assert.ok(ghost.includes('幽灵'), '场景按钮文案必须渲染');
  });
});

/* ── bindCopyAction 接线（S-4：仅凭契约可接线） ───────────── */

describe('#76 bindCopyAction 接线', () => {
  it('发现 → 激活 → readDataText → copyText → 反馈 全链路', async () => {
    const fake = fakePorts();
    const host = fakeActionHost(
      [COPY_ACTION_IDS.actionBar.copyData, COPY_ACTION_IDS.actionBar.copyLog],
      { [COPY_ACTION_IDS.actionBar.copyData]: 'DATA' },
    );
    const handle = bindCopyAction(host.host, fake.ports);
    assert.deepEqual(host.subscriptions, [COPY_ACTION_IDS.actionBar.copyData, COPY_ACTION_IDS.actionBar.copyLog], '必须订阅 listActionIds() 列出的全部 id');

    assert.equal(host.activate(COPY_ACTION_IDS.actionBar.copyData), true, '复制数据按钮必须已订阅');
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(fake.fallbackCalls, ['DATA'], '激活必须把 data-t 文本送进 copyText');
    assert.equal(fake.host.mounted.length, 1, '反馈必须经 ports.toast');

    assert.equal(host.activate(COPY_ACTION_IDS.actionBar.copyLog), true, '复制日志按钮同样已订阅');
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(fake.fallbackCalls, ['DATA'], '无 data-t 的按钮必须跳过（不抛错、不复制）');
    handle.dispose();
  });

  it('listActionIds() 可含非复制按钮：靠 readDataText → undefined 跳过，不报错', async () => {
    const fake = fakePorts();
    const host = fakeActionHost(['ilife-demo-open', COPY_ACTION_IDS.errorReceipt.copyData], { [COPY_ACTION_IDS.errorReceipt.copyData]: 'ERR' });
    const handle = bindCopyAction(host.host, fake.ports);
    assert.equal(host.activate('ilife-demo-open'), true, '场景按钮也被订阅（不得另设白名单）');
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(fake.fallbackCalls, [], '非复制按钮必须静默跳过');
    assert.equal(fake.host.mounted.length, 0, '非复制按钮不得产反馈');
    handle.dispose();
  });

  it('只订阅 listActionIds() 列出的 id（不猜 id、不通配）', () => {
    const fake = fakePorts();
    const host = fakeActionHost([COPY_ACTION_IDS.actionBar.copyData], {});
    const handle = bindCopyAction(host.host, fake.ports);
    assert.deepEqual(host.subscriptions, [COPY_ACTION_IDS.actionBar.copyData]);
    assert.ok(!host.subscriptions.includes(COPY_ACTION_IDS.errorReceipt.copyData), '未列出的 id 不得订阅');
    handle.dispose();
  });

  it('重复 id 由 binder 去重（同 id 只订阅一次）', () => {
    const fake = fakePorts();
    const host = fakeActionHost(['ilife-a', 'ilife-a', 'ilife-b'], {});
    const handle = bindCopyAction(host.host, fake.ports);
    assert.deepEqual(host.subscriptions, ['ilife-a', 'ilife-b'], '重复 id 必须去重');
    handle.dispose();
  });

  it('dispose() 解绑全部已订阅 id 且幂等（解绑后不再复制）', async () => {
    const fake = fakePorts();
    const host = fakeActionHost(['ilife-a', 'ilife-b'], { 'ilife-a': 'A', 'ilife-b': 'B' });
    const handle = bindCopyAction(host.host, fake.ports);
    handle.dispose();
    handle.dispose();
    assert.deepEqual(host.unsubscribed, ['ilife-a', 'ilife-b'], 'dispose 必须解绑全部');
    assert.deepEqual(host.activeIds(), [], '解绑后不应残留订阅');
    host.activate('ilife-a');
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(fake.fallbackCalls, [], 'dispose 之后激活不得再复制');
  });

  it('opts 透传到 copyText（silent 生效）', async () => {
    const fake = fakePorts();
    const host = fakeActionHost(['ilife-a'], { 'ilife-a': 'A' });
    const handle = bindCopyAction(host.host, fake.ports, { silent: true });
    host.activate('ilife-a');
    await new Promise((r) => { setTimeout(r, 0); });
    assert.deepEqual(fake.fallbackCalls, ['A']);
    assert.equal(fake.host.mounted.length, 0, 'silent 必须透传到 copyText');
    handle.dispose();
  });

  it('port 非法 → bad-input', () => {
    const fake = fakePorts();
    expectBadInput(() => bindCopyAction(null, fake.ports), 'port=null');
    expectBadInput(() => bindCopyAction({ readDataText: () => undefined, onActivate: () => () => {} }, fake.ports), 'port 缺 listActionIds');
    expectBadInput(() => bindCopyAction({ listActionIds: () => [], readDataText: () => undefined }, fake.ports), 'port 缺 onActivate');
  });

  it('端口返回值守卫：listActionIds() 非数组 → 零订阅不抛错；onActivate 返回非函数 → dispose 安全', () => {
    const fake = fakePorts();
    const subscriptions = [];
    const badList = bindCopyAction({
      listActionIds: () => undefined,
      readDataText: () => undefined,
      onActivate: (actionId) => { subscriptions.push(actionId); return () => {}; },
    }, fake.ports);
    assert.deepEqual(subscriptions, [], 'listActionIds() 非数组 → 不得订阅任何 id');
    assert.doesNotThrow(() => badList.dispose(), 'listActionIds() 非数组时 dispose 不得抛错');

    const handle = bindCopyAction({
      listActionIds: () => ['ilife-a'],
      readDataText: () => 'A',
      onActivate: () => undefined,
    }, fake.ports);
    assert.doesNotThrow(() => handle.dispose(), 'onActivate 未返回解绑函数时 dispose 不得抛错');
    assert.doesNotThrow(() => handle.dispose(), 'dispose 必须幂等');
    assert.deepEqual(fake.fallbackCalls, [], '未激活不得触发复制');
  });

  it('激活回调不得产生未处理拒绝（FX-76-6：fallback 抛错／反馈挂载抛错）', async () => {
    const unhandled = [];
    const onUnhandled = (reason) => { unhandled.push(reason); };
    process.on('unhandledRejection', onUnhandled);
    try {
      // ① 通道 2 抛错（FX-76-1 修复后 copyText 不抛，但 binder 仍须接住任何逃逸异常）
      const fallbackCalls = [];
      const thrower = fakePorts({ fallback: () => { fallbackCalls.push('A'); throw new Error('boom'); } });
      const host1 = fakeActionHost(['ilife-a'], { 'ilife-a': 'A' });
      const handle1 = bindCopyAction(host1.host, thrower.ports);
      assert.equal(host1.activate('ilife-a'), true, '前置：按钮必须已订阅');
      // ② 反馈通道挂载抛错 → copyText 的 settle 抛出，binder 的 void 必须接住
      const badToast = fakePorts({ toast: { mount: () => { throw new Error('mount-fail'); } } });
      const host2 = fakeActionHost(['ilife-b'], { 'ilife-b': 'B' });
      const handle2 = bindCopyAction(host2.host, badToast.ports);
      assert.equal(host2.activate('ilife-b'), true, '前置：按钮必须已订阅');

      await new Promise((r) => { setTimeout(r, 60); });
      assert.deepEqual(fallbackCalls, ['A'], '前置：抛错的通道 2 确实被调用过');
      assert.deepEqual(unhandled, [], '激活回调不得产生未处理拒绝');
      handle1.dispose();
      handle2.dispose();
    } finally {
      process.removeListener('unhandledRejection', onUnhandled);
    }
  });
});

/* ── buildSharedHelpersJs 产出契约（S-3／A5／A6） ─────────── */

describe('#76 buildSharedHelpersJs 产出契约', () => {
  const js = buildSharedHelpersJs();

  it('恒非空，且是 IIFE（经典 script 作用域可跑，无 ESM 语法）', () => {
    assert.ok(js.length > 0, '产出不得为空串（空串 → fillTemplate 抛 asset-missing）');
    assert.ok(js.trimStart().startsWith('(function'), '必须是 IIFE 或显式挂载点');
    assert.ok(js.trimEnd().endsWith('}());'), 'IIFE 必须自闭合');
    assert.ok(!/^\s*(?:import|export)\s/m.test(js), '不得含 ESM import／export（否则经典 script 直接死）');
    assert.ok(!/\bawait\b/.test(js), '不得含顶层 await');
    assert.ok(!js.includes('</script'), '资产不得混入闭标签字样（WRAP_PREDICATES.assetsBare 口径）');
  });

  it('自包含：不 import、不依赖其它脚本或既有全局', () => {
    assert.equal(SHARED_HELPERS_JS_RULE.selfContained, true);
    assert.ok(!/\brequire\s*\(/.test(js), '不得 require');
    assert.ok(!/\bimport\s*\(/.test(js), '不得动态 import');
    assert.ok(!/\b(?:base-paint|basePaint)\b/.test(js), '不得依赖包名');
  });

  it('幂等判据只落 DOM（标记属性 ＋ querySelector 早退），无 window 哨兵', () => {
    assert.equal(SHARED_HELPERS_JS_RULE.idempotent, true);
    assert.equal(SHARED_HELPERS_JS_RULE.forbidGlobalAssignment, true);
    assert.ok(/document\.querySelector\(MARKER_SEL\)/.test(js), '幂等判据必须是 DOM 查询早退');
    assert.ok(js.includes('data-ilife-helpers'), '必须给挂载点打标记属性');
    assert.ok(!/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(js), '不得向 window／globalThis 赋值（含哨兵）');
    assert.ok(!/__ilife|\bwindow\.__/.test(js), '不得用隐式全局做哨兵');
  });

  it('允许页面侧 DOM 读取与事件绑定（domAllowed）', () => {
    assert.equal(SHARED_HELPERS_JS_RULE.domAllowed, true);
    assert.ok(js.includes('document.addEventListener'), '必须用事件委派（禁内联 onclick）');
    assert.ok(!/onclick\s*=/i.test(js), '不得产出内联 onclick');
  });

  it('双通道复制 ＋ 冻结常量注入产出文本（不产第二份真相）', () => {
    assert.ok(js.includes('navigator.clipboard'), '通道 1 必须尝试 clipboard');
    assert.ok(js.includes('execCommand'), '通道 2 必须保留 execCommand 兜底');
    assert.ok(js.includes(COPY_TEXT_DEFAULTS.okMessage), 'ok 文案必须取自 COPY_TEXT_DEFAULTS');
    assert.ok(js.includes(COPY_TEXT_DEFAULTS.failMessage), 'fail 文案必须取自 COPY_TEXT_DEFAULTS');
    assert.ok(js.includes(String(TOAST_DEFAULTS.timeoutMs)), 'timeout 必须取自 TOAST_DEFAULTS');
    assert.ok(js.includes(String(TOAST_DEFAULTS.maxStack)), 'maxStack 必须取自 TOAST_DEFAULTS');
    assert.ok(js.includes(String(TOAST_DEFAULTS.mobileMaxPx)), '移动端断点必须取自 TOAST_DEFAULTS');
    assert.ok(js.includes(ACTION_ID_ATTR), '承载属性必须取 ACTION_ID_ATTR');
    assert.ok(js.includes(DEFAULT_DATA_ATTR), '文本属性缺省必须取 DEFAULT_DATA_ATTR');
  });

  it('dataAttr 覆盖只影响产出 JS 的选择器；prefix 覆盖只影响类名', () => {
    const custom = buildSharedHelpersJs({ prefix: 'x-', dataAttr: 'data-x' });
    assert.ok(custom.includes('var TEXT_ATTR = "data-x";'), 'dataAttr 覆盖必须只影响选择器');
    assert.ok(custom.includes('"x-toast"'), 'prefix 覆盖必须影响类名');
    assert.ok(custom.includes('data-x-helpers'), '幂等标记属性必须按 prefix 派生');
    assert.ok(!custom.includes('"ilife-toast"'), '覆盖后不得残留缺省前缀类名');
  });
});

/* ── 无宿主可用性表（CONTROL_AVAILABILITY）：表与实现必须一致 ── */

describe('#76 无宿主可用性表（CONTROL_AVAILABILITY）', () => {
  it('静态 HTML 与运行时端口两列与实现行为逐条一致', () => {
    assert.equal(CONTROLS_HOST_REQUIREMENT, 'none', '全部控件不依赖 DSH 宿主');
    for (const name of CONTROL_NAMES) {
      const spec = CONTROL_AVAILABILITY[name];
      assert.equal(spec.needsRuntime, spec.runtimePort !== null, name + '：needsRuntime 与 runtimePort 必须同真同假');
    }
    // 原 `if (spec.staticHtml) assert.equal(typeof spec.needsRuntime, 'boolean')` 对类型化布尔恒真（FX-76-3①）
    // → 换成有鉴别力的「staticHtml=true 的控件集合逐字固定」（多一个／少一个／改名都红）
    const staticHtmlControls = CONTROL_NAMES.filter((name) => CONTROL_AVAILABILITY[name].staticHtml === true);
    assert.deepEqual([...staticHtmlControls].sort(), ['actionBar', 'emptyState', 'errorReceipt', 'statusBadge', 'toast'],
      'staticHtml=true 的控件集合必须逐字固定（copyText 无 HTML 产物）');
    // staticHtml=true 的五个控件必须能**无端口**产出非空字符串
    assert.ok(renderToast({ msg: 'm' }).length > 0, 'toast.staticHtml=true 但 renderToast 未产出');
    assert.ok(renderActionBar({ copyData: { actionId: 'ilife-a' } }).length > 0, 'actionBar.staticHtml=true');
    assert.ok(renderStatusBadge({ status: 'ok' }).length > 0, 'statusBadge.staticHtml=true');
    assert.ok(renderEmptyState({ text: 't' }).length > 0, 'emptyState.staticHtml=true');
    assert.ok(renderErrorReceipt({ message: 'm' }).length > 0, 'errorReceipt.staticHtml=true');
    // needsRuntime=false 的两个控件不得要求任何端口（纯静态，Node 侧可生成）
    for (const name of ['statusBadge', 'emptyState']) {
      assert.equal(CONTROL_AVAILABILITY[name].needsRuntime, false, name + ' 必须是纯静态');
      assert.equal(CONTROL_AVAILABILITY[name].runtimePort, null, name + ' 不得有运行时端口');
    }
    // copyText 无 HTML 产物（staticHtml=false）＋ 需要端口
    assert.equal(CONTROL_AVAILABILITY.copyText.staticHtml, false, 'copyText 无 HTML 产物');
    assert.equal(CONTROL_AVAILABILITY.copyText.runtimePort, 'CopyPorts');
    assert.equal(CONTROL_AVAILABILITY.actionBar.runtimePort, 'CopyPorts+ToastHostPort');
    assert.equal(CONTROL_AVAILABILITY.errorReceipt.runtimePort, 'CopyPorts+ToastHostPort');
  });
});

/* ── 无宿主可执行证据（D4／A2／A6：独立 HTML 页面 ＋ headless 浏览器） ── */

/** 浏览器候选路径（FX-76-5：Windows ＋ **macOS** ＋ Linux，覆盖 `ci.yml` 的三 OS 矩阵）。
 *  `DSH_BROWSER` 优先；`DSH_BROWSER_CANDIDATES`（逗号分隔）可**替换**候选表——用于自证
 *  「无浏览器时不会静默变绿」（见下 `requireBrowser`）。 */
function browserCandidates() {
  const explicit = process.env.DSH_BROWSER_CANDIDATES;
  const defaults = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    // macOS（GitHub `macos-latest` 预装 Chrome；缺这三条时该 OS 必然无证据）
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
  ];
  const list = typeof explicit === 'string' && explicit !== ''
    ? explicit.split(',').map((s) => s.trim()).filter((s) => s !== '')
    : defaults;
  return [process.env.DSH_BROWSER, ...list];
}

/** 找本机 Chrome／Chromium／Edge；找不到返回 `null`（由 `requireBrowser` 决定如何处置）。 */
function findBrowser(candidates = browserCandidates()) {
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0 && existsSync(candidate)) return candidate;
  }
  return null;
}

/** FX-76-3③／FX-76-5：找不到浏览器 → **显式失败**，绝不 `t.skip`（不许静默变绿）。
 *  理由：A2「无宿主可用」的证据是**可执行**证据；跳过会让门禁在没有浏览器的机器上依然全绿，
 *  等于证据消失。装了 Chrome／Chromium／Edge，或用 `DSH_BROWSER=<路径>` 指定即可。 */
function requireBrowser(browser, candidates = browserCandidates()) {
  if (browser !== null) return browser;
  throw new assert.AssertionError({
    message: '未找到 Chrome／Chromium／Edge：A2 的 headless 可执行证据**缺失**（FX-76-3③／FX-76-5 定死：'
      + '不静默跳过）。已探测候选：' + JSON.stringify(candidates.filter((c) => typeof c === 'string'))
      + '；请安装浏览器或用 DSH_BROWSER=<路径> 指定。',
  });
}

/** 起一次 headless Chrome／Edge 并回读 DOM（`--dump-dom`）。 */
async function dumpDom(browser, target, extraArgs = []) {
  const profile = mkdtempSync(join(tmpdir(), 't76-chrome-'));
  try {
    const { stdout } = await execFileAsync(browser, [
      '--headless=new',
      '--disable-gpu',
      '--no-sandbox',
      '--no-first-run',
      '--disable-extensions',
      '--disable-background-networking',
      '--disable-component-update',
      '--disable-breakpad',
      '--disable-dev-shm-usage',
      '--user-data-dir=' + profile,
      '--virtual-time-budget=3000',
      ...extraArgs,
      '--dump-dom',
      target,
    ], { encoding: 'utf8', timeout: 90000, maxBuffer: 32 * 1024 * 1024 });
    return stdout;
  } finally {
    rmSync(profile, { recursive: true, force: true });
  }
}

/** 从 `--dump-dom` 输出里取页面自报的 `RESULT:{…}`。 */
function readResult(dom, label) {
  const match = dom.match(/RESULT:(\{[\s\S]*?\})<\/div>/);
  assert.ok(match !== null, label + '：页面未产出结果（夹具未跑完）：' + dom.slice(0, 400));
  return { json: match[1], out: JSON.parse(match[1]) };
}

/** 写一份临时页面并返回 `file://` URL（自包含：零 import、零服务，双击即可打开）。 */
function writeTempPage(html, name = 'page.html') {
  const dir = mkdtempSync(join(tmpdir(), 't76-page-'));
  const file = join(dir, name);
  writeFileSync(file, html, 'utf8');
  return pathToFileURL(file).href;
}

/** 组装独立 HTML 页面：`renderX` 产出 ＋ helpers JS（经典 script）＋ 内联端口适配器。 */
function buildFixtureHtml() {
  const helpers = buildSharedHelpersJs();
  const moduleScript = [
    "import * as bp from '/index.js';",
    'const out = {};',
    "const put = (id, html) => { document.getElementById(id).innerHTML = html; };",
    'put("bar", bp.renderActionBar({',
    "  buttons: [{ label: '打开场景', kind: 'primary', actionId: 'ilife-demo-open' }],",
    '  copyData: { actionId: bp.COPY_ACTION_IDS.actionBar.copyData, text: "DATA-TEXT" },',
    '  copyLog: { actionId: bp.COPY_ACTION_IDS.actionBar.copyLog, text: "LOG-TEXT" },',
    '}));',
    'put("badge", bp.renderStatusBadge({ status: "danger" }));',
    'put("empty", bp.renderEmptyState({ icon: "📭", text: "暂无数据", hint: "先添加一条" }));',
    'put("receipt", bp.renderErrorReceipt({ message: "渲染失败", dataText: "R-DATA", logText: "R-LOG" }));',
    'put("toastbox", bp.renderToast({ msg: "已复制", detail: "粘贴给 AI" }));',
    'out.actionIds = [...document.querySelectorAll("[" + bp.ACTION_ID_ATTR + "]")].map((el) => el.getAttribute(bp.ACTION_ID_ATTR));',
    'out.dataT = document.querySelector("[" + bp.ACTION_ID_ATTR + "=\\"ilife-copy-data\\"]").getAttribute(bp.DEFAULT_DATA_ATTR);',
    'out.badgeText = document.querySelector(".ilife-status-badge").textContent;',
    'out.emptyText = document.querySelector(".ilife-empty-text").textContent;',
    'out.receiptButtons = document.querySelectorAll(".ilife-error-actions > button").length;',
    'out.inlineHandlers = ["bar", "badge", "empty", "receipt", "toastbox"].map((id) => document.getElementById(id).innerHTML).join("").split("onclick").length - 1;',
    // 静态 renderToast 的无障碍／容量属性回读（FX-76-7③：原来只断言 inlineHandlers===0）
    'const staticToast = document.querySelector("#toastbox > .ilife-toast");',
    'out.staticToastRole = staticToast.getAttribute("role");',
    'out.staticToastAriaLive = staticToast.getAttribute("aria-live");',
    'out.staticToastDataMax = staticToast.getAttribute("data-max");',
    'out.staticToastCloseLabel = staticToast.querySelector(".ilife-toast-close").textContent;',
    'const seen = { fallback: [], mounted: 0 };',
    'const ports = {',
    '  clipboard: null,',
    '  fallback(text) { seen.fallback.push(text); return true; },',
    '  toast: { mount(html) { seen.mounted += 1; const box = document.createElement("div"); box.className = "fixture-toast"; box.innerHTML = html; document.getElementById("toastbox").appendChild(box); return { remove() { box.remove(); } }; } },',
    '};',
    'const host = {',
    '  listActionIds: () => [...document.querySelectorAll("[" + bp.ACTION_ID_ATTR + "]")].map((el) => el.getAttribute(bp.ACTION_ID_ATTR)).filter((id) => id !== null),',
    '  readDataText: (actionId) => { const el = document.querySelector("[" + bp.ACTION_ID_ATTR + "=\\"" + actionId + "\\"]"); return el ? (el.getAttribute(bp.DEFAULT_DATA_ATTR) ?? undefined) : undefined; },',
    '  onActivate: (actionId, handler) => { const el = document.querySelector("[" + bp.ACTION_ID_ATTR + "=\\"" + actionId + "\\"]"); if (!el) return () => {}; el.addEventListener("click", handler); return () => el.removeEventListener("click", handler); },',
    '};',
    'const handle = bp.bindCopyAction(host, ports);',
    'document.querySelector("[" + bp.ACTION_ID_ATTR + "=\\"ilife-copy-data\\"]").click();',
    'await new Promise((r) => { setTimeout(r, 30); });',
    'out.bindFallback = seen.fallback.slice();',
    'out.bindMounted = seen.mounted;',
    'handle.dispose();',
    'document.querySelector("[" + bp.ACTION_ID_ATTR + "=\\"ilife-copy-log\\"]").click();',
    'await new Promise((r) => { setTimeout(r, 30); });',
    'out.afterDispose = seen.fallback.slice();',
    'const outcomes = [];',
    'outcomes.push(await bp.copyText("x", { clipboard: { writeText: () => Promise.resolve() }, fallback: () => false, toast: ports.toast }));',
    'outcomes.push(await bp.copyText("y", { clipboard: { writeText: () => Promise.reject(new Error("denied")) }, fallback: (t) => { seen.fallback.push("fb:" + t); return true; }, toast: ports.toast }));',
    'outcomes.push(await bp.copyText("z", { clipboard: null, fallback: () => false, toast: ports.toast }));',
    'outcomes.push(await bp.copyText("", { clipboard: null, fallback: () => true, toast: ports.toast }));',
    'out.channels = outcomes.map((o) => o.channel);',
    'out.okFlags = outcomes.map((o) => o.ok);',
    'out.emptyReason = outcomes[3].reason;',
    'const stack = [];',
    'const controller = bp.createToastController({ mount(html) { const el = document.createElement("div"); el.className = "fixture-stack-item"; el.innerHTML = html; document.body.appendChild(el); stack.push(el); return { remove() { el.remove(); } }; } });',
    'controller.show({ msg: "A" });',
    'controller.show({ msg: "B" });',
    'out.stackBefore = document.querySelectorAll(".fixture-stack-item").length;',
    'controller.flush();',
    'out.stackAfter = document.querySelectorAll(".fixture-stack-item").length;',
    'out.markerCount = document.querySelectorAll("[data-ilife-helpers=\\"1\\"]").length;',
    'const staleStack = document.querySelector(".ilife-toast-stack");',
    'if (staleStack) staleStack.remove();',
    'document.querySelector("[" + bp.ACTION_ID_ATTR + "=\\"ilife-copy-log\\"]").click();',
    'await new Promise((r) => { setTimeout(r, 200); });',
    'out.helpersToasts = document.querySelectorAll(".ilife-toast-stack > .ilife-toast").length;',
    'out.helpersStackClass = document.querySelector(".ilife-toast-stack") !== null;',
    'document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
  ].join(LF);

  return [
    '<!doctype html>',
    '<html lang="zh"><head><meta charset="utf-8"><title>base-paint #76 无宿主夹具</title></head>',
    '<body>',
    '<div id="bar"></div><div id="badge"></div><div id="empty"></div><div id="receipt"></div><div id="toastbox"></div>',
    '<div id="result">PENDING</div>',
    // 夹具自持的页面侧环境（与控件实现无关）：headless 下 clipboard 权限不确定，固定为 resolve。
    '<script>',
    'Object.defineProperty(navigator, "clipboard", { value: { writeText: function () { return Promise.resolve(); } }, configurable: true });',
    '</script>',
    // helpers JS 第 1 次：**经典 script**（无 type="module"，证明 A6）
    '<script>',
    helpers,
    '</script>',
    // helpers JS 第 2 次：同页再注入一次，证明幂等（判据只落 DOM）
    '<script>',
    helpers,
    '</script>',
    '<script type="module">',
    moduleScript,
    '</script>',
    '</body></html>',
  ].join(LF);
}

/** 起临时 HTTP 服务托管夹具 ＋ dist 模块（浏览器里 ES module 需要 http 源）。 */
function serveFixture(html) {
  const server = createServer((req, res) => {
    const url = (req.url ?? '/').split('?')[0];
    if (url === '/' || url === '/index.html') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    const file = resolve(DIST_DIR, url.replace(/^\/+/, ''));
    if (!file.startsWith(resolve(DIST_DIR)) || !existsSync(file)) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'content-type': 'text/javascript; charset=utf-8' });
    res.end(readFileSync(file));
  });
  return server;
}

/** 视口收窄夹具（FX-76-2）：自包含 `file://` 页面——helpers JS ×1（经典 script）＋ 一个复制按钮 ＋
 *  经典探针脚本。零 import／零服务／零 DSH 宿主注入；剪贴板固定 reject，使每次点击都确定性地
 *  走到 `execCommand` 兜底并产一条反馈（容量才是本用例唯一变量）。 */
function buildViewportHtml() {
  const clicks = TOAST_DEFAULTS.maxStack + 2;
  return [
    '<!doctype html>',
    '<html lang="zh"><head><meta charset="utf-8"><title>#76 视口收窄（≤' + TOAST_DEFAULTS.mobileMaxPx + 'px）</title></head>',
    '<body>',
    '<button type="button" ' + ACTION_ID_ATTR + '="ilife-copy-data" ' + DEFAULT_DATA_ATTR + '="VIEWPORT">复制</button>',
    '<div id="result">PENDING</div>',
    // 页面侧环境桩：headless 无用户手势 → 真实 clipboard 必 NotAllowedError；固定 reject 以固定路径。
    '<script>',
    'Object.defineProperty(navigator, "clipboard", { value: { writeText: function () { return Promise.reject(new Error("stub-denied")); } }, configurable: true });',
    '</script>',
    // helpers JS：**经典 script**（无 type="module"）
    '<script>',
    buildSharedHelpersJs(),
    '</script>',
    '<script>',
    'var out = {};',
    'var btn = document.querySelector("[' + ACTION_ID_ATTR + ']");',
    'out.clicks = 0;',
    'out.markerCount = document.querySelectorAll("[data-ilife-helpers=\\"1\\"]").length;',
    'for (var i = 0; i < ' + clicks + '; i++) { btn.click(); out.clicks += 1; }',
    'setTimeout(function () {',
    '  var host = document.querySelector(".ilife-toast-stack");',
    '  out.stackCount = host ? host.children.length : 0;',
    '  out.toastCount = document.querySelectorAll(".ilife-toast-stack > .ilife-toast").length;',
    '  out.matchesMobile = window.matchMedia("(max-width: ' + TOAST_DEFAULTS.mobileMaxPx + 'px)").matches;',
    '  out.innerWidth = window.innerWidth;',
    '  document.getElementById("result").textContent = "RESULT:" + JSON.stringify(out);',
    '}, 50);',
    '</script>',
    '</body></html>',
  ].join(LF);
}

describe('#76 无宿主可执行证据（纯 HTML 页面 ＋ headless 浏览器）', () => {
  it('renderX 产出 ＋ helpers JS 在无宿主注入的页面里跑通（双通道／接线／幂等／flush）', async (t) => {
    const browser = requireBrowser(findBrowser());
    const server = serveFixture(buildFixtureHtml());
    try {
      await new Promise((r) => { server.listen(0, '127.0.0.1', r); });
      const { port } = server.address();
      const dom = await dumpDom(browser, 'http://127.0.0.1:' + port + '/');
      const { json, out } = readResult(dom, 'HTTP 夹具');
      t.diagnostic('夹具（headless ' + browser + '）产出：' + json);

      // ① 静态控件产出在真实 DOM 里成立（无 DSH 宿主注入）
      assert.deepEqual(out.actionIds, [
        'ilife-demo-open',
        COPY_ACTION_IDS.actionBar.copyData,
        COPY_ACTION_IDS.actionBar.copyLog,
        COPY_ACTION_IDS.errorReceipt.copyData,
        COPY_ACTION_IDS.errorReceipt.copyLog,
      ], '页面内 ACTION_ID_ATTR 集合必须与产出逐字一致');
      assert.equal(out.dataT, 'DATA-TEXT', '渲染期写入的 data-t 必须可被页面读回');
      assert.equal(out.badgeText, STATUS_DEFAULT_TEXT.danger, 'statusBadge 文本必须取冻结默认值');
      assert.equal(out.emptyText, '暂无数据', 'emptyState 文本必须落到 DOM');
      assert.equal(out.receiptButtons, 3, 'errorReceipt 必须渲染 3 个按钮');
      assert.equal(out.inlineHandlers, 0, '页面 DOM 不得含内联 onclick（零注入面）');
      // 静态 renderToast 的无障碍／容量属性回读（FX-76-7③：原来只断言 inlineHandlers===0）
      assert.equal(out.staticToastRole, TOAST_DEFAULTS.role, '静态 toast 的 role 必须取 TOAST_DEFAULTS.role');
      assert.equal(out.staticToastAriaLive, TOAST_DEFAULTS.ariaLive, '静态 toast 的 aria-live 必须取 TOAST_DEFAULTS.ariaLive');
      assert.equal(out.staticToastDataMax, String(TOAST_DEFAULTS.maxStack), '静态 toast 的 data-max 必须取 TOAST_DEFAULTS.maxStack');
      assert.equal(out.staticToastCloseLabel, closeLabelOf(renderToast({ msg: 'm' })), '静态 toast 的关闭按钮文案必须与 renderToast 产出一致');

      // ② bindCopyAction ＋ DOM 适配器：发现 → 激活 → readDataText → copyText → 反馈
      assert.deepEqual(out.bindFallback, ['DATA-TEXT'], '点击复制数据必须把 data-t 文本交给 copyText');
      assert.equal(out.bindMounted, 1, '复制成功必须经 ports.toast 反馈一次');
      assert.deepEqual(out.afterDispose, ['DATA-TEXT'], 'dispose 之后点击不得再复制');

      // ③ 双通道与空串短路
      assert.deepEqual(out.channels, ['clipboard', 'fallback', null, null], '通道选择必须符合契约');
      assert.deepEqual(out.okFlags, [true, true, false, false]);
      assert.equal(out.emptyReason, 'empty', '空串必须短路 reason=empty');

      // ④ toast 控制器 flush
      assert.equal(out.stackBefore, 2, '两条 toast 必须已挂载');
      assert.equal(out.stackAfter, 0, 'flush 必须清栈');

      // ⑤ helpers JS 幂等（注入两次）＋ 经典 script 作用域可用
      assert.equal(out.markerCount, 1, '同页注入两次必须只有一个挂载点标记（幂等判据只落 DOM）');
      assert.equal(out.helpersToasts, 1, '幂等：一次点击只产一条反馈（重复注入不得叠加监听）');
      assert.equal(out.helpersStackClass, true, 'helpers JS 必须自建反馈栈容器');
    } finally {
      await new Promise((r) => { server.close(r); });
    }
  });

  it('helpers JS 在 ≤820px 视口把反馈栈收窄为 3（页面运行时行为，FX-76-2）', async (t) => {
    const browser = requireBrowser(findBrowser());
    // 自包含页面：零 import、零 HTTP 服务，`file://` 直开（FX-76-4 同口径的最小视口夹具）
    const url = writeTempPage(buildViewportHtml(), 'viewport.html');
    const run = async (windowSize, label) => {
      const dom = await dumpDom(browser, url, ['--window-size=' + windowSize]);
      const { json, out } = readResult(dom, label);
      t.diagnostic(label + '（headless ' + browser + ' --window-size=' + windowSize + '）产出：' + json);
      return out;
    };

    const narrow = await run('390,844', '窄视口');
    assert.equal(narrow.markerCount, 1, '窄视口：helpers 必须已挂载（幂等标记唯一）');
    assert.equal(narrow.matchesMobile, true, '窄视口：matchMedia(≤' + TOAST_DEFAULTS.mobileMaxPx + 'px) 必须命中（否则本用例无鉴别力）');
    assert.ok(narrow.innerWidth <= TOAST_DEFAULTS.mobileMaxPx, '窄视口：视口宽度必须真的 ≤' + TOAST_DEFAULTS.mobileMaxPx + '，实测 ' + narrow.innerWidth);
    assert.equal(narrow.clicks, TOAST_DEFAULTS.maxStack + 2, '窄视口：点击次数必须多于宽容量，才能区分收窄');
    assert.equal(narrow.stackCount, TOAST_DEFAULTS.mobileMaxStack, '窄视口：反馈栈必须收窄为 mobileMaxStack=' + TOAST_DEFAULTS.mobileMaxStack);

    const wide = await run('1200,800', '宽视口');
    assert.equal(wide.matchesMobile, false, '宽视口：matchMedia(≤' + TOAST_DEFAULTS.mobileMaxPx + 'px) 必须不命中');
    assert.ok(wide.innerWidth > TOAST_DEFAULTS.mobileMaxPx, '宽视口：视口宽度必须真的 >' + TOAST_DEFAULTS.mobileMaxPx + '，实测 ' + wide.innerWidth);
    assert.equal(wide.clicks, TOAST_DEFAULTS.maxStack + 2);
    assert.equal(wide.stackCount, TOAST_DEFAULTS.maxStack, '宽视口：反馈栈必须为 maxStack=' + TOAST_DEFAULTS.maxStack);
    assert.notEqual(wide.stackCount, narrow.stackCount, '宽窄两档容量必须不同（否则断言恒真）');
  });
});
