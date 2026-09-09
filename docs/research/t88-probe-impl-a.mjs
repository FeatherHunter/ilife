/** t88 实施 A 段探针（S1／S2 证据 ＋ F3 逐条对账 ＋ 渲染样本生成）。
 *
 * 跑法：`node docs/research/t88-probe-impl-a.mjs`（只读源码／dist；唯一写入＝渲染样本 `.scratch/t88/out/`）
 * 口径：断言式，末行 `RESULT: n/m fails=k`，`fails>0 → exit 1`。
 *
 * F3 对账（可跳过）：环境变量 `T88_F3` 或默认 `D:\2Study\StudyNotes\SKILLS\卡路里\卡路里.html`
 * 不存在时只打 `INFO F3-MISSING`，不计入断言（本仓测试不依赖仓外路径）。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
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
const R = await import('../../packages/skill-calorie/dist/render/index.js');
const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');

/* ── S1：数据模型 ── */
const data = R.buildHelpSceneData({ updatedAt: '2026-09-09 12:00' });
const groups = data.groups;
const subgroups = groups.flatMap((g) => g.subgroups);
const scenes = subgroups.flatMap((s) => s.scenes);
check('A1 分组数 10', groups.length === 10, String(groups.length));
check('A1 子功能数 54', subgroups.length === 54, String(subgroups.length));
check('A1 场景数 436', scenes.length === 436, String(scenes.length));
check('A1 id 唯一 436/436', new Set(scenes.map((s) => s.id)).size === 436, new Set(scenes.map((s) => s.id)).size + '/436');
check('A1 子功能 id 唯一 54/54', new Set(subgroups.map((s) => s.id)).size === 54, new Set(subgroups.map((s) => s.id)).size + '/54');
check('A1 分组序 = F3', JSON.stringify(groups.map((g) => g.id)) === JSON.stringify(['home', 'diet', 'weight', 'exercise', 'workout', 'goal', 'body_detail', 'body_photo', 'profile', 'analysis']), JSON.stringify(groups.map((g) => g.id)));
check('A1 分组 label 逐字 = F3 十组', JSON.stringify(groups.map((g) => g.label)) === JSON.stringify(['主页', '饮食', '体重', '运动', '健身计划', '目标管理', '身体细节', '身材照片', '基础信息', '分析']), JSON.stringify(groups.map((g) => g.label)));
check('A1 每分组子功能数 = F3', JSON.stringify(groups.map((g) => g.subgroups.length)) === JSON.stringify([3, 9, 8, 5, 6, 3, 4, 4, 3, 9]), JSON.stringify(groups.map((g) => g.subgroups.length)));
const typeHist = scenes.reduce((acc, s) => {
  const k = (s.types ?? ['(none)']).map((t) => (typeof t === 'string' ? t : t.text)).join(',');
  acc[k] = (acc[k] ?? 0) + 1;
  return acc;
}, {});
check('A1 types 结果 329', typeHist['结果'] === 329, String(typeHist['结果']));
check('A1 types 回执 79', typeHist['回执'] === 79, String(typeHist['回执']));
check('A1 types 过程 6', typeHist['过程'] === 6, String(typeHist['过程']));
check('A1 无 types 22（legacy）', typeHist['(none)'] === 22, String(typeHist['(none)']));
check('A1 types 恒发 SceneTypeBadge{text,bg,fg}', scenes.every((s) => (s.types ?? []).every((t) => typeof t === 'object' && typeof t.text === 'string' && typeof t.bg === 'string' && typeof t.fg === 'string')), '');
const colors = new Set(scenes.flatMap((s) => (s.types ?? []).map((t) => t.bg + '/' + t.fg)));
check('P-3 徽章色集 ⊆ F3 三档', [...colors].every((c) => c === '#e8f2ff/#0a63ce' || c === '#e2f7f5/#00897b'), JSON.stringify([...colors]));
check('P-3 徽章色不触 H-01 禁色表', ![...colors].some((c) => ['#0a84ff', '#af52de', '#ff375f', '#0071e3'].some((bad) => c.includes(bad))), '');
check('A1 顶层键 = F3 键集', JSON.stringify(Object.keys(data)) === JSON.stringify(['skill_name', 'title', 'subtitle', 'contact', 'groups']), JSON.stringify(Object.keys(data)));
check('A1 subtitle 基数 = 10 分类 · 436 场景', R.buildHelpSceneData().subtitle === '10 分类 · 436 场景', R.buildHelpSceneData().subtitle);
check('P-2 无 updatedAt 两次调用逐字相同', JSON.stringify(R.buildHelpSceneData()) === JSON.stringify(R.buildHelpSceneData()), '');
check('R1-7 legacy 22 条 id = main_prompt.cli 原文', (() => {
  const legacy = trig.TRIGGERS.filter((t) => !('output_type' in t));
  const want = new Set(legacy.map((t) => t.main_prompt.cli));
  const got = new Set(scenes.filter((s) => !s.types).map((s) => s.id));
  return legacy.length === 22 && got.size === 22 && [...want].every((c) => got.has(c));
})(), '');
check('R1-12 prompt 无 </script>／<!--', scenes.every((s) => !s.prompt_template.includes('</script>') && !s.prompt_template.includes('<!--')), '');

/* ── S2：壳落地（三态同源） ── */
const file = R.renderHelpCenterHtml({ mode: 'file', updatedAt: '2026-09-09 12:00' });
const inline = R.renderHelpCenterHtml({ mode: 'inline', updatedAt: '2026-09-09 12:00' });
const text = R.renderHelpCenterHtml({ mode: 'text', updatedAt: '2026-09-09 12:00' });
const html = file.html;
const MARKERS = ['<!--INJECT-DATA-->', '<!--CONTENT-->', '<!--SHARED-HELPERS-->', '<!--SHARED-CSS-->', '<!--CHARTS-HELPERS-->', '<!--NO-SHARED-->'];
say('INFO FILE-BYTES ' + Buffer.byteLength(html, 'utf8') + ' LINES ' + html.split('\n').length);
say('INFO INLINE-BYTES ' + Buffer.byteLength(inline.html, 'utf8') + ' TEXT-BYTES ' + Buffer.byteLength(text.html, 'utf8'));
check('A3① 六标记逐个残留 0', MARKERS.every((m) => (html.split(m).length - 1) === 0), MARKERS.map((m) => m + '=' + (html.split(m).length - 1)).join(' '));
check('A3① 泛化标记残留 0', [...html.matchAll(/<!--[A-Z0-9-]+-->/g)].length === 0, JSON.stringify([...html.matchAll(/<!--[A-Z0-9-]+-->/g)].map((m) => m[0])));
check('A3① report.markers 六键', JSON.stringify(file.report.markers.map((m) => m.key)) === JSON.stringify(['injectData', 'content', 'sharedHelpers', 'sharedCss', 'chartsHelpers', 'noShared']), JSON.stringify(file.report.markers.map((m) => m.key)));
check('A2 data-scene-id 436', (html.match(/data-scene-id=/g) ?? []).length === 436, String((html.match(/data-scene-id=/g) ?? []).length));
check('A2 data-subgroup-id 54', (html.match(/data-subgroup-id=/g) ?? []).length === 54, String((html.match(/data-subgroup-id=/g) ?? []).length));
check('A2 复制按钮 1308', (html.match(/data-action-id=/g) ?? []).length === 1308, String((html.match(/data-action-id=/g) ?? []).length));
const htmlIds = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
check('A3② HTML id 唯一', new Set(htmlIds).size === htmlIds.length, htmlIds.length + ' ids, unique ' + new Set(htmlIds).size);
check('A2 file 态是完整文档', /^<!DOCTYPE html>/.test(html) && html.includes('<meta charset="utf-8">') && /<\/html>\s*$/.test(html), '');
check('P-5 inline 无 DOCTYPE／head／html', !inline.html.includes('<!DOCTYPE') && !inline.html.includes('<head>') && !inline.html.includes('</head>') && !inline.html.includes('<html') && !inline.html.includes('<body'), '');
check('P-5 inline <style> 落点钉死（在 <section> 之前，恰 1 个）', inline.html.indexOf('<style>') === 0 && (inline.html.match(/<style>/g) ?? []).length === 1 && inline.html.indexOf('<style>') < inline.html.indexOf('<section'), 'style@' + inline.html.indexOf('<style>') + ' section@' + inline.html.indexOf('<section'));
check('P-5 inline 只取 <section> 片段', (inline.html.match(/<section/g) ?? []).length >= 1 && !inline.html.includes('<body') && !inline.html.includes('<html'), '');
check('P-5 inline 带 helpers', inline.html.trimEnd().endsWith('</script>') && inline.html.includes(R.COPY_RUNTIME_JS.slice(0, 40)), '');
const sceneIdRe = /data-scene-id="([^"]*)"/g;
const fileIds = [...html.matchAll(sceneIdRe)].map((m) => m[1]);
const inlineIds = [...inline.html.matchAll(sceneIdRe)].map((m) => m[1]);
check('三态同源：inline 的 data-scene-id 集合 = file', fileIds.length === 436 && JSON.stringify(inlineIds) === JSON.stringify(fileIds), fileIds.length + '/' + inlineIds.length);
check('三态同源：text 覆盖 436 个 id', scenes.every((s) => text.html.includes(s.id)), '');
check('三态同源：text 无 HTML 标签', !/<(section|style|script|div|article|details|span|button)\b/.test(text.html), '');
check('A3③ helpers 单实现（壳内 helpers = COPY_RUNTIME_JS）', html.includes(R.COPY_RUNTIME_JS), '');

/* ── F3 逐条对账（仓外，可跳过） ── */
const F3 = process.env.T88_F3 ?? 'D:\\2Study\\StudyNotes\\SKILLS\\卡路里\\卡路里.html';
if (!existsSync(F3)) {
  say('INFO F3-MISSING ' + F3);
} else {
  const raw = readFileSync(F3, 'utf8');
  const start = raw.indexOf('<script id="help-data"');
  const open = raw.indexOf('>', start);
  const close = raw.indexOf('</script>', open);
  const f3 = JSON.parse(raw.slice(open + 1, close));
  const f3Scenes = f3.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  const byId = new Map(f3Scenes.map((s) => [s.id, s]));
  check('F3 场景数 = 436', f3Scenes.length === 436, String(f3Scenes.length));
  check('F3 顶层键集 = 本模型', JSON.stringify(Object.keys(f3)) === JSON.stringify(Object.keys(data)), JSON.stringify(Object.keys(f3)));
  const newOnes = scenes.filter((s) => s.types);
  check('F3 对账：414 条新场景 id 逐字相等', newOnes.every((s) => byId.has(s.id)), '');
  check('F3 对账：436 条 prompt_template 逐字相等', scenes.every((s) => {
    const hit = byId.get(s.id) ?? f3Scenes.find((x) => x.wake_word === s.wake_word);
    return hit !== undefined && hit.prompt_template === s.prompt_template;
  }), '');
  check('F3 对账：436 条 title／wake_word 逐字相等', scenes.every((s) => {
    const hit = byId.get(s.id) ?? f3Scenes.find((x) => x.wake_word === s.wake_word);
    return hit !== undefined && hit.title === s.title && hit.wake_word === s.wake_word;
  }), '');
  const legacyNew = scenes.filter((s) => !s.types).map((s) => s.id);
  const legacyF3 = f3Scenes.filter((s) => s.id.startsWith('legacy_')).map((s) => s.id);
  check('L-19 台账：22 条 legacy id 与 F3 差集 = 22（已登记）', legacyNew.length === 22 && legacyF3.length === 22 && legacyNew.every((id) => !f3Scenes.some((s) => s.id === id)), 'new=' + legacyNew.length + ' f3=' + legacyF3.length);
  const groupsEq = JSON.stringify(groups.map((g) => [g.id, g.label, g.icon, g.subgroups.map((s) => s.label)]))
    === JSON.stringify(f3.groups.map((g) => [g.id, g.label, g.icon, g.subgroups.map((s) => s.label)]));
  check('F3 对账：10 组 × 54 子功能（id／label／icon／子功能序）逐字相等', groupsEq, '');
}

/* ── 渲染样本（交付物 1） ── */
const sampleDir = join(HERE, '..', '..', '.scratch', 't88', 'out');
if (!sampleDir.replace(/\\/g, '/').includes('/.scratch/t88/out')) throw new Error('样本目录路径守卫失败：' + sampleDir);
mkdirSync(sampleDir, { recursive: true });
const samplePath = join(sampleDir, '卡路里_HELP_preview.html');
writeFileSync(samplePath, html, 'utf8');
const sample = readFileSync(samplePath, 'utf8');
check('样本落盘：file 态逐字一致', sample === html, samplePath);
say('INFO SAMPLE ' + samplePath + ' bytes=' + Buffer.byteLength(sample, 'utf8') + ' lines=' + sample.split('\n').length);
say('INFO SAMPLE-STATS sceneId=' + (sample.match(/data-scene-id=/g) ?? []).length
  + ' subgroupId=' + (sample.match(/data-subgroup-id=/g) ?? []).length
  + ' copyButtons=' + (sample.match(/data-action-id=/g) ?? []).length
  + ' markerResidue=' + MARKERS.reduce((n, m) => n + (sample.split(m).length - 1), 0)
  + ' genericResidue=' + [...sample.matchAll(/<!--[A-Z0-9-]+-->/g)].length
  + ' htmlIds=' + (sample.match(/ id="/g) ?? []).length
  + ' htmlIdsUnique=' + new Set([...sample.matchAll(/ id="([^"]+)"/g)].map((m) => m[1])).size);

say('RESULT: ' + (total - fails) + '/' + total + ' fails=' + fails);
console.log(out.join('\n'));
process.exit(fails === 0 ? 0 : 1);
