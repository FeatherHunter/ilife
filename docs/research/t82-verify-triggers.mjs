#!/usr/bin/env node
/**
 * #82 触发词核实探针（只读，不写仓库任何受跟踪文件）。
 *
 * 做三件事：
 *   1) 从旧基线 frontmatter（只读对照）逐字抽出 `触发词:` 列表，计数；
 *   2) 从新 SoT（packages/skill-calorie/src/triggers/scene-*.ts 的 wake_word）抽全量词集；
 *   3) 从路由层（routing.ts 的 wakeWord/kind）抽 exec／non-exec 分类；
 * 逐条对账旧 69 项：在新 SoT 是否存在、路由是否命中、exec 还是 non-exec。
 *
 * 输出：.scratch/t82/verify-triggers.json ＋ 机读摘要行 `RESULT: n/m`。
 */
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OLD_SKILL = 'D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\SKILL.md';
const TRIG_DIR = join(ROOT, 'packages', 'skill-calorie', 'src', 'triggers');

// ---------- 1) 旧 frontmatter 触发词 ----------
const oldText = readFileSync(OLD_SKILL, 'utf8').replace(/\r\n/g, '\n');
const oldLines = oldText.split('\n');
const fmEnd = oldLines.indexOf('---', 1);
const fm = oldLines.slice(1, fmEnd).join('\n');
const m = /触发词[:：]\s*([^\n]+)/.exec(fm);
if (!m) throw new Error('旧 frontmatter 未找到触发词行');
const oldTriggers = m[1].split('、').map((s) => s.trim()).filter(Boolean);
// 旧正文另注册的词（L5「说「卡路里HELP」打开完整能力速查台」）
const bodyHelp = /说「([^」]+)」打开完整能力速查台/.exec(oldText);
const oldExtra = bodyHelp ? [bodyHelp[1]] : [];

// ---------- 2) 新 SoT 全量词 ----------
const sot = new Map(); // wake_word -> [file]
for (const f of readdirSync(TRIG_DIR).filter((x) => /^scene-\d\d-.*\.ts$/.test(x)).sort()) {
  const text = readFileSync(join(TRIG_DIR, f), 'utf8');
  for (const hit of text.matchAll(/"wake_word":\s*"((?:[^"\\]|\\.)*)"/g)) {
    const w = JSON.parse('"' + hit[1] + '"');
    if (!sot.has(w)) sot.set(w, []);
    sot.get(w).push(f);
  }
}

// ---------- 3) 路由层分类 ----------
const routing = readFileSync(join(TRIG_DIR, 'routing.ts'), 'utf8');
const routes = new Map(); // wakeWord -> Set(kind)
for (const line of routing.split('\n')) {
  const w = /wakeWord:\s*'((?:[^'\\]|\\.)*)'/.exec(line);
  if (!w) continue;
  const k = /kind:\s*'(exec|non-exec)'/.exec(line);
  if (!k) continue;
  const word = w[1];
  if (!routes.has(word)) routes.set(word, new Set());
  routes.get(word).add(k[1]);
}

// ---------- 对账 ----------
const rows = oldTriggers.map((w, i) => {
  const inSot = sot.has(w);
  const kinds = routes.get(w);
  return {
    no: i + 1,
    word: w,
    inSot,
    sotScene: inSot ? [...new Set(sot.get(w))] : [],
    routed: !!kinds,
    kinds: kinds ? [...kinds].sort() : [],
    verdict: !inSot ? 'SOT-MISSING' : !kinds ? 'NOT-ROUTED' : [...kinds].includes('exec') ? 'exec' : 'non-exec',
  };
});
const helpRow = { word: oldExtra[0] ?? '(未解析)', inSot: sot.has(oldExtra[0] ?? ''), routed: routes.has(oldExtra[0] ?? '') };

const byVerdict = rows.reduce((a, r) => ((a[r.verdict] = (a[r.verdict] || 0) + 1), a), {});
const out = {
  oldFrontmatterCount: oldTriggers.length,
  oldBodyExtra: oldExtra,
  newSotCount: sot.size,
  routingWakeWords: routes.size,
  byVerdict,
  helpCenterWord: helpRow,
  rows,
};
writeFileSync(join(ROOT, '.scratch', 't82', 'verify-triggers.json'), JSON.stringify(out, null, 1), 'utf8');

console.log('旧 frontmatter 触发词数：' + oldTriggers.length);
console.log('旧正文另注册：' + JSON.stringify(oldExtra));
console.log('新 SoT 词数：' + sot.size + '／路由层词数：' + routes.size);
console.log('判定分布：' + JSON.stringify(byVerdict));
for (const r of rows) {
  if (r.verdict !== 'exec') console.log('  ' + r.verdict + '  ' + r.no + ' ' + r.word + '  kinds=' + JSON.stringify(r.kinds));
}
console.log('卡路里HELP：inSot=' + helpRow.inSot + ' routed=' + helpRow.routed);
const okCount = rows.filter((r) => r.inSot).length;
console.log('RESULT: ' + okCount + '/' + rows.length);
