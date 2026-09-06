/** T11 #30 追加 · SKILL.md + templates 验收（照 M6 范式）：技能说明/唯一出口/envelope/HELP 现找（含 T10 照片模块）。
 * 模板 6 件 + HELP 构建期注入可复现 + 照片 exec 逐条可 import。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildHelpBlock, START, END } from '../scripts/build-help.mjs';
import { CALORIE_COMBOS } from '../dist/cli/keys.js';
import { buildPhotoHelp } from '../dist/render/index.js';

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
  it('互联区新鲜（构建期注入可复现，77 键全对齐 combos）', () => {
    const si = skill.indexOf(START), ei = skill.indexOf(END);
    assert.equal(skill.slice(si + START.length + 1, ei - 1), buildHelpBlock());
    assert.equal(Object.keys(CALORIE_COMBOS).length, 77);
    for (const k of Object.keys(CALORIE_COMBOS)) assert.ok(skill.includes(k), '缺键 ' + k);
  });
  it('模板 6 件齐 + SHARED 双标记各恰一次', () => {
    const files = readdirSync(join(pkgDir, 'templates')).filter((f) => f.endsWith('.html')).sort();
    assert.deepEqual(files, ['diet.html', 'exercise.html', 'goal.html', 'help.html', 'home.html', 'photo-gallery.html']);
    for (const f of files) {
      const t = readFileSync(join(pkgDir, 'templates', f), 'utf8');
      assert.match(t, /calorie-cmd-read/);
      assert.equal(t.split('<!--SHARED-CSS-->').length - 1, 1, f + ' CSS 标记');
      assert.equal(t.split('<!--SHARED-HELPERS-->').length - 1, 1, f + ' HELPERS 标记');
    }
  });
  it('T10 照片 HELP：10 条全可执行（模块+函数逐条 import 存在）', async () => {
    const all = buildPhotoHelp();
    assert.equal(all.length, 10);
    for (const h of all) {
      assert.ok(h.exec.startsWith('node ') && h.exec.includes(h.fn));
      assert.ok(h.legacyCli.startsWith('python scripts/render_'));
      const rel = h.module.replace('@feather_wch/skill-calorie/dist/', '../dist/');
      const mod = await import(rel);
      assert.equal(typeof mod[h.fn], 'function', h.key + ' 缺导出 ' + h.fn);
    }
  });
});
