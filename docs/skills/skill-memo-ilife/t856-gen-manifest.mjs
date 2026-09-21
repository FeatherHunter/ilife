#!/usr/bin/env node
/** #856 · 清单生成器（清单是唯一权威）。
 *
 * 读唯一定义地 `packages/skill-memo-ilife/src/help/booklet.ts` 的 BOOKLET_ROWS，
 * 写 `docs/skills/skill-memo-ilife/t856-manifest.json`。文件名最终名只在此一处算出：
 * `manifest.rows[].file ＝ booklet.file ＋ '.html'`（#825 v2：file 存最终名，墙精确匹配）。
 * booklet 本体（34 格／4 族／主体算法）一字不动，本件只做机械变换。
 *
 * 门（失败即 exit 非零并点名）：
 *   1. 34 格连续（seq 1–34，无缺号无重号）；
 *   2. file 34 两两不同（撞名在生成时就红，不等上墙）；
 *   3. 每行必填 seq／kind／wake／file（墙自检的最低要求）；
 *   4. 与 HELP 官方源对齐：30 个结果页场景 id 与唤醒词逐字出自 `src/help/scenes/*.ts`
 *     （过程页 4 行挂原场景 id＋kind=过程页，不计入 30 对齐）。
 * 清单不带 BOM（带签名的 UTF-8 读出来会 Unexpected token）。
 *
 * 用法：
 *   node docs/skills/skill-memo-ilife/t856-gen-manifest.mjs            # 写清单，打印读数
 *   node docs/skills/skill-memo-ilife/t856-gen-manifest.mjs --check    # 只校验不写盘
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, '..', '..', '..');
const BOOKLET = join(repo, 'packages', 'skill-memo-ilife', 'src', 'help', 'booklet.ts');
const SCENES_DIR = join(repo, 'packages', 'skill-memo-ilife', 'src', 'help', 'scenes');
const OUT = join(root, 't856-manifest.json');

const die = (msg) => { console.error(msg); process.exit(1); };

/** 页型：册子 kind＋family → 清单 kind（墙与链路表直接引用此字样）。 */
function toKind(family, kind) {
  if (kind === '过程页') return '过程型·向导页';
  if (family === '列表查询') return '结果型·列表页';
  if (family === '报告') return '结果型·报告页';
  return '结果型·回执页';
}

/** 目标命令（现状链路表 §二＋#837 Q④⑤⑥⑦＋#850 新开 memo.init／memo.reminder）。路由修复不在本票，键列为目标态引用。 */
const KEY_BY_SCENE_KIND = {
  'memo_add_basic|结果页': 'memo.create',
  'memo_update_basic|结果页': 'memo.update',
  'memo_delete_basic|结果页': 'memo.remove',
  'memo_change_category_single|结果页': 'memo.update',
  'memo_change_subcategory|结果页': 'memo.update',
  'memo_batch_change_category|结果页': 'memo.batch',
  'memo_batch_change_category|过程页': 'memo.batch',
  'memo_search_keyword|结果页': 'memo.search',
  'memo_search_alias|结果页': 'memo.search',
  'memo_get_detail|结果页': 'memo.detail',
  'memo_search_by_date|结果页': 'memo.search',
  'memo_search_wish|结果页': 'memo.wish',
  'memo_search_checkin|结果页': 'memo.search',
  'memo_search_mood|结果页': 'memo.search',
  'memo_remind_with_note|结果页': 'memo.create',
  'memo_remind_existing|结果页': 'memo.reminder',
  'memo_reminders_active|结果页': 'memo.remind',
  'memo_completed_reminders|结果页': 'memo.remind',
  'memo_complete_wish|结果页': 'memo.update',
  'memo_complete_wish|过程页': 'memo.wish',
  'memo_wish_schedule|结果页': 'memo.wish',
  'memo_wish_schedule|过程页': 'memo.wish',
  'memo_add_wish|结果页': 'memo.create',
  'memo_delete_wish|结果页': 'memo.remove',
  'memo_update_wish|结果页': 'memo.update',
  'memo_add_checkin|结果页': 'memo.create',
  'memo_delete_checkin|结果页': 'memo.remove',
  'memo_update_checkin|结果页': 'memo.update',
  'memo_add_mood|结果页': 'memo.create',
  'memo_delete_mood|结果页': 'memo.remove',
  'memo_update_mood|结果页': 'memo.update',
  'memo_sync_feishu|结果页': 'memo.sync',
  'memo_init_setup|结果页': 'memo.init',
  'memo_init_setup|过程页': 'memo.init',
};

/** 从 booklet.ts 源码逐行提取 BOOKLET_ROWS（不编译 TS，只读字面量）。 */
function readBookletRows(src) {
  const rows = [];
  const re = /\{\s*seq:\s*(\d+),\s*sceneId:\s*'([^']+)',\s*wake:\s*'([^']+)',\s*file:\s*'([^']+)',\s*family:\s*'([^']+)',\s*kind:\s*'([^']+)',\s*check:\s*'([^']+)'\s*\}/g;
  for (const m of src.matchAll(re)) {
    rows.push({ seq: Number(m[1]), sceneId: m[2], wake: m[3], stem: m[4], family: m[5], kind: m[6], check: m[7] });
  }
  return rows;
}

/** HELP 官方源的场景 id→wake（读 scenes/*.ts 源码文本，不编译）。 */
function readHelpPairs() {
  const pairs = new Map();
  for (const f of readdirSync(SCENES_DIR)) {
    if (!f.endsWith('.ts')) continue;
    const src = readFileSync(join(SCENES_DIR, f), 'utf8');
    const ids = [...src.matchAll(/\bid:\s*"([a-z0-9_]+)"/g)].map((m) => m[1]).filter((s) => s.startsWith('memo_'));
    const wakes = [...src.matchAll(/\bwake_word:\s*"([^"]+)"/g)].map((m) => m[1]);
    // scenes 文件里 id 与 wake_word 按场景块顺序一一对应；只取 memo_ 开头的 id 块。
    // 更稳的取法：按场景对象块切分后再取对。
    const blocks = src.split(/id:\s*"/).slice(1);
    for (const b of blocks) {
      const idm = b.match(/^([a-z0-9_]+)"/);
      if (!idm || !idm[1].startsWith('memo_')) continue;
      const wm = b.match(/wake_word:\s*"([^"]+)"/);
      if (wm) pairs.set(idm[1] + '::' + wm[1], true);
    }
    void ids; void wakes;
  }
  return pairs;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const bookletSrc = readFileSync(BOOKLET, 'utf8');
  const rows = readBookletRows(bookletSrc);
  const problems = [];
  if (rows.length !== 34) problems.push(`册子行数=${rows.length}，期望 34（booklet.ts 被改过？本件不跟）`);
  const seqs = rows.map((r) => r.seq).sort((a, b) => a - b);
  for (let i = 0; i < 34; i++) {
    if (seqs[i] !== i + 1) { problems.push(`seq 不连续：期望 ${i + 1}，实得 ${seqs[i] ?? '（缺）'}`); break; }
  }
  const stems = rows.map((r) => r.stem);
  const dupStem = stems.find((s, i) => stems.indexOf(s) !== i);
  if (dupStem) problems.push(`主体撞名：${dupStem}（清单唯一性门）`);
  const files = rows.map((r) => r.stem + '.html');
  const dupFile = files.find((s, i) => files.indexOf(s) !== i);
  if (dupFile) problems.push(`最终名撞名：${dupFile}（清单唯一性门）`);
  for (const r of rows) {
    if (!r.wake || !r.stem || !r.family || !r.kind) problems.push(`第 ${r.seq} 行缺字段：${JSON.stringify(r)}`);
    const key = KEY_BY_SCENE_KIND[r.sceneId + '|' + r.kind];
    if (!key) problems.push(`第 ${r.seq} 行无目标命令映射：${r.sceneId}／${r.kind}`);
  }
  // HELP 对齐：30 结果页的 sceneId＋wake 必须逐字出自 scenes/*.ts（读源码文本，不编译）。
  const helpPairs = readHelpPairs();
  for (const r of rows) {
    if (r.kind !== '结果页') continue;
    if (!helpPairs.has(r.sceneId + '::' + r.wake)) problems.push(`第 ${r.seq} 行与 HELP 对不上：${r.sceneId}／${r.wake}`);
  }
  if (helpPairs.size !== 30) problems.push(`HELP 场景数=${helpPairs.size}，期望 30（官方源被改过？）`);
  if (problems.length) die('清单门红：\n  ' + problems.join('\n  '));

  const manifestRows = rows.map((r) => ({
    seq: r.seq,
    family: r.family,
    kind: toKind(r.family, r.kind),
    wake: r.wake,
    title: r.stem,
    file: r.stem + '.html',
    key: KEY_BY_SCENE_KIND[r.sceneId + '|' + r.kind],
    check: r.check,
  }));
  const familyCounts = ['通用回执', '列表查询', '报告', '向导'].map((f) => {
    const n = manifestRows.filter((r) => r.family === f).length;
    return `${f}${n}`;
  }).join('／');
  const mf = {
    batch: 't856-备忘录验收形制',
    madeAt: new Date().toISOString().slice(0, 10),
    source: 'packages/skill-memo-ilife/src/help/booklet.ts（BOOKLET_ROWS 34 行；本清单为机械派生，file＝主体＋.html）',
    naming: '发布名＝清单 rows[].file（最终名，全仓只此一处算；墙／索引／链路表／机审名单都只读它）',
    ledger: 'docs/skills/skill-memo-ilife/t856-读数日志.json（每批读数版本化）',
    rowCount: 34,
    familyCounts,
    readings: {
      '格数': '34（30 结果页＋4 过程页）',
      '族分布': familyCounts,
      '口径提醒': '清单行内字样不做权威；权威为本段 readings＋盘上实测（#825 §六第 1 坑）',
      '预演说明': '本票为形制冻结＋生成器交付，产物内容归 8 张域票；收口 #834 在 34 格真产物上重跑，本批读数不代收口读数',
    },
    notShipped: [],
    rows: manifestRows,
  };
  if (!checkOnly) writeFileSync(OUT, JSON.stringify(mf, null, 2) + '\n', 'utf8');
  console.log(`清单${checkOnly ? '校验' : '已写'}：34 格（${familyCounts}）；唯一性通过；file 34 两两不同 -> 可发`);
}

main();
