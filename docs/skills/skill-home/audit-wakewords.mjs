#!/usr/bin/env node
/**
 * 唤醒词层「两向对账」复跑脚本（居家管家 · 场景页地图 #797 的证据件）。
 *
 * 它回答一个问题：**每一条唤醒词，到底有没有归宿？** 三个方向一起算：
 *   ① 有场景、路由表里没有   → 唤醒词打不到（期望只有联动那 3 条：已裁不做）
 *   ② 有路由、但没有场景     → 无规格（没有 prompt／type／页面归属，验收墙没有格）
 *   ③ yaml 写的变体、路由表不认 → 对外承诺与实现两头落空
 *
 * 口径：场景主词与变体都取自 HELP 内容资产 `packages/skill-home/src/help/scenarios.yaml`；
 * 路由表取自 `packages/skill-home/src/policy/wakewords.ts` 的 `WAKE_TABLE`。
 * **注意**：yaml 是 CRLF，按行解析时要用 `split(/\r?\n/)`——带 `$` 锚点的正则在 CRLF 下会静默零命中（本件第一版就栽在这里）。
 *
 * 跑法（仓库根）：`node docs/skills/skill-home/audit-wakewords.mjs`
 * 退出码：0 ＝ 三向都无意外（方向一仅联动 3 条、方向二与方向三为 0）；1 ＝ 有需要处置的词。
 */
import { readFileSync } from 'node:fs';

const YAML = 'packages/skill-home/src/help/scenarios.yaml';
const WAKES = 'packages/skill-home/src/policy/wakewords.ts';

const yaml = readFileSync(YAML, 'utf8');
const wakes = readFileSync(WAKES, 'utf8');

const sceneWords = new Map();
const variantWords = new Map();
let curScene = null;
let inVariants = false;
for (const line of yaml.split(/\r?\n/)) {
  const idm = line.match(/^- id: (\S+)/);
  if (idm) { curScene = idm[1]; inVariants = false; continue; }
  if (/^  variants:/.test(line)) { inVariants = true; continue; }
  if (/^  \S/.test(line) && !/^    /.test(line) && !/^  variants:/.test(line) && !/^  - /.test(line)) inVariants = false;
  const wm = line.match(/^  wake_word: (.+)$/);
  if (wm) for (const w of wm[1].split('/')) sceneWords.set(w.trim(), curScene);
  const pm = line.match(/^    phrase: (.+)$/);
  if (pm && inVariants) variantWords.set(pm[1].trim(), curScene);
}

const table = new Set();
for (const m of wakes.matchAll(/\{\s*phrase:\s*'([^']+)',\s*key:/g)) table.add(m[1]);

const sceneNoRoute = [...sceneWords.keys()].filter((w) => !table.has(w));
const routeNoScene = [...table].filter((w) => !sceneWords.has(w));
const variantsNoRoute = [...variantWords.keys()].filter((w) => !table.has(w));

console.log(`场景主唤醒词 ${sceneWords.size} 条 ／ 路由表 ${table.size} 条 ／ yaml 变体 ${variantWords.size} 条`);
console.log(`\n【方向一】有场景、路由表里没有 —— ${sceneNoRoute.length} 条（期望：只有联动 3 条）`);
for (const w of sceneNoRoute) console.log(`   ${w}   ← 场景 ${sceneWords.get(w)}`);
console.log(`\n【方向二】有路由、但没有场景（无规格） —— ${routeNoScene.length} 条`);
for (const w of routeNoScene) console.log(`   ${w}`);
console.log(`\n【方向三】yaml 变体没进路由表 —— ${variantsNoRoute.length} 条`);
for (const w of variantsNoRoute) console.log(`   ${w}   ← 场景 ${variantWords.get(w)}`);

const unexpected = sceneNoRoute.filter((w) => !/^联动|^记到/.test(w));
const ok = unexpected.length === 0 && routeNoScene.length === 0 && variantsNoRoute.length === 0;
console.log(`\n${ok ? 'PASS' : 'FAIL'}：方向一意外 ${unexpected.length} 条；方向二 ${routeNoScene.length} 条；方向三 ${variantsNoRoute.length} 条`);
process.exit(ok ? 0 : 1);
