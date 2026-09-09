/** t88 返修探针 R2：T9／T11 双锁镜像 ＋ 两处体积差归因（只读，断言式）。 */
const out = [];
let fails = 0; let total = 0;
const say = (s) => out.push(s);
function check(name, ok, detail) { total += 1; if (!ok) fails += 1; say((ok ? 'PASS ' : 'FAIL ') + name + (detail === undefined ? '' : ' :: ' + detail)); }

const fs = await import('node:fs');
const base = await import('../../packages/base-render/dist/index.js');
const SRC_HELP = fs.readFileSync(new URL('../../packages/base-render/src/help.ts', import.meta.url), 'utf8');

/* T11 镜像：suffix ∈ literals 或 startsWith(某 literal) */
const literals = new Set([...SRC_HELP.matchAll(/cls\('([^']*)'/g)].map((m) => m[1]));
for (const m of SRC_HELP.matchAll(/cls\("([^"]*)"/g)) literals.add(m[1]);
literals.add('help-shell');
const t11ok = (suffix) => literals.has(suffix) || [...literals].some((l) => suffix.startsWith(l));
/* T9 镜像：类名必须归属 8 个区根之一 */
const ROOTS = ['ilife-toast', 'ilife-action', 'ilife-copy-btn', 'ilife-status-badge', 'ilife-empty', 'ilife-error', 'ilife-charts', 'ilife-help-shell'];
const t9ok = (cls) => ROOTS.some((r) => cls === r || cls.startsWith(r));

say('INFO literals=' + JSON.stringify([...literals].sort()));
const candidates = [
  'ilife-help-shell-search', 'ilife-help-shell-hitcount', 'ilife-help-shell-backtop', 'ilife-help-shell-mark', // v1 方案（应违规）
  'ilife-help-shell-card-copy', 'ilife-help-shell-card-mark', 'ilife-help-shell-tab-search', 'ilife-help-shell-page-hitcount', 'ilife-help-shell-btn-backtop', // v2 方案（应通过）
  'ilife-card-copy', 'ilife-search', // 新区根（应被 T9 拦）
];
for (const c of candidates) {
  const suffix = c.replace('ilife-help-shell-', '');
  const t9 = t9ok(c); const t11 = c.startsWith('ilife-help-shell-') ? t11ok(suffix) : null;
  say('INFO ' + c + ' T9=' + t9 + ' T11=' + (t11 === null ? 'n/a' : t11));
}
check('v1 四个类名 T11 违规（证实 R1-6）', ['search', 'hitcount', 'backtop', 'mark'].every((s) => !t11ok(s)), '');
check('v2 五个类名 T9+T11 双绿', ['card-copy', 'card-mark', 'tab-search', 'page-hitcount', 'btn-backtop'].every((s) => t11ok(s)) && ['ilife-help-shell-card-copy', 'ilife-help-shell-card-mark', 'ilife-help-shell-tab-search', 'ilife-help-shell-page-hitcount', 'ilife-help-shell-btn-backtop'].every(t9ok), '');
check('新区根 ilife-card-* 被 T9 拦（故不可用）', !t9ok('ilife-card-copy'), '');
check('基线 CSS 现有关名 T9 全绿', [...new Set([...base.buildStyleSheet().css.matchAll(/\.(ilife-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))].every(t9ok), '');
check('基线 CSS 现有 help-shell 类 T11 全绿', [...new Set([...base.buildStyleSheet().css.matchAll(/\.(ilife-help-shell-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))].every((c) => t11ok(c.replace('ilife-help-shell-', ''))), '');

/* 体积差归因：probe-shell 975,370 vs probe-shell3 975,038 */
const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const T = trig.TRIGGERS;
const isNew = (t) => 'output_type' in t && 'prompt_template' in t;
const CATS = [['🏠', '主页', 'home'], ['🍚', '饮食', 'diet'], ['⚖️', '体重', 'weight'], ['🏃', '运动', 'exercise'], ['💪', '健身计划', 'workout'], ['🎯', '目标管理', 'goal'], ['🧬', '身体细节', 'body_detail'], ['📸', '身材照片', 'body_photo'], ['⚙️', '基础信息', 'profile'], ['📊', '分析', 'analysis']];
const ORD = { '基础信息': ['设置资料', '看档案', '改资料'], '目标管理': ['定目标', '看目标', '改目标'], '身体细节': ['记身体细节', '看身体细节', '比身体细节', '删身体细节'], '运动': ['记运动', '改运动', '看运动', '运动分析', '运动复盘'], '身材照片': ['存身材照', '看身材照', '比身材照', '管身材照'], '饮食': ['记饮食', '改饮食', '看饮食', '查食品', '看营养', '看排行', '饮食复盘', '餐别分布'], '健身计划': ['定训练计划', '看训练计划', '改训练计划', '落地训练', '计划复盘', '安全检查'] };
const OT = { process: '过程', result: '结果', receipt: '回执' };
const groups = []; const gi = {};
for (const [icon, name, key] of CATS) { const g = { id: key, icon, label: name, subgroups: [] }; groups.push(g); gi[name] = g; }
const sk = (c, s) => { const o = ORD[c] ?? []; if (o.includes(s)) return [0, o.indexOf(s), s]; if (s === '既有唤醒词') return [2, 0, s]; return [1, 0, s]; };
const push = (sc, c, s) => { const g = gi[c]; if (!g) return; let sg = g.subgroups.find((x) => x.label === s); if (!sg) { sg = { id: g.id + '_' + (g.subgroups.length + 1), label: s, scenes: [] }; g.subgroups.push(sg); } sg.scenes.push(sc); };
const newS = T.filter(isNew).slice().sort((a, b) => { const ka = sk(a.category ?? '', a.subfunction ?? ''), kb = sk(b.category ?? '', b.subfunction ?? ''); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return (a.order ?? 9999) - (b.order ?? 9999); });
for (const t of newS) { const s = { id: t.key, title: t.name, wake_word: t.wake_word, status: '', prompt_template: t.prompt_template }; const ot = OT[t.output_type]; if (ot) s.types = [ot]; push(s, t.category, t.subfunction || '既有唤醒词'); }
const leg = T.filter((t) => !isNew(t)).slice().sort((a, b) => (a.wake_word < b.wake_word ? -1 : 1));
for (const t of leg) push({ id: 'legacy_' + t.wake_word, title: t.wake_word, wake_word: t.wake_word, status: '', prompt_template: t.main_prompt.text }, t.category === '复盘' ? '分析' : t.category, '既有唤醒词');
const res = groups.filter((g) => g.subgroups.length > 0);
for (const g of res) g.subgroups.sort((a, b) => { const ka = sk(g.label, a.label), kb = sk(g.label, b.label); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return 0; });
const assets = { sharedHelpersJs: base.buildSharedHelpersJs(), sharedCssText: base.buildStyleSheet().css };
const variantA = { skill_name: '卡路里', title: '唤醒词速查台', subtitle: '10 分类 · 436 场景 · 更新于 2026-09-09 12:00', contact: { items: [{ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }, { label: 'Issues', value: 'https://github.com/FeatherHunter/SKILLS/issues' }] }, version: '0.2.0', groups: res };
const variantB = { skill_name: '卡路里', title: '唤醒词速查台', subtitle: '10 分类 · 436 场景', version: '0.2.0', contact: { items: [{ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }] }, groups: res };
const a = base.renderHelpShell({ sceneData: variantA, assets }).html;
const b = base.renderHelpShell({ sceneData: variantB, assets }).html;
say('INFO bytes variantA=' + Buffer.byteLength(a, 'utf8') + ' variantB=' + Buffer.byteLength(b, 'utf8') + ' delta=' + (Buffer.byteLength(a, 'utf8') - Buffer.byteLength(b, 'utf8')));
say('INFO delta-explain = subtitle(带时间戳 vs 不带) + contact(Issues 条目) 两处字段差异');
check('两次输入字节不同（P-2 快照影响属实）', a !== b, '');
say('RESULT: ' + (total - fails) + '/' + total + ' fails=' + fails);
console.log(out.join('\n'));
process.exit(fails === 0 ? 0 : 1);
