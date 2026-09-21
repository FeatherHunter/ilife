#!/usr/bin/env node
/** #777 · 收口 A 批量驱动器：合并 7 份册子片段 → 落验收副本 → 写 manifest.json。
 *
 * 跑法（仓根）：
 *   node tooling/run-locked.mjs --ticket 777 -- node docs/skills/skill-chef/t777-run-all.mjs
 *     → 打印 `卡 48／复制 48／变体 4／HELP 1／缺失 0` 且 exit 0
 *
 * 只读 7 份册子片段（写集表：收口 A 只读片段，不重跑域票的写库）：
 *   t770/t771/t772/t773/t774/t775/t776-册子片段.json（共 48 行＝48 卡）。
 * 逐条真跑的事实发生在 7 张域票（各自副本库＋运行脚本＋证据件）；本驱动器逐条重验
 * （源文件存在＋复制＋bytes/sha256 重算＋产物含 </html> 标记），不复写任何副本库，
 * 不碰真库（全程不开 SQLite；隔离通道声明 CHANNEL-PENDING-#756，不抢 #756 的裁定）。
 *
 * 唯一真跑是 HELP：4 条 HELP 词复用一份验收副本 HELP 文件（t767-命名 §三.1），由本脚本
 * 经 dist 纯渲染产出（buildChefHelpFileData＋renderChefHelpHtml＋deliverChefHelp explicit
 * 落点，零 DB、全程不建库），不是复制旧文件。
 *
 * 验收副本布局（同一套 slug 规则，t767-命名 §二／§三，禁各算一套）：
 *   .scratch/t777/<域中文名>/<slug>.html            48 个 canonical（manifest 登记它们）
 *   .scratch/t777/<域中文名>/<slug>--<唤醒词>.html   4 个变体（参数不同的新表多出词，§三.2）
 *   .scratch/t777/HELP/私家大厨_HELP_验收副本.html   HELP 4 词复用这一份（§三.1）
 *   .scratch/t777/manifest.json                     48 格（同一份产物只记一格）
 *
 * t775 别名（该票内卡号非 canonical id，映射见 t775-历史域.md §1）：
 *   hist-1→record_cook、hist-2→view_history_list、hist-3→view_stats_dashboard、hist-4→view_stats_global
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DOCS = join(ROOT, 'docs', 'skills', 'skill-chef');
const BATCH = join(ROOT, '.scratch', 't777');
const MANIFEST = join(BATCH, 'manifest.json');
const LF = String.fromCharCode(10);

const FRAGS = ['t770', 't771', 't772', 't773', 't774', 't775', 't776'];
const HIST_ALIAS = {
  'hist-1': 'record_cook',
  'hist-2': 'view_history_list',
  'hist-3': 'view_stats_dashboard',
  'hist-4': 'view_stats_global',
};
// 参数不同的新表多出词 → 变体文件（宿主卡 canonical 内容复制，路径独立，t767-命名 §三.2）
const VARIANTS = [
  { word: '完成做菜', host: 'cooking_start_fresh' },
  { word: '查清单', host: 'shopping_generate' },
  { word: '清空清单', host: 'shopping_generate' },
  { word: '排除可选', host: 'shopping_generate' },
];

function fail(msg) {
  console.error(msg);
  process.exit(1);
}

// ── 读权威资产（唯一事实源，同 t767-对账.mjs 的正则口径） ──
const assetText = readFileSync(join(ROOT, 'packages', 'skill-chef', 'src', 'triggers', 'chef-scenes.ts'), 'utf8');
const domains = [...assetText.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*label:\s*'([^']+)'\s*,\s*icon:\s*'[^']*'\s*,\s*dir:\s*'([^']+)'\s*\}/g)]
  .map((m) => ({ id: m[1], label: m[2], dir: m[3] }));
const cards = [...assetText.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*group:\s*'([^']+)'\s*,\s*domain:\s*'([^']+)'\s*,\s*slug:\s*'([^']+)'\s*\}/g)]
  .map((m) => ({ id: m[1], group: m[2], domain: m[3], slug: m[4] }));
if (cards.length !== 48) fail('资产卡数应为 48，实测 ' + cards.length);
const dirOf = (domainId) => {
  const d = domains.find((x) => x.id === domainId);
  if (!d) fail('资产无此域：' + domainId);
  return d.dir;
};

// ── 读 7 份片段并归一（字段名三套：卡id/卡/card、唤醒词/wake、命令/command/key、参数/params、路径/产物绝对路径/file/path） ──
function normRow(r) {
  const rawId = r['卡id'] ?? r['卡'] ?? r.card;
  const id = HIST_ALIAS[rawId] ?? rawId;
  return {
    id,
    wake: r['唤醒词'] ?? r.wake,
    command: r['命令'] ?? r.command ?? r.key,
    params: r['参数'] ?? r.params,
    src: r['产物绝对路径'] ?? r.file ?? r.path,
  };
}
const byCard = new Map();
for (const t of FRAGS) {
  const p = join(DOCS, t + '-册子片段.json');
  if (!existsSync(p)) fail('片段缺失：' + p);
  let rows;
  try {
    rows = JSON.parse(readFileSync(p, 'utf8'));
  } catch (e) {
    fail('片段坏 JSON：' + p + '（' + String(e.message ?? e) + '）');
  }
  for (const r of rows) {
    const n = normRow(r);
    if (!n.id || !n.src) fail('片段行缺字段（' + t + '）：' + JSON.stringify(r).slice(0, 80));
    if (byCard.has(n.id)) fail('同一份产物记了两格：' + n.id + '（' + t + ' 与 ' + byCard.get(n.id).frag + '）');
    byCard.set(n.id, { ...n, frag: t });
  }
}
const missingCards = cards.map((c) => c.id).filter((id) => !byCard.has(id));
if (missingCards.length) fail('缺卡 ' + missingCards.length + '：' + missingCards.join('、'));
const extraCards = [...byCard.keys()].filter((id) => !cards.some((c) => c.id === id));
if (extraCards.length) fail('片段有多余卡（资产外）：' + extraCards.join('、'));

// ── 复制 canonical 产物并重验 ──
mkdirSync(BATCH, { recursive: true });
const entries = [];
for (const c of cards) {
  const row = byCard.get(c.id);
  if (!existsSync(row.src)) fail('源产物缺失（' + c.id + '，' + row.frag + '）：' + row.src);
  const dest = join(BATCH, dirOf(c.domain), c.slug + '.html');
  mkdirSync(join(BATCH, dirOf(c.domain)), { recursive: true });
  copyFileSync(row.src, dest);
  const html = readFileSync(dest, 'utf8');
  if (!html.includes('</html')) fail('产物缺 </html> 标记（空页嫌疑，' + c.id + '）：' + dest);
  const bytes = Buffer.byteLength(html, 'utf8');
  const sha256 = createHash('sha256').update(html, 'utf8').digest('hex');
  entries.push({
    卡id: c.id,
    组: c.group,
    域: c.domain,
    唤醒词: row.wake,
    命令: row.command,
    参数: row.params,
    产物绝对路径: dest,
    exit: 0,
    bytes,
    sha256,
    来源片段: row.frag,
  });
  console.log(c.id + ' → ' + dest);
}

// ── HELP 真跑（纯渲染＋explicit 落点，零 DB） ──
const D = (p) => pathToFileURL(join(ROOT, 'packages', 'skill-chef', 'dist', p)).href;
const helpFile = await import(D('help/helpFile.js'));
const helpOut = await import(D('help/output.js'));
const helpHtml = helpFile.renderChefHelpHtml(helpFile.buildChefHelpFileData(new Date()));
if (!helpHtml.includes('</html')) fail('HELP 渲染缺 </html> 标记');
const helpDest = join(BATCH, 'HELP', '私家大厨_HELP_验收副本.html');
mkdirSync(join(BATCH, 'HELP'), { recursive: true });
const receipt = helpOut.deliverChefHelp({ explicit: helpDest, html: helpHtml });
console.log('HELP → exit=0 → ' + receipt.path + '（' + receipt.bytes + ' B）');

// ── 变体文件（复制宿主 canonical 内容，路径独立） ──
for (const v of VARIANTS) {
  const host = entries.find((e) => e.卡id === v.host);
  if (!host) fail('变体宿主缺失：' + v.host);
  const hostCard = cards.find((c) => c.id === v.host);
  const dest = join(BATCH, dirOf(hostCard.domain), v.host + '--' + v.word + '.html');
  copyFileSync(host.产物绝对路径, dest);
  console.log('变体 ' + v.word + ' → ' + dest);
}

writeFileSync(MANIFEST, JSON.stringify(entries, null, 2) + LF, 'utf8');
console.log('卡 48／复制 48／变体 4／HELP 1／缺失 0');
