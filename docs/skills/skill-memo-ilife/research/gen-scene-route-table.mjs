// #820 现状链路表：逐个场景量出 prompt → 唤醒词 → 命令 → 参数，并标出会被 #837 哪一条改动。
// 事实源：HELP 资产（官方源）＋ 现路由表实测（routeWakeword 真跑，不是读表猜）。
// 跑法：node docs/skills/skill-memo-ilife/research/gen-scene-route-table.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { routeWakeword } from '../../../../packages/skill-memo-ilife/dist/policy/wakewords.js';

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

/** #821 §4① 已坐实的「能路由但接不住」6 条（逐条带证据行号，出处 t821-唤醒词对账.md）。 */
const BROKEN = {
  memo_remind_existing: '没有命令分支：`memo.create` 只走「先建新笔记再挂提醒」，全包没有 noteId 通道（旧侧是 `remind [note_id]` 位置参数）',
  memo_search_by_date: '`timeRange` 没人读：`memo.search` 只认 q／category／sub，排期过滤走 `dueMatches`',
  memo_completed_reminders: 'preset 进错分支：`{done:false}` 不满足 `mode==="done" || done===true`，落到 status active',
  memo_delete_wish: '**键不删**：指向 `memo.update`（只做字段 patch），删除只有 `memo.remove`（须 confirm）',
  memo_delete_checkin: '同上（preset `{category:"打卡"}`）',
  memo_delete_mood: '同上（preset `{category:"情绪日记"}`）',
};

/** #837 的八条里，哪一条会改到这个场景。 */
const BY_DECISION = {
  memo_remind_existing: '⑥ 设提醒落法',
  memo_search_by_date: '⑤ timeRange 语义',
  memo_delete_wish: '⑦ 删X 的 confirm 从哪来',
  memo_delete_checkin: '⑦ 删X 的 confirm 从哪来',
  memo_delete_mood: '⑦ 删X 的 confirm 从哪来',
  memo_init_setup: '④ 首次使用落哪条命令',
  memo_sync_feishu: '（= 补主名行，无待裁）',
};

const firstSentence = (tpl) => {
  // 源件里换行是**两个字面字符** `\n`（TS 字符串字面量），先还原成真换行再取首行。
  const first = tpl.replace(/\\n/g, '\n').split('\n')[0].replace(/^请帮我/, '').trim();
  const one = first.replace(/\|/g, '｜'); // 表格单元格里不能出现裸竖线
  return one.length > 44 ? one.slice(0, 44) + '…' : one;
};

const rows = [];
for (const d of DOMAINS) {
  const src = readFileSync('packages/skill-memo-ilife/src/help/scenes/' + d.file + '.ts', 'utf8');
  const marks = [...src.matchAll(/label: "([^"]*)",\n\s+scenes:/g)].map((m) => ({ label: m[1], at: m.index }));
  for (const b of src.split(/\n\s*\{\n\s*id: "/).slice(1).map((x) => '{\n      id: "' + x)) {
    const id = b.match(/id: "([a-z_0-9]+)"/)?.[1];
    const title = b.match(/title: "([^"]*)"/)?.[1];
    const wake = b.match(/wake_word: "([^"]*)"/)?.[1];
    if (!id || !wake) continue;
    const tpl = b.match(/prompt_template: "([\s\S]*?)",\n\s+types:/)?.[1] ?? '';
    const types = (b.match(/types: \[([^\]]*)\]/)?.[1] ?? '').split(',').map((x) => x.trim().replace(/"/g, '')).filter(Boolean);
    const idx = src.indexOf('id: "' + id + '"');
    let group = marks[0]?.label ?? '基础';
    for (const m of marks) if (m.at < idx) group = m.label;

    let route = '', detail = '';
    try {
      const r = routeWakeword(wake);
      route = '`' + r.key + '`';
      const p = Object.keys(r.params ?? {});
      detail = p.length ? '参数 ' + p.join('／') : '无预设参数';
    } catch (e) {
      // ⚠️ routeWakeword 两类错别混（本探针第一版就踩了）：
      //   POLICY_NO_MATCH       = 路由表里没有这条词（真·路由不到）
      //   POLICY_MISSING_SLOT   = 词**命中了**，只是 `needs` 槽位没给——路由是通的，只差参数
      if (String(e.code ?? '') === 'POLICY_MISSING_SLOT') {
        const m = String(e.message).match(/^缺槽位 ([^：]+)：(.+)$/);
        route = '`' + (m ? '（命中，缺槽位 ' + m[1] + '）' : '（命中，缺槽位）') + '`';
        detail = '词命中了；槽位 ' + (m ? m[1] : '?') + ' 待补';
      } else {
        route = '**NO_MATCH**';
        detail = '路由表里没有这条词';
      }
    }
    rows.push({ dom: d.label, icon: d.icon, group, id, wake, title, tpl: firstSentence(tpl), types, route, detail });
  }
}

const noMatch = rows.filter((r) => r.route === '**NO_MATCH**');
// ⚠️ NO_MATCH 优先于「接不住」：词根本路由不到时，命令层接不接得住是**后话**，别重复计数。
const broken = rows.filter((r) => BROKEN[r.id] && r.route !== '**NO_MATCH**');
const needSlot = rows.filter((r) => r.route !== '**NO_MATCH**' && !BROKEN[r.id] && r.route.includes('缺槽位'));
const ok = rows.filter((r) => r.route !== '**NO_MATCH**' && !BROKEN[r.id] && !r.route.includes('缺槽位'));
// 既是 NO_MATCH 又在 BROKEN 名单里的（本批只有 `删情绪` 一条）：单独点出来，别静默丢掉。
const both = rows.filter((r) => BROKEN[r.id] && r.route === '**NO_MATCH**');

const L = [];
L.push('# #820 现状链路表：30 场景 × prompt → 唤醒词 → 命令 → 参数');
L.push('');
L.push('**谁读**：#822（册子冻结）、#825（验收形制）、#834（收口）与 8 张域票开工前先读。**这一页给的是「今天是什么样」，不是「应该是什样」** —— 目标态由 #837 的八条 ＋ #838 的实施定。');
L.push('');
L.push('**怎么量**：唤醒词与命令取自官方源（`src/help/scenes/*.ts`）；**「现路由」那一列是把主名真喂给 `routeWakeword()` 跑出来的**（`dist/policy/wakewords.js`），不是读表猜的。生成器 `research/gen-scene-route-table.mjs` 可重跑。');
L.push('');
L.push('## 一 汇总');
L.push('');
L.push('| 状态 | 条数 | 含义 |');
L.push('|---|---|---|');
L.push('| **通** | **' + ok.length + '** | 词直接命中、命令分支也在 |');
L.push('| **命中但需补槽位** | **' + needSlot.length + '** | 词命中了，但表里给它挂了 `needs` 槽位；场景 prompt 里本来就有对应字段，AI 填进去即可 —— **不是缺陷，是口径**（`POLICY_MISSING_SLOT`）。⚠️ 其中 `备忘改子分类` 是**靠别名子串侥幸命中**的，不是真命中 |');
L.push('| **可路由但接不住** | **' + broken.length + '** | 词命中，但命令层做不到场景承诺的事（#821 §4① 坐实） |');
L.push('| **路由不到** | **' + noMatch.length + '** | 路由表里根本没有这条 HELP 主名（`POLICY_NO_MATCH`） |');
L.push('| **合计** | **' + rows.length + '** | —— |');
L.push('');
L.push('### 路由不到的 ' + noMatch.length + ' 条（场景 → 主名）');
L.push('');
for (const r of noMatch) L.push('- ' + r.icon + ' **' + r.wake + '**（`' + r.id + '`，' + r.group + '）');
L.push('');
L.push('⚠️ **探针自己踩过的一个坑**（写在这里免得下一个探针再踩）：`routeWakeword()` 抛**两类**错，别混成一类 ——');
L.push('`POLICY_NO_MATCH`＝路由表里真没有这条词；`POLICY_MISSING_SLOT`＝**词命中了**，只是 `needs` 槽位没给。本探针第一版把两类都当 NO_MATCH，读数虚高成 20 条。');
L.push('');
L.push('### 可路由但接不住的 ' + broken.length + ' 条');
L.push('');
for (const r of broken) L.push('- ' + r.icon + ' **' + r.wake + '**（`' + r.id + '`）：' + BROKEN[r.id] + '　→ 待裁：' + (BY_DECISION[r.id] ?? '—'));
L.push('');
if (both.length) {
  L.push('⚠️ **另 ' + both.length + ' 条「路由不到」的场景，命令层也带着同一个毛病」**（别因为它在上面那一列就漏掉）：');
  L.push('');
  for (const r of both) L.push('- 💭 **' + r.wake + '**（`' + r.id + '`）：主名路由不到，**且**它的别名词今天指向 `memo.update` —— ' + BROKEN[r.id]);
  L.push('');
}
L.push('## 二 30 行逐条');
L.push('');
L.push('| 序 | 域 | 组 | 场景 id | 唤醒词 | prompt 首句 | 命令键（现路由真跑） | 预设 | HELP 页型 | 现状 |');
L.push('|---|---|---|---|---|---|---|---|---|---|');
rows.forEach((r, i) => {
  const state = r.route === '**NO_MATCH**' ? '**路由不到**' : BROKEN[r.id] ? '**接不住**' : r.route.includes('缺槽位') ? '需补槽位' : '通';
  L.push('| ' + (i + 1) + ' | ' + r.icon + ' | ' + r.group + ' | `' + r.id + '` | **' + r.wake + '** | ' + r.tpl + ' | ' + r.route + ' | ' + r.detail + ' | ' + r.types.join('＋') + ' | ' + state + ' |');
});
L.push('');
L.push('## 三 这张表与下游的关系');
L.push('');
L.push('- **链路总表（Destination 第 2 条）**要用后四列 —— `唤醒词 → 命令 → 参数 → 产物路径`。今天第 4 列有 ' + (noMatch.length + broken.length) + ' 行填不出来，正是 #837／#838 要清掉的。');
L.push('- **8 张域票**拿它当核对清单：本域哪几行今天是红的，做完要变绿。');
L.push('- **#837 的八条**：会改到本表的第 ④（首次使用）／⑤（timeRange）／⑥（设提醒）／⑦（删X 的 confirm）条，另加「补主名行」与「撤别名行」两条机械改动。');
L.push('');
L.push('## 四 这一页**不**回答的');
L.push('');
L.push('- 目标态的 `命令键` 取值（取决于 #837 的八条）。');
L.push('- 每个场景最终出几份产物、叫什么名（归 #822）。');
L.push('- `prompt` 的最终文案（本表只取首句做指认，不是定稿）。');
writeFileSync('docs/skills/skill-memo-ilife/t822-现状链路表.md', L.join('\n'), 'utf8');
console.log('30 行表已出：通 ' + ok.length + '／接不住 ' + broken.length + '／路由不到 ' + noMatch.length);
console.log('路由不到：' + noMatch.map((r) => r.wake).join('、'));
