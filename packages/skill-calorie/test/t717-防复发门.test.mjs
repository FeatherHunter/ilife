/** #717 批⑤ · 防复发门：**测试件去拉既有的结构门**（这是本包里唯一合法且真会跑的自动执行口）。
 *
 * **为什么这样搭**：`scripts/check-*.mjs` 那几道门**都不在 `package.json` 的 script 里、也没有测试件拉它们**，
 * 只能靠人记得手工跑；所以「立一道门」在这包里等于立一件没人拉的死代码。真正的机器门 =
 * **测试件 ＋ 既有门脚本**：本件跑 `--test` 时自动把门拉起来，红了就是包测试红了。
 *
 * **门的规矩**（正本在 `scripts/check-one-path.mjs` 件头，本件只跑它、不另立一套）：
 *   ① 同一符号不许有两条 `dist` 路径（#702 立）；
 *   ② 定义地闭集账（#717 批⑤ 加）：台账里每一项「数值只许出现在这些文件」，
 *      例外**从源码派生**——文件里写着 `export { X } from './件.js'` 的薄转出即豁免（不认手写清单）。
 *
 * 跑法：`node --test packages/skill-calorie/test/t717-防复发门.test.mjs`
 */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');
const SCRIPT = join(PKG, 'scripts', 'check-one-path.mjs');

const { judge, judgeDefinitionSites, DEFINITION_SITES } = await import(
  new URL('../scripts/check-one-path.mjs', import.meta.url).href);

test('#717 批⑤ 结构门：同一符号一条路径 ＋ 定义地闭集账，当刻全绿', () => {
  const onePath = judge(PKG);
  const defSites = judgeDefinitionSites(PKG);
  console.log('READING #717 批⑤ 一条路径红=' + onePath.map((r) => r.symbol).join('、')
    + ' ｜ 定义地台账=' + DEFINITION_SITES.map((d) => d.name).join('／')
    + ' ｜ 跑出账外的=' + defSites.map((d) => d.name + '@' + d.file + ':' + d.line).join('、'));
  assert.deepEqual(onePath.map((r) => r.symbol), [], '同一符号出现在两条 dist 路径上：' + JSON.stringify(onePath.map((r) => r.symbol)));
  assert.deepEqual(defSites.map((r) => r.name + '@' + r.file + ':' + r.line), [],
    '定义地跑到台账外（数值被抄到了别处）：' + JSON.stringify(defSites));
});

test('#717 批⑤ 门真在守东西：门脚本自证 5/5 ＋ 端到端一条真红', () => {
  /* ① 门自己的五条自证（含批⑤ 新加的两条：出账必红／薄转出豁免） */
  const st = spawnSync(process.execPath, [SCRIPT, '--selftest'], { encoding: 'utf8' });
  assert.equal(st.status, 0, '门自证没过：' + String(st.stdout).slice(-400) + String(st.stderr).slice(-400));
  assert.match(String(st.stdout), /RESULT: 5\/5/, '门自证不是 5/5：' + String(st.stdout).slice(-200));
  assert.match(String(st.stdout), /SELFTEST: PASS/, '门自证末行不是 PASS');

  /* ② 端到端：往一棵假包里塞一份抄来的区间数 ⇒ **真跑门脚本**（`--root` 指假包）必须非 0 退出并逐行点名 */
  const dir = mkdtempSync(join(tmpdir(), 't717-gate-e2e-'));
  try {
    mkdirSync(join(dir, 'src', 'shared'), { recursive: true });
    mkdirSync(join(dir, 'test'), { recursive: true });
    writeFileSync(join(dir, 'src', 'shared', 'nutritionRange.ts'), "export const NUTRITION_RANGE = { protein: { min: 10, max: 20 } };\n");
    writeFileSync(join(dir, 'src', 'rogue.ts'), "export const R = { protein: { min: 10, max: 20 } };\n");
    const out = spawnSync(process.execPath, [SCRIPT, '--root', dir], { encoding: 'utf8' });
    const text = String(out.stdout) + String(out.stderr);
    console.log('READING #717 批⑤ 端到端 exit=' + out.status + ' ｜ ' + (text.match(/RED   [^\n]*/) ?? ['（没点名）'])[0]);
    assert.equal(out.status, 1, '抄来的区间数没被门抓到：' + text.slice(-300));
    assert.match(text, /RED {3}营养素推荐区间[^\n]*src\/rogue\.ts:1/, '门没点名那个文件与行号：' + text.slice(-300));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
