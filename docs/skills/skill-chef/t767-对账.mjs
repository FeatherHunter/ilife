#!/usr/bin/env node
/** #767 · 对账脚本：50 词 ↔48 卡 ↔命令 ↔域，双向对账＋slug 唯一。
 *
 * 跑法：
 *   node docs/skills/skill-chef/t767-对账.mjs              # 打印读数，不一致 exit 1 并点名
 *
 * 读三处（全程只读）：
 *   ① `packages/skill-chef/src/triggers/chef-scenes.ts`（本票资产，50 词／48 卡／slug 的唯一事实源）；
 *   ② `packages/skill-chef/src/policy/wakewords.ts` 的 `WAKE_TABLE`（37 条路由表）；
 *   ③ `packages/skill-chef/src/help/sceneData.ts`（48 卡 HELP 资产，核对卡 id 集合）。
 *
 * 判据：
 *   词数＝资产 WAKES 行数（应 50）／卡数＝资产 CARDS 行数（应 48）；
 *   差集＝可路由词缺表＋表词缺并集＋命令对不上＋业务词无卡＋卡无词＋卡不在 HELP＋HELP 卡不在资产，任一即红；
 *   slug 冲突＝卡 slug 去重后的缺口数（应 0）。
 * 变异自证（必跑，见对账表.md §证据）：
 *   从 WAKE_TABLE 删一条 → 差集 1 并点名；改回即绿。
 *   给两张卡同一个 slug（改生成物） → slug 冲突 1 并点名。
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..', '..');
const ASSET = join(ROOT, 'packages', 'skill-chef', 'src', 'triggers', 'chef-scenes.ts');
const WAKE_SRC = join(ROOT, 'packages', 'skill-chef', 'src', 'policy', 'wakewords.ts');
const SCENE_SRC = join(ROOT, 'packages', 'skill-chef', 'src', 'help', 'sceneData.ts');

const assetText = readFileSync(ASSET, 'utf8');
const wakeText = readFileSync(WAKE_SRC, 'utf8');
const sceneText = readFileSync(SCENE_SRC, 'utf8');

const wakes = [...assetText.matchAll(/\{\s*phrase:\s*'([^']+)'\s*,\s*source:\s*'([^']+)'\s*,\s*routable:\s*(true|false)\s*,\s*key:\s*'([^']+)'\s*,\s*group:\s*'([^']*)'\s*,\s*cards:\s*\[([^\]]*)\]/g)]
  .map((m) => ({ phrase: m[1], source: m[2], routable: m[3] === 'true', key: m[4], group: m[5], cards: [...m[6].matchAll(/'([^']+)'/g)].map((x) => x[1]) }));
const cards = [...assetText.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*group:\s*'([^']+)'\s*,\s*domain:\s*'([^']+)'\s*,\s*slug:\s*'([^']+)'\s*\}/g)]
  .map((m) => ({ id: m[1], group: m[2], domain: m[3], slug: m[4] }));
const tableRows = [...wakeText.matchAll(/\{ phrase: '([^']+)', key: '([^']+)'/g)].map((m) => ({ phrase: m[1], key: m[2] }));
const tablePhrases = tableRows.map((r) => r.phrase);
const sceneIds = [...sceneText.matchAll(/\{\s*id:\s*'([^']+)'\s*,\s*title:/g)].map((m) => m[1]);

const wordCount = wakes.length;
const cardCount = cards.length;
const problems = [];

const routableMissing = wakes.filter((w) => w.routable && !tablePhrases.includes(w.phrase));
for (const w of routableMissing) problems.push('可路由词缺表：' + w.phrase);
const tableExtra = tableRows.filter((r) => !wakes.some((w) => w.phrase === r.phrase));
for (const r of tableExtra) problems.push('表词缺并集：' + r.phrase);
for (const w of wakes.filter((x) => x.routable)) {
  const hit = tableRows.find((r) => r.phrase === w.phrase);
  if (hit && hit.key !== w.key) problems.push('命令对不上：' + w.phrase + ' 表内 ' + hit.key + ' ≠ 资产 ' + w.key);
}
for (const w of wakes.filter((x) => x.source !== 'help' && x.cards.length === 0)) problems.push('业务词无卡：' + w.phrase);
const cardIds = cards.map((c) => c.id);
for (const c of cards) {
  if (!wakes.some((w) => w.cards.includes(c.id))) problems.push('卡无词：' + c.id);
}
for (const c of cards) {
  if (!sceneIds.includes(c.id)) problems.push('卡不在 HELP：' + c.id);
}
for (const id of sceneIds) {
  if (!cardIds.includes(id)) problems.push('HELP 卡不在资产：' + id);
}
const diff = problems.length;

const seen = new Map();
const slugProblems = [];
for (const c of cards) {
  if (seen.has(c.slug)) slugProblems.push('slug 冲突：' + c.slug + '（' + seen.get(c.slug) + '／' + c.id + '）');
  else seen.set(c.slug, c.id);
}
const slugConflicts = cards.length - seen.size;

console.log('词 ' + wordCount + '／卡 ' + cardCount + '／差集 ' + diff + '／slug 冲突 ' + slugConflicts);
if (wordCount !== 50) console.error('词数应为 50，实测 ' + wordCount);
if (cardCount !== 48) console.error('卡数应为 48，实测 ' + cardCount);
for (const p of problems) console.error('差集：' + p);
for (const p of slugProblems) console.error(p);
if (diff !== 0 || slugConflicts !== 0 || wordCount !== 50 || cardCount !== 48) process.exit(1);
console.log('OK：50 词 ↔48 卡双向对账通过，slug 全唯一');
