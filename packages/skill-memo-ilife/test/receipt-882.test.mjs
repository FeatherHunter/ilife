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
import { join, dirname, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkMemoDb, seedNote } from './helpers/memo-sqlite.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const pkg = join(here, '..');
const NODE = process.execPath;
const dist = (rel) => pathToFileURL(join(pkg, 'dist', rel)).href;
/** 包内 `src` 的 `.ts` 件（静态审计用：只读源码文本，不 import）。 */
const srcFiles = (dir) => readdirSync(dir, { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? srcFiles(join(dir, e.name)) : (e.name.endsWith('.ts') ? [join(dir, e.name)] : [])));

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
  const buildPage = async (entityId, entityLabel, scene = 'memo_batch_change_category') => {
    const { buildReceiptPage } = await import(dist('render/receipt.js'));
    return buildReceiptPage({
      scene,
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

  it('19 格逐格：数字形态（记录号）在**每一格**上都带 `#`（族里那条规则的覆盖面）', async () => {
    const { RECEIPT_SCENES } = await import(dist('render/receipt.js'));
    assert.equal(RECEIPT_SCENES.length, 19, '册子本族 19 格（#831／#826／#828／#829／#830 逐域追加）');
    const bad = [];
    for (const scene of RECEIPT_SCENES) {
      const row = objectRowOf(jsonOf((await buildPage(18, '备忘', scene)).html));
      if (row !== '对象：备忘 #18') bad.push(scene + ' → ' + row);
    }
    assert.deepEqual(bad, [], '这几格没按「数字＝记录号」渲染');
  });

  // 调用面审计（静态）：`entityId` 的取值位全包只有三处写字符串字面量，其余都是数字表达式。
  // 这就是「18 格单条场景仍带 `#`」在仓内的门 —— 新冒一处字符串（把记录号改成文案）即红。
  // 现场清单（#882 当刻，10 处取值位）：checkin/receipt.ts `note.id`；memo/receiptPage.ts `note.id`／
  // `opts.entityId`；memo/receipt.ts `input.updated + ' 条'`（本票目标的字符串形态）；
  // memo/run.ts `'未新建'`（兜底）／`r.receipt.updated`（**计数**，按类型仍带 `#`，见票面 §四）；
  // remind/run.ts `note === null ? row.id : note.id`；wish/receipt.ts `input.entityId ?? loc?.id ?? '—'`（兜底）；
  // wish/run.ts `items.length`（**计数**，同上）。
  it('调用面：`entityId` 取值位的字符串字面量只许是这三处（新冒一处即红）', () => {
    const known = [' 条', '未新建', '—']; // 批量支的「N 条」拼接 ／ 记情绪兜底 ／ 记心愿兜底
    const hits = [];
    for (const f of srcFiles(join(pkg, 'src'))) {
      const rel = relative(pkg, f).replace(/\\/g, '/');
      for (const line of readFileSync(f, 'utf8').split('\n')) {
        if (/\breadonly\b/.test(line)) continue; // 类型声明位，不是取值位
        // 只取 `entityId: <expr>` ／ `entityId = <expr>` 里的那截表达式（`===` 比较不算），再从中取字面量 ——
        // 整行取会把同一行的 `'对象：'`、`'打卡'` 这类不相关的字面量也算进来。
        const m = /entityId\s*[:=](?!=)\s*([^,;}\n]+)/.exec(line);
        if (m === null) continue;
        for (const lit of m[1].matchAll(/'([^']*)'/g)) hits.push([rel, lit[1]]);
      }
    }
    assert.deepEqual(
      [...new Set(hits.map((h) => h[1]))].sort(), [...known].sort(),
      '新出现的字符串字面量：' + JSON.stringify(hits),
    );
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
// 但本票改了它们**上屏的样子**（去掉那个 `#`），故在这里锁住本票真做过的那件事：**形状**（标签 ＋ 无 `#`）。
// 兜底那两个词（`未新建`／`—`）本身**不锁** —— 措辞的去留归票面 §四那张待开的票。
describe('#882 · 字符串形态的另外两处兜底（定义级：只锁「去了 `#`」，不锁措辞）', () => {
  it('记心愿没拿到记录号时：去掉 `#`（旧样子是 `心愿 #—`）', async () => {
    const { buildWishReceipt } = await import(dist('wish/receipt.js'));
    const page = buildWishReceipt({
      scene: 'memo_add_wish',
      title: '记心愿',
      loc: null,
      receipt: { ok: true, message: '已记一条：7', local: 'created', remote: 'not-applicable', remoteId: null },
    });
    const row = objectRowOf(jsonOf(page.html));
    assert.ok(row.startsWith('对象：心愿 '), '对象那一半仍是「心愿」：' + row);
    assert.ok(!row.includes('#'), '`#` 后面没有记录号，不许再出现：' + row);
  });

  it('记情绪没拿到记录号时：去掉 `#`（旧样子是 `情绪日记 #未新建`）', async () => {
    const { buildReceipt } = await import(dist('memo/receiptPage.js'));
    const page = buildReceipt(
      'memo_add_mood', '记情绪',
      { ok: false, message: '已记一条：7；远端没成（未登录）', local: 'created', remote: 'failed', remoteId: null },
      { entityLabel: '情绪日记', entityId: '未新建', summary: ['本次未新建笔记'] },
    );
    const row = objectRowOf(jsonOf(page.html));
    assert.ok(row.startsWith('对象：情绪日记 '), '对象那一半仍是「情绪日记」：' + row);
    assert.ok(!row.includes('#'), '`#` 后面不是记录号，不许再出现：' + row);
  });
});
