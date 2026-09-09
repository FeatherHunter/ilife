/** t88 A1 复算（断言式 · R1-3）：把 render_help_center.py:96-194 的规则在新 SoT 上复算，
 *  逐条断言 10 分组／54 子功能／436 场景／id 436-436／types 329·79·6·22／`____` 130／「三句话」436。
 *  跑法：node docs/research/t88-probe-contract.mjs   （只读；fails>0 → exit 1）
 *  说明：本脚本不读 F3（只 import dist/triggers）；F3 侧逐字段对账由红队 `red-f3-parity.mjs` 完成（diffs=0）。 */
const out = [];
let fails = 0;
let total = 0;
const say = (s) => out.push(s);
function check(name, ok, detail) {
  total += 1;
  if (!ok) fails += 1;
  say((ok ? 'PASS ' : 'FAIL ') + name + (detail === undefined ? '' : ' :: ' + detail));
}

const trig = await import('../../packages/skill-calorie/dist/triggers/index.js');
const T = trig.TRIGGERS;

/* ── 规则（逐字对齐 D:\2Study\StudyNotes\SKILLS\卡路里\scripts\render_help_center.py） ── */
const CATEGORIES_V3 = [
  ['🏠', '主页', 'home'], ['🍚', '饮食', 'diet'], ['⚖️', '体重', 'weight'],
  ['🏃', '运动', 'exercise'], ['💪', '健身计划', 'workout'], ['🎯', '目标管理', 'goal'],
  ['🧬', '身体细节', 'body_detail'], ['📸', '身材照片', 'body_photo'], ['⚙️', '基础信息', 'profile'],
  ['📊', '分析', 'analysis'],
];
const LEGACY_NAME = { '复盘': '分析' };
const SUBFUNC_ORDER = {
  '基础信息': ['设置资料', '看档案', '改资料'],
  '目标管理': ['定目标', '看目标', '改目标'],
  '身体细节': ['记身体细节', '看身体细节', '比身体细节', '删身体细节'],
  '运动': ['记运动', '改运动', '看运动', '运动分析', '运动复盘'],
  '身材照片': ['存身材照', '看身材照', '比身材照', '管身材照'],
  '饮食': ['记饮食', '改饮食', '看饮食', '查食品', '看营养', '看排行', '饮食复盘', '餐别分布'],
  '健身计划': ['定训练计划', '看训练计划', '改训练计划', '落地训练', '计划复盘', '安全检查'],
};
const OUTPUT_TYPE_LABELS = { process: '过程', result: '结果', receipt: '回执' };
const isNew = (t) => 'output_type' in t && 'prompt_template' in t;

const groups = [];
const gi = {};
for (const [icon, name, key] of CATEGORIES_V3) {
  const g = { id: key, icon, label: name, subgroups: [] };
  groups.push(g); gi[name] = g;
}
const subKey = (cat, sub) => {
  const o = SUBFUNC_ORDER[cat] ?? [];
  if (o.includes(sub)) return [0, o.indexOf(sub), sub];
  if (sub === '既有唤醒词') return [2, 0, sub];
  return [1, 0, sub];
};
const push = (scene, cat, sub) => {
  const g = gi[cat]; if (!g) return;
  let sg = g.subgroups.find((x) => x.label === sub);
  if (!sg) { sg = { id: g.id + '_' + (g.subgroups.length + 1), label: sub, scenes: [] }; g.subgroups.push(sg); }
  sg.scenes.push(scene);
};
const newS = T.filter(isNew).slice().sort((a, b) => {
  const ka = subKey(a.category ?? '', a.subfunction ?? ''); const kb = subKey(b.category ?? '', b.subfunction ?? '');
  for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1;
  const oa = a.order ?? 9999; const ob = b.order ?? 9999;
  if (oa !== ob) return oa - ob;
  return String(a.name ?? '') < String(b.name ?? '') ? -1 : 1;
});
for (const t of newS) {
  const s = { id: t.key ?? t.wake_word, title: t.name ?? t.wake_word, wake_word: t.wake_word, status: '', prompt_template: t.prompt_template ?? '' };
  const ot = OUTPUT_TYPE_LABELS[t.output_type ?? '']; if (ot) s.types = [ot];
  push(s, t.category ?? '', t.subfunction || '既有唤醒词');
}
const legacyS = T.filter((t) => !isNew(t)).slice().sort((a, b) => (a.wake_word < b.wake_word ? -1 : 1));
for (const t of legacyS) {
  const s = { id: 'legacy_' + t.wake_word, title: t.wake_word, wake_word: t.wake_word, status: '', prompt_template: (t.main_prompt ?? {}).text ?? '' };
  push(s, LEGACY_NAME[t.category] ?? (t.category ?? '分析'), '既有唤醒词');
}
const res = groups.filter((g) => g.subgroups.length > 0);
for (const g of res) g.subgroups.sort((a, b) => { const ka = subKey(g.label, a.label); const kb = subKey(g.label, b.label); for (let i = 0; i < 3; i += 1) if (ka[i] !== kb[i]) return ka[i] < kb[i] ? -1 : 1; return 0; });

const totalScenes = res.reduce((n, g) => n + g.subgroups.reduce((m, sg) => m + sg.scenes.length, 0), 0);
const all = res.flatMap((g) => g.subgroups.flatMap((sg) => sg.scenes));
const subTotal = res.reduce((n, g) => n + g.subgroups.length, 0);
const typeHist = all.reduce((a, s) => { const k = (s.types ?? ['(none)']).join(','); a[k] = (a[k] ?? 0) + 1; return a; }, {});

/* ── 断言（A1「由脚本断言」） ── */
check('分组数 = 10', res.length === 10, String(res.length));
check('子功能数 = 54', subTotal === 54, String(subTotal));
check('场景数 = 436', totalScenes === 436, String(totalScenes));
check('id 唯一 436/436', new Set(all.map((s) => s.id)).size === 436, new Set(all.map((s) => s.id)).size + '/436');
check('分组序 = F3 序', JSON.stringify(res.map((g) => g.id)) === JSON.stringify(['home', 'diet', 'weight', 'exercise', 'workout', 'goal', 'body_detail', 'body_photo', 'profile', 'analysis']), JSON.stringify(res.map((g) => g.id)));
check('每分组子功能数 = F3', JSON.stringify(res.map((g) => g.subgroups.length)) === JSON.stringify([3, 9, 8, 5, 6, 3, 4, 4, 3, 9]), JSON.stringify(res.map((g) => g.subgroups.length)));
check('子功能 id 形如 {group}_{n}', res.every((g) => g.subgroups.every((sg, i) => sg.id === g.id + '_' + (i + 1))), '');
check('types 结果 = 329', typeHist['结果'] === 329, String(typeHist['结果']));
check('types 回执 = 79', typeHist['回执'] === 79, String(typeHist['回执']));
check('types 过程 = 6', typeHist['过程'] === 6, String(typeHist['过程']));
check('无 types = 22（legacy）', typeHist['(none)'] === 22, String(typeHist['(none)']));
check('prompt 含 ____ = 130', all.filter((s) => s.prompt_template.includes('____')).length === 130, String(all.filter((s) => s.prompt_template.includes('____')).length));
check('prompt 含「三句话」= 436', all.filter((s) => s.prompt_template.includes('三句话')).length === 436, String(all.filter((s) => s.prompt_template.includes('三句话')).length));
check('prompt 无空串', all.every((s) => s.prompt_template !== ''), '');
check('prompt 无 </script>／<!--（R1-12 守卫）', all.every((s) => !s.prompt_template.includes('</script>') && !s.prompt_template.includes('<!--')), '');
// L-18（本 session 自查发现）：SoT `CATEGORIES` 的 diet 展示名是「饮食记录」（index.ts:21），
// 而 F3／render_help_center.py:44 是「饮食」→ 故守卫不能写成「HELP_GROUPS.label ⊆ CATEGORIES.label」。
check('分组 label 逐字 = F3 十组', JSON.stringify(res.map((g) => g.label)) === JSON.stringify(['主页', '饮食', '体重', '运动', '健身计划', '目标管理', '身体细节', '身材照片', '基础信息', '分析']), JSON.stringify(res.map((g) => g.label)));
check('L-18 diet 展示名差异已登记（SoT=饮食记录 / F3=饮食）', trig.CATEGORIES.find(([, , k]) => k === 'diet')[1] === '饮食记录' && res.find((g) => g.id === 'diet').label === '饮食', '');
say('RESULT: ' + (total - fails) + '/' + total + ' fails=' + fails);
console.log(out.join('\n'));
process.exit(fails === 0 ? 0 : 1);
