/** t88 探针 4：用新 SoT 派生 sceneData → 走 #78 的 renderHelpShell，实测壳产物形态与缺口。只读。 */
const out = [];
const say = (s) => out.push(s);
const base = await import('../../packages/base-render/dist/index.js');
const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const T = trig.TRIGGERS;

const CATEGORIES_V3 = [
  ['🏠', '主页', 'home'], ['🍚', '饮食', 'diet'], ['⚖️', '体重', 'weight'],
  ['🏃', '运动', 'exercise'], ['💪', '健身计划', 'workout'], ['🎯', '目标管理', 'goal'],
  ['🧬', '身体细节', 'body_detail'], ['📸', '身材照片', 'body_photo'], ['⚙️', '基础信息', 'profile'],
  ['📊', '分析', 'analysis'],
];
const LEGACY_NAME = { '复盘': '分析' };
const SUBFUNC_ORDER = {
  '基础信息': ['设置资料', '看档案', '改资料'], '目标管理': ['定目标', '看目标', '改目标'],
  '身体细节': ['记身体细节', '看身体细节', '比身体细节', '删身体细节'],
  '运动': ['记运动', '改运动', '看运动', '运动分析', '运动复盘'],
  '身材照片': ['存身材照', '看身材照', '比身材照', '管身材照'],
  '饮食': ['记饮食', '改饮食', '看饮食', '查食品', '看营养', '看排行', '饮食复盘', '餐别分布'],
  '健身计划': ['定训练计划', '看训练计划', '改训练计划', '落地训练', '计划复盘', '安全检查'],
};
const OT = { process: '过程', result: '结果', receipt: '回执' };
const isNew = (t) => 'output_type' in t && 'prompt_template' in t;
const groups = []; const gi = {};
for (const [icon, name, key] of CATEGORIES_V3) { const g = { id: key, icon, label: name, subgroups: [] }; groups.push(g); gi[name] = g; }
const subKey = (cat, sub) => { const o = SUBFUNC_ORDER[cat] ?? []; if (o.includes(sub)) return [0, o.indexOf(sub), sub]; if (sub === '既有唤醒词') return [2, 0, sub]; return [1, 0, sub]; };
const push = (scene, cat, sub) => { const g = gi[cat]; if (!g) return; let sg = g.subgroups.find((x) => x.label === sub); if (!sg) { sg = { id: g.id + '_' + (g.subgroups.length + 1), label: sub, scenes: [] }; g.subgroups.push(sg); } sg.scenes.push(scene); };
const newS = T.filter(isNew); const legacyS = T.filter((t) => !isNew(t));
newS.sort((a, b) => { const ka = subKey(a.category ?? '', a.subfunction ?? ''), kb = subKey(b.category ?? '', b.subfunction ?? ''); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; const oa = a.order ?? 9999, ob = b.order ?? 9999; if (oa !== ob) return oa - ob; return String(a.name ?? '') < String(b.name ?? '') ? -1 : 1; });
for (const t of newS) { const s = { id: t.key ?? t.wake_word, title: t.name ?? t.wake_word, wake_word: t.wake_word, status: '', prompt_template: t.prompt_template ?? '' }; const ot = OT[t.output_type ?? '']; if (ot) s.types = [ot]; push(s, t.category ?? '', t.subfunction || '既有唤醒词'); }
legacyS.sort((a, b) => (a.wake_word < b.wake_word ? -1 : 1));
for (const t of legacyS) { const s = { id: 'legacy_' + t.wake_word, title: t.wake_word, wake_word: t.wake_word, status: '', prompt_template: (t.main_prompt ?? {}).text ?? '' }; push(s, LEGACY_NAME[t.category] ?? (t.category ?? '分析'), '既有唤醒词'); }
const res = groups.filter((g) => g.subgroups.length > 0);
for (const g of res) g.subgroups.sort((a, b) => { const ka = subKey(g.label, a.label), kb = subKey(g.label, b.label); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return 0; });

const sceneData = {
  skill_name: '卡路里', title: '唤醒词速查台',
  subtitle: '10 分类 · 436 场景 · 更新于 2026-09-09 12:00',
  contact: { items: [{ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }, { label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' }] },
  version: '0.2.0',
  groups: res,
};
const assets = { sharedHelpersJs: base.buildSharedHelpersJs(), sharedCssText: base.buildStyleSheet().css };
const t0 = Date.now();
const o = base.renderHelpShell({ sceneData, assets });
const ms = Date.now() - t0;
const html = o.html;
say('RESULT-SHELL-BYTES ' + Buffer.byteLength(html, 'utf8'));
say('RESULT-SHELL-LINES ' + html.split('\n').length);
say('RESULT-SHELL-MS ' + ms);
say('RESULT-SHELL-OUT-KEYS ' + JSON.stringify(Object.keys(o)));
say('RESULT-DOCTYPE ' + /^<!DOCTYPE html>/.test(html));
// R1-10 修：原写法 `m + '=' + html.split(m).length - 1` 因运算符优先级恒得 NaN（红队复算确认）；
// 现改为括号内取计数，并把冻结面 6 个标记全覆盖（R1-2）。
say('RESULT-PLACEHOLDER-RESIDUE ' + Object.values(base.TEMPLATE_MARKERS).map((m) => m + '=' + (html.split(m).length - 1)).join(' '));
say('RESULT-PLACEHOLDER-GENERIC ' + JSON.stringify([...html.matchAll(/<!--[A-Z0-9-]+-->/g)].map((m) => m[0])));
say('RESULT-TEMPLATE-MARKERS ' + JSON.stringify(base.TEMPLATE_MARKERS));
const ids = [...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
say('RESULT-ID-COUNT ' + ids.length + ' UNIQUE ' + new Set(ids).size);
say('RESULT-ID-DUP ' + JSON.stringify(ids.filter((x, i) => ids.indexOf(x) !== i)));
say('RESULT-DATA-SCENE-COUNT ' + (html.match(/data-scene-id=/g) ?? []).length);
say('RESULT-SUBGROUP-COUNT ' + (html.match(/data-subgroup-id=/g) ?? []).length);
say('RESULT-GROUP-PAGE-COUNT ' + (html.match(/class="ilife-help-shell-page"/g) ?? []).length);
say('RESULT-COPY-BUTTONS ' + (html.match(/data-action-id=/g) ?? []).length);
say('RESULT-SCRIPT-COUNT ' + (html.match(/<script/g) ?? []).length);
say('RESULT-SEARCH-INPUT ' + /type="search"/.test(html) + ' search-wrap ' + /search/.test(html));
say('RESULT-DETAILS-COUNT ' + (html.match(/<details/g) ?? []).length);
say('RESULT-INLINE-STYLE ' + (html.match(/ style="/g) ?? []).length);
say('RESULT-HELPERS-BYTES ' + Buffer.byteLength(assets.sharedHelpersJs, 'utf8'));
say('RESULT-CSS-BYTES ' + Buffer.byteLength(assets.sharedCssText, 'utf8'));
say('RESULT-CSS-BREAKPOINTS ' + JSON.stringify([...assets.sharedCssText.matchAll(/@media[^{]+/g)].map((m) => m[0].trim())));
say('RESULT-CSS-FORBIDDEN ' + ['#0a84ff', '#af52de', '#ff375f', '#0071e3', 'linear-gradient', 'radial-gradient'].map((k) => k + '=' + (assets.sharedCssText.includes(k) ? 'HIT' : '0')).join(' '));
say('RESULT-CSS-TNUM ' + assets.sharedCssText.includes('tnum') + ' FOCUSVIS ' + assets.sharedCssText.includes(':focus-visible') + ' REDUCED ' + assets.sharedCssText.includes('prefers-reduced-motion'));
say('RESULT-HELPERS-GLOBALS ' + ['window.', 'globalThis.'].map((k) => k + '=' + (assets.sharedHelpersJs.split(k).length - 1)).join(' '));
say('RESULT-HELPERS-EXECCMD ' + assets.sharedHelpersJs.includes('execCommand') + ' CLIPBOARD ' + assets.sharedHelpersJs.includes('navigator.clipboard'));
say('RESULT-HELPERS-MARK ' + /createElement\('mark'\)|<mark/.test(assets.sharedHelpersJs));
console.log(out.join('\n'));
