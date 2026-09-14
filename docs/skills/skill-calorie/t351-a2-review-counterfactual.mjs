/** 独立审查兵反事实实验 C：把「夹具本轮的两处改动」分别撤回，看 v3→v4 的 9 份差异
 *  是否**完全**由夹具改动解释（数据面），还是掺了表形改动。
 *
 *  做法：读被审脚本 v4 的**源码文本**，做定点字符串替换生成三个变体，各自跑进自己的目录；
 *  被审脚本本体一字不动（不写 `.scratch/t351-fix/`）。
 *  变体：cfA＝撤掉「补的那条动作」；cfB＝撤掉「改的那条动作名」；cfAB＝两处都撤。
 *  用法（建议持锁）：node .scratch/t351-a2/review/counterfactual.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, resolve } from 'node:path';

const SRC = 'docs/skills/skill-calorie/t351-a2-run-176-207-v4.mjs';
const orig = readFileSync(SRC, 'utf8');

/** 撤掉补的那条动作（a2 加的两行注释＋那一条对象） */
const ADDED = `      // 生产库真形状的边界（a2 加）：细化词里混着类型裸词 \`背 iso 主\`（与该行 type 同值）
      // ⇒ 副行须读作「背 主 · 孤立」，正文里不许出现 \`iso\` 裸词。
      { name: '宽距高位下拉', part: '背', type: 'iso', note: '背 iso 主 [W2 5reps×42.5kg, 15-20 RPM(3-4秒/次)]',
        sets: Array.from({ length: 5 }, () => ({ reps: 5, weight: 42.5, unit: 'kg' })) },
`;
/** 撤掉改的那条动作名（周五 上肢 首动作：悍马机卧推 ← 俯卧撑） */
const RENAMED = "{ name: '悍马机卧推', part: '胸', type: 'main', note: '胸整体";
const ORIGINAL = "{ name: '俯卧撑', part: '胸', type: 'main', note: '胸整体";

if (!orig.includes(ADDED)) throw new Error('CF: 补的那条动作定位失败（源码已变）');
if (!orig.includes(RENAMED)) throw new Error('CF: 改的那条动作名定位失败（源码已变）');

const variants = [
  ['cfA', orig.replace(ADDED, '')],
  ['cfB', orig.replace(RENAMED, ORIGINAL)],
  ['cfAB', orig.replace(ADDED, '').replace(RENAMED, ORIGINAL)],
];

const root = resolve('.scratch/t351-a2/review');
mkdirSync(root, { recursive: true });
for (const [name, text] of variants) {
  const f = join(root, name + '.mjs');
  writeFileSync(f, text, 'utf8');
  const out = join(root, 'out-' + name);
  const r = spawnSync(process.execPath, [f, '--out', out], { encoding: 'utf8', cwd: process.cwd() });
  const files = readdirSync(out).filter((x) => x.endsWith('.html')).length;
  const tail = String(r.stdout || '').split('\n').filter((l) => /RESULT|FAIL/.test(l)).slice(-3).join(' | ');
  console.log('CF_RUN ' + name + ' exit=' + r.status + ' 产物=' + files + ' :: ' + tail.slice(0, 300));
}
console.log('CF_DONE');
