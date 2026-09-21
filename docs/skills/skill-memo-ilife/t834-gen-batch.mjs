#!/usr/bin/env node
/** #834 · **整批真跑**驱动器（收口票第一段）：一份夹具、一次跑批、34 格产物全落盘。
 *
 * 为什么单列一件（与 8 张域票各自的驱动器不同）：域票是「我这 4～7 格真跑」，
 * 收口要的是**同一份夹具、同一次跑批**下 34 格全出 —— 跨域共用的那几行（`备忘改分类` 单条 vs 批量、
 * 心愿域与同步域共用同一批心愿行）只有在同一份库里跑才暴露撞格与互相污染。
 *
 * 夹具口径照仓内既有接缝件（`tooling/contract-seam.mjs`）：临时库 ＋ 临时家目录配置 ＋
 * 能应答的远端挡板（`lark-cli` 替身经 PATH 首位注入）。**绝不碰活库与真家目录。**
 *
 * 产物收集：库侧落点仍是 `<库目录>/memo_html/<主体>_<时间戳>.html`（时间戳只活在库侧，
 * 照 #822／#825 v2）；本件按册子把每一格复制成**最终发布名** `<主体>.html` 收进 `--out` 目录，
 * 供 #856 的 `--stage` → 双端墙 → 链路总表 → 机审名单一条链读。
 *
 * 用法（仓根）：
 *   node docs/skills/skill-memo-ilife/t834-gen-batch.mjs [--out <目录>] [--keep]
 * 读数：逐格一行（序／唤醒词／命令／退出码／主体对册子）；末尾 `RESULT: n/34`；
 * 任一格没落盘或主体与册子不符即 exit 1 并逐条点名。
 */
import { chmodSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { makeSeam, envelope } from '../../../tooling/contract-seam.mjs';
import { mkMemoConfig, stubPathEnv } from '../../../packages/skill-memo-ilife/test/helpers/config-base.mjs';
import { seedNote, seedReminder } from '../../../packages/skill-memo-ilife/test/helpers/memo-sqlite.mjs';
import { bookletFileStem, BOOKLET_ROWS } from '../../../packages/skill-memo-ilife/dist/help/booklet.js';

const ROOT = resolve('.');
const argOf = (n, d) => { const i = process.argv.indexOf(n); return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : d; };
/** 批目录默认落在**技能包自己的 `.scratch/`** 下：`.scratch/` 在任意深度都被 git 忽略，
 *  而视觉复核工具只认会话工作区内的路径 —— 落在包内，墙页与产物才既不入仓又能被人／工具直接打开。 */
const OUT = resolve(argOf('--out', 'packages/skill-memo-ilife/.scratch/t834/源'));
const KEEP = process.argv.includes('--keep');
const READING = join(dirname(OUT), '跑批读数.json');
const DAY = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);

/* ── 夹具：临时库 ＋ 挡板 ＋ 临时家目录 ─────────────────────────────────────── */
const seam = makeSeam('memo', { prefix: 't834-batch-', state: { tasks: [] } });
const db = seam.dbPath;
const home = mkMemoConfig({ db: { dir: db } }, 't834-batch-cfg-');
const ENV = stubPathEnv(home, seam.stub.dir);

/* ── 布景：一次性把 8 个域要用的行都种下（直插，不经出口——布景不是被测行为）────── */
const id = {};
// 备忘域
id.memoUpd = seedNote(db, { content: '买牛奶两盒', category: '备忘', sub: '家务' });
id.memoSub = seedNote(db, { content: '周报要写', category: '备忘', sub: '工作' });
id.memoCat = seedNote(db, { content: '今天走了 8000 步', category: '备忘' });
id.memoDel = seedNote(db, { content: '临时草稿：明天再看', category: '备忘' });
id.memoBat = seedNote(db, { content: '批量对象：换季衣服', category: '备忘' });
id.memoQ = seedNote(db, { content: '咖啡豆快没了，记得补', category: '备忘', sub: '购物' });
seedNote(db, { content: '读完《设计中的设计》', category: '备忘', due: DAY(-2) });
// 查找域（关键词命中一条、时间范围命中一条）
seedNote(db, { content: '买菜：西红柿、鸡蛋、挂面', category: '备忘', sub: '家务' });
// 心愿域
id.wishUpd = seedNote(db, { content: '学游泳', category: '心愿', sub: '运动' });
id.wishDel = seedNote(db, { content: '学陶艺', category: '心愿' });
id.wishDone = seedNote(db, { content: '跑马拉松', category: '心愿', sub: '运动', due: DAY(30), guid: 'tk_done' });
id.wishPlan = seedNote(db, { content: '去一趟敦煌', category: '心愿', sub: '个人' });
// 打卡域
id.chkUpd = seedNote(db, { content: '今天跑步 5 公里', category: '打卡', sub: '跑步' });
id.chkDel = seedNote(db, { content: '早起打卡', category: '打卡' });
// 情绪域
id.moodUpd = seedNote(db, { content: '今天有点累', category: '情绪日记', sub: '疲惫' });
id.moodDel = seedNote(db, { content: '被论文卡住，有点烦', category: '情绪日记', sub: '烦躁' });
// 提醒域：一条挂旧笔记的、一条已触发的
id.remNote = seedNote(db, { content: '交电费', category: '备忘' });
seedReminder(db, { noteId: id.remNote, at: '2026-10-01 09:00', type: '一次性', content: '该交电费了' });
seedReminder(db, { noteId: id.chkUpd, at: '2026-09-20 07:00', type: '一次性', content: '该跑步了', status: 'done', notified: '2026-09-20 07:00:00' });

/* 同步域：远端现状（描述里带归属锚 `原备忘 #N`，`src/wish/mark.ts` 的唯一定义地） */
seam.stub.setState({
  tasks: [
    { guid: 'tk_done', summary: '跑马拉松', description: '原备忘 #' + id.wishDone, due: DAY(30), completed_at: '2026-09-21T10:00:00Z' },
    { guid: 'tk_plan', summary: '去一趟敦煌', description: '原备忘 #' + id.wishPlan, due: DAY(45), completed_at: '' },
  ],
});

/* 首次使用域：诊断 JSON（照老 `init-report --data` 契约：items 检查清单 ＋ todos ＋ verify）。
 *
 * ⚠️ 这份载荷是**夹具文案**（生产里由 AI 现写、本页只透传渲染），所以它的措辞也要守本仓的文案纪律：
 *   - 早期版本照抄了 `.scratch/t833/probe-init.mjs` 的「Python 时代示例文案」，带 `fts5`／`CLI` 两个
 *     英文裸词 ⇒ 机审 ⑥ 在两页各点 3 处。**#833 已判定这是示例文案债并改过中文**，本驱动器是沿旧夹具
 *     又踩回去的（实测：同一页换中文载荷，⑥ 由 1 件变 0 件，见证据件 §二）。故此处回到中文说法。
 *   - 判定链与两次读数都留在 `t834-收口-证据.md`，不静默换字。 */
const DIAG = {
  items: [
    { name: '运行环境', status: 'ok', desc: 'Node 可用', action: '' },
    { name: '数据目录', status: 'ok', desc: '可写', action: '' },
    { name: '数据存储', status: 'warn', desc: '全文搜索扩展未装', action: '装全文搜索扩展后重跑' },
    { name: '飞书联动', status: 'err', desc: '未安装飞书命令行工具', action: '按指引安装并授权' },
    { name: '配置项', status: 'ok', desc: '配置文件三项齐', action: '' },
    { name: '提醒调度', status: 'warn', desc: '调度外壳未接', action: '确认定时任务在跑' },
  ],
  todos: [
    { title: '装飞书命令行工具', steps: ['下安装包', '跑授权', '回来说一声'] },
    { title: '开全文搜索', steps: ['装全文搜索扩展', '重建索引'] },
  ],
  verify: ['重跑首次使用看环境检查全绿', '记一条备忘确认落盘', { text: '看提醒列表能读出调度结果', status: 'skip' }],
};

/**
 * 34 格：册子 seq／sceneId ／kind ／命令键 ／参数。
 * **顺序即状态**：建→改→删各自的对象互不复用；批量向导先收集后执行；同步放最后（读的是前面跑完的库）。
 */
const CELLS = [
  { seq: 1, scene: 'memo_add_basic', key: 'memo.create', params: { title: '买牛奶', body: '买牛奶两盒', category: '备忘', sub: '家务' } },
  { seq: 2, scene: 'memo_update_basic', key: 'memo.update', params: { id: id.memoUpd, body: '买牛奶两盒（改后）' } },
  { seq: 3, scene: 'memo_delete_basic', key: 'memo.remove', params: { id: id.memoDel, confirm: true } },
  { seq: 4, scene: 'memo_change_category_single', key: 'memo.update', params: { id: id.memoCat, category: '打卡' } },
  { seq: 5, scene: 'memo_change_subcategory', key: 'memo.update', params: { id: id.memoSub, sub_category: '工作台账' } },
  { seq: 31, scene: 'memo_batch_change_category', kind: '过程页', key: 'memo.batch', params: { fromCategory: '备忘' } },
  { seq: 6, scene: 'memo_batch_change_category', key: 'memo.batch', params: { ids: [id.memoBat], toCategory: '心愿' } },
  { seq: 7, scene: 'memo_search_keyword', key: 'memo.search', params: { q: '咖啡' } },
  { seq: 8, scene: 'memo_search_alias', key: 'memo.search', params: { q: '牛奶', scene: 'memo_search_alias' } },
  { seq: 9, scene: 'memo_get_detail', key: 'memo.detail', params: { id: id.memoQ } },
  { seq: 10, scene: 'memo_search_by_date', key: 'memo.search', params: { start: DAY(-7), end: DAY(1) } },
  { seq: 11, scene: 'memo_search_wish', key: 'memo.wish', params: { category: '心愿', scene: 'memo_search_wish' } },
  { seq: 12, scene: 'memo_search_checkin', key: 'memo.search', params: { category: '打卡' } },
  { seq: 13, scene: 'memo_search_mood', key: 'memo.search', params: { category: '情绪日记' } },
  { seq: 14, scene: 'memo_remind_with_note', key: 'memo.create', params: { title: '取牛奶', body: '取牛奶', category: '备忘', remindAt: '2026-10-01 09:00' } },
  { seq: 15, scene: 'memo_remind_existing', key: 'memo.reminder', params: { note_id: id.remNote, content: '该做保养了', remind_at: '2026-10-02 09:00' } },
  { seq: 16, scene: 'memo_reminders_active', key: 'memo.remind', params: {} },
  { seq: 17, scene: 'memo_completed_reminders', key: 'memo.remind', params: { mode: 'done' } },
  { seq: 20, scene: 'memo_add_wish', key: 'memo.create', params: { title: '学吉他', body: '学吉他', category: '心愿', sub: '音乐' } },
  { seq: 22, scene: 'memo_update_wish', key: 'memo.update', params: { id: id.wishUpd, body: '学游泳（改后）' } },
  { seq: 21, scene: 'memo_delete_wish', key: 'memo.remove', params: { id: id.wishDel, confirm: true } },
  { seq: 18, scene: 'memo_complete_wish', key: 'memo.update', params: { id: id.wishDone, done: true } },
  { seq: 32, scene: 'memo_complete_wish', kind: '过程页', key: 'memo.wish', params: { wizard: 'complete' } },
  { seq: 19, scene: 'memo_wish_schedule', key: 'memo.wish', params: {} },
  { seq: 33, scene: 'memo_wish_schedule', kind: '过程页', key: 'memo.wish', params: { wizard: 'plan' } },
  { seq: 23, scene: 'memo_add_checkin', key: 'memo.create', params: { content: '今天跑步 7 公里', category: '打卡', sub_category: '跑步' } },
  { seq: 25, scene: 'memo_update_checkin', key: 'memo.update', params: { id: id.chkUpd, content: '今天跑步 6 公里', category: '打卡' } },
  { seq: 24, scene: 'memo_delete_checkin', key: 'memo.remove', params: { id: id.chkDel, confirm: true } },
  { seq: 26, scene: 'memo_add_mood', key: 'memo.create', params: { title: '今天心情不错', body: '今天心情不错', category: '情绪日记', sub: '开心' } },
  { seq: 28, scene: 'memo_update_mood', key: 'memo.update', params: { id: id.moodUpd, body: '今天有点累（改后）' } },
  { seq: 27, scene: 'memo_delete_mood', key: 'memo.remove', params: { id: id.moodDel, confirm: true } },
  { seq: 29, scene: 'memo_sync_feishu', key: 'memo.sync', params: {} },
  { seq: 30, scene: 'memo_init_setup', key: 'memo.init', params: { data: DIAG } },
  { seq: 34, scene: 'memo_init_setup', kind: '过程页', key: 'memo.init', params: { data: DIAG, mode: 'wizard' } },
];

/* 册子是名字的唯一权威：file ＝ `bookletFileStem(scene, kind)` ＋ `.html`。 */
const wantOf = (c) => bookletFileStem(c.scene, c.kind ?? '结果页') + '.html';
const wakeOf = (c) => {
  const hit = BOOKLET_ROWS.find((r) => r.seq === c.seq);
  if (hit === undefined) throw new Error('册子无此序：' + c.seq);
  return hit.wake;
};

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

console.log('# t834 整批真跑（临时库 ' + db + '）');
console.log('');
console.log('序   唤醒词'.padEnd(22) + '命令'.padEnd(16) + '退出码  主体对册子  产物');
console.log('-'.repeat(118));

const rows = [];
for (const c of CELLS) {
  const r = seam.runNew(c.key, c.params, { extraEnv: ENV });
  let env = null;
  try { env = envelope(r); } catch { env = null; }
  const land = env?.delivery?.path && existsSync(env.delivery.path) ? env.delivery.path : null;
  const want = wantOf(c);
  let got = '';
  if (land !== null) {
    got = land.replace(/\\/g, '/').split('/').pop().replace(/_\d{8}_\d{6}(_\d+)?\.html$/, '') + '.html';
    if (got === want) copyFileSync(land, join(OUT, want));
  }
  const ok = got === want;
  rows.push({
    seq: c.seq, wake: wakeOf(c), key: c.key, scene: c.scene, kind: c.kind ?? '结果页',
    exit: typeof r.status === 'number' ? r.status : -1,
    params: c.params, landing: land, want, got, ok,
    message: env?.message ?? null, remote: env?.data?.remote ?? null,
  });
  console.log(
    String(c.seq).padEnd(5) + wakeOf(c).padEnd(16) + c.key.padEnd(16) + String(r.status).padEnd(8)
    + (got === '' ? '（无产物）'.padEnd(12) : (ok ? '✓' : '✗ 实得 ' + got).padEnd(12))
    + (land === null ? String(r.stderr ?? '').trim().split('\n')[0].slice(0, 50) : want),
  );
}

/* ── 复算：源目录件数 ＝ 册子格数 ＝ 34（少任何一件都在这里红） ──────────────── */
const missed = rows.filter((r) => !r.ok);
const files = readdirSync(OUT).filter((f) => f.endsWith('.html')).sort();
const stems = new Set(BOOKLET_ROWS.map((r) => r.file + '.html'));
const extra = files.filter((f) => !stems.has(f));
const missing = [...stems].filter((f) => !files.includes(f));
const sizes = files.map((f) => ({ f, b: statSync(join(OUT, f)).size }));
const totalBytes = sizes.reduce((a, s) => a + s.b, 0);
const maxFile = sizes.slice().sort((a, b) => b.b - a.b)[0];

console.log('');
console.log(`RESULT: ${rows.length - missed.length}/${rows.length} 格真跑成功；源目录 ${files.length} 件（册子 34）；共 ${totalBytes} B；最大单件 ${maxFile.f} ${maxFile.b} B`);
if (missing.length) console.error('  源目录缺件：' + missing.join('、'));
if (extra.length) console.error('  源目录多出非册子件：' + extra.join('、'));
if (missed.length) for (const m of missed) console.error(`  格未落盘／主体不符：${m.seq} ${m.wake}（要 ${m.want}，实得 ${m.got || '无'}）`);

mkdirSync(join(ROOT, '.scratch'), { recursive: true });
writeFileSync(READING, JSON.stringify({
  ticket: '#834', madeAt: new Date().toISOString(),
  seam: { db, home, stub: seam.stub.dir, out: OUT },
  notes: id,
  rows,
  summary: { cells: rows.length, ok: rows.length - missed.length, files: files.length, totalBytes, maxFile },
}, null, 2) + '\n', 'utf8');
console.log('读数：' + READING);
console.log('产物目录（发布名）：' + OUT);

if (!KEEP) { try { chmodSync(OUT, 0o755); } catch { /* win 无 exec 位 */ } }
const clean = missed.length === 0 && missing.length === 0 && extra.length === 0;
process.exit(clean ? 0 : 1);
