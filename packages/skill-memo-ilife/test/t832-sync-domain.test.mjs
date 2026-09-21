/**
 * #832 · sync 域（1 场景：备忘录同步）端到端 —— 唤醒词能路由 ＋ 命令能跑 ＋ 产物真落盘。
 *
 * 场景出处：`src/help/scenes/sync.ts` 的 `memo_sync_feishu`（唤醒词 `备忘录同步`，`types: 查看／回执`）；
 * 册子格：`src/help/booklet.ts` 第 29 行（主体 `备忘录同步`，族 报告，结果页）。
 *
 * 三条断言对着票面三段（「唤醒词能路由／命令能跑／产物真落盘」），逐条用**外部行为**读：
 *   ① 路由：`routeWakeword('备忘录同步')` → `memo.sync`，且 SKILL.md 速查块里真有这一行（AI 靠它找命令）；
 *   ② 命令能跑：真起进程走**唯一出口** `dist/cli/cmd_read.js`，两条路都判 —— 远端可用（闸门开）
 *      ⇒ 退出码 0 ＋ 11 项统计；远端不可用 ⇒ 退出码仍非 0 但**页面照出**（#657／#658 的
 *      「ensure 型合成写」契约 D-25／MUT-F：退出码与「有没有出页」是两件事，验收分开判）；
 *   ③ 产物：落盘名 ＝**册子主体**`备忘录同步` ＋ 时间戳（`src/help/booklet.ts` 是唯一定义地，
 *      本用例只引用不重写），体积与回执 `delivery.bytes` 一致。
 *
 * 接缝：同 `wish-sync-661`／`wizard-pages-665` —— 只打唯一出口，两个注入点分别是
 * 临时库（配置项 `db.dir`）与远端挡板（PATH 首位的 `lark-cli`）。
 *
 * 跑法（**cwd 必须是包目录**：出口依赖包内 `node_modules` 的 junction 依赖 `base-paint` 等，
 * 从仓根跑会 `ERR_MODULE_NOT_FOUND`，那是跑法问题不是被测行为）：
 *   cd packages/skill-memo-ilife
 *   node ../../node_modules/typescript/bin/tsc -b .            # 编译（或照仓规走 run-locked）
 *   node --test test/t832-sync-domain.test.mjs
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { envelope, makeSeam } from '../../../tooling/contract-seam.mjs';
import { mkMemoConfig, noLarkPathEnv, stubPathEnv } from './helpers/config-base.mjs';
import { seedNote } from './helpers/memo-sqlite.mjs';
import { bookletFileStem } from '../dist/help/booklet.js';
import { routeWakeword } from '../dist/triggers/wakewords.js';;

const here = dirname(fileURLToPath(import.meta.url));
const skillPath = join(here, '..', 'SKILL.md');
const SYNC_KEY = 'memo.sync';
const SCENE_ID = 'memo_sync_feishu';
const WAKE = '备忘录同步';
const STAT_KEYS = [
  'backfilled', 'scannedDone', 'synced', 'scannedPending', 'dueAdded', 'dueOverridden', 'dueRemoved',
  'skippedNoMark', 'skippedAlreadyDone', 'skippedNoLocalNote', 'errors',
];

function seam(prefix, state) { return makeSeam('memo', { prefix, state }); }

/** 远端挡板在场：临时库写 `db.dir`、挡板目录放 PATH 首位（隔离口是家目录注入）。 */
function envWithStub(s) {
  const home = mkMemoConfig({ db: { dir: s.dbPath } }, 't832-cfg-');
  return stubPathEnv(home, s.stub.dir);
}
/** 远端挡板缺席：PATH 里没有任何 lark 落点 ⇒ 四门必关（本机真 CLI 在也不干扰）。 */
function envNoLark(s) {
  const home = mkMemoConfig({ db: { dir: s.dbPath } }, 't832-nolark-');
  return noLarkPathEnv(home);
}

/** 跑一次出口：回执、退出码、远端收到的调用三样一次取齐（断言只读这三处）。
 *  ⚠️ 本用例必须在**包目录**为 cwd 时跑（见文件头跑法）：出口依赖包内 `node_modules`
 *  （`base-paint` 等 junction 依赖只挂在包目录下），从仓根 spawn 会 `ERR_MODULE_NOT_FOUND`
 *  —— 那是跑法问题，不是被测行为。 */
function run(s, key, params, opts = {}) {
  s.stub.clearCalls();
  const r = s.runNew(key, params, { ...opts, extraEnv: opts.extraEnv ?? envWithStub(s) });
  let env = null;
  try { env = envelope(r); } catch { env = null; }
  return { r, env, exit: r.status, argv: s.calls().map((c) => c.argv) };
}

const syncRow = () => {
  const md = readFileSync(skillPath, 'utf8');
  return md.split('\n').find((l) => l.startsWith('| ' + WAKE + ' |')) ?? '';
};

describe('#832 sync 域 1 场景端到端（备忘录同步 → memo.sync → 报告页）', () => {
  it('① 唤醒词能路由：HELP 场景词 → memo.sync，且 SKILL.md 速查块里真有这一行', () => {
    const hit = routeWakeword(WAKE, {});
    assert.equal(hit.key, SYNC_KEY);
    assert.deepEqual(hit.params, {}, '本命令无需参数（HELP 原文：无需参数,直接发送）');

    // AI 找命令的通道是 SKILL.md 的构建期注入块：那一行必须在，且指到同一条键。
    const row = syncRow();
    assert.notEqual(row, '', 'SKILL.md 速查块缺 ' + WAKE + ' 这一行（AI 无从按唤醒词找到命令）');
    assert.match(row, new RegExp('\\| ' + SYNC_KEY + ' \\|'), '速查行须指向 ' + SYNC_KEY + '：' + row);
    // 反例面：改错一个字就路由不到（本行不是「凡含备忘／同步就命中」的宽匹配）。
    assert.equal(syncRow(), row);
    assert.throws(() => routeWakeword('备忘同步', {}), (e) => e.code === 'POLICY_NO_MATCH');
    assert.throws(() => routeWakeword('同步一次', {}), (e) => e.code === 'POLICY_NO_MATCH');
  });

  it('② 命令能跑（远端可用）：退出码 0 ＋ 11 项统计 ＋ 对账真写本地', () => {
    const s = seam('t832-ok-');
    // 布景：一条**无远端标识**的心愿（步 1 补建；直插库行，不是走 `memo.create`——那条路自己就补建）
    // ＋ 一条有标识心愿（步 3 远端改期）。
    seedNote(s.dbPath, { content: '学会做提拉米苏', category: '心愿', sub: '个人' });
    const created = run(s, 'memo.create', { title: '去一趟敦煌', body: '去一趟敦煌', category: '心愿', due: '2026-10-20' });
    assert.equal(created.exit, 0, '前一条命令须成：' + String(created.r.stderr).slice(0, 300));
    const guid = created.env.data.remoteId;
    const noteId = s.localNew().find((n) => n.content === '去一趟敦煌').id;

    // 远端把那条心愿改期（对账时远端优先）→ 本地跟着改。
    s.stub.setState({
      tasks: s.remote().tasks.map((t) => (t.guid === guid ? { ...t, due: '2026-12-01', completed_at: '' } : t)),
    });

    const x = run(s, SYNC_KEY, {});
    assert.equal(x.exit, 0, '远端可用时对账须全成（stderr=' + String(x.r.stderr).slice(0, 300) + '）');
    for (const k of STAT_KEYS) assert.ok(k in x.env.data, '回执缺统计项 ' + k);
    assert.equal(x.env.data.backfilled, 1, '步 1：本地缺标识那条补建到远端');
    assert.equal(x.env.data.dueOverridden, 1, '步 3：本地旧排期被远端日期覆盖（对账时远端优先）');
    assert.deepEqual(x.env.data.errors, []);
    assert.equal(s.localNew().find((n) => n.id === noteId).due, '2026-12-01', '步 3：远端改期同步到本地');
    assert.equal(x.env.shape, 'receipt', '一个命令一种回执形状');
  });

  it('③ 产物真落盘：主体来自册子（备忘录同步）＋ 时间戳，体积与回执一致', () => {
    const s = seam('t832-page-');
    assert.equal(run(s, 'memo.create', { title: '学游泳', body: '学游泳', category: '心愿' }).exit, 0);

    // 缺省（不给 --html）：落默认 `memo_html/<册子主体>_<时间戳>.html`。
    const plain = run(s, SYNC_KEY, {});
    const d = plain.env?.delivery;
    assert.ok(d && d.path, '缺省也要出 delivery（页面照出与退出码是两件事）');
    assert.equal(existsSync(d.path), true, '落盘件不存在：' + d.path);
    assert.equal(statSync(d.path).size, d.bytes, '体积与回执不一致');

    const base = d.path.replace(/\\/g, '/').split('/').pop();
    const stem = bookletFileStem(SCENE_ID);
    assert.equal(stem, WAKE, '册子第 29 格主体');
    assert.match(base, new RegExp('^' + stem + '_\\d{8}_\\d{6}(_\\d+)?\\.html$'), '落盘名须＝册子主体＋时间戳，实得：' + base);
    // 目录：扁平 `memo_html/`（册子 §三；`html.dir` 默认值，既有产物原地并排，不另开层）。
    assert.equal(d.path.replace(/\\/g, '/').slice(0, -base.length), s.dbPath.replace(/\\/g, '/') + '/memo_html/', '目录须是 <库目录>/memo_html/ 扁平一层');

    // 显式 --html：逐字落点，内容仍是同一张报告页。
    const explicit = run(s, SYNC_KEY, {}, { html: join(s.dir, 'sync-report.html') });
    assert.equal(explicit.env.delivery.path, join(s.dir, 'sync-report.html'), '显式路径须逐字落点');
    const html = readFileSync(explicit.env.delivery.path, 'utf8');
    assert.ok(html.includes(WAKE), '页面上须出现场景名');
    assert.ok(!html.includes('<!--INJECT-DATA-->'), '模板三标记须填完');
  });

  it('③ 远端不可用：退出码如实非 0，但页面照出（#658 D-25 契约的边界）', () => {
    const s = seam('t832-off-');
    assert.equal(run(s, 'memo.create', { title: '学游泳', body: '学游泳', category: '心愿' }).exit, 0);

    const x = run(s, SYNC_KEY, {}, { extraEnv: envNoLark(s) });
    assert.equal(x.exit, 4, '远端侧没成 ⇒ 退出码非 0（回执分字段如实写）');
    assert.equal(x.env.data.remote, 'unavailable');
    assert.equal(x.env.data.errors.length, 1, '失败原因须如实点名：' + JSON.stringify(x.env.data.errors));
    assert.match(String(x.env.data.errors[0]), /远端不可用/, '点名「远端不可用」并带原因');
    // 退出码与「有没有出页」分开判：页面照出、落盘、体积一致。
    const d = x.env.delivery;
    assert.ok(d && d.path, '远端不可用时也要出页（回执照打，不在写完回执之前吞掉）');
    assert.equal(existsSync(d.path), true);
    assert.equal(statSync(d.path).size, d.bytes);
    assert.match(d.path.replace(/\\/g, '/').split('/').pop(), new RegExp('^' + WAKE + '_\\d{8}_\\d{6}(_\\d+)?\\.html$'));
  });
});
