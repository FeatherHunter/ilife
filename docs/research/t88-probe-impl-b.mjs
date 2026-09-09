/** t88 实施 B 段探针（S4：helpers 扩展 ＋ 卡级复制按钮 ＋ helpShell CSS）——断言式，只读源码／dist，
 *  唯一写入＝渲染样本 `.scratch/t88/out/卡路里_HELP_preview_b.html`（交付物 2）。
 *
 *  跑法：`node docs/research/t88-probe-impl-b.mjs`
 *  口径：末行 `RESULT: n/m fails=k`，`fails>0 → exit 1`。
 *  浏览器实证另见 `docs/research/t88-browser-evidence-b.mjs`（真实 headless Chrome，须先跑本探针生成样本）。
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const out = [];
let fails = 0;
let total = 0;
const say = (s) => out.push(s);
function check(name, ok, detail) {
  total += 1;
  if (!ok) fails += 1;
  say((ok ? 'PASS ' : 'FAIL ') + name + (detail === undefined ? '' : ' :: ' + detail));
}

const HERE = dirname(fileURLToPath(import.meta.url));
const BP = await import('../../packages/base-render/dist/index.js');
const R = await import('../../packages/skill-calorie/dist/render/index.js');
const TRIG = await import('../../packages/skill-calorie/dist/triggers/index.js');

const LF = String.fromCharCode(10);
const HELPERS = BP.buildSharedHelpersJs();
const CSS = BP.buildStyleSheet().css;

/* ── 1. helpers 产出文本的纯度与冻结面（R1-11／FX-18） ── */
check('B-P1 helpers 是 IIFE（经典 script 可跑）', HELPERS.trimStart().startsWith('(function') && HELPERS.trimEnd().endsWith('}());'), '');
check('B-P2 只用 document.* ＋ 只读 window.matchMedia', HELPERS.includes('document.') && /window\.matchMedia\(/.test(HELPERS), '');
check('B-P3 零 window／globalThis 赋值', !/\b(?:window|globalThis)\s*\.\s*[\w$]+\s*=(?!=)/.test(HELPERS), '');
check('B-P4 零 node: 内建', !/(?:from|import\s*\(|require\s*\(|import)\s*['"]node:/.test(HELPERS), '');
check('B-P5 零 <canvas>', !HELPERS.includes('<canvas'), '');
check('B-P6 零 classList（T28「动效纯 CSS」）', !HELPERS.includes('classList'), '');
check('B-P7 零 "show" 字面量（T28）', !/["']show["']/.test(HELPERS), '');
check('B-P8 零 flex-wrap（样式单一来源）', !HELPERS.includes('flex-wrap'), '');
check('B-P9 零内联 onclick=／零 </script', !/onclick\s*=/i.test(HELPERS) && !HELPERS.includes('</script'), '');
check('B-P10 单 marker（不新增第二个标记）', (HELPERS.match(/var MARKER_ATTR =/g) ?? []).length === 1 && (HELPERS.match(/setAttribute\(MARKER_ATTR/g) ?? []).length === 1, '');
check('B-P11 单 boot()（新功能挂进既有 boot）', (HELPERS.match(/function boot\(\)/g) ?? []).length === 1 && HELPERS.includes('initHelpShell();'), '');
check('B-P12 卡级 actionId／文案恒读冻结常量', HELPERS.includes(BP.HELP_COPY_ACTIONS.prompt.actionId) && HELPERS.includes(BP.HELP_COPY_ACTIONS.prompt.label), '');
check('B-P13 无 HELP 壳时逐项早退', HELPERS.includes('document.querySelector(SHELL_SEL)') && HELPERS.includes('if (!shell) return;'), '');

/* ── 2. 新类名：CSS 有规则 ＋ helpers 真用（N-4「CSS 有类名、产出者空转」反面） ── */
const NEW_SUFFIXES = ['card-copy', 'card-mark', 'card-hidden', 'subgroup-hidden', 'tab-search', 'tab-search-input', 'tab-search-clear', 'page-hitcount', 'field-input', 'btn-backtop', 'btn-backtop-show'];
const root = BP.STYLE_PREFIX + 'help-shell-';
for (const suffix of NEW_SUFFIXES) {
  const full = root + suffix;
  check('B-C1 CSS 有 .' + full, CSS.includes('.' + full), '');
  check('B-C2 helpers 真产 ' + full, HELPERS.includes(full), '');
}
// 类名与冻结壳的 cls() 实参同命名空间（T11 startsWith 归属）：CSS 里每个 ilife-help-shell-* 都能被
// help.ts 的 cls() 实参前缀覆盖 —— 与 style.test.mjs T11 同口径（此处只做 S4 新类的定点复核）。
const helpSrc = readFileSync(join(HERE, '..', '..', 'packages', 'base-render', 'src', 'help.ts'), 'utf8');
const literals = new Set([...helpSrc.matchAll(/cls\(['"]([^'"]*)['"]/g)].map((m) => m[1]));
check('B-C3 新类名后缀 ⊆ 既有 cls() 实参前缀（T11 归属）', NEW_SUFFIXES.every((s) => [...literals].some((lit) => s.startsWith(lit))), NEW_SUFFIXES.filter((s) => ![...literals].some((lit) => s.startsWith(lit))).join(',') || 'all');

/* ── 3. 渲染样本（交付物 2；file 态、固定 updatedAt） ── */
const file = R.renderHelpCenterHtml({ mode: 'file', updatedAt: '2026-09-09 12:00' });
const html = file.html;
const sampleDir = join(HERE, '..', '..', '.scratch', 't88', 'out');
if (!sampleDir.replace(/\\/g, '/').includes('/.scratch/t88/out')) throw new Error('样本目录路径守卫失败：' + sampleDir);
mkdirSync(sampleDir, { recursive: true });
const samplePath = join(sampleDir, '卡路里_HELP_preview_b.html');
writeFileSync(samplePath, html, 'utf8');
const sample = readFileSync(samplePath, 'utf8');
check('B-S1 样本落盘逐字一致', sample === html, samplePath);
check('B-S2 样本 436 卡', (sample.match(/<article class="ilife-help-shell-card"/g) ?? []).length === 436, String((sample.match(/<article class="ilife-help-shell-card"/g) ?? []).length));
check('B-S3 静态 HTML 卡头按钮 0（降级保持；卡级按钮只在运行时）', (sample.match(/class="ilife-help-shell-card-copy"/g) ?? []).length === 0, String((sample.match(/class="ilife-help-shell-card-copy"/g) ?? []).length));
check('B-S4 静态复制按钮 1308（436×3）', (sample.match(/data-action-id=/g) ?? []).length === 1308, String((sample.match(/data-action-id=/g) ?? []).length));
check('B-S5 静态标记无搜索框／无 #backTop（降级保持；helpers 文本内的类名字符串不算）', !sample.includes('class="ilife-help-shell-tab-search"') && !sample.includes('id="backTop"'), '');
check('B-S6 六标记残留 0 ＋ 泛化残留 0', [...sample.matchAll(/<!--[A-Z0-9-]+-->/g)].length === 0, String([...sample.matchAll(/<!--[A-Z0-9-]+-->/g)].length));
check('B-S7 helpers 单实现（样本内 helpers 段 = COPY_RUNTIME_JS）', sample.includes(R.COPY_RUNTIME_JS) && R.COPY_RUNTIME_JS === HELPERS, '');
check('B-S8 每个 <pre> 与同卡 Sheet prompt 按钮 data-t 逐字相等（静态前提）', (() => {
  const cards = sample.split('<article class="ilife-help-shell-card"').slice(1);
  let ok = 0;
  for (const card of cards) {
    const pre = /<pre class="ilife-help-shell-prompt">([\s\S]*?)<\/pre>/.exec(card);
    const btn = /<button[^>]*data-action-id="ilife-help-copy-prompt"[^>]*data-t="([\s\S]*?)"/.exec(card);
    if (pre && btn) {
      const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
      if (unesc(pre[1]) === unesc(btn[1])) ok += 1;
    }
  }
  say('INFO PAIRS ' + ok + '/436');
  return ok === 436;
})(), '');
check('B-S9 静态 436/436 卡含 card-top（注入落点存在）', (sample.match(/class="ilife-help-shell-card-top"/g) ?? []).length === 436, String((sample.match(/class="ilife-help-shell-card-top"/g) ?? []).length));
check('B-S10 CSS-only Tab 结构仍在（radio + :checked + page-body）', sample.includes('type="radio"') && CSS.includes('.ilife-help-shell-tab-input:checked + .ilife-help-shell-page-body'), '');

/* ── 4. 类名与真实壳产出的对照（不引 help.ts 的派生式必须逐字对齐） ── */
const shellHtml = BP.renderHelpShell({
  sceneData: R.buildHelpSceneData({ updatedAt: '2026-09-09 12:00' }),
  assets: R.helpCenterAssets(),
}).html;
const shellClasses = new Set([...shellHtml.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
for (const suffix of ['card', 'card-top', 'sheet', 'prompt', 'tab-bar', 'tab-input', 'page', 'subgroup', 'cli']) {
  check('B-C4 壳真产 ' + root + suffix + '（helpers 选择器锚点）', shellClasses.has(root + suffix), '');
}
// `editable_fields` 类名：真实 卡路里 payload **0 条**（F3 payload 同为 0 条 → 该路径与 F3 同形：代码在、数据无），
// 故用带字段的夹具渲染对照（S4 预览能力的类名锚点必须真实存在）。
const FIELD_FIXTURE = {
  skill_name: 'S', title: 'T',
  groups: [{ id: 'g', label: 'G', subgroups: [{ id: 'g_1', label: 'SG', scenes: [{ id: 'k', title: 'TT', wake_word: 'w', status: '', prompt_template: 'p', editable_fields: [{ name: 'n', label: 'L', value: 'V', hint: 'H', required: true }] }] }] }],
};
const fieldHtml = BP.renderHelpShell({ sceneData: FIELD_FIXTURE, assets: R.helpCenterAssets() }).html;
const fieldClasses = new Set([...fieldHtml.matchAll(/class="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/)));
for (const suffix of ['field', 'field-label', 'field-value', 'field-hint']) {
  check('B-C5 壳（带 editable_fields 夹具）真产 ' + root + suffix, fieldClasses.has(root + suffix), '');
}

say('INFO HELPERS-BYTES ' + Buffer.byteLength(HELPERS, 'utf8'));
say('INFO SAMPLE ' + samplePath + ' bytes=' + Buffer.byteLength(sample, 'utf8') + ' lines=' + sample.split(LF).length);
say('INFO SAMPLE-SHA256 ' + createHash('sha256').update(sample).digest('hex'));
say('RESULT: ' + (total - fails) + '/' + total + ' fails=' + fails);
console.log(out.join(LF));
process.exit(fails === 0 ? 0 : 1);
