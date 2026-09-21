// #882 · 「对象」那一格的取值形状（回执页族定义级）＋ 批量改分类执行支端到端（真出口）。
//
// 这一件要锁住的**口径**：`ReceiptRows.entityId` 是数字⇒记录号（族里加 `#`，`备忘 #18`）；
// 是字符串⇒域侧自述文案（原样上屏、不吃 `#`，`批量改分类 1 条`）。改回旧写法（一律 `' #' + String(...)`）
// 本件必红。另锁一条「同一句只拼一遍」：信封的 `data.message` 与页 lead 逐字相同（#882 之前是两份定义）。
//
// 跑的是**仓内 dist 的真出口**（`dist/cli/cmd_read.js`，同 `receipt-831.test.mjs` 的口径）：
// 改完源码先 `node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife` 再跑本件。
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, existsSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const NODE = process.execPath;
const dist = (rel) => pathToFileURL(join(pkg, 'dist', rel)).href;

let DB = '';
let HOME = '';
let BIN = '';

function run(args) {
  return spawnSync(NODE, [BIN, ...args], {
    cwd: dirname(BIN), encoding: 'utf8',
    env: { ...process.env, USERPROFILE: HOME, HOME },
  });
}
const landingDir = () => join(DB, 'memo_html');
const listing = () => (existsSync(landingDir()) ? readdirSync(landingDir()) : []);
/** 该主体最新那一件（库侧实例名＝主体_时间戳，按名排序即按时间序）。 */
const latestOf = (stem) => {
  const fresh = listing().filter((f) => f.startsWith(stem + '_')).sort();
  assert.ok(fresh.length >= 1, stem + ' 缺产物，目录里只有：' + listing().join(','));
  return readFileSync(join(landingDir(), fresh[fresh.length - 1]), 'utf8');
};
const jsonOf = (html) => {
  const m = /<script id="payload" type="application\/json">([\s\S]*?)<\/script>/.exec(html);
  assert.ok(m !== null, '页里必须有载荷块');
  return JSON.parse(m[1]);
};
/** 页上「对象」那一行（数据面 receipt.rows 与屏上 sections 同源，这里读数据面那一份）。 */
const objectRowOf = (payload) => payload.data.receipt.rows.find((r) => r.startsWith('对象：'));

before(() => {
  DB = mkMemoDb('memo-882-');
  HOME = mkdtempSync(join(tmpdir(), 'memo-882-home-'));
  mkdirSync(join(HOME, '.ilife'), { recursive: true });
  writeFileSync(join(HOME, '.ilife', 'memo.yaml'),
    ['db:', '  dir: ' + JSON.stringify(DB.replace(/\\/g, '/')), '  name: memo.db'].join('\n') + '\n', 'utf8');
  BIN = join(pkg, 'dist', 'cli', 'cmd_read.js');
  assert.ok(existsSync(BIN), '先编译：node node_modules/typescript/bin/tsc -b packages/skill-memo-ilife');
});

after(() => {
  rmSync(HOME, { recursive: true, force: true });
});

describe('#882 · 回执页族「对象」行（定义级：数字＝记录号，字符串＝域侧自述）', () => {
  const buildPage = async (entityId, entityLabel) => {
    const { buildReceiptPage } = await import(dist('render/receipt.js'));
    return buildReceiptPage({
      scene: 'memo_batch_change_category',
      title: '备忘改分类',
      message: '改分类完成：更新 1 条，跳过 0 条',
      badges: { category: '心愿', sub: null },
      summary: [],
      sections: [],
      receipt: { entityLabel, entityId, local: 'updated', remote: 'not-applicable', remoteId: null },
      copyLog: { thinking: '', data_structure: '', call_chain: '', exception: '无' },
      retryPrompt: '重跑一次',
    });
  };

  it('数字形态：记录号照旧带 `#`（`备忘 #18`）', async () => {
    const page = await buildPage(18, '备忘');
    assert.equal(objectRowOf(jsonOf(page.html)), '对象：备忘 #18');
  });

  it('字符串形态：域侧自述文案原样上屏，不吃 `#`（`批量改分类 1 条`）', async () => {
    const page = await buildPage('1 条', '批量改分类');
    const row = objectRowOf(jsonOf(page.html));
    assert.equal(row, '对象：批量改分类 1 条');
    assert.ok(!row.includes('#'), '字符串形态不许再出现 `#`：' + row);
  });

  it('批量支装配件填的就是字符串形态（`N 条`，不带「更新」二字、不带 `#`）', async () => {
    const { memoBatchResultPage } = await import(dist('memo/receipt.js'));
    const page = memoBatchResultPage({
      receipt: { ok: true, message: '改分类完成：更新 1 条，跳过 0 条', local: 'updated', remote: 'not-applicable', remoteId: null },
      updated: 1, skipped: 0, errors: [], from: null, to: '心愿',
    });
    assert.equal(page.stem, '备忘改分类-批量', '主体取自册子（seq 6）');
    assert.equal(objectRowOf(jsonOf(page.html)), '对象：批量改分类 1 条');
  });
});

describe('#882 · 批量改分类执行支（真出口：屏上与信封同源）', () => {
  it('执行一次：页上「对象」行读作「批量改分类 1 条」，信封 message 与页 lead 逐字相同', () => {
    const id = seedNote(DB, { content: '批量对象：换季衣服', category: '备忘' });
    const r = run(['memo.batch', '--params', JSON.stringify({ ids: [id], toCategory: '心愿' })]);
    assert.equal(r.status, 0, String(r.stderr));
    const env = JSON.parse(r.stdout);
    assert.equal(env.data.message, '改分类完成：更新 1 条，跳过 0 条', '信封那一句用中文条数，不再露半角等号');
    assert.equal(env.data.updated, 1);
    const html = latestOf('备忘改分类-批量');
    const payload = jsonOf(html);
    assert.equal(objectRowOf(payload), '对象：批量改分类 1 条');
    assert.equal(payload.message, env.data.message, '页 lead 与信封 message 同源（同一句只拼一遍）');
    assert.ok(!html.includes('#更新'), '屏上不许再有 `#更新`：' + objectRowOf(payload));
  });

  it('跳过／错误照旧逐条记账，摘要一条不丢', () => {
    const r = run(['memo.batch', '--params', JSON.stringify({ ids: [999999], toCategory: '心愿' })]);
    assert.equal(r.status, 4, '跳过了就不算全成');
    const env = JSON.parse(r.stdout);
    assert.equal(env.data.skipped, 1);
    assert.equal(env.data.message, '改分类完成：更新 0 条，跳过 1 条');
    const payload = jsonOf(latestOf('备忘改分类-批量'));
    assert.equal(objectRowOf(payload), '对象：批量改分类 0 条');
    const summary = payload.data.scene.snapshot.summary;
    assert.ok(summary.some((s) => s.startsWith('没做成：')), '逐条错误进摘要，不静默：' + JSON.stringify(summary));
  });
});

describe('#882 · 18 格单条场景不吃这一改（回归锁）', () => {
  it('单条改分类：`对象：<分类> #<id>` 照旧', () => {
    const id = seedNote(DB, { content: '单条改分类对象', category: '备忘' });
    const r = run(['memo.update', '--params', JSON.stringify({ id, category: '打卡' })]);
    assert.equal(r.status, 0, String(r.stderr));
    assert.equal(objectRowOf(jsonOf(latestOf('备忘改分类'))), '对象：打卡 #' + id);
  });

  it('删一条：`对象：<分类> #<id>` 照旧（删前那一行是权威）', () => {
    const id = seedNote(DB, { content: '单条删除对象', category: '备忘' });
    const r = run(['memo.remove', '--params', JSON.stringify({ id, confirm: true })]);
    assert.equal(r.status, 0, String(r.stderr));
    assert.equal(objectRowOf(jsonOf(latestOf('删备忘'))), '对象：备忘 #' + id);
  });
});

// 字符串形态在域里一共三处：批量支（本票目标）＋ 两处兜底。墙上 34 格跑不到兜底那两处，
// 但本票改了它们**上屏的样子**（`#未新建` → `未新建`、`#—` → `—`），故在这里按定义级锁住形状：
// **本票只去 `#`，不改措辞**（措辞的去留见票面 §四，另开票）。
describe('#882 · 字符串形态的另外两处兜底（定义级：只去 `#`，不改措辞）', () => {
  it('记心愿没拿到记录号时：`对象：心愿 —`（旧写法是 `#—`）', async () => {
    const { buildWishReceipt } = await import(dist('wish/receipt.js'));
    const page = buildWishReceipt({
      scene: 'memo_add_wish',
      title: '记心愿',
      loc: null,
      receipt: { ok: true, message: '已记一条：7', local: 'created', remote: 'not-applicable', remoteId: null },
    });
    assert.equal(objectRowOf(jsonOf(page.html)), '对象：心愿 —');
  });

  it('记情绪没拿到记录号时：`对象：情绪日记 未新建`（旧写法是 `#未新建`）', async () => {
    const { buildReceipt } = await import(dist('memo/receiptPage.js'));
    const page = buildReceipt(
      'memo_add_mood', '记情绪',
      { ok: false, message: '已记一条：7；远端没成（未登录）', local: 'created', remote: 'failed', remoteId: null },
      { entityLabel: '情绪日记', entityId: '未新建', summary: ['本次未新建笔记'] },
    );
    assert.equal(objectRowOf(jsonOf(page.html)), '对象：情绪日记 未新建');
  });
});
