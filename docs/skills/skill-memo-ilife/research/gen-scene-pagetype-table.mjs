// 生成 #822（册子冻结）的输入表：HELP 的 30 场景 × 页型声明，纯事实、零提案。
// 事实源：packages/skill-memo-ilife/src/help/scenes/*.ts（机器生成，禁手改）+ 老技能 6 模板映射（调查报告）。
import { readFileSync, writeFileSync } from 'node:fs';

const DOMAINS = [
  { file: 'memo', label: '备忘类', icon: '📝' },
  { file: 'search', label: '查找类', icon: '🔍' },
  { file: 'remind', label: '提醒类', icon: '⏰' },
  { file: 'wish', label: '心愿类', icon: '🎯' },
  { file: 'checkin', label: '打卡类', icon: '✅' },
  { file: 'mood', label: '情绪类', icon: '💭' },
  { file: 'sync', label: '同步类', icon: '🔄' },
  { file: 'init', label: '初始化类', icon: '🚀' },
];

/** 老技能 6 份模板 → 场景 的映射（出处：docs/skills/skill-memo-ilife/research/old-memo-html-survey.md §3）。 */
const OLD_TPL = {
  memo_search_keyword: 'memo_query.html', memo_search_alias: 'memo_query.html', memo_get_detail: 'memo_query.html',
  memo_search_by_date: 'memo_query.html', memo_search_wish: 'memo_query.html', memo_search_checkin: 'memo_query.html',
  memo_search_mood: 'memo_query.html', memo_reminders_active: 'memo_query.html', memo_completed_reminders: 'memo_query.html',
  memo_wish_schedule: 'wish_plan.html', memo_complete_wish: 'wish_complete.html',
  memo_batch_change_category: 'change_category.html', memo_sync_feishu: 'sync_report.html', memo_init_setup: 'init_report.html',
};

const rows = [];
for (const d of DOMAINS) {
  const src = readFileSync('packages/skill-memo-ilife/src/help/scenes/' + d.file + '.ts', 'utf8');
  // 场景块：id → title → wake_word → ... → types: [...]
  const blocks = src.split(/\n\s*\{\n\s*id: "/).slice(1).map((b) => '{\n      id: "' + b);
  const subGroups = [...src.matchAll(/id: "([a-z_0-9]+)",\n\s+label: "([^"]*)",\n\s+scenes:/g)].map((m) => ({ id: m[1], label: m[2] }));
  for (const b of blocks) {
    const id = b.match(/id: "([a-z_0-9]+)"/)?.[1];
    const title = b.match(/title: "([^"]*)"/)?.[1];
    const wake = b.match(/wake_word: "([^"]*)"/)?.[1];
    if (!id || !wake) continue; // 二级组块也有 id/label，但没有 wake_word —— 只收场景
    const types = (b.match(/types: \[([^\]]*)\]/)?.[1] ?? '').split(',').map((s) => s.trim().replace(/"/g, '')).filter(Boolean);
    rows.push({ dom: d.label, icon: d.icon, id, title, wake, types, old: OLD_TPL[id] ?? '—' });
  }
}

// 组归属（按域文件里的书写序切段）
const withGroup = [];
let gi = 0;
for (const d of DOMAINS) {
  const src = readFileSync('packages/skill-memo-ilife/src/help/scenes/' + d.file + '.ts', 'utf8');
  const marks = [...src.matchAll(/label: "([^"]*)",\n\s+scenes:/g)].map((m) => ({ label: m[1], at: m.index }));
  const mine = rows.filter((r) => r.dom === d.label);
  for (const r of mine) {
    const idx = src.indexOf('id: "' + r.id + '"');
    let g = marks[0]?.label ?? '基础';
    for (const m of marks) if (m.at < idx) g = m.label;
    withGroup.push({ ...r, group: g });
  }
  gi += marks.length;
}

const tally = {};
for (const r of withGroup) for (const t of r.types) tally[t] = (tally[t] ?? 0) + 1;
const total = withGroup.reduce((a, r) => a + r.types.length, 0);

const lines = [];
lines.push('# #822 册子冻结 · 输入表（HELP 的 30 场景 × 页型声明）');
lines.push('');
lines.push('**性质**：**纯事实，零提案** —— 内容全部读自官方源 `packages/skill-memo-ilife/src/help/scenes/*.ts`（机器生成、禁手改）与老技能的 6 份模板映射。**这张表不做任何设计决定**；份数、命名、页型族怎么归并，是 #822 要裁的事。');
lines.push('');
lines.push('**生成器**：`docs/skills/skill-memo-ilife/research/gen-scene-pagetype-table.mjs`（可重跑；源改了重跑即同步）。');
lines.push('');
lines.push('## 一 汇总读数');
lines.push('');
lines.push('| 页型（HELP 自己声明的 `types`） | 条数 |');
lines.push('|---|---|');
for (const k of ['采集', '回执', '向导', '查看']) lines.push('| ' + k + ' | ' + (tally[k] ?? 0) + ' |');
lines.push('| **合计格数**（逐型算一份产物） | **' + total + '** |');
lines.push('');
lines.push('- 场景数 **' + withGroup.length + '**；唯一唤醒词 **' + new Set(withGroup.map((r) => r.wake)).size + '**（`备忘改分类` 单条与批量共用一词）。');
lines.push('- 30 条**全部**带「回执」；20 条带「采集」；10 条带「查看」；4 条带「向导」。');
lines.push('- 老技能**实际出 HTML 只有 14 条**（下表「老技能产物」列写出），其余 16 条老技能只回 JSON。');
lines.push('');
lines.push('## 二 30 场景逐条');
lines.push('');
lines.push('| 序 | 域 | 二级组 | 场景 id | 唤醒词 | 标题 | HELP 声明的页型 | 老技能产物 |');
lines.push('|---|---|---|---|---|---|---|---|');
withGroup.forEach((r, i) => {
  lines.push('| ' + (i + 1) + ' | ' + r.icon + ' ' + r.dom + ' | ' + r.group + ' | `' + r.id + '` | **' + r.wake + '** | ' + r.title + ' | ' + r.types.join(' ＋ ') + ' | ' + (r.old === '—' ? '**不出页**' : '`' + r.old + '`') + ' |');
});
lines.push('');
lines.push('## 三 老技能 6 份模板各盖几条场景');
lines.push('');
const byOld = {};
for (const r of withGroup) if (r.old !== '—') (byOld[r.old] ??= []).push(r.wake + '（' + r.id + '）');
for (const [tpl, list] of Object.entries(byOld)) lines.push('- `' + tpl + '` ← **' + list.length + ' 条**：' + list.join('、'));
lines.push('- 其余 **' + withGroup.filter((r) => r.old === '—').length + ' 条**：老技能不出页（只回 stdout JSON）。');
lines.push('');
lines.push('## 四 #822 要裁的就是下面这些（本表不代答）');
lines.push('');
lines.push('1. **份数**：' + total + ' 格全出，还是收窄？（已定的口径是「照 `types` 逐型出页」。）');
lines.push('2. **形状归并**：这 ' + total + ' 格归并成几个形状族、每族一条渲染路径？');
lines.push('3. **命名规则**：产物发布名怎么算、**只在一处算**（两侧不一致＝全墙集体死链）。');
lines.push('4. **产物目录**：落 `<库目录>/memo_html/`（扁平，照 #220 裁决 1），还是另开一层？');
lines.push('5. **老技能不出页的那 ' + withGroup.filter((r) => r.old === '—').length + ' 条**没有版式对照基准，形状自由度更大 —— 要不要另立口径？');
lines.push('');
writeFileSync('docs/skills/skill-memo-ilife/t822-册子输入-场景页型表.md', lines.join('\n'), 'utf8');
console.log('场景 ' + withGroup.length + ' 条；合计格数 ' + total + '；页型计数 ' + JSON.stringify(tally));
console.log('老技能出页 ' + withGroup.filter((r) => r.old !== '—').length + ' 条；不出页 ' + withGroup.filter((r) => r.old === '—').length + ' 条');
console.log('已落盘 docs/skills/skill-memo-ilife/t822-册子输入-场景页型表.md');
