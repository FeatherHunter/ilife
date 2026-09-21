#!/usr/bin/env node
/**
 * 唤醒词层「两向对账」复跑脚本（居家管家 · 场景页地图 #797 的证据件）。
 *
 * 它回答一个问题：**每一条唤醒词，到底有没有归宿？** 四个方向一起算：
 *   ① 有场景、路由表里没有   → 唤醒词打不到（期望只有联动那 3 条：已裁不做）
 *   ② 有路由、但没有场景主词 → 按唤醒词层规格归宿：进表变体（yaml 标 route:true）
 *       ／技能级入口 3 词／待复裁兼容词 3 条（查物品(HTML)等，票 4 落默认 HTML 后复裁）
 *       ／已确认归宿 20 词（无争议并入 6＋单审确认 6＋借用写侧 4，见下 EXPECT_ROUTED）
 *   ③ yaml 标 route:true 的变体、路由表不认 → 对外承诺与实现两头落空（须为 0）
 *   ④ yaml 标 route:false 的变体、路由表却认 → 含指代的模糊词进了确定性路由（须为 0）
 *
 * 口径：场景主词与变体（含 route 标记）取自 HELP 内容资产
 * `packages/skill-home/src/help/scenarios.yaml`；路由表取自派生件
 * `packages/skill-home/src/policy/routes.generated.ts` 的 `ROUTES_GENERATED`
 * （#800 起 WAKE_TABLE 的记录面住生成件，读生成件即读同一张表）。
 * **注意**：yaml 是 CRLF，按行解析时要用 `split(/\r?\n/)`——带 `$` 锚点的正则在 CRLF 下会静默零命中（本件第一版就栽在这里）。
 *
 * 跑法（仓库根）：`node docs/skills/skill-home/audit-wakewords.mjs`
 * 退出码：0 ＝ 四向都无意外；1 ＝ 有需要处置的词。
 */
import { readFileSync } from 'node:fs';

const YAML = 'packages/skill-home/src/help/scenarios.yaml';
const ROUTES = 'packages/skill-home/src/policy/routes.generated.ts';

const yaml = readFileSync(YAML, 'utf8');
const gen = readFileSync(ROUTES, 'utf8');

const sceneWords = new Map();
const variantRouted = new Map();
const variantNonRouted = new Map();
// 变体项只认 direction→phrase→route 顺序（fail-closed：缺标记或乱序即抛，不静默）。
let curScene = null;
let inVariants = false;
let pending = null;
for (const line of yaml.split(/\r?\n/)) {
  const idm = line.match(/^- id: (\S+)/);
  if (idm) { curScene = idm[1]; inVariants = false; pending = null; continue; }
  if (/^  variants:/.test(line)) { inVariants = true; continue; }
  if (/^  \S/.test(line) && !/^    /.test(line) && !/^  variants:/.test(line) && !/^  - /.test(line)) {
    inVariants = false; pending = null;
  }
  const wm = !inVariants && /^  wake_word: (.+)$/.exec(line);
  if (wm) for (const w of wm[1].split('/')) sceneWords.set(w.trim(), curScene);
  const dm = inVariants && /^  - direction: (.+)$/.exec(line);
  if (dm) { pending = { phrase: null, route: null }; continue; }
  const pm = inVariants && pending && /^    phrase: (.+)$/.exec(line);
  if (pm) { pending.phrase = pm[1].trim(); continue; }
  const rm = inVariants && pending && /^    route: (true|false)$/.exec(line);
  if (rm) {
    if (!pending.phrase) throw new Error('变体项先有 route 后有 phrase（只认 direction→phrase→route 顺序）');
    (rm[1] === 'true' ? variantRouted : variantNonRouted).set(pending.phrase, curScene);
    pending = null;
  }
}
if (pending) throw new Error('变体项缺 route 标记：' + JSON.stringify(pending));

const table = new Set();
for (const m of gen.matchAll(/\{\s*phrase:\s*'((?:[^'\\]|\\.)*)',\s*key:/g)) {
  table.add(m[1].replace(/\\'/g, "'").replace(/\\\\/g, '\\'));
}

const sceneNoRoute = [...sceneWords.keys()].filter((w) => !table.has(w));
// 方向二已登记词：入口 3＋兼容待复裁 3＋无争议并入 6＋单审确认 6＋借用写侧 4。
const EXPECT_ROUTED = new Set([
  '居家管家 帮助', '居家管家帮助', '居家管家能做什么',
  '查物品(HTML)', '看物品(HTML)', '统物品(HTML)',
  '补物品', '减物品', '废物品', '借物品', '修物品', '盘物品', '盘全部',
  '查高频', '查低频', '看标签', '合标签', '推位置', '找位置', '改购物清单',
  '借出', '借入', '归还', '催还',
]);
const routeNoScene = [...table].filter((w) => !sceneWords.has(w));
const routeNoSceneUnexpected = routeNoScene.filter((w) => !variantRouted.has(w) && !EXPECT_ROUTED.has(w));
const variantsNoRoute = [...variantRouted.keys()].filter((w) => !table.has(w));
const nonRoutedInTable = [...variantNonRouted.keys()].filter((w) => table.has(w));

console.log(`场景主唤醒词 ${sceneWords.size} 条 ／ 路由表 ${table.size} 条 ／ yaml 变体 ${variantRouted.size + variantNonRouted.size} 条（进表 ${variantRouted.size}／非路由 ${variantNonRouted.size}）`);
console.log(`\n【方向一】有场景、路由表里没有 —— ${sceneNoRoute.length} 条（期望：只有联动 3 条）`);
for (const w of sceneNoRoute) console.log(`   ${w}   ← 场景 ${sceneWords.get(w)}`);
console.log(`\n【方向二】有路由、但没有场景主词 —— ${routeNoScene.length} 条（期望：进表变体 ${variantRouted.size}＋已登记 ${EXPECT_ROUTED.size}）`);
for (const w of routeNoScene) console.log(`   ${w}`);
console.log(`\n【方向三】route:true 变体没进路由表 —— ${variantsNoRoute.length} 条`);
for (const w of variantsNoRoute) console.log(`   ${w}   ← 场景 ${variantRouted.get(w)}`);
console.log(`\n【方向四】route:false 变体进了路由表 —— ${nonRoutedInTable.length} 条`);
for (const w of nonRoutedInTable) console.log(`   ${w}   ← 场景 ${variantNonRouted.get(w)}`);

const unexpected = sceneNoRoute.filter((w) => !/^联动|^记到/.test(w));
const ok = unexpected.length === 0 && routeNoSceneUnexpected.length === 0 && variantsNoRoute.length === 0 && nonRoutedInTable.length === 0;
console.log(`\n${ok ? 'PASS' : 'FAIL'}：方向一意外 ${unexpected.length} 条；方向二意外 ${routeNoSceneUnexpected.length} 条；方向三 ${variantsNoRoute.length} 条；方向四 ${nonRoutedInTable.length} 条`);
process.exit(ok ? 0 : 1);
