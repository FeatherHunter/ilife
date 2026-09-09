/** t88 返修探针 R1：验证红蓝两席的关键主张（只读，不写任何共享路径）。
 *  跑法：node .scratch/t88/probe-rework1.mjs
 *  口径：纯读 dist＋冻结实例；断言式（不符即 exit≠0）。 */
const out = [];
let fails = 0;
let total = 0;
const say = (s) => out.push(s);
function check(name, ok, detail) {
  total += 1;
  if (!ok) fails += 1;
  say((ok ? 'PASS ' : 'FAIL ') + name + (detail === undefined ? '' : ' :: ' + detail));
}

const base = await import('../../packages/base-render/dist/index.js');
const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const T = trig.TRIGGERS;
const isNew = (t) => 'output_type' in t && 'prompt_template' in t;
const legacy = T.filter((t) => !isNew(t));

/* ── R1-7：22 条 legacy 的真 CLI 可用性 ── */
const clis = legacy.map((t) => (t.main_prompt ?? {}).cli ?? '');
check('R1-7 legacy 22 条 main_prompt.cli 全非空', clis.every((c) => typeof c === 'string' && c.trim() !== ''), 'n=' + clis.length);
check('R1-7 legacy cli 互不重复', new Set(clis).size === clis.length, new Set(clis).size + '/' + clis.length);
check('R1-7 legacy cli 与 414 键无碰撞', clis.every((c) => !T.some((t) => isNew(t) && t.key === c)), '');
say('INFO legacy-cli-sample ' + JSON.stringify(clis.slice(0, 3)));
say('INFO legacy-id-if-wakeword ' + JSON.stringify(legacy.slice(0, 2).map((t) => 'legacy_' + t.wake_word)));

/* ── R1-1：卡级复制可达性（静态壳 vs 运行时注入） ── */
const CATS = [['🏠', '主页', 'home'], ['🍚', '饮食', 'diet'], ['⚖️', '体重', 'weight'], ['🏃', '运动', 'exercise'], ['💪', '健身计划', 'workout'], ['🎯', '目标管理', 'goal'], ['🧬', '身体细节', 'body_detail'], ['📸', '身材照片', 'body_photo'], ['⚙️', '基础信息', 'profile'], ['📊', '分析', 'analysis']];
const ORD = { '基础信息': ['设置资料', '看档案', '改资料'], '目标管理': ['定目标', '看目标', '改目标'], '身体细节': ['记身体细节', '看身体细节', '比身体细节', '删身体细节'], '运动': ['记运动', '改运动', '看运动', '运动分析', '运动复盘'], '身材照片': ['存身材照', '看身材照', '比身材照', '管身材照'], '饮食': ['记饮食', '改饮食', '看饮食', '查食品', '看营养', '看排行', '饮食复盘', '餐别分布'], '健身计划': ['定训练计划', '看训练计划', '改训练计划', '落地训练', '计划复盘', '安全检查'] };
const OT = { process: '过程', result: '结果', receipt: '回执' };
const groups = []; const gi = {};
for (const [icon, name, key] of CATS) { const g = { id: key, icon, label: name, subgroups: [] }; groups.push(g); gi[name] = g; }
const sk = (c, s) => { const o = ORD[c] ?? []; if (o.includes(s)) return [0, o.indexOf(s), s]; if (s === '既有唤醒词') return [2, 0, s]; return [1, 0, s]; };
const push = (sc, c, s) => { const g = gi[c]; if (!g) return; let sg = g.subgroups.find((x) => x.label === s); if (!sg) { sg = { id: g.id + '_' + (g.subgroups.length + 1), label: s, scenes: [] }; g.subgroups.push(sg); } sg.scenes.push(sc); };
const newS = T.filter(isNew).slice().sort((a, b) => { const ka = sk(a.category ?? '', a.subfunction ?? ''), kb = sk(b.category ?? '', b.subfunction ?? ''); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return (a.order ?? 9999) - (b.order ?? 9999); });
for (const t of newS) { const s = { id: t.key, title: t.name, wake_word: t.wake_word, status: '', prompt_template: t.prompt_template }; const ot = OT[t.output_type]; if (ot) s.types = [ot]; push(s, t.category, t.subfunction || '既有唤醒词'); }
const leg = legacy.slice().sort((a, b) => (a.wake_word < b.wake_word ? -1 : 1));
for (const t of leg) push({ id: 'legacy_' + t.wake_word, title: t.wake_word, wake_word: t.wake_word, status: '', prompt_template: (t.main_prompt ?? {}).text ?? '' }, t.category === '复盘' ? '分析' : t.category, '既有唤醒词');
const res = groups.filter((g) => g.subgroups.length > 0);
for (const g of res) g.subgroups.sort((a, b) => { const ka = sk(g.label, a.label), kb = sk(g.label, b.label); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return 0; });
const sceneData = { skill_name: '卡路里', title: '唤醒词速查台', version: '0.2.0', contact: { items: [{ label: 'GitHub', value: 'x' }] }, groups: res };
const html = base.renderHelpShell({ sceneData, assets: { sharedHelpersJs: base.buildSharedHelpersJs(), sharedCssText: base.buildStyleSheet().css } }).html;

// 结构性度量（不用窗口正则）：按 <article class="ilife-help-shell-card" ...> 切段
const segs = html.split('<article class="ilife-help-shell-card"').slice(1);
check('R1-1 卡段数=436', segs.length === 436, String(segs.length));
const cardLevelBtn = segs.filter((s) => {
  const end = s.indexOf('</article>');
  const body = end >= 0 ? s.slice(0, end) : s;
  const sheetIdx = body.indexOf('<details class="ilife-help-shell-sheet"');
  const head = sheetIdx >= 0 ? body.slice(0, sheetIdx) : body;
  return head.includes('data-action-id=');
});
check('R1-1 卡级（Sheet 外）按钮 = 0（现状）', cardLevelBtn.length === 0, String(cardLevelBtn.length));

// Sheet 内 prompt 按钮 data-t 与 <pre> 文本逐字等长
let pairs = 0; let equal = 0;
for (const s of segs) {
  const pre = s.match(/<pre class="ilife-help-shell-prompt">([\s\S]*?)<\/pre>/);
  const btn = s.match(/data-action-id="ilife-help-copy-prompt" data-t="([^"]*)"/);
  if (!pre || !btn) continue;
  pairs += 1;
  const preText = pre[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  if (preText === btn[1].replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')) equal += 1;
}
check('R1-1 Sheet prompt data-t 与 <pre> 逐字相等 436/436', pairs === 436 && equal === 436, pairs + ' pairs, equal ' + equal);

// helpers 委派证据
const js = base.buildSharedHelpersJs();
check('R1-1 helpers 是 [data-action-id] 事件委派', js.includes('ACTION_ATTR') && js.includes('addEventListener("click"') && js.includes('getAttribute(TEXT_ATTR)'), '');
check('R1-1 helpers 未限定 class（任意元素带 actionId+data-t 均可点）', !/closest\(["'][^"']*copy/.test(js), '');

/* ── R1-2：6/6 冻结标记 ── */
const markers = Object.values(base.TEMPLATE_MARKERS ?? {});
say('INFO TEMPLATE_MARKERS ' + JSON.stringify(base.TEMPLATE_MARKERS ?? null));
const report = base.renderHelpShell({ sceneData, assets: { sharedHelpersJs: base.buildSharedHelpersJs(), sharedCssText: base.buildStyleSheet().css } }).report;
check('R1-2 report.markers 六项', Array.isArray(report.markers) && report.markers.length === 6, String(report.markers?.length));
check('R1-2 六项键集合', JSON.stringify(report.markers.map((m) => m.key)) === JSON.stringify(['injectData', 'content', 'sharedHelpers', 'sharedCss', 'chartsHelpers', 'noShared']), JSON.stringify(report.markers.map((m) => m.key)));
const gen = [...html.matchAll(/<!--[A-Z0-9-]+-->/g)].map((m) => m[0]);
check('R1-2 产物内泛化标记残留 = 0', gen.length === 0, JSON.stringify(gen.slice(0, 3)));

/* ── R1-6：T9＋T11 双锁（**R-cond-4 修**：原 `viol()` 硬切 `ilife-help-shell-` 前缀 →
 *  `ilife-card-*` 备选恒判「违规」、该组断言空转。现改为**逐字复用 `style.test.mjs` 的判据**：
 *  T9 = 类名必须落在 `CONTROL_STYLE_SECTIONS × SECTION_ROOTS.ns` 闭集根内（`style.test.mjs:270-278`）；
 *  T11 = `ilife-help-shell-<suffix>` 的 suffix ∈ `src/help.ts` 的 `cls()` 实参字面量（或 startsWith 其一）
 *  （`style.test.mjs:302-315` ＋ `:162-168`）。── */
const SRC_HELP = await import('node:fs').then((fs) => fs.readFileSync(new URL('../../packages/base-render/src/help.ts', import.meta.url), 'utf8'));
const SRC_STYLE_TEST = await import('node:fs').then((fs) => fs.readFileSync(new URL('../../packages/base-render/test/style.test.mjs', import.meta.url), 'utf8'));
// SECTION_ROOTS（style.test.mjs:59-68）：区名 → 命名空间根。
const SECTION_NS = {};
for (const m of SRC_STYLE_TEST.matchAll(/^\s{2}(\w+):\s*\{\s*ns:\s*'([^']+)'/gm)) SECTION_NS[m[1]] = m[2];
const T9_ROOTS = Object.values(SECTION_NS).map((ns) => 'ilife-' + ns);
const literals = new Set([...SRC_HELP.matchAll(/cls\('([^']*)'/g)].map((m) => m[1]));
for (const m of SRC_HELP.matchAll(/cls\("([^"]*)"/g)) literals.add(m[1]);
literals.add('help-shell');
/** T9：类名归属某个闭集根。 */
const t9ok = (name) => T9_ROOTS.some((r) => name === r || name.startsWith(r));
/** T11：仅对 helpShell 命名空间内的类名生效（其余区由 T10 管）。 */
const t11ok = (name) => {
  const prefix = 'ilife-help-shell-';
  if (!name.startsWith(prefix)) return true;
  const suffix = name.slice(prefix.length);
  return literals.has(suffix) || [...literals].some((lit) => suffix.startsWith(lit));
};
const viol = (name) => !(t9ok(name) && t11ok(name));
const css = base.buildStyleSheet().css;
const nsClasses = [...new Set([...css.matchAll(/\.(ilife-[A-Za-z0-9_-]+)/g)].map((m) => m[1]))];
check('R1-6 基线：产出 CSS 全部类名 0 违规（T9＋T11）', nsClasses.filter(viol).length === 0, String(nsClasses.length) + ' classes');
for (const c of ['ilife-help-shell-search', 'ilife-help-shell-hitcount', 'ilife-help-shell-backtop', 'ilife-help-shell-mark']) {
  check('R1-6 旧方案类 ' + c + ' 应被拦', viol(c) === true, viol(c) ? '违规（T11 拦）' : '（未拦＝判据失效）');
}
for (const c of ['ilife-help-shell-card-copy', 'ilife-help-shell-card-mark', 'ilife-help-shell-tab-search', 'ilife-help-shell-page-hitcount', 'ilife-help-shell-btn-backtop']) {
  check('R1-6 采用类 ' + c + ' 应双绿', viol(c) === false, viol(c) ? '（违规）' : '（T9＋T11 双绿）');
}
for (const c of ['ilife-card-copy', 'ilife-card-search', 'ilife-card-hitcount', 'ilife-card-backtop', 'ilife-card-mark']) {
  check('R1-6 备选前缀 ' + c + ' 应撞 T9', viol(c) === true, viol(c) ? '违规（撞 T9 闭集）' : '（未拦＝判据失效）');
}
say('RESULT: ' + (total - fails) + '/' + total + ' fails=' + fails);
console.log(out.join('\n'));
process.exit(fails === 0 ? 0 : 1);
