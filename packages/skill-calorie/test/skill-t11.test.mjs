/** T11 #30 追加 · SKILL.md + templates 验收（照 M6 范式）：技能说明/唯一出口/envelope/HELP 现找（含 T10 照片模块）。
 * 模板 6 件经 dist 侧 loader 装载（#95）+ HELP 构建期注入可复现 + 照片 exec 逐条可 import。
 * #107：6 件模板**不再存在「存在但零引用」**——逐件被 HELP 速查台渲染进「看板页入口」
 * （`buildHelpViewEntries` → `meta_blocks`），故断言从「文件存在」升级为「存在 ＋ 真被渲染」。
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
import {
  HELP_VIEW_ENTRIES_META_ID, HELP_VIEW_ENTRIES_META_TITLE,
  buildHelpViewEntries, renderHelpCenterHtml, renderViewEntriesHtml,
} from '../dist/render/helpCenter.js';

const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = readFileSync(join(pkgDir, 'SKILL.md'), 'utf8');

/** 剥 HTML 实体（`meta_blocks[].html` 经 `escapeHtml` 落地，比对原文前须还原）。 */
const decodeEntities = (s) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const countOf = (haystack, needle) => haystack.split(needle).length - 1;

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
      // #107：抽取锚点（看板页入口）逐件恰 1 处——模板侧漂移即在此红。
      assert.equal(countOf(t, '<h1>'), 1, f + ' <h1> 锚点');
      assert.equal(countOf(t, '<p class="lead">'), 1, f + ' <p class="lead"> 锚点');
      assert.equal(countOf(t, '<pre class="view-cli">'), 1, f + ' <pre class="view-cli"> 锚点');
    }
  });
  // #107 验收：6 件模板**要么被真正使用、要么删除**。本票取「并入 HELP 重建」——
  // 逐件经 loader 读盘 → 抽三锚点 → 进速查台「看板页入口」（file／inline 走 meta_blocks，text 走文本段）。
  // 本组断言把「死文件」堵死：模板消失／锚点漂移／HELP 停止渲染 → 逐条红。
  it('模板 6 件被 HELP 速查台真正渲染（#107：不留「存在但零引用」）', () => {
    const entries = buildHelpViewEntries();
    assert.equal(entries.length, 6, '入口数＝模板数');
    assert.deepEqual(entries.map((e) => e.name), [...CALORIE_TEMPLATES], '入口序恒 CALORIE_TEMPLATES');
    for (const e of entries) {
      assert.ok(e.title.length > 0, e.name + ' 缺 <h1> 标题');
      assert.ok(e.lead.length > 0, e.name + ' 缺 lead 说明');
      assert.ok(e.cli.startsWith('calorie-cmd-read '), e.name + ' 取数命令须 calorie-cmd-read 开头');
      // 抽取结果必须**逐字来自磁盘模板文件**（防「模块内第二份副本冒充」）。
      const raw = loadTemplate(e.name);
      assert.ok(raw.includes('<h1>' + e.title + '</h1>'), e.name + ' 标题非取自模板文件');
      assert.ok(raw.includes('<pre class="view-cli">' + e.cli + '</pre>'), e.name + ' 命令非取自模板文件');
      assert.ok(raw.includes('<title>' + e.title + '</title>'), e.name + ' <h1> 与 <title> 不一致');
    }
    // 三态同源：file／inline 的 meta 块 ＋ text 文本段都是同一份入口。
    const file = renderHelpCenterHtml({ mode: 'file' });
    const inline = renderHelpCenterHtml({ mode: 'inline' });
    const text = renderHelpCenterHtml({ mode: 'text' });
    for (const [label, html] of [['file', file.html], ['inline', inline.html]]) {
      assert.equal(countOf(html, 'data-meta-id="' + HELP_VIEW_ENTRIES_META_ID + '"'), 1, label + ' 缺看板页入口块');
      assert.equal(countOf(html, 'data-view-entry="'), 6, label + ' 入口条目数');
      const decoded = decodeEntities(html);
      for (const e of entries) {
        assert.ok(decoded.includes('<b>' + e.title + '</b>'), label + ' 未渲染模板标题：' + e.name);
        assert.ok(decoded.includes(e.cli), label + ' 未渲染模板命令：' + e.name);
      }
    }
    assert.ok(text.html.includes('[' + HELP_VIEW_ENTRIES_META_TITLE + ']'), 'text 态缺看板页入口段');
    for (const e of entries) {
      assert.ok(text.html.includes('  ' + e.title + ' · ' + e.cli), 'text 态未渲染入口：' + e.name);
    }
    // 入口行不得混进场景行口径（4 空格行恒 436 条）。
    assert.equal(text.html.split('\n').filter((line) => line.startsWith('    ')).length, 436);
  });
  it('入口块自负转义（meta_blocks.html 原样透传，不得让模板内容注入标签）', () => {
    const html = renderViewEntriesHtml([
      { name: 'x', title: '<b>t</b>', lead: 'a&b', cli: 'calorie-cmd-read x' },
    ]);
    assert.ok(!html.includes('<b>t</b>'), '标题未转义');
    assert.ok(html.includes('&lt;b&gt;t&lt;/b&gt;'), '标题须转义为实体');
    assert.ok(html.includes('a&amp;b'), '说明须转义为实体');
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
