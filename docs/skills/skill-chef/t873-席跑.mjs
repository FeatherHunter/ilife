#!/usr/bin/env node
/** #873 席位驱动器（subagent 席自证用）：跑本域的产物驱动器 → 按域切出自己那几页 →
 *  出双端首屏图（390×820／1280×860，＝终审器具的判读面）→ 跑机器质量门。
 *
 * 为什么另出一件：收口 A 的批量驱动器（`t777-run-all.mjs`）写死 `.scratch/t777`，多席并行会撞写集；
 * 本件**只碰 `t873-` 开头的席位目录**（一席一族，互不重叠），产物来源与命名规则逐字照抄收口 A
 * （`t777-run-all.mjs` 的卡片归一 ＋ `t767-命名` 的 slug 规则），不另立一套。
 *
 * 用法（仓根；**须在锁内跑**，它会重出产物与册子片段）：
 *   node tooling/run-locked.mjs --ticket 873 -- node docs/skills/skill-chef/t873-席跑.mjs <域中文名>
 *   node tooling/run-locked.mjs --ticket 873 -- node docs/skills/skill-chef/t873-席跑.mjs <域中文名> --keep-shot
 *
 * 域中文名（＝产物目录名，逐字）：做菜／查看／搜索筛选／修改／历史／采购／录入／派生／开始使用／数据管理
 * 落点：`.scratch/t873-<域>/`（`<域>/*.html` ＋ `manifest.json` ＋ `shots/`）
 * 退出码：0 全绿；1 产物缺件／质量门红；2 用法错。
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = resolve(import.meta.dirname, '..', '..', '..');
const DOCS = join(ROOT, 'docs', 'skills', 'skill-chef');
const LF = String.fromCharCode(10);

/** 域中文名 → 该域的产物驱动器（一域一驱动；小域四张共用 `t776`）。 */
const DRIVER = {
  做菜: 't772-run-cooking.mjs',
  查看: 't770-run-view.mjs',
  搜索筛选: 't771-run-search.mjs',
  修改: 't774-run-update.mjs',
  历史: 't775-run-history.mjs',
  采购: 't776-run-small-domains.mjs',
  录入: 't773-run-add.mjs',
  派生: 't776-run-small-domains.mjs',
  开始使用: 't776-run-small-domains.mjs',
  数据管理: 't776-run-small-domains.mjs',
};
/** 该域要读的册子片段（本域驱动跑完即是最新）。 */
const FRAG = {
  做菜: ['t772'], 查看: ['t770'], 搜索筛选: ['t771'], 修改: ['t774'], 历史: ['t775'],
  录入: ['t773'], 采购: ['t776'], 派生: ['t776'], 开始使用: ['t776'], 数据管理: ['t776'],
};
/** `t775` 票内卡号非 canonical id，映射见 `t777-run-all.mjs` 头注。 */
const HIST_ALIAS = { 'hist-1': 'record_cook', 'hist-2': 'view_history_list', 'hist-3': 'view_stats_dashboard', 'hist-4': 'view_stats_global' };

const argv = process.argv.slice(2);
const domain = argv.find((a) => !a.startsWith('--') && a !== '873');
if (domain === undefined || DRIVER[domain] === undefined) {
  console.error('用法：node docs/skills/skill-chef/t873-席跑.mjs <域中文名>；域＝' + Object.keys(DRIVER).join('／'));
  process.exit(2);
}

function fail(msg) { console.error(msg); process.exit(1); }

// ── ① 跑本域产物驱动器（它写自己的 `.scratch/t77X` 与册子片段） ──
const driver = DRIVER[domain];
console.log('=== 跑驱动器 ' + driver);
const r = spawnSync(process.execPath, [join(DOCS, driver)], { cwd: ROOT, stdio: 'inherit' });
if (r.status !== 0) fail('驱动器非 0 退出（' + driver + '）：' + r.status);

// ── ② 读权威资产（同 `t777-run-all.mjs` 的正则口径） ──
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

// ── ③ 归一册子片段（字段名三套，同收口 A） ──
const byCard = new Map();
for (const t of FRAG[domain]) {
  const p = join(DOCS, t + '-册子片段.json');
  if (!existsSync(p)) fail('片段缺失：' + p);
  for (const row of JSON.parse(readFileSync(p, 'utf8'))) {
    const rawId = row['卡id'] ?? row['卡'] ?? row.card;
    const id = HIST_ALIAS[rawId] ?? rawId;
    const src = row['产物绝对路径'] ?? row.file ?? row.path;
    if (!id || !src) fail('片段行缺字段（' + t + '）：' + JSON.stringify(row).slice(0, 80));
    byCard.set(id, { id, wake: row['唤醒词'] ?? row.wake, src });
  }
}

// ── ④ 切本域那几页，复制进席位目录，写席位 manifest ──
const mine = cards.filter((c) => dirOf(c.domain) === domain);
if (mine.length === 0) fail('该域没有卡：' + domain);
const SEAT = join(ROOT, '.scratch', 't873-' + domain);
mkdirSync(join(SEAT, domain), { recursive: true });
const entries = [];
for (const c of mine) {
  const row = byCard.get(c.id);
  if (row === undefined) fail('本域卡不在片段里：' + c.id);
  if (!existsSync(row.src)) fail('源产物缺失（' + c.id + '）：' + row.src);
  const dest = join(SEAT, domain, c.slug + '.html');
  copyFileSync(row.src, dest);
  const html = readFileSync(dest, 'utf8');
  if (!html.includes('</html')) fail('产物缺 </html> 标记（空页嫌疑，' + c.id + '）：' + dest);
  entries.push({
    卡id: c.id, 组: c.group, 域: c.domain, 唤醒词: row.wake,
    产物绝对路径: dest, bytes: Buffer.byteLength(html, 'utf8'),
    sha256: createHash('sha256').update(html, 'utf8').digest('hex'),
  });
}
writeFileSync(join(SEAT, 'manifest.json'), JSON.stringify(entries, null, 2) + LF, 'utf8');
console.log('=== 本域产物 ' + entries.length + ' 件 -> ' + SEAT);
for (const e of entries) console.log('  ' + e.卡id + ' → ' + e.产物绝对路径);

// ── ⑤ 双端首屏图（判读面：与墙格同尺寸） ──
const shot = spawnSync(process.execPath, [join(DOCS, 't778-截图.mjs'), SEAT, join(SEAT, 'shots'), '--viewport-only'], { cwd: ROOT, stdio: 'inherit' });
if (shot.status !== 0) { console.error('截图器非 0 退出（状态 ' + shot.status + '）——视觉复评前须先解决'); process.exit(1); }

// ── ⑥ 机器质量门（六列；`--widths` 与终审器具同两档） ──
const gate = spawnSync(process.execPath, [join(DOCS, 't768-质量门.mjs'), join(SEAT, domain), '--widths', '390,1280', '--json', join(SEAT, '质量门.json')], { cwd: ROOT, stdio: 'inherit' });
const gateOk = gate.status === 0;
console.log('=== 质量门 exit=' + gate.status + '（读数 ' + join(SEAT, '质量门.json') + '）');
console.log('SEAT-OK ' + domain + ' 卡 ' + entries.length + '；质量门 ' + (gateOk ? '全绿' : '有红，逐列见 质量门.json'));
process.exit(gateOk ? 0 : 1);
