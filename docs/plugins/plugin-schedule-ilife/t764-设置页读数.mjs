#!/usr/bin/env node
/** #764 · 作息设置页读数：拿真产物（`dist/client.js`）＋真技能回执（子进程跑 `schedule.config.read/check`）渲染整页，量验收第 2、4 条。
 *
 * 为什么另写一份（不复用 `t696-设置页渲染台.mjs`）：那台只 mock `config.get/save/reset` 三个端点，
 * 作息新增的「飞书 CLI」状态行吃的是 `config.check`——mock 不到。本脚本给假 connection 配齐四个端点，
 * 其中读与体检两份数据由**真技能 CLI**（临时家目录、PATH 掐掉真 CLI ⇒ 红档确定）现取，存与重置走内存态。
 *
 * 读数（stdout 打 PASS 行；exit 非 0 即红）：
 *   · 四块齐：数据目录（可改）／库文件名（只读）／HELP 产物目录（只读）／飞书 CLI 状态行；
 *   · 只读行 input disabled、不接改；可改行可用；按钮「选择文件夹」在且可点；
 *   · 状态行红档「没找到飞书 CLI」＋「复制 prompt」＋官网行逐字；
 *   · 全页文本无省略号。
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const SKILL_BIN = join(REPO, 'packages', 'skill-schedule', 'dist', 'cli', 'cmd_read.js');
const CLIENT_JS = join(REPO, 'packages', 'plugin-schedule-ilife', 'dist', 'client.js');

const HOME = mkdtempSync(join(tmpdir(), 't764-page-'));
const homeEnv = { USERPROFILE: HOME, HOME };
/** 真机可能装着真 lark-cli：读数要红得确定，PATH 里只留 node 与系统目录。 */
const sysRoot = process.env.SystemRoot || 'C:\\Windows';
const NO_LARK_PATH = process.platform === 'win32'
  ? [dirname(process.execPath), join(sysRoot, 'System32'), sysRoot].join(delimiter)
  : [dirname(process.execPath), '/usr/bin', '/bin'].join(delimiter);

function skill(key) {
  const r = spawnSync(process.execPath, [SKILL_BIN, key, '--params', '{}'], {
    encoding: 'utf8', env: { ...process.env, ...homeEnv, PATH: NO_LARK_PATH },
  });
  if (r.status !== 0) throw new Error(key + ' exit=' + r.status + ' stderr=' + (r.stderr || '').slice(0, 300));
  return JSON.parse(String(r.stdout)).data;
}

const readData = skill('schedule.config.read');
const checkData = skill('schedule.config.check');
const { REMOTE_DIRECTORY_PICKER } = await import(pathToFileURL(join(REPO, 'packages', 'plugin-schedule-ilife', 'dist', 'dsh-ctx.js')).href);

/* ── stub loader ＋ hooks 替身（与仓根 `test/helpers/panel-render.mjs` 同形，够跑设置页组件） ── */
function makeReact() {
  const store = [];
  const queue = [];
  const api = {
    cursor: 0, queue, store,
    createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children: children.length === 0 ? undefined : children.length === 1 ? children[0] : children } }),
    Fragment: Symbol('Fragment'),
    useId: () => 'r1',
    useRef: (init) => {
      const i = api.cursor++;
      if (!(i in store)) store[i] = { current: init === undefined ? null : init };
      return store[i];
    },
    useState: (init) => {
      const i = api.cursor++;
      if (!(i in store)) store[i] = typeof init === 'function' ? init() : init;
      return [store[i], (next) => { const v = typeof next === 'function' ? next(store[i]) : next; store[i] = v; }];
    },
    useMemo: (fn, deps) => {
      const i = api.cursor++;
      const before = store[i];
      if (!before || !deps || before.deps.length !== deps.length || deps.some((d, k) => d !== before.deps[k])) {
        const value = fn();
        store[i] = { deps: deps ?? null, value };
        return value;
      }
      return before.value;
    },
    useCallback: (fn, deps) => api.useMemo(() => fn, deps),
    useEffect: (fn, deps) => {
      const i = api.cursor++;
      const before = store[i];
      const changed = !before || !deps || before.deps.length !== deps.length || deps.some((d, k) => d !== before.deps[k]);
      store[i] = { deps: deps ?? null };
      if (changed) queue.push(fn);
    },
  };
  return api;
}
let ACTIVE = null;

function materialize() {
  const code = readFileSync(CLIENT_JS, 'utf8');
  const registrations = [];
  new Function('window', 'React', code)({ __ModuleLoader__: { load: (reg) => { registrations.push(reg); } } }, makeReact());
  if (registrations.length !== 1) throw new Error('client 束须恰好注册一次');
  ACTIVE = makeReact();
  const factory = registrations[0].factory;
  const module = factory((spec) => {
    if (String(spec) === 'react' || String(spec).startsWith('react/')) return ACTIVE;
    if (String(spec).includes('directory-browser')) {
      return {
        pickerModeOf: () => 'native',
        readPickAnswer: async () => ({ kind: 'cancelled' }),
        openRowBrowser: () => undefined,
        createRootsSource: () => async () => [],
        DirectoryBrowserFromRow: () => null,
      };
    }
    throw new Error('未声明外部：' + spec);
  });
  return module;
}

function expand(node) {
  if (node === null || node === undefined || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((c) => expand(c));
  if (typeof node.type === 'function') {
    ACTIVE.cursor = 0;
    return expand(node.type(node.props ?? {}));
  }
  return { type: node.type, props: { ...(node.props ?? {}), children: expand(node.props?.children) } };
}

const texts = [];
const inputs = [];
const buttons = [];
const links = [];
function visit(node) {
  if (node === null || node === undefined || typeof node !== 'object') {
    if (typeof node === 'string') texts.push(node);
    return;
  }
  if (Array.isArray(node)) { for (const c of node) visit(c); return; }
  if (node.type === 'input') inputs.push(node.props ?? {});
  if (node.type === 'button') buttons.push(node.props ?? {});
  if (node.type === 'a') links.push(node.props ?? {});
  visit(node.props?.children);
}

async function main() {
  const mod = materialize();
  const captured = [];
  const calls = [];
  const ctx = {
    slots: {
      inject: (name, fn) => { captured.push(fn()); },
      register: (desc, comp) => ({ desc, comp }),
    },
    connection: {
      rpc: {
        call: async (_base, _channel, { method }) => {
          calls.push(method);
          if (method === 'config.get') return { ok: true, value: readData };
          if (method === 'config.check') return { ok: true, value: checkData };
          if (method === 'config.save' || method === 'config.reset') return { ok: true, value: readData };
          return { ok: false, error: { code: 'bad-request', message: '未知端点', details: {} } };
        },
      },
    },
    get: (name) => (name === REMOTE_DIRECTORY_PICKER ? { pick: async () => ({ ok: true, value: null }) } : null),
  };
  mod.apply(ctx);
  if (captured.length !== 1) throw new Error('设置页注册次数须为 1，实为 ' + captured.length);
  const root = captured[0].comp;
  for (let pass = 0; pass < 12; pass += 1) {
    ACTIVE.cursor = 0;
    const tree = expand({ type: root, props: {} });
    texts.length = 0; inputs.length = 0; buttons.length = 0; links.length = 0;
    visit(tree);
    const effects = ACTIVE.queue.splice(0, ACTIVE.queue.length);
    if (effects.length === 0) break;
    for (const ef of effects) await ef();
    await new Promise((r) => setTimeout(r, 0));
    if (pass === 11) throw new Error('effect 12 轮未收敛');
  }
  const text = texts.join(' ');
  const fail = (msg) => { console.error('FAIL ' + msg); process.exit(1); };
  const pass = (msg) => console.log('PASS ' + msg);
  for (const w of ['数据目录', '库文件名', 'HELP 产物目录', '飞书 CLI', '复制 prompt', '重新检测']) {
    if (!text.includes(w)) fail('缺文案：' + w);
  }
  pass('四块齐：数据目录／库文件名／HELP 产物目录／飞书 CLI 状态行');
  if (inputs.length !== 3) fail('输入框须恰 3 个，实为 ' + inputs.length);
  const disabled = inputs.map((p) => p.disabled === true);
  if (JSON.stringify(disabled) !== JSON.stringify([false, true, true])) fail('disabled 须是 [可改, 只读, 只读]，实为 ' + JSON.stringify(disabled));
  pass('行形态：[可改, 只读, 只读]（框里是生效绝对路径）');
  const btnText = buttons.map((p) => (Array.isArray(p.children) ? p.children.join('') : p.children) ?? '').join('|');
  for (const w of ['选择文件夹', '复制 prompt', '重新检测', '保存', '重置为默认', '重新读取']) {
    if (!btnText.includes(w)) fail('缺按钮：' + w);
  }
  pass('按钮齐：选择文件夹／复制 prompt／重新检测／保存／重置为默认／重新读取');
  if (!text.includes('没找到飞书 CLI')) fail('红档状态行须显示「没找到飞书 CLI」');
  pass('状态行红档（PATH 已掐掉真 CLI，确定性红）');
  if (!text.includes('飞书CLI官网为：https://www.feishu.cn/feishu-cli')) fail('缺逐字官网行');
  const official = links.find((p) => p.href === 'https://www.feishu.cn/feishu-cli');
  if (!official) fail('官网行须可点击（a[href]）');
  pass('官网行逐字＋可点击');
  if (text.includes('…') || /[^.]\.\.\.[^.]/.test(text)) fail('文案含省略号');
  pass('全页文案零省略号');
  console.log('CALLS ' + JSON.stringify(calls));
  console.log('TEXT ' + text.slice(0, 600));
}

await main();
