/** t88 探针 6：壳正文结构（剥离 CSS/JS）+ 体积归因 + report 形状。只读。 */
const out = [];
const say = (s) => out.push(s);
const base = await import('../../packages/base-render/dist/index.js');
const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const T = trig.TRIGGERS;
const CATS = [['🏠','主页','home'],['🍚','饮食','diet'],['⚖️','体重','weight'],['🏃','运动','exercise'],['💪','健身计划','workout'],['🎯','目标管理','goal'],['🧬','身体细节','body_detail'],['📸','身材照片','body_photo'],['⚙️','基础信息','profile'],['📊','分析','analysis']];
const ORD = {'基础信息':['设置资料','看档案','改资料'],'目标管理':['定目标','看目标','改目标'],'身体细节':['记身体细节','看身体细节','比身体细节','删身体细节'],'运动':['记运动','改运动','看运动','运动分析','运动复盘'],'身材照片':['存身材照','看身材照','比身材照','管身材照'],'饮食':['记饮食','改饮食','看饮食','查食品','看营养','看排行','饮食复盘','餐别分布'],'健身计划':['定训练计划','看训练计划','改训练计划','落地训练','计划复盘','安全检查']};
const OT = { process:'过程', result:'结果', receipt:'回执' };
const isNew = (t) => 'output_type' in t && 'prompt_template' in t;
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
const sceneData = { skill_name: '卡路里', title: '唤醒词速查台', subtitle: '10 分类 · 436 场景', version: '0.2.0', contact: { items: [{ label: 'GitHub', value: 'https://github.com/FeatherHunter/SKILLS' }] }, groups: res };
const assets = { sharedHelpersJs: base.buildSharedHelpersJs(), sharedCssText: base.buildStyleSheet().css };
const o = base.renderHelpShell({ sceneData, assets });
const html = o.html;
const body = html.replace(/<style>[\s\S]*?<\/style>/g, '').replace(/<script[\s\S]*?<\/script>/g, '');
say('RESULT-TOTAL-BYTES ' + Buffer.byteLength(html, 'utf8'));
say('RESULT-BODY-BYTES ' + Buffer.byteLength(body, 'utf8'));
say('RESULT-CSS-BYTES ' + Buffer.byteLength(assets.sharedCssText, 'utf8'));
say('RESULT-HELPERS-BYTES ' + Buffer.byteLength(assets.sharedHelpersJs, 'utf8'));
say('RESULT-PAYLOAD-BYTES ' + (html.match(/<script id="[^"]*"[^>]*>[\s\S]*?<\/script>/)?.[0].length ?? -1));
say('RESULT-PLACEHOLDER-RESIDUE ' + ['<!--INJECT-DATA-->','<!--SHARED-CSS-->','<!--SHARED-HELPERS-->','<!--CHARTS-HELPERS-->','<!--CONTENT-->'].map((m) => m + '=' + (html.split(m).length - 1)).join(' '));
say('RESULT-REPORT ' + JSON.stringify(o.report));
// 正文特征
const feats = {
  'tab-bar': /class="ilife-help-shell-tab-bar"/, 'tab-input(radio)': /type="radio"/, 'tab-label': /class="ilife-help-shell-tab"/,
  'page': /class="ilife-help-shell-page"/, 'subgroup(details)': /class="ilife-help-shell-subgroup"/,
  'card': /class="ilife-help-shell-card"/, 'card-title': /class="ilife-help-shell-card-title"/,
  'cli-code': /class="ilife-help-shell-cli"/, 'sheet(details)': /class="ilife-help-shell-sheet"/,
  'prompt-pre': /class="ilife-help-shell-prompt"/, 'actions-row': /class="ilife-help-shell-actions"/,
  'hero': /class="ilife-help-shell-hero"/, 'lead': /class="ilife-help-shell-lead"/,
  'about-page': /data-page="about"/, 'meta-block': /class="ilife-help-shell-meta-block"/,
  'search-input': /<input[^>]*type="search"/, 'mark-tag': /<mark/, 'backtop': /backTop|back-top/,
  'empty-state': /ilife-controls-empty|emptyState|empty-state/,
  'toast': /data-ilife-helpers|ilife-controls-toast|toast/,
};
for (const [k, re] of Object.entries(feats)) say('BODY-HAS-' + k + ' ' + re.test(body));
// 复制按钮分布
say('BODY-COPY-BUTTONS ' + (body.match(/data-action-id=/g) ?? []).length);
// R1-14 修：原 `[\s\S]{0,400}?` 窗口度量测不出结构性事实 → 改为按 <article> 分段，
// 只统计「Sheet 之外（卡头）」出现 data-action-id 的卡数。
const cardSegs = body.split('<article class="ilife-help-shell-card"').slice(1);
const cardHeadWithBtn = cardSegs.filter((s) => {
  const end = s.indexOf('</article>');
  const seg = end >= 0 ? s.slice(0, end) : s;
  const sheetIdx = seg.indexOf('<details class="ilife-help-shell-sheet"');
  return (sheetIdx >= 0 ? seg.slice(0, sheetIdx) : seg).includes('data-action-id=');
});
say('BODY-CARD-COUNT ' + cardSegs.length);
say('BODY-CARD-HEAD-WITH-BTN ' + cardHeadWithBtn.length + ' (0 = 静态壳无卡级按钮，证实 R1-1)');
// data-t 体积
const noT = html.replace(/ data-t="[^"]*"/g, '');
say('RESULT-BYTES-WITHOUT-DATA-T ' + Buffer.byteLength(noT, 'utf8'));
console.log(out.join('\n'));
