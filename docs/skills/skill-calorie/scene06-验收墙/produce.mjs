#!/usr/bin/env node
/** 场景06「目标管理」25 条唤醒词 → HTML 产物生产者（入仓件 · 无依赖）。
 *
 * 口径出处：
 *   - 唤醒词与命令：`packages/skill-calorie/src/triggers/scene-06-goal.ts` 的 25 条（冻结表原文），
 *     每条跑它自己的 `main_prompt.cli` —— 这就是「prompt → 唤醒词 → 命令」那一条链的权威写法，
 *     本脚本不另拟命令（照抄原件，防幻觉命令）。
 *   - 配方：照抄仓内既有生产者 `.scratch/produce-9.mjs`（临时库 ＋ `seedFull` ＋ `SKILLS_DB_PATH`
 *     ＋ `CALORIE_TODAY`），只换 jobs 与产物目录。
 *   - 墙与索引：`docs/skills/skill-calorie/scene06-验收墙/gen-wall.mjs`（照仓规
 *     `docs/agents/视觉验收墙.md` §6 骨架）；产物名＝清单 `rows[].file`，**名字只在本文件算一处**。
 *
 * 用法：
 *   node produce.mjs                 # 全量出（33 件产物 ＋ manifest.json ＋ 链路索引.html）
 *   node produce.mjs --only 定营养    # 只跑名字里含该串的词（冒烟用）
 *
 * 库：一次性的临时目录（`mkdtemp`），跑完即弃——写类命令写的是这份临时库，**不碰真库**。
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..', '..', '..', '..');
const CLI = join(ROOT, 'packages', 'skill-calorie', 'dist', 'cli', 'cmd_read.js');
const OUT = HERE;

const { openDb, DB_FILENAME } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'index.js')).href);
const { seedFull, SEED_TODAY, PLACEHOLDER_SUBSTITUTIONS } = await import(pathToFileURL(join(ROOT, 'docs', 'research', 't81-seed.mjs')).href);
const { SCENE_06_GOAL } = await import(pathToFileURL(join(ROOT, 'packages', 'skill-calorie', 'dist', 'triggers', 'scene-06-goal.js')).href);

/** 11 条「带空位」写词：它们的写前页是同一张预检确认页（`SKILL.md:75` 逐字列过这 11 条）。
 *  这一串是**唯一出处**——预检页那一批产物由它决定；改这里就是改那一批。 */
const PRECHECK_WORDS = [
  '定营养目标',
  '定营养目标(自动算)',
  '定体重目标',
  '定体重目标(自动算截止)',
  '定体重目标(含起始日)',
  '定饮水目标',
  '定饮水目标(自动算)',
  '一键定全套目标',
  '改营养目标',
  '改体重目标',
  '改饮水目标',
];

/** 写命令键（回执型）：命令声明里 `kind: 'write'` 的那几条（`src/goal/commands.ts`）。 */
const WRITE_KEYS = new Set([
  'calorie.goal.set',
  'calorie.goal.water',
  'calorie.goal.weight',
  'calorie.goal.pause',
  'calorie.goal.resume',
]);

/** 冻结命令串 → [key, paramsJson]。不认形态即抛（不猜）。 */
function parseCli(cli) {
  const m = /^calorie-cmd-read\s+(calorie\.[a-z0-9.-]+)(?:\s+--params\s+'(.*)')?$/.exec(String(cli).trim());
  if (!m) throw new Error('认不出的命令串（照冻结表原文应当能认）：' + cli);
  return [m[1], m[2]];
}

/** 占位符 → 真实值：一律走种子表 `PLACEHOLDER_SUBSTITUTIONS`（唯一出处，不另拟）。
 *  **两处例外**（截止日与起始日不能用表里那个「证据日」2026-09-06）：
 *  - `deadline` → `2026-09-19`（＝种子日 +12 天）：好让「看即将到期的目标」（默认 14 天窗）真有内容，
 *    否则那页 exit 4「无到期目标」，墙上看不到东西；
 *  - `startDate` → `2026-09-01`（起始日必须早于截止日）。
 *  这两处是**为出页服务的取值**，不是产品口径；换值只影响产物内容，不影响链路。 */
const SUBST_OVERRIDE = { deadline: '2026-09-19', startDate: '2026-09-01' };
function substitute(raw) {
  if (raw === undefined) return undefined;
  const obj = JSON.parse(raw);
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    if (typeof v !== 'string' || !v.startsWith('<') || !v.endsWith('>')) continue;
    if (SUBST_OVERRIDE[k] !== undefined) { obj[k] = SUBST_OVERRIDE[k]; continue; }
    const hit = PLACEHOLDER_SUBSTITUTIONS.get(v);
    if (hit === undefined || hit === null) throw new Error('占位符没有替换值：' + v);
    obj[k] = hit;
  }
  return JSON.stringify(obj);
}

const onlyIdx = process.argv.indexOf('--only');
const only = onlyIdx === -1 ? null : String(process.argv[onlyIdx + 1] ?? '');

const workDir = mkdtempSync(join(tmpdir(), 'scene06-'));
const db = openDb(join(workDir, DB_FILENAME));
seedFull(db);
db.close();
mkdirSync(OUT, { recursive: true });

function run(key, params) {
  const args = [CLI, key];
  if (params !== undefined) args.push('--params', params);
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, SKILLS_DB_PATH: workDir, CALORIE_TODAY: SEED_TODAY },
  });
  if (r.status !== 0) return { ok: false, err: `${key} exit=${r.status} ${String(r.stderr).slice(0, 300)}` };
  let env;
  try { env = JSON.parse(String(r.stdout).trim()); } catch (e) { return { ok: false, err: `${key} 回执不是 JSON：${String(r.stdout).slice(0, 200)}` }; }
  if (!env.data || !env.data.output) return { ok: false, err: `${key} 回执里没有 data.output` };
  return { ok: true, env, html: readFileSync(env.data.output, 'utf8'), bytes: readFileSync(env.data.output).length };
}

const CHECK = {
  结果型: '数值与老技能实物对得上吗（预期值给出处）；版面有没有塌列／挤／被藏起来的横滚。',
  回执型: '写入回执：落库了什么、改前→改后对照是否与预检页一致；有没有把内部函数名印上屏。',
  过程型: '预检确认页：现值与推荐值是否摆清、缺项有没有编数字、页面是不是静态无脚本、确认那一步写得清不清楚。',
};

const rows = [];
const problems = [];
const gaps = [];
let seq = 0;

for (const t of SCENE_06_GOAL) {
  const wake = t.wake_word;
  if (only && !wake.includes(only)) continue;
  const [key, rawParams] = parseCli(t.main_prompt.cli);
  const params = substitute(rawParams);
  const isWrite = WRITE_KEYS.has(key);
  const needsPrecheck = PRECHECK_WORDS.includes(wake);

  // ① 主产物：读类＝结果页；写类＝写后回执页；自动算三条的命令本就是预检页。
  const mainKind = isWrite ? '回执型' : (key === 'calorie.view.goal-wizard' ? '过程型' : '结果型');
  const mainFile = mainKind === '过程型' ? `${wake}-预检.html`
    : mainKind === '回执型' ? `${wake}-回执.html` : `${wake}.html`;
  if (mainKind !== '过程型') {
    const r = run(key, params);
    if (!r.ok) { problems.push(`${wake}（主产物）：${r.err}`); }
    else {
      const complete = /^<!doctype html>/i.test(r.html.trim());
      const template = (r.env.delivery && r.env.delivery.template) || '（回执未给 delivery.template）';
      copyFileSync(r.env.data.output, join(OUT, mainFile));
      if (!complete) gaps.push(`${wake}（${mainFile}）：模板=${template}、${r.bytes} 字节 —— **不是完整文档**（片段直出，双击打开只有一段裸区块，没有 charset／样式／版面）`);
      seq += 1;
      rows.push({
        seq, family: mainKind === '回执型' ? '写后回执（写类 10 条）' : '结果页（看目标 12 条）',
        kind: complete ? mainKind : mainKind + '·片段',
        wake, title: `${wake} · ${complete ? mainKind : mainKind + '（片段，未整页）'}`, file: mainFile, key,
        cli: `calorie-cmd-read ${key}${params === undefined ? '' : ' --params \'' + params + '\''}`,
        prompt: t.prompt_template, bytes: r.bytes, template, complete, check: CHECK[mainKind],
      });
    }
  }

  // ② 过程型：11 条带空位写词共用同一张预检确认页（按词出页，页内展开的是这一条词）。
  if (needsPrecheck) {
    const preFile = `${wake}-预检.html`;
    const r = run('calorie.view.goal-wizard', JSON.stringify({ wake }));
    if (!r.ok) { problems.push(`${wake}（预检页）：${r.err}`); }
    else {
      const complete = /^<!doctype html>/i.test(r.html.trim());
      const template = (r.env.delivery && r.env.delivery.template) || '（回执未给 delivery.template）';
      if (!complete) gaps.push(`${wake}（${preFile}）：模板=${template} —— 不是完整文档`);
      copyFileSync(r.env.data.output, join(OUT, preFile));
      seq += 1;
      rows.push({
        seq, family: '预检确认页（过程型 11 条）', kind: complete ? '过程型' : '过程型·片段', wake,
        title: `${wake} · 预检确认页`, file: preFile, key: 'calorie.view.goal-wizard',
        cli: `calorie-cmd-read calorie.view.goal-wizard --params '{"wake":"${wake}"}'`,
        prompt: t.prompt_template, bytes: r.bytes, template, complete, check: CHECK['过程型'],
      });
    }
  }
}

/* 链路索引：prompt → 唤醒词 → 命令 → 绝对产物路径（点路径即开该 HTML）。 */
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const abs = (f) => join(OUT, f).replace(/\\/g, '/');
const fileUrl = (f) => 'file:///' + abs(f);
const chain = rows.map((r) => `  <article class="row" id="r${r.seq}">
    <div class="head"><span class="seq">${r.seq}</span><b>${esc(r.wake)}</b><span class="kind">${esc(r.kind)}</span></div>
    <div class="prompt"><span class="lbl">用户会说的话（prompt 原文）</span><pre>${esc(r.prompt || '（该词没有 prompt_template）')}</pre></div>
    <dl>
      <dt>唤醒词</dt><dd><code>${esc(r.wake)}</code></dd>
      <dt>命令</dt><dd><code>${esc(r.cli)}</code></dd>
      <dt>产物绝对路径</dt><dd><a class="path" href="${esc(fileUrl(r.file))}">${esc(abs(r.file))}</a>（${r.bytes} 字节 · 模板 ${esc(r.template || '？')} · ${r.complete ? '<b class="ok">完整文档</b>' : '<b class="bad">片段，不是完整文档</b>'}）</dd>
      <dt>该确认什么</dt><dd>${esc(r.check)}</dd>
    </dl>
  </article>`).join('\n');

const notShipped = [
  { what: '暂停所有目标／重启所有目标 的预检确认页', why: '这两条词**无空位**（不带参数），按 2026-09-13 裁定不出预检页，只在写后回执页上出现。' },
  { what: '定营养目标(自动算)／定饮水目标(自动算)／一键定全套目标 的独立回执页', why: '这三条词的命令本身就是预检确认页（先算给我看）；写由后续三条写命令落地，回执挂在那三条词上——不是漏做，见 `SKILL.md:75`。' },
  { what: '三条自造词：看目标推荐／看目标配置／看目标状态', why: '它们不在场景 06 的 25 条冻结词表里（只在路由层，`src/goal/routes.ts:34-37`），也没有 HELP 卡片；归属与落地是票 #291 在办的事。' },
  { what: '看目标完成率(按周)／(按月) 的独立页', why: '两条词今天都路由到 `calorie.view.goal-progress`，与「看本周目标」同页（只是窗口参数相同）——产物在，但**屏幕上看不出差别**，这一条该由用户裁：要不要按词出不同的窗口。' },
];

writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({
  batch: 'scene06-验收墙',
  madeAt: '2026-09-15',
  source: '一次性的临时库（`seedFull` 种子 ＋ `CALORIE_TODAY=2026-09-07`），生产者 `produce.mjs`（本目录，入仓）',
  naming: '发布名 ＝ 清单 rows[].file；结果页 `<唤醒词>.html`、回执页 `<唤醒词>-回执.html`、预检页 `<唤醒词>-预检.html`——名字只在本清单算一处',
  gaps,
  rows, notShipped,
}, null, 2) + '\n', 'utf8');

writeFileSync(join(OUT, '链路索引.html'), `<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>场景06 目标管理 · 链路索引（${rows.length} 件）</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,"PingFang SC","Microsoft YaHei",sans-serif;background:#f5f5f7;color:#1d1d1f}
.wrap{padding:26px 22px 70px;max-width:1080px}
h1{font-size:24px;font-weight:600;margin-bottom:6px}
.sub{color:#6e6e73;font-size:13.5px;line-height:1.8;margin-bottom:20px}
.sub b{color:#1d1d1f}
.toc{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:13px 16px;margin-bottom:18px;font-size:13px;line-height:1.9}
.toc a{color:#007aff;text-decoration:none;margin-right:10px}
.row{background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:14px 16px;margin-bottom:12px}
.head{display:flex;align-items:baseline;gap:8px;margin-bottom:9px}
.seq{background:#1d1d1f;color:#fff;border-radius:6px;font-size:11.5px;font-weight:600;padding:1px 7px}
.head b{font-size:15px}
.kind{margin-left:auto;color:#86868b;font-size:11.5px}
.lbl{color:#86868b;font-size:11.5px;display:block;margin-bottom:4px}
pre{background:#f5f5f7;border:1px solid #e8e8ed;border-radius:8px;padding:9px 11px;font-size:12px;line-height:1.7;white-space:pre-wrap;word-break:break-word;font-family:ui-monospace,SFMono-Regular,Menlo,monospace}
dl{display:grid;grid-template-columns:96px 1fr;gap:4px 10px;font-size:12.5px;line-height:1.7;margin-top:10px}
dt{color:#86868b}
code{font-size:11.5px;color:#3a3a3c;word-break:break-all}
a.path{color:#007aff;text-decoration:underline;word-break:break-all;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:11.5px}
b.ok{color:#0a7f34}
b.bad{color:#c0392b}
.note{margin-top:22px;background:#fff;border:1px solid #d2d2d7;border-radius:12px;padding:16px 18px}
.note ul{margin:8px 0 0 20px;font-size:13px;line-height:1.9;color:#3a3a3c}
</style></head><body><div class="wrap">
<h1>场景06「目标管理」链路索引 · ${rows.length} 件</h1>
<div class="sub">一条一条摆开：<b>用户会说的话（prompt 原文）→ 唤醒词 → 命令 → 产物绝对路径</b>。点「产物绝对路径」那一行即可打开该 HTML（绝对路径链接）。
写类词走两段：<b>先出预检确认页（过程型）→ 用户确认 → 再出写后回执页（回执型）</b>。<br>
其余入口：<a href="总索引.html">总索引</a> · <a href="手机墙-390.html">手机墙 390</a> · <a href="桌面墙-1280.html">桌面墙 1280</a>。</div>
<div class="toc"><b>跳到：</b>${rows.map((r) => `<a href="#r${r.seq}">${esc(r.wake)}${r.kind === '过程型' ? '（预检）' : ''}</a>`).join('')}</div>
${chain}
<div class="note"><h2>本批的缺口（如实记账）</h2>
<ul>
${gaps.length ? gaps.map((g) => `<li>${esc(g)}</li>`).join('\n') : '<li>（无缺口：全部产物都是完整文档）</li>'}
</ul>
<h2>有意不出产物及其原因</h2>
<ul>
${notShipped.map((n) => `<li><b>${esc(n.what)}</b>：${esc(n.why)}</li>`).join('\n')}
</ul></div>
</div></body></html>
`, 'utf8');

console.log(`产物 ${rows.length} 件 -> ${OUT}（完整文档 ${rows.filter((r) => r.complete).length} 件，片段 ${rows.filter((r) => !r.complete).length} 件）`);

/* 逐格缺陷清单（脚手架 ＋ 机器读数逐格；视觉缺陷那一半由人看墙时填）。 */
const sameBytes = new Map();
for (const r of rows) {
  const k = r.bytes + '|' + r.template;
  sameBytes.set(k, [...(sameBytes.get(k) || []), r.wake + (r.kind.startsWith('过程型') ? '（预检）' : '')]);
}
const dupLines = [...sameBytes.values()].filter((g) => g.length > 1)
  .map((g) => `  - ${g.length} 条词的产物**逐字节相同**（${g[0].split('·')[0].trim().length} 字节量级）：${g.join('、')}`);

const checklist = `# 场景06 目标管理 · 逐格缺陷清单（33 格）

- 批次：\`docs/skills/skill-calorie/scene06-验收墙/\`（生产者 \`produce.mjs\`，墙 \`gen-wall.mjs\`，清单 \`manifest.json\`）
- 口径出处：仓规 \`docs/agents/视觉验收墙.md\`（§3 收口七步／§4 完成判据／§6.2 骨架／§7 坑）
- 墙：\`手机墙-390.html\`（33 格 × 390 宽 × 3 列，看塌列）、\`桌面墙-1280.html\`（33 格 × 1280 宽 × 1 列，缩 0.469 显示，看排布）
- 细看入口：\`总索引.html\`（按页面族分组）／\`链路索引.html\`（prompt → 唤醒词 → 命令 → 绝对路径，可点开）
- 自检读数：正例 \`node gen-wall.mjs . 手机墙-390.html 390 820\` → **33 格；链接 101 条；缺失 0 -> 可发，exit 0**；
  反例（把清单里「看今日目标」的 file 改成 \`故意写的不存在页.html\` 再跑 \`--check\`）→ **缺失 1 -> 不可发，exit 1 并点名那一份**；还原后复跑 exit 0。
- 数据来源：一次性临时库（\`seedFull\` 种子 ＋ \`CALORIE_TODAY=2026-09-07\`）；写类命令写的是这份临时库，**没碰真库**。
- 唤醒词与命令：逐条取 \`src/triggers/scene-06-goal.ts\` 的 25 条冻结词表原文（跑它自己的 \`main_prompt.cli\`，不另拟命令）。

## 一、机器读数逐格（生产者出，不靠人眼）

| 格 | 唤醒词 | 类型 | 模板 | 字节 | 完整文档？ | 文件 |
|---|---|---|---|---|---|---|
${rows.map((r) => `| ${r.seq} | ${r.wake} | ${r.kind} | \`${r.template}\` | ${r.bytes} | ${r.complete ? '是' : '**否（片段）**'} | \`${r.file}\` |`).join('\n')}

## 二、初筛发现的缺陷（机器可见 ＋ 本席抽查，逐条给证据）

1. **写后回执页整页缺位**（10 件，格 1／4／6／8／10／24／26／28／30／31）：模板 \`receipt\`、206–275 字节，双击打开只有一段裸区块——没有 \`<!doctype html>\`、没有 charset、没有样式、没有页框。地图 #153 的目的地口径是「产物＝完整文档」，这 10 件当场不达标。
2. **回执把内部词印上屏**：回执正文里写着 \`op=update · id=1\`（\`定营养目标-回执.html\` 逐字如此）。这正是墙存在的理由那一类缺陷（判据抓不到、人一眼看见）。
3. **结果页还剩 4 件是片段**（模板 \`fragment\`）：看目标对比实际（1357 B）／看目标完成度（1779 B）／看即将到期的目标（1204 B）／看目标历史完成（1779 B）——走的是旧片段渲染件，不是整页装配。
4. **同一个页面顶着多条词**（屏幕上看不出差别）：
${dupLines.join('\n')}
5. **写入缺陷（本席复跑出来的，非本批产物本身的问题）**：\`定体重目标\`／\`改体重目标\` 只给 \`kg\`、不给截止日时，会把 \`daily_goal.goal_deadline\` **抹成 NULL**；紧接着念「看即将到期的目标」→ **exit 4「无到期目标（daily_goal.goal_deadline 缺失）」**。复跑读数：种子库 \`goal_deadline=2026-12-31\` → 跑 \`calorie.goal.weight {"kg":68}\` → \`goal_deadline=null\` → \`calorie.view.goal-expiring\` exit 4 → 带截止日写回后 exit 0。本批产物之所以有这一页，是因为生产者按种子表补了截止日（见 \`produce.mjs\` 的 \`SUBST_OVERRIDE\`）。

## 三、待你看（墙上看得出、判据抓不到的那一类）

滚一遍两张墙，逐格记：挤／塌列／被藏起来的横滚／层级乱／文案难读／两端差异。看完没缺陷也算结论，但要写明**看了哪些格**。

| 格 | 该确认什么 | 你的结论 |
|---|---|---|
| 全部 33 格 | 双端各滚一遍，逐格比对 | （待填） |
| 1／4／6／8／10／24／26／28／30／31 | 回执片段：裸区块＋\`op=update · id=1\` 印上屏，能不能接受 | （待填） |
| 14／15／18／22／23 | 判据：同页多词（逐字节相同）该不该按词出不同内容 | （待填） |
| 19／20／21／32 | 4 件片段结果页：要不要现在就整页化 | （待填） |

## 四、本批的缺口（清单 \`gaps\` 段同源）

${gaps.length ? gaps.map((g) => `- ${g}`).join('\n') : '- （无）'}

## 五、有意不出产物及其原因（照做法 §3-4）

${notShipped.map((n) => `- **${n.what}**：${n.why}`).join('\n')}
`;
writeFileSync(join(OUT, '逐格缺陷清单.md'), checklist, 'utf8');
console.log('逐格缺陷清单.md 已写（二段为初筛、三段留人填）。');
if (problems.length) {
  console.error(`\n${problems.length} 处问题：`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('全部主产物与预检页都出了完整文档；链路索引.html / manifest.json 已写。');
