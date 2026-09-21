// #876 · 回执页族：把内部标识符与内部状态值从屏上收掉（真出口 ＋ 定义级用例）。
//
// 钉两件事，缺一条即红：
//   ① **屏上那一份**里不许出现机器值 —— 远端 guid（`tk_*`）、`远端标识` 这个字段名、
//      `提醒 ID` 这个列名、`状态：active` 这个后端取值；
//   ② **一份都不许丢** —— 合成写契约要的三格（本地侧／远端侧／远端标识）仍在命令出口回执 JSON 里，
//      远端 guid 仍留在页内载荷（`snapshot.sections`）里。
//
// 为什么必须落在用例里：那面 34 格验收墙住 `.scratch/t834/验收/`（不入仓），而**三道机器门都读不到屏上这一面** ——
//   机审 ⑥ 把 `rows`／`kv` 当数据位不进判据（`t869-机审读数.md` §3.1）；
//   五维尺 H2 的 R7 读者整段剥掉 `<script>`（`packages/skill-calorie/scripts/audit-separators.mjs`），
//   而本族屏上每一个字都由页内脚本从 `<script id="payload">` 渲染出来。
// 同族先例见 `t828-remind-domain.test.mjs` 末尾那两条「渲染后才看得见的债」。
//
// 读数口径：「屏上文本」按**模板真实的取数路径**算（`renderResult()` 读 `data.receipt.rows`；
// `renderRows()` 读 `snapshot.sections` 里 heading≠「处理结果」的那些段；副标题读 `payload.message`；
// 事实条读 `snapshot.summary`）。故第一组用例把模板那几条取数约定一并钉住 —— 模板改了口径即红，
// 逼一次自觉复核，免得本件算的那份「屏上文本」悄悄与真页走散。两档真渲染截图是视觉那一关（人看屏）。
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';
import { mkMemoConfig, stubPathEnv } from './helpers/config-base.mjs';
import { buildReceiptPage } from '../dist/render/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const BIN = join(pkg, 'dist', 'cli', 'cmd_read.js');
const TEMPLATE = readFileSync(join(pkg, 'templates', 'receipt.html'), 'utf8');

const payloadOf = (html) => JSON.parse(/<script id="payload" type="application\/json">([\s\S]*?)<\/script>/.exec(html)[1]);

/** 一页的「屏上文本」：按模板取数路径拼出来的那几段（静态标签不必进 —— 本件只查机器值有没有上屏）。 */
function screenText(payload) {
  const d = payload.data ?? {};
  const s = (d.scene ?? {}).snapshot ?? {};
  const r = d.receipt ?? {};
  const lines = [
    String(d.title ?? ''),
    String(payload.message ?? r.message ?? ''),
    String(r.category ?? ''), String(r.sub ?? ''),
    ...(Array.isArray(s.summary) ? s.summary : []),
    ...(Array.isArray(r.rows) ? r.rows : []),
  ];
  for (const sec of (Array.isArray(s.sections) ? s.sections : [])) {
    if (sec.heading === '处理结果') continue; // renderRows 按这个 heading 整段滤掉（数据面）
    for (const row of (sec.rows ?? [])) lines.push(String(typeof row === 'object' && row !== null ? row.text : row));
  }
  return lines.join('\n');
}

/** 页内载荷里那个「处理结果」数据面段（模板不上屏，机器值留档处）。 */
const dataSideRows = (payload) => ((payload.data?.scene?.snapshot?.sections) ?? [])
  .filter((sec) => sec.heading === '处理结果')
  .flatMap((sec) => sec.rows ?? []).map(String);

/** 一台自带夹具：新临时库 ＋ 新家目录（每用例一套，产物不跨用例累积）。 */
function fixture() {
  const db = mkMemoDb('receipt-876-');
  const home = mkMemoConfig({ db: { dir: db } }, 'receipt-876-home-');
  const env = stubPathEnv(home, mkdtempSync(join(tmpdir(), 'receipt-876-stub-')));
  const landing = join(db, 'memo_html');
  return {
    db,
    run: (key, params) => spawnSync(process.execPath, [BIN, key, '--params', JSON.stringify(params)], { encoding: 'utf8', env }),
    pagesOf: (stem) => (existsSync(landing) ? readdirSync(landing) : []).filter((f) => f.startsWith(stem + '_')),
    html: (file) => readFileSync(join(landing, file), 'utf8'),
  };
}

const outData = (r) => JSON.parse(r.stdout).data;

describe('#876 · 模板取数约定（本件算「屏上文本」的依据）', () => {
  it('屏上「处理结果」卡读 receipt.rows，数据面那一段按 heading 被滤掉', () => {
    assert.match(TEMPLATE, /var rows=receipt\(\)\.rows/, '屏上结果卡须读 `data.receipt.rows`');
    assert.match(TEMPLATE, /sec\.heading!=="处理结果"/, '模板须按 heading「处理结果」滤掉数据面那一段');
  });
  it('副标题读 payload.message，事实条读 snapshot.summary', () => {
    assert.match(TEMPLATE, /payload\.message\|\|r\.message/);
    assert.match(TEMPLATE, /Array\.isArray\(s\.summary\)/);
  });
});

describe('#876 · 定义级：回执族一处定义，19 格同时受益', () => {
  const page = () => buildReceiptPage({
    scene: 'memo_add_wish',
    title: '记心愿',
    message: '已记一条：7',
    badges: { category: '心愿', sub: null },
    summary: ['心愿编号 7', '排期 未定'],
    sections: [],
    receipt: { entityLabel: '心愿', entityId: 7, local: 'created', remote: 'created', remoteId: 'tk_seed_876' },
    copyLog: { thinking: '', data_structure: '', call_chain: '', exception: '' },
    retryPrompt: '重跑一次：记心愿',
  });

  it('远端 guid 与「远端标识」字段名都不上屏', () => {
    const payload = payloadOf(page().html);
    const screen = screenText(payload);
    assert.ok(!screen.includes('tk_seed_876'), '屏上不许出现远端 guid：\n' + screen);
    assert.ok(!screen.includes('远端标识'), '「远端标识」是契约里的字段名，不许当标签上屏：\n' + screen);
  });

  it('三格里用户看得懂的两行仍在，且是人话', () => {
    const screen = screenText(payloadOf(page().html));
    assert.ok(screen.includes('对象：心愿 #7'), '对象行（本地记录号）须在');
    assert.ok(screen.includes('本地侧：已新建'), '本地侧须是人话');
    assert.ok(screen.includes('远端侧：已在飞书新建任务'), '远端侧须是人话');
  });

  it('一份都没丢：远端 guid 仍留在页内载荷的数据面里', () => {
    const rows = dataSideRows(payloadOf(page().html));
    assert.ok(rows.includes('远端标识：tk_seed_876'), '数据面须保留「远端标识：<guid>」这一格：' + rows.join(' | '));
  });
});

describe('#876 · 真出口：设提醒（格 15）', () => {
  it('「提醒行」面板是列的字段名与后端取值都换了人话', () => {
    const f = fixture();
    const id = seedNote(f.db, { content: '交电费', category: '备忘' });
    const r = f.run('memo.reminder', { note_id: id, content: '该交电费了', remind_at: '2026-10-01 09:00' });
    assert.equal(r.status, 0, 'stderr=' + String(r.stderr).slice(0, 300));
    const files = f.pagesOf('设提醒');
    assert.equal(files.length, 1, '产物：' + files.join(','));
    const screen = screenText(payloadOf(f.html(files[0])));
    assert.ok(screen.includes('提醒编号：'), '列名 `ID` 须换成人话「提醒编号」：\n' + screen);
    assert.ok(screen.includes('状态：有效'), '后端取值 `active` 须换成人话「有效」：\n' + screen);
    assert.ok(!screen.includes('提醒 ID'), '「提醒 ID」不许再上屏：\n' + screen);
    assert.ok(!screen.includes('active'), '`active` 不许再上屏：\n' + screen);
  });

  it('写入时间那一行照旧（它是正当事实，不是内部标识）', () => {
    const f = fixture();
    const id = seedNote(f.db, { content: '买牛奶', category: '备忘' });
    const r = f.run('memo.reminder', { note_id: id, content: '取牛奶', remind_at: '2026-10-02 09:00' });
    assert.equal(r.status, 0);
    assert.ok(screenText(payloadOf(f.html(f.pagesOf('设提醒')[0]))).includes('写入时间：'));
  });
});

describe('#876 · 真出口：手上有远端 guid 的那条心愿（格 18／20／22 同族）', () => {
  it('屏上收掉 guid，出口回执与页内载荷两处都还在', () => {
    const f = fixture();
    // 只改子分类：不碰远端 ⇒ 不需要远端挡板也走得到「本地有 guid」那一支（`updateWish` 的 not-applicable 支）。
    const id = seedNote(f.db, { content: '学游泳', category: '心愿', sub: '运动', guid: 'tk_live_876' });
    const r = f.run('memo.update', { id, sub_category: '健身' });
    assert.equal(r.status, 0, 'stderr=' + String(r.stderr).slice(0, 300));
    const files = f.pagesOf('改心愿');
    assert.equal(files.length, 1, '产物：' + files.join(','));

    const payload = payloadOf(f.html(files[0]));
    const screen = screenText(payload);
    assert.ok(!screen.includes('tk_live_876'), '屏上不许出现远端 guid：\n' + screen);
    assert.ok(!screen.includes('远端标识'), '「远端标识」不许当标签上屏：\n' + screen);

    // ① 页内载荷：机器值留档
    assert.ok(dataSideRows(payload).includes('远端标识：tk_live_876'),
      '页内载荷的数据面须留住这一格：' + dataSideRows(payload).join(' | '));
    // ② 命令出口回执 JSON：契约要的三格逐格读得到（`docs/agents/合成写判据.md` §一判据 4）
    const data = outData(r);
    assert.equal(data.remoteId, 'tk_live_876', '出口回执的 remoteId 不许动');
    assert.equal(data.local, 'updated');
    assert.equal(data.remote, 'not-applicable');
  });
});
