// t781-清单 自检（入仓）：node docs/skills/skill-schedule/t781-清单.mjs --check
// 绿：exit 0；清单 scenarios 恰 85（id 集与 fixture 逐条相同）；families 恰 18；别名覆盖新仓路由表全部词；
// 行只有老侧事实列（白名单＋黑名单双断言）；JSON/MD 无 BOM；MD 为 JSON 派生（--render 重算比对）。
// 新仓路由词读生成物 routes.generated.ts（780 Layer2 后唯一定义地是各能力 routes.ts；wakewords.ts 只做回退）。
// 红：任一不符即非零退出并打印首个差异。用法：--check 只比对；--render 由 JSON 重写 MD。
import { readFileSync, writeFileSync } from 'node:fs';

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const RP = s => join(REPO, ...s.split('/'));
const JPATH = RP('docs/skills/skill-schedule/场景清单.json');
const MPATH = RP('docs/skills/skill-schedule/场景清单.md');
const FPATH = RP('packages/skill-schedule/test/fixtures/t198-old-scenarios.json');
const WPATH = RP('packages/skill-schedule/src/triggers/routes.generated.ts');
const WPATH_FALLBACK = RP('packages/skill-schedule/src/policy/wakewords.ts');

const fail = m => { console.error('RED: ' + m); process.exit(1); };
const ok = m => console.log('GREEN: ' + m);
const raw = p => {
 const b = readFileSync(p);
 if (b[0] === 0xef && b[1] === 0xbb && b[2] === 0xbf) fail('带 BOM：' + p);
 const t = b.toString('utf8');
 if (t.includes('�')) fail('非法 UTF-8：' + p);
 return t;
};
const esc = s => String(s).replace(/\|/g, '｜').replace(/\r?\n/g, '⏎');

function expectedMD(doc) {
 const L = ['# 场景清单（老侧事实，机器读以 JSON 为准）', '',
  '> 本页由 `t781-清单.mjs --render` 自 JSON 派生，手改即红。行数口径：数据行 85（表头/分隔/分组标题不计）。', ''];
 const groups = [['write', '写入与同步'], ['query', '查询与浏览'], ['plan', '日程与计划'], ['analyze', '分析与洞察'], ['admin', '辅助与管理']];
 for (const [g, name] of groups) {
  const rows = doc.scenarios.filter(s => s.domain === g);
  L.push('## ' + name + '（' + rows.length + '）', '', '| 唤醒词 | scenario_id | 标题 | prompt | 老侧家族 |', '|---|---|---|---|---|');
  for (const r of rows) L.push('| ' + [esc(r.wake_word), esc(r.scenario_id), esc(r.title), esc(r.prompt), esc(r.old_family || ('—（' + r.family_null_reason + '）'))].join(' | ') + ' |');
  L.push('');
 }
 return L.join('\n');
}

const mode = process.argv[2];
const jt = raw(JPATH), ft = raw(FPATH);
let wt; try { wt = raw(WPATH); } catch { wt = raw(WPATH_FALLBACK); }
const doc = JSON.parse(jt);
const fix = JSON.parse(ft);
const fixIds = new Set(); fix.categories.forEach(c => c.wake_words.forEach(w => w.scenarios.forEach(s => fixIds.add(s.scenario_id))));

// C2 85 行且 id 集相同
if (doc.scenarios.length !== 85) fail('scenarios 非 85：' + doc.scenarios.length);
const gotIds = new Set(doc.scenarios.map(s => s.scenario_id));
if (gotIds.size !== 85) fail('scenario_id 不唯一');
for (const id of fixIds) if (!gotIds.has(id)) fail('缺 fixture id：' + id);
for (const id of gotIds) if (!fixIds.has(id)) fail('多出 id：' + id);
// C8 标题/prompt 逐字节
const fixMap = new Map(); fix.categories.forEach(c => c.wake_words.forEach(w => w.scenarios.forEach(s => fixMap.set(s.scenario_id, s))));
for (const r of doc.scenarios) {
 const s = fixMap.get(r.scenario_id);
 if (r.title !== s.scenario_title) fail('标题漂移：' + r.scenario_id);
 if (r.prompt !== s.prompt) fail('prompt 漂移：' + r.scenario_id);
 if (r.wake_word !== s.wake_word) fail('唤醒词漂移：' + r.scenario_id);
}
// C3 白名单列
for (const r of doc.scenarios) {
 const keys = Object.keys(r).sort().join(',');
 const base = ['domain', 'old_family', 'prompt', 'scenario_id', 'title', 'wake_word'].sort().join(',');
 const plus = ['domain', 'family_null_reason', 'old_family', 'prompt', 'scenario_id', 'title', 'wake_word'].sort().join(',');
 if (r.old_family === null) { if (keys !== plus) fail('行多余列：' + r.scenario_id + ' ' + keys); if (!r.family_null_reason) fail('空家族无理由：' + r.scenario_id); }
 else if (keys !== base) fail('行多余列：' + r.scenario_id + ' ' + keys);
}
// C4 黑名单（新侧命令/产物名/出不出页）
const blob = JSON.stringify(doc.scenarios);
const bad = [/schedule\.(record|plan|help)\.[a-z.]+/, /commands\.ts/, /出页|不出页|产物名/];
for (const re of bad) if (re.test(blob)) fail('行含新侧列嫌疑：' + re);
// C5 families 恰 18
if (doc.families.length !== 18) fail('families 非 18：' + doc.families.length);
for (const f of doc.families) {
 for (const k of ['id', 'name_old', 'template_old', 'producer_old', 'landing_old', 'trigger_old', 'blocks_old'])
  if (!(k in f)) fail('家族缺键 ' + k + '：' + f.id);
 if (!Array.isArray(f.blocks_old) || f.blocks_old.length === 0) fail('家族无必现块：' + f.id);
}
const famById = new Map(doc.families.map(f => [f.id, f]));
if (famById.size !== 18) fail('家族 id 不唯一');
for (const r of doc.scenarios) {
 if (r.old_family === null) continue;
 if (r.old_family.startsWith('—外·')) continue;
 const sep = r.old_family.indexOf('｜');
 if (sep < 0) fail('家族引用无分隔符｜：' + r.scenario_id);
 const fid = r.old_family.slice(0, sep), fn = r.old_family.slice(sep + 1);
 const f = famById.get(fid);
 if (!f) fail('家族引用悬空：' + r.scenario_id + ' → ' + fid);
 if (fn !== f.name_old) fail('家族名与 families 不一致：' + r.scenario_id);
}
const newPs = [...wt.matchAll(/phrase:\s*'([^']+)'/g)].map(m => m[1]);
if (newPs.length === 0) fail('新仓路由词读到 0 条（权威源形状已变，先修读数再谈覆盖）');
const coveredNew = new Set(doc.aliases.map(a => a.new_phrase).filter(Boolean));
for (const p of newPs) if (!coveredNew.has(p)) fail('别名缺新词：' + p);
const oldWs = []; fix.categories.forEach(c => c.wake_words.forEach(w => oldWs.push(w.wake_word)));
const coveredOld = new Set(doc.aliases.map(a => a.old_phrase).filter(Boolean));
for (const w of oldWs) if (!coveredOld.has(w)) fail('别名缺老词：' + w);
// C7 MD 派生一致
const exp = expectedMD(doc);
if (mode === '--render') { writeFileSync(MPATH, exp.endsWith('\n') ? exp : exp + '\n', 'utf8'); ok('MD 已重写，数据行 85'); }
else {
 let cur; try { cur = raw(MPATH); } catch { fail('MD 不在盘，先跑 --render'); }
 if (cur !== (exp.endsWith('\n') ? exp : exp + '\n')) fail('MD 非派生（与 JSON 重算不一致，先跑 --render）');
 const dataRows = cur.split('\n').filter(l => l.startsWith('| ') && !l.startsWith('| 唤醒词')).length;
 if (dataRows !== 85) fail('MD 数据行非 85：' + dataRows);
}
ok('85 行=id 集一致；families=18；别名新 ' + newPs.length + '＋老 ' + oldWs.length + ' 全覆盖；零设计列（白＋黑）；无 BOM；MD 派生一致');
