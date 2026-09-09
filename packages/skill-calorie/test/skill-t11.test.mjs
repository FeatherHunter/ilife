/** T11 #30 追加 · SKILL.md + templates 验收（照 M6 范式）：技能说明/唯一出口/envelope/HELP 现找（含 T10 照片模块）。
 * 模板 6 件经 dist 侧 loader 装载（#95）+ HELP 构建期注入可复现 + 照片 exec 逐条可 import。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';
import { buildPhotoHelp, CALORIE_TEMPLATES, loadTemplate, CalorieRenderError } from '../dist/render/index.js';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

describe('calorie SKILL 与模板（M6 范式）', () => {
  it('SKILL 含说明/唯一出口/envelope/HELP/环境', () => {
    assert.match(skill, /卡路里/);
    assert.match(skill, /calorie-cmd-read/);
    assert.match(skill, /envelope 全字段/);
    assert.match(skill, /HELP 现找/);
    assert.match(skill, /身材照片 HELP 模块/);
    assert.match(skill, /SKILLS_DB_PATH/);
    assert.match(skill, /出 scope/);
    assert.ok(skill.includes(START) && skill.includes(END));
    assert.ok(skill.split('\n').length >= 70);
  });
  it('M6 Wizard Verify 铁则正文（#98）在 AUTO 块外，含前置/映射/不可写/违规口径', () => {
    assert.match(skill, /Wizard Verify 铁则/);
    const m6 = skill.indexOf('## Wizard Verify 铁则');
    assert.ok(m6 > 0, '缺 M6 章节标题');
    assert.ok(m6 < skill.indexOf(START), 'M6 章节必须在 AUTO 块之外（块内会被 build-help 重写）');
    for (const s of ['记体脂（皮褶钳）', 'body_composition_wizard.html', 'body_measurements_wizard.html', 'plan_builder_wizard.html', '当前不可写', '不豁免', '协议 fail mode']) {
      assert.ok(skill.includes(s), 'M6 正文缺：' + s);
    }
  });
  it('互联区新鲜（构建期注入可复现，99 键全对齐 combos（#113 +8／#86 +4））', () => {
    const si = skill.indexOf(START), ei = skill.indexOf(END);
    assert.equal(skill.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.equal(Object.keys(CALORIE_COMBOS).length, 99);
    for (const k of Object.keys(CALORIE_COMBOS)) assert.ok(skill.includes(k), '缺键 ' + k);
  });
  it('模板 6 件经 loader 装载（#95：dist/render 上溯两级取包根 templates/）', () => {
    const files = readdirSync(join(pkgDir, 'templates')).filter((f) => f.endsWith('.html')).sort();
    assert.deepEqual(files, ['diet.html', 'exercise.html', 'goal.html', 'help.html', 'home.html', 'photo-gallery.html']);
    // 清单与磁盘双向对齐：加模板只改文件不登记 → 红。
    assert.deepEqual([...CALORIE_TEMPLATES].sort(), files.map((f) => f.replace(/\.html$/, '')).sort());
    for (const f of files) {
      const t = loadTemplate(f.replace(/\.html$/, ''));
      assert.match(t, /calorie-cmd-read/);
      assert.equal(t.split('<!--SHARED-CSS-->').length - 1, 1, f + ' CSS 标记');
      assert.equal(t.split('<!--SHARED-HELPERS-->').length - 1, 1, f + ' HELPERS 标记');
    }
  });
  it('loader 未知模板大声失败（不返空）', () => {
    assert.throws(() => loadTemplate('no-such-template'), (e) => e instanceof CalorieRenderError && e.code === 'bad-input');
  });
  // #95 F7：`missing-data` 分支此前零守卫——变异（catch → return ''）后 build／skill-t11／G3 三绿。
  // 用「安装布局副本」造缺件场景：只复制 dist 侧装载器（不复制 templates/），装载必抛 missing-data；
  // 不碰仓库内真实模板文件（并发安全），rmSync 受守卫约束（协议 §2.1③）。
  it('loader 缺文件抛 missing-data（不返空）', async () => {
    const tmpRoot = tmpdir();
    const tmp = mkdtempSync(join(tmpRoot, 'ilife-t95-missing-'));
    const guard = (p) => {
      const abs = resolve(p);
      if (!abs.startsWith(resolve(tmpRoot) + sep) || abs === resolve(tmpRoot)) throw new Error('守卫拒绝删除：' + abs);
      if (/[\\/](node_modules|packages|docs|test|tooling|\.git)([\\/]|$)/.test(abs)) throw new Error('守卫拒绝删除（仓库敏感路径）：' + abs);
      return abs;
    };
    try {
      const rel = join('node_modules', 'skill-calorie');
      const dst = join(tmp, rel, 'dist', 'render');
      mkdirSync(dst, { recursive: true });
      for (const f of ['templates.js', 'errors.js']) copyFileSync(join(pkgDir, 'dist', 'render', f), join(dst, f));
      const mod = await import(pathToFileURL(join(dst, 'templates.js')).href);
      // 副本模块与被测 dist 是**两个模块实例**，不能 instanceof 比较类；按 name＋code 判。
      const isMissingData = (e) => !!e && e.name === 'CalorieRenderError' && e.code === 'missing-data';
      // 负例：包根 templates/ 缺席 → 必须抛 missing-data（变异成 return '' 即红）。
      assert.throws(() => mod.loadTemplate('help'), isMissingData, '缺件必须抛 missing-data');
      // 正例对照：同一布局补上文件后必须成功（证明上一条红的是「缺件」而非路径解析错）。
      mkdirSync(join(tmp, rel, 'templates'), { recursive: true });
      copyFileSync(join(pkgDir, 'templates', 'help.html'), join(tmp, rel, 'templates', 'help.html'));
      assert.match(mod.loadTemplate('help'), /calorie-cmd-read/);
    } finally {
      rmSync(guard(tmp), { recursive: true, force: true });
    }
  });
  it('T10 照片 HELP：10 条全可执行（模块+函数逐条 import 存在）', async () => {
    const all = buildPhotoHelp();
    assert.equal(all.length, 10);
    for (const h of all) {
      assert.ok(h.exec.startsWith('node ') && h.exec.includes(h.fn));
      assert.ok(h.legacyCli.startsWith('python scripts/render_'));
      const rel = h.module.replace('skill-calorie/dist/', '../dist/');
      const mod = await import(rel);
      assert.equal(typeof mod[h.fn], 'function', h.key + ' 缺导出 ' + h.fn);
    }
  });
});
