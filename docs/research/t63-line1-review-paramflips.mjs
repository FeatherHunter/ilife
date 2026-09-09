// #63 对抗式审查席 · 探针②：t81-route-evidence.mjs 的 paramFlips 真值（不跑该脚本）。
//
// 手法：把被审脚本里 FX-81-7 家族派生块（`const TODAY … function paramFlip`）**逐字取出**在本进程内 eval，
// 再按该脚本自己的谓词（twin／wizard／direct／override）复算 paramFlips，并与 dist 路由层真值对照。
// 只读、零 CLI spawn。
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { TRIGGERS } from '../../packages/skill-calorie/dist/triggers/index.js';
import { HELP_EXEC_OVERRIDES } from '../../packages/skill-calorie/dist/triggers/help-lookup.js';
import { EXEC_ROUTES, NEW_KEY_ROUTES, TWIN_WAKE_WORDS, WAKE_ROUTES } from '../../packages/skill-calorie/dist/triggers/routing.js';

const rel = (p) => fileURLToPath(new URL(p, new URL('../../', import.meta.url)));
const src = readFileSync(rel('docs/research/t81-route-evidence.mjs'), 'utf8');
const lines = src.split(/\r?\n/);
const start = lines.findIndex((l) => l.startsWith("const TODAY = '2026-09-07';"));
const end = lines.findIndex((l) => l.includes('FX-81-7 的两条非家族词'));
if (start < 0 || end < 0) throw new Error('未能定位 FX-81-7 块');
const block = lines.slice(start, end).join('\n');
const paramFlip = new Function(`${block}\nreturn paramFlip;`)();

const WIZARD = new Set(['定营养目标(自动算)', '定饮水目标(自动算)', '一键定全套目标', '批量导入食品', '校验批量导入']);
const TWIN = new Set(TWIN_WAKE_WORDS);
const PARAM_SPECIAL = new Set(['记体脂（皮褶钳）', '看目标预测达成']);
const frozenInternal = (t) => (typeof t.key === 'string' ? t.key : null);

let paramFlips = 0; let derivedNullButExec = [];
const rows = [];
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i];
  const t = TRIGGERS[i];
  const cli = t.main_prompt.cli;
  const isTwin = TWIN.has(r.wakeWord);
  const isWizard = WIZARD.has(r.wakeWord);
  const isDirect = cli.startsWith('calorie-cmd-read calorie.');
  const internal = frozenInternal(t);
  const isOverride = !!internal && !!HELP_EXEC_OVERRIDES[internal];
  const special = PARAM_SPECIAL.has(r.wakeWord);
  const derived = special ? true : (isTwin || isWizard || isDirect || isOverride ? null : paramFlip(cli));
  if (derived) paramFlips += 1;
  else if (!isTwin && !isWizard && !isDirect && !isOverride && r.kind === 'exec') derivedNullButExec.push(r.wakeWord);
  rows.push({ word: r.wakeWord, kind: r.kind, derived: !!derived, isTwin, isWizard, isDirect, isOverride, special });
}
console.log(`P2-1 被审脚本 paramFlips 真值（逐字取出其 paramFlip 复算）= ${paramFlips}（脚本断言 222）`);
console.log(`P2-2 脚本「家族未派生但路由层为 exec」真值 = ${derivedNullButExec.length}`);
console.log(`P2-3 未派生但 exec 的词：${derivedNullButExec.join('／')}`);
let direct = 0; let override = 0;
for (let i = 0; i < WAKE_ROUTES.length; i += 1) {
  const r = WAKE_ROUTES[i]; if (r.kind !== 'exec') continue;
  const t = TRIGGERS[i]; const internal = frozenInternal(t);
  if (r.cli === t.main_prompt.cli) direct += 1;
  else if (internal && HELP_EXEC_OVERRIDES[internal] === r.cli) override += 1;
}
const twinFlips = WAKE_ROUTES.filter((r) => TWIN.has(r.wakeWord)).length;
console.log(`P2-4 分解真值：direct=${direct} + override=${override} + twinFlips=${twinFlips} + paramFlips=${paramFlips} = ${direct + override + twinFlips + paramFlips} vs EXEC_ROUTES.length=${EXEC_ROUTES.length}（差 ${EXEC_ROUTES.length - (direct + override + twinFlips + paramFlips)}）`);
console.log(`P2-5 快照 exec 记录面：EXEC_ROUTES ${EXEC_ROUTES.length} + NEW_KEY_ROUTES ${NEW_KEY_ROUTES.length} + COVERAGE_REPAIR 1 = ${EXEC_ROUTES.length + NEW_KEY_ROUTES.length + 1}（测试断言 398）`);
