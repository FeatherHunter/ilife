#!/usr/bin/env node
/**
 * 命名纪律审计（#859 规格 §一，规格单 `docs/skills/skill-home/naming-chain-precedent.md`）。
 *
 * 判什么：
 *   R1 事实源 `src/help/scenarios.yaml` 豁免——场景 id 的家就在那儿与机器附录里。
 *   R2 `src/**`（除事实源）、`test/**`、`scripts/**` 里不许出现场景 id：字母码（SM6-1 这类）
 *      与附录里那 70 个 id 字面量，一律不许作为运行期值、标识符或文件名位置出现。
 *      唯一例外＝注释行里的**溯源注**：同一行里 id 之前必须已有中文（先写中文场景名、再附码）。
 *   R3 70 行命令中文名两两不重（产物文件名主体就是它；重了即静默互盖）。
 *
 * 跑法（仓库根）：`node packages/skill-home/scripts/audit-naming.mjs`
 *   正例 exit 0 并打印「0 处」；有越界即 exit 1 并逐条点名（文件:行:文本 ← 命中的 id）。
 *   收口期可按写集分批：`--except src/express,src/stats` （逗号分隔的相对片段，命中即跳过该文件）。
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO = join(PKG, '..', '..');
const APPENDIX = join(REPO, 'docs', 'skills', 'skill-home', 'scene-pages-contract.appendix.json');
const YAML = join(PKG, 'src', 'help', 'scenarios.yaml');
const SELF = 'scripts/audit-naming.mjs';

const argv = process.argv.slice(2);
const exIdx = argv.indexOf('--except');
const except = exIdx >= 0 && argv[exIdx + 1] ? argv[exIdx + 1].split(',').map((s) => s.trim()).filter(Boolean) : [];

const appendix = JSON.parse(readFileSync(APPENDIX, 'utf8'));
const ids = appendix.scenarios.map((s) => s.id);
const LETTER_CODE = new RegExp('[A-Z]{2,}[0-9]+-[0-9]+', 'g');
const CJK = new RegExp('[\\u4e00-\\u9fff]');

const violations = [];
const skipped = [];
const walk = (dir) => {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) { walk(full); continue; }
    if (!/\.(ts|mjs|js)$/.test(name)) continue;
    if (full === YAML) continue;
    const rel = relative(PKG, full).replace(/\\/g, '/');
    if (rel === SELF) continue;
    if (except.some((e) => rel.includes(e))) { skipped.push(rel); continue; }
    readFileSync(full, 'utf8').split(/\r?\n/).forEach((line, i) => {
      const hits = [];
      for (const m of line.matchAll(LETTER_CODE)) hits.push([m.index, m[0]]);
      for (const id of ids) {
        const re = new RegExp('(?<![\\w-])' + id.replace(/-/g, '\\-') + '(?![\\w-])', 'g');
        for (const m of line.matchAll(re)) hits.push([m.index, m[0]]);
      }
      for (const [idx, text] of hits) {
        const trimmed = line.trim();
        const isComment = trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
        if (isComment && CJK.test(line.slice(0, idx))) continue; // 溯源注：先中文、再附码
        violations.push(rel + ':' + (i + 1) + ': ' + trimmed.slice(0, 110) + '  ← ' + text);
      }
    });
  }
};
for (const r of ['src', 'test', 'scripts']) walk(join(PKG, r));

// R3 命令中文名唯一（产物文件名的唯一性前提）
const cn = appendix.scenarios.map((s) => s.commandCn);
const dupCn = [...new Set(cn.filter((v, i) => cn.indexOf(v) !== i))];
if (dupCn.length > 0) violations.push('R3 命令中文名重了（产物会互盖）：' + dupCn.join('、'));

if (violations.length > 0) {
  console.log(`FAIL：命名纪律越界 ${violations.length} 处` + (skipped.length ? `（另按 --except 跳过 ${skipped.length} 件）` : ''));
  for (const v of violations) console.log('- ' + v);
  process.exit(1);
}
console.log(`PASS：命名纪律 0 处越界；命令中文名 70/70 唯一` + (skipped.length ? `；按 --except 跳过 ${skipped.length} 件` : '') + ' -> 可发');
