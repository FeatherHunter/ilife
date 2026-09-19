#!/usr/bin/env node
/** t725 · `assembleDocPage` 改前／改后**穷举等价**（本票判据 1 在卡路里侧的正面读数之一）。
 *
 * 它做什么：把改前那一份 `src/shared/docPage.ts`（从指定 commit 取）落成包内临时副本（Node 24 直接剥类型跑），
 *   与**当刻 dist** 的那一份对照，逐例比整页 sha256 —— 入参取**全部字段的组合**（近九千例），
 *   盖住真出口读数盖不到的分支（`printable`／`pageUi`／`charts`／A线／B线／眉标筛除…）。
 *
 * 用法（仓根，先 `pnpm build` 或 `tsc -b packages/skill-calorie`）：
 *   node docs/base/base-render/t725-equivalence.mjs --old <改前那个 commit 或 ref>
 * 例：`node docs/base/base-render/t725-equivalence.mjs --old 9b0b9be8`
 *
 * 退出码：0 ＝ 逐例逐字节相同；1 ＝ 有差异（逐条打第一处差异的样例）。
 * 说明：这是**对照读数**、不是交付面门禁（生产不走「直调内部件」这条缝）；件里临时副本用完即删。
 */
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..');
const SRC_REL = 'packages/skill-calorie/src/shared/docPage.ts';
const TMP_REL = 'packages/skill-calorie/.t725-oldDocPage.ts';
const NEW_REL = 'packages/skill-calorie/dist/shared/docPage.js';

const argv = process.argv.slice(2);
const oldRef = argv[argv.indexOf('--old') + 1];
if (!oldRef || oldRef.startsWith('--')) {
  console.error('缺 `--old <改前那个 commit 或 ref>`：改前那一份从版本库取，别拿当刻工作区顶替。');
  process.exit(2);
}

const tmpAbs = join(ROOT, TMP_REL);
const oldSource = execFileSync('git', ['show', `${oldRef}:${SRC_REL}`], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
writeFileSync(tmpAbs, oldSource, 'utf8');

const CONTENT = '<section id="sec-x"><p>正文样例 &amp; 转义</p></section>';
const BASE = { docTitle: '卡路里·样例', title: '标题样例', content: CONTENT };
const AXES = {
  metaLeft: [undefined, '', '窗口 7 天', 'calorie.view.diet'],
  badge: [undefined, '', '整体趋势'],
  summary: [undefined, '', '一句话结论'],
  eyebrow: ['', '饮食域', 'calorie.view.diet'],
  subtitle: [null, '', '副标题'],
  charts: [undefined, false, true],
  printable: [undefined, false, true],
  pageUi: [undefined, false, true],
};

const sha = (s) => createHash('sha256').update(s, 'utf8').digest('hex');

try {
  if (!existsSync(join(ROOT, NEW_REL))) throw new Error(`dist 缺 ${NEW_REL}：先编译 skill-calorie`);
  const oldMod = await import(pathToFileURL(tmpAbs).href);
  const newMod = await import(pathToFileURL(join(ROOT, NEW_REL)).href);

  let inputs = [{}];
  for (const k of Object.keys(AXES)) {
    const next = [];
    for (const cur of inputs) for (const v of AXES[k]) next.push({ ...cur, [k]: v });
    inputs = next;
  }

  let same = 0;
  const diff = [];
  for (const [i, input] of inputs.entries()) {
    const full = { ...BASE, ...input };
    const a = oldMod.assembleDocPage(full);
    const b = newMod.assembleDocPage(full);
    if (a === b) same++;
    else if (diff.length < 5) {
      const shown = Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined));
      diff.push(`#${i} ${JSON.stringify(shown)} old=${sha(a).slice(0, 16)}(${Buffer.byteLength(a)}) new=${sha(b).slice(0, 16)}(${Buffer.byteLength(b)})`);
    }
  }
  console.log(`OLD=${oldRef}:${SRC_REL}`);
  console.log(`EQUIV: 相同=${same} 不同=${diff.length > 0 ? '≥' + diff.length : 0} 共=${inputs.length}`);
  for (const d of diff) console.log('DIFF ' + d);
  console.log(same === inputs.length ? 'RESULT: PASS 穷举逐字节相同' : 'RESULT: FAIL');
  process.exitCode = same === inputs.length ? 0 : 1;
} finally {
  if (existsSync(tmpAbs)) rmSync(tmpAbs, { force: true });
}
