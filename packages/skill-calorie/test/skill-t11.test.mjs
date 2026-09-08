/** T11 #30 追加 · SKILL.md + templates 验收（照 M6 范式）：技能说明/唯一出口/envelope/HELP 现找（含 T10 照片模块）。
 * 模板 6 件经 dist 侧 loader 装载（#95）+ HELP 构建期注入可复现 + 照片 exec 逐条可 import。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
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
  it('互联区新鲜（构建期注入可复现，77 键全对齐 combos）', () => {
    const si = skill.indexOf(START), ei = skill.indexOf(END);
    assert.equal(skill.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.equal(Object.keys(CALORIE_COMBOS).length, 77);
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
