#!/usr/bin/env node
/** #227 · 备忘录 HELP 内容资产生成器：老骨架 → `src/help/scenes/<域>.ts`（8 个域文件）＋ `src/help/sceneData.ts`。
 *
 * 为什么留一个生成器：30 场景的 `prompt_template` 要求「逐字」，手抄必漂移；生成器只做
 * 「读事实源 → 声明式清洗 → 逐字序列化 → 落盘」，跑两次字节一致。
 *
 * 用法（**不进 build／test 管线**，事实源在仓外，故 `--check` 只在事实源在盘的机器上可跑）：
 *   node packages/skill-memo-ilife/scripts/gen-help-assets.mjs            # 落盘
 *   node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --check    # 只比对，不一致 exit 1
 *   node packages/skill-memo-ilife/scripts/gen-help-assets.mjs --src <老实物.html> --yaml <scenarios.yaml>
 *
 * 两处事实源（都只读）：
 *   ① 老实物契约载荷 `<SKILLS_DB_PATH>/memo_html/备忘录_HELP_*.html` 的 `window.__DATA__`——
 *      它**就是**老转换层 `script/memo_render.py:527-599` `_scenarios_to_contract_data()` 的产出，
 *      逐字零改写（比在 JS 里重写一遍 YAML 解析器更忠实：老 yaml 的 `prompt` 是多行双引号标量）。
 *   ② 老 `references/scenarios.yaml` 顶层 `skill`／`version`（裁决 9：`version` 从老 yaml 顶层读，
 *      不许写死成第四份副本）＋ 30 条的 `scenario_id`／`wake_word`／`scenario_title`／`type`／
 *      `status`／`category`／`subfunction`／`dimensions` 键序（**交叉复核**：两地逐条对不上即 fail-closed）。
 *
 * 五处「非纯搬运」都在本文件里写死、可复核（生成文件头注释同步声明），逐条对账见
 * `docs/skills/skill-memo-ilife/t227-assets-report.md`：
 *   1. `subgroups[].id` 老 0 起 → 新 1 起（票 6 V8=A；票 5 `t225-structure-design.md` §2.2）；
 *   2. `prompt_template` 去命令化（用户 U6：页面只出现唤醒词）＋ 按老 yaml `:9`「不暴露 DB」清实现细节；
 *   3. `editable_fields` 清洗（裁决 6）：剔 12 条 `html` 开关、补 1 条布尔脏数据 ＋ 9 条 ASCII 落回的中文名；
 *   4. 新增 `aliases`（老 yaml `:30` 禁此字段，管不到本仓资产；别名住技能侧资产、渲染时剥离，裁决 5）；
 *   5. `status` 全空串、**不许**标 `【待开发】`（用户 U1／U2／U3：HELP 是完整体，不是现状快照）。
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG_DIR = join(HERE, '..');
const SCENES_DIR = join(PKG_DIR, 'src', 'help', 'scenes');
const SCENE_DATA = join(PKG_DIR, 'src', 'help', 'sceneData.ts');
const DEFAULT_SRC = 'D:\\2Study\\StudyNotes\\.db\\memo_html\\备忘录_HELP_20260820_162453.html';
const DEFAULT_YAML = 'D:\\2Study\\StudyNotes\\SKILLS\\备忘录\\references\\scenarios.yaml';
const ANCHOR = 'window.__DATA__ = ';

/** 摘要锁（fail-closed）：① 老实物文件字节；② 老 30 条老骨架 canonical；③ 清洗后 30 条 canonical。 */
const SOURCE_SHA256 = '8a25dd587d6b96ae2b56a16a17812def84d819dafefa4daa134e1c01b68efd8a';
const LEGACY_DIGEST = '0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c';
const ASSET_DIGEST = '7c72fb924f8457e2130ebb0b331ae583c3aaaa64f4a04c27cf01da581c325827';

/** 声明 2 · `prompt_template` 清洗表：`[场景 id, 老片段(逐字), 新片段, 类]`。
 *  类 `CLI` ＝ 用户 U6 的命令去化：`--html` 6 个场景 ＋ 子命令名 4 个场景 ＋ `-c` 1 个场景，**并集 8**；
 *  类 `DB` ＝ 老 yaml `:9`「不暴露 DB」：`notes.due`／`note`／`task`／`task_guid`／`GUID`／`Cron`。
 *  每条都断言「在老 prompt 里恰好出现 1 次」，对不上即 fail-closed。 */
const PROMPT_EDITS = [
  ['memo_search_keyword', '带 --html 时生成可视化搜索结果页。', '并生成可视化搜索结果页。', 'CLI'],
  ['memo_get_detail', '带 --html 时生成详情页。', '并生成详情页。', 'CLI'],
  ['memo_search_wish', 'AI 自动按"心愿"分类过滤,等同搜备忘 -c 心愿。', 'AI 自动按"心愿"分类过滤。', 'CLI'],
  ['memo_reminders_active', '带 --html 时生成可筛选的可视化页。', '并生成可筛选的可视化页。', 'CLI'],
  ['memo_reminders_active', '  状  态: _____________ (选填,active=默认/dismissed)', '  状  态: _____________ (选填,默认只看有效提醒)', 'DB'],
  ['memo_complete_wish', '先 wish-complete --html 生成向导', '先出一份完成向导页', 'CLI'],
  ['memo_wish_schedule', '先 wish-batch-plan --suggest-due X --html 生成向导', '先出一份排期向导页(可带建议日期)', 'CLI'],
  ['memo_batch_change_category', '调多条 update-category。', 'AI 逐条改分类。', 'CLI'],
  ['memo_sync_feishu', '2. 反向同步 done(飞书已完成 → 本地 complete-wish)', '2. 反向同步完成状态(飞书已完成 → 本地标记完成)', 'CLI'],
  ['memo_sync_feishu', '带 --html 时生成同步报告页(含 11 统计字段)。', '并生成同步报告页(含 11 统计字段)。', 'CLI'],
  ['memo_complete_wish', '新建打卡 note(同事务)', '新建一条打卡记录(同事务)', 'DB'],
  ['memo_wish_schedule', 'AI 设置本地 notes.due + 飞书 task 同步 due。', 'AI 设置本地排期日期,并与飞书任务同步。', 'DB'],
  ['memo_sync_feishu', '3. 反向同步 due(飞书 due 改 → 本地 notes.due 跟)', '3. 反向同步排期日期(飞书那边改了日期 → 本地跟着改)', 'DB'],
  ['memo_sync_feishu', '1. 本地补建(本地心愿无飞书 task → 自动建)', '1. 本地补建(本地心愿还没有飞书任务 → 自动建)', 'DB'],
  ['memo_remind_with_note', 'Cron 到点触发推送。', '到点自动推送提醒。', 'DB'],
  ['memo_add_wish', '飞书任务清单: _____________ (选填,tasklist GUID,留空=我的任务)', '飞书任务清单: _____________ (选填,留空=我的任务)', 'DB'],
  ['memo_add_wish', 'AI 创建心愿 note,自动建飞书 task 并写回 task_guid。', 'AI 创建心愿笔记,自动建飞书任务并建立关联。', 'DB'],
  ['memo_delete_wish', '若有飞书 task,会自动标完成。', '若有飞书任务,会自动标完成。', 'DB'],
  ['memo_update_wish', '飞书 task 标题同步更新。', '飞书任务标题同步更新。', 'DB'],
  ['memo_add_mood', 'AI 创建情绪日记 note。', 'AI 创建一条情绪日记。', 'DB'],
  ['memo_add_checkin', 'AI 创建打卡 note。', 'AI 创建一条打卡记录。', 'DB'],
  ['memo_init_setup', '检查并配置 Python', '检查并配置运行环境', 'IMPL'],
  ['memo_init_setup', '飞书 CLI(未安装则引导我安装并授权)', '飞书联动(未安装则引导我安装并授权)', 'IMPL'],
  ['memo_init_setup', '、环境变量,初始化数据库', '、配置项,初始化数据库', 'IMPL'],
  ['memo_complete_wish', 'AI 执行原子操作:删除该心愿 + 新建一条打卡记录(同事务)。', 'AI 删除该心愿并新建一条打卡记录。', 'IMPL'],
  ['memo_delete_basic', 'AI 删除这些备忘并告知影响行数;', 'AI 删除这些备忘并告诉你改动了几条;', 'IMPL'],
  ['memo_update_basic', 'AI 更新这条备忘的字段,告诉你修改后的内容。', 'AI 更新这条备忘的内容,告诉你修改后的结果。', 'IMPL'],
  ['memo_get_detail', 'AI 显示这条备忘的全部字段。', 'AI 显示这条备忘的全部内容。', 'IMPL'],
  ['memo_sync_feishu', '并生成同步报告页(含 11 统计字段)。', '并生成同步报告页(11 项统计)。', 'IMPL'],
  ['memo_change_category_single', '(它是内容维度的二阶属性)。', '(它是内容的细分)。', 'IMPL'],
  ['memo_batch_change_category', 'AI 生成批量改分类向导 HTML,你在 UI 勾选 + 选目标分类', 'AI 生成批量改分类向导网页,你在页面上勾选 + 选目标分类', 'IMPL'],
  ['memo_batch_change_category', '目标分类: _____________ (建议目标,可在 HTML 改)', '目标分类: _____________ (建议目标,可在网页上改)', 'IMPL'],
  ['memo_complete_wish', '你在 HTML 勾选 + 填打卡内容。', '你在页面上勾选 + 填打卡内容。', 'IMPL'],
  ['memo_wish_schedule', '你在 HTML 微调。', '你在页面上微调。', 'IMPL'],
];

/** 声明 5 · `title`／`label`／`hint` 里的实现细节字面（裁决 21 的 D5 ＋ 复审 M1：与 DB 类同一条规则，
 *  可见性更高）。`[类, 场景 id, 老片段, 新片段]`；`title`＝标题，`label:<字段名>`＝字段名，`hint:<字段名>`＝提示。
 *  **保留语义、只换说法**：`due`→同步到飞书；`GUID`→ID；`active/dismissed`→有效/已废弃
 *  （用老侧自己的词：`dismiss`＝废弃提醒）；`'null'`→留空即清除；`级联`→连同关联提醒一起删；
 *  `原子操作`／`同事务`／`影响行数`／`全文索引`／`字段`／`二阶属性`／`批量版`／`自动化用`／`HTML`／`UI`
 *  → 用户话（复审员 I 的 M1 逐条改法）。 */
const TEXT_EDITS = [
  ['title', 'memo_wish_schedule', '(同步飞书 due)', '(同步到飞书)'],
  ['hint:tasklist_guid', 'memo_add_wish', '飞书任务清单 GUID(可选)', '飞书任务清单 ID(可选)'],
  ['hint:status', 'memo_reminders_active', 'active(默认)/dismissed', '有效(默认)/已废弃'],
  ['hint:sub_category', 'memo_change_subcategory', "'null' 清除", '留空即清除'],
  ['title', 'memo_complete_wish', '(原子操作)', '(转成打卡记录)'],
  ['title', 'memo_batch_change_category', '(过程型 HTML 向导)', '(网页向导)'],
  ['label:with_reminders', 'memo_delete_basic', '级联删除提醒', '连同关联提醒一起删'],
  ['hint:with_reminders', 'memo_delete_basic', '是否级联删关联提醒(默认否,有提醒则报错)', '是否连同关联提醒一起删(默认否,有提醒则报错)'],
  ['hint:true', 'memo_delete_basic', '跳过二次确认(自动化用)', '跳过二次确认'],
  ['hint:keyword', 'memo_search_keyword', '搜索词(全文索引)', '搜索词'],
  ['hint:bulk_indicator', 'memo_change_category_single', "原话含'都/全部/多个 ID' → 走批量版", '多条一起改时,写「都」或「全部」'],
  ['hint:bulk_indicator', 'memo_batch_change_category', "原话含'都/全部/多个 ID'", '一次改多条(原话含「都/全部/多个 ID」)'],
  ['hint:to_category', 'memo_batch_change_category', '建议目标分类(HTML 可改)', '建议目标分类(网页上可改)'],
];

/** 清洗后 `prompt_template` 里不许再出现的实现记号（页面只出现唤醒词）。 */
const PROMPT_FORBIDDEN = ['--', '-c ', 'memo.', 'memo_cli', 'notes.', 'note', 'task', 'due',
  'Cron', 'GUID', 'guid', 'active', 'dismissed', 'SQL', '.py', 'SELECT', 'INSERT', 'UPDATE', 'script/',
  '原子操作', '同事务', '影响行数', '级联', '全文索引', '字段', '二阶属性', '批量版', '自动化', 'HTML', 'UI'];

/** 逐场景额外禁用。`memo_init_setup` 那条：编程语言名与接口名不许上页面（裁决 21 D7）。
 *  `Python` **不入全局表**——它在 `memo_add_wish` 里是**用户内容示例**（`如"想学 Python"`），
 *  删了会丢例子，故按场景精确禁用。 */
const SCENE_FORBIDDEN = { memo_init_setup: ['Python', 'CLI', '环境变量'] };

/** 清洗后 `title`／`label`／`hint` 里不许再出现的实现记号（裁决 21 ＋ 复审 M1：可见文案与 prompt 同一条规则）。
 *  **不列入**（有意保留，且都不是实现细节）：`ID`（老侧用户词，裁决 21 给的替换词就是「任务清单 ID」）、
 *  `YYYY-MM-DD`／`HH:MM` 等格式占位、`Python`（`memo_add_wish` 的**用户内容示例**）、
 *  `数据存储`／`初始化数据库`／`调度`（老 `SKILL.md:312-317` 的安装 prompt 逐字）。
 *  ⚠️ 复审员 I 已判：先前给 `HTML`／`UI` 开的豁免**不成立**（`HTML` 就是标记语言名，且那条例外是
 *  生成器注释自设的）——本表现**照收**，见 `TEXT_EDITS` 里那 5 处换说法。 */
const VISIBLE_FORBIDDEN = ['GUID', 'null', 'active', 'dismissed', 'due',
  'Cron', 'note', 'task', '--', 'memo.', 'notes.', 'script/',
  '原子操作', '同事务', '影响行数', '级联', '全文索引', '字段', '二阶属性', '批量版', '自动化', 'HTML', 'UI'];

/** 声明 3 · `editable_fields` 清洗（裁决 6：要清的共 22 条 ＝ 1 布尔 ＋ 9 非 html 落回 ＋ 12 html）。 */
const DROP_FIELDS = new Set(['html']); // 12 条 CLI 开关（老 :147／:178 等）
const LABEL_FIX = { // 9 条非布尔 ASCII 落回 → 中文名（7 个键；`remind_at`／`repeat_rule` 各 2 条）
  remind_at: '提醒时间', repeat_rule: '重复规则', start: '开始日期', end: '结束日期',
  status: '提醒状态', tasklist_guid: '飞书任务清单', reminder_id: '关联提醒',
};
/** 1 条布尔脏数据：老 yaml `memo_delete_basic.dimensions.true` 被 YAML 解析成布尔 `true` ⇒
 *  `name`／`label` 都成布尔，**过不了 `base-render` 的 `editable_fields` schema**（裁决 6）。
 *  清洗：键按字符串 `'true'` 落（`name` 必须 string），label 取老 `DIM_LABEL_MAP` 的 `跳过二次确认`。 */
const BOOL_FIELD = { name: 'true', label: '跳过二次确认' };

/** 声明 4 · `aliases` 12 条（裁决 5 收词规则：只收老侧会路由的词；42 条口语样例／HELP 自身 9 条不进）。
 *  来源 ① 老 yaml（主词本身）；② 老 `SKILL.md` 两张表与 `:300`／`:302-305`；③ `references/examples.md`（贡献 0 条）；
 *  新表（`src/policy/wakewords.ts`）里**能归到老场景**的新词按裁决 7 也进（`改子分类`／`查提醒`／`记一条`／`添加笔记`）；
 *  `废弃提醒`（新表有、老侧零场景可归）按裁决 7 不上页面。 */
const ALIASES = {
  memo_complete_wish: ['完成打卡'], // SKILL.md:262／:300
  memo_init_setup: ['初始化', '新手'], // SKILL.md:300（yaml 里 0 次）
  memo_add_mood: ['记情绪日记'], // SKILL.md:479
  memo_search_mood: ['查情绪日记'], // SKILL.md:525／:536／:540
  memo_update_mood: ['改情绪日记'], // SKILL.md:547
  memo_delete_mood: ['删情绪日记'], // SKILL.md:563
  memo_batch_change_category: ['批量改分类'], // SKILL.md:169／:644／:731／:754 ＋ 新表 wakewords.ts:16
  memo_change_subcategory: ['改子分类'], // 新表 wakewords.ts:17（老侧只作 `备忘改子分类` 的子串）
  memo_reminders_active: ['查提醒'], // 新表 wakewords.ts:22 ＋ 老 `memo_render.py:45` COMMAND_CN_MAP
  memo_add_basic: ['记一条', '添加笔记'], // 新表 wakewords.ts:28-29（`添加笔记` 另见 SKILL.md:477 章节名）
};

const q = (s) => JSON.stringify(s);
const sha256 = (s) => createHash('sha256').update(s, 'utf8').digest('hex');
/** 老骨架 canonical：老 30 条（id／title／wake_word／status／prompt_template／types／editable_fields 原样）。 */
const canonical = (scenes) => JSON.stringify(scenes.map((s) =>
  [s.id, s.title, s.wake_word, s.status, s.prompt_template, s.types, s.editable_fields ?? null]));

function readPayload(src) {
  if (!existsSync(src)) throw new Error('事实源不在盘上：' + src);
  const raw = readFileSync(src, 'utf8');
  const at = raw.indexOf(ANCHOR);
  if (at < 0) throw new Error('未找到 window.__DATA__ 锚点：' + src);
  const start = at + ANCHOR.length;
  const end = raw.indexOf('</script>', start);
  if (end < 0) throw new Error('window.__DATA__ 未闭合：' + src);
  return { payload: JSON.parse(raw.slice(start, end).trim().replace(/;$/, '')), bytes: Buffer.byteLength(raw, 'utf8') };
}

/** 老 yaml：只认单行 plain 标量（顶层 `skill`／`version`、`categories` 键序、场景 7 字段、`dimensions` 键序）。 */
function readYamlMeta(path) {
  if (!existsSync(path)) throw new Error('事实源不在盘上：' + path);
  const rows = [];
  const cats = [];
  const top = {};
  let cur = null;
  let inDims = false;
  let inCats = false;
  const text = readFileSync(path, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  for (const line of text.split('\n')) {
    let m;
    if ((m = /^(skill|version): (.+)$/.exec(line))) { top[m[1]] = m[2].trim(); continue; }
    if (/^categories:/.test(line)) { inCats = true; continue; }
    if (/^scenarios:/.test(line)) { inCats = false; continue; }
    if (inCats && (m = /^- key: (.+)$/.exec(line))) { cats.push(m[1].trim()); continue; }
    if ((m = /^- wake_word: (.+)$/.exec(line))) { cur = { wake_word: m[1].trim(), dims: [] }; rows.push(cur); inDims = false; continue; }
    if (!cur) continue;
    if ((m = /^  ([a-z_]+):(.*)$/.exec(line))) {
      const key = m[1];
      const val = m[2].trim();
      inDims = key === 'dimensions' && val === '';
      if (key !== 'dimensions') cur[key] = val.replace(/^'(.*)'$/, '$1');
      continue;
    }
    if (inDims && (m = /^    (\S+):/.exec(line))) cur.dims.push(m[1] === 'true' ? 'true' : m[1]);
  }
  return { top, rows, cats };
}

/** 两地交叉复核：老实物载荷 30 条 ↔ 老 yaml 30 条（**按 id 配对**，逐字段逐字 ＋ 组序／组内序）。
 *  ⚠️ 载荷的顺序不是 yaml 的书写序：载荷先按 `category` 分域、再按 `subfunction` 收组
 *  （`memo_batch_change_category` 在 yaml `:361` 却落回 `memo` 域的 `分类调整` 组）——所以按 id 对。 */
function crossCheck(groups, yaml) {
  const scenes = groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
  const bad = (msg) => { throw new Error('两地事实源对不上：' + msg); };
  if (scenes.length !== yaml.rows.length) bad('场景数 载荷 ' + scenes.length + ' ≠ yaml ' + yaml.rows.length);
  const idxOf = new Map(yaml.rows.map((y, i) => [y.scenario_id, i]));
  const where = new Map();
  for (const g of groups) for (const s of g.subgroups) for (const sc of s.scenes) where.set(sc.id, [g.id, s.label]);
  if (groups.map((g) => g.id).join(',') !== yaml.cats.join(',')) bad('域顺序 ≠ yaml `categories` 顺序');
  for (const sc of scenes) {
    const y = yaml.rows[idxOf.get(sc.id)];
    if (!y) bad('载荷场景 ' + sc.id + ' 在 yaml 里没有');
    const [gid, label] = where.get(sc.id);
    const pairs = [['wake_word', sc.wake_word, y.wake_word], ['title', sc.title, y.scenario_title],
      ['status', sc.status, y.status], ['types', sc.types.join('+'), y.type],
      ['category', gid, y.category], ['subgroup', label, y.subfunction || '基础'],
      ['dimensions', (sc.editable_fields || []).map((f) => String(f.name)).join(','), y.dims.join(',')]];
    for (const [what, a, b] of pairs) if (a !== b) bad(sc.id + ' 的 ' + what + '：载荷 ' + a + ' ≠ yaml ' + b);
  }
  for (const g of groups) for (const s of g.subgroups) { // 组内序＝书写序
    const idx = s.scenes.map((sc) => idxOf.get(sc.id));
    for (let i = 1; i < idx.length; i++) if (!(idx[i] > idx[i - 1])) bad(s.id + ' 组内序不是 yaml 书写序');
  }
  for (const g of groups) { // 二级组顺序＝该组首次出现的书写序
    const first = g.subgroups.map((s) => Math.min(...s.scenes.map((sc) => idxOf.get(sc.id))));
    for (let i = 1; i < first.length; i++) if (!(first[i] > first[i - 1])) bad(g.id + ' 的二级组顺序不是首次出现序');
  }
}

/** 一次替换：断言老片段在文本里**恰好出现 1 次**（对不上即 fail-closed）。 */
function replaceOnce(where, text, from, to) {
  const n = text.split(from).length - 1;
  if (n !== 1) throw new Error('清洗表对不上：' + where + ' 的片段出现 ' + n + ' 次：' + from);
  return text.replace(from, to);
}

/** 反向断言：清洗后不许再出现实现记号。 */
function scanForbidden(where, text, tokens) {
  const low = String(text).toLowerCase();
  for (const tok of tokens) if (low.includes(tok.toLowerCase())) {
    throw new Error(where + ' 仍含实现记号 ' + JSON.stringify(tok));
  }
}

/** 清洗一条场景：prompt 去命令／去 DB／去实现细节，title／label／hint 同规则换说法，字段剔 html ＋ 补中文名。 */
function cleanScene(scene, hits) {
  let prompt = scene.prompt_template;
  for (const [id, from, to, kind] of PROMPT_EDITS) {
    if (id !== scene.id) continue;
    prompt = replaceOnce(id + '.prompt', prompt, from, to);
    hits.push([id, kind]);
  }
  let title = scene.title;
  const labelFix = new Map();
  const hintFix = new Map();
  for (const [kind, id, from, to] of TEXT_EDITS) {
    if (id !== scene.id) continue;
    if (kind === 'title') { title = replaceOnce(id + '.title', title, from, to); hits.push([id, 'title']); }
    else if (kind.startsWith('label:')) labelFix.set(kind.slice('label:'.length), [from, to]);
    else hintFix.set(kind.slice('hint:'.length), [from, to]);
  }
  const fields = [];
  for (const f of scene.editable_fields || []) {
    const name = typeof f.name === 'string' ? f.name : String(f.name); // 布尔脏数据 → 字符串键
    if (DROP_FIELDS.has(name)) { hits.push([scene.id, 'drop:' + name]); continue; }
    let label = typeof f.label === 'string' ? f.label : String(f.label);
    if (typeof f.name !== 'string' || typeof f.label !== 'string') {
      if (name !== BOOL_FIELD.name) throw new Error('未声明的脏字段：' + scene.id + '/' + name);
      label = BOOL_FIELD.label;
    } else if (LABEL_FIX[name]) label = LABEL_FIX[name];
    if (labelFix.has(name)) {
      label = replaceOnce(scene.id + '/' + name + '.label', label, labelFix.get(name)[0], labelFix.get(name)[1]);
      hits.push([scene.id, 'label']);
    }
    let hint = f.hint;
    if (hintFix.has(name)) {
      hint = replaceOnce(scene.id + '/' + name + '.hint', hint, hintFix.get(name)[0], hintFix.get(name)[1]);
      hits.push([scene.id, 'hint']);
    }
    fields.push({ name, label, value: f.value, hint, required: f.required });
  }
  const out = { id: scene.id, title, wake_word: scene.wake_word, status: scene.status,
    prompt_template: prompt, types: scene.types };
  if (fields.length) out.editable_fields = fields;
  if (ALIASES[scene.id]) out.aliases = ALIASES[scene.id];
  scanForbidden(scene.id + '.prompt', prompt, PROMPT_FORBIDDEN.concat(SCENE_FORBIDDEN[scene.id] || []));
  scanForbidden(scene.id + '.title', title, VISIBLE_FORBIDDEN);
  for (const f of fields) {
    scanForbidden(scene.id + '/' + f.name + '.label', f.label, VISIBLE_FORBIDDEN);
    scanForbidden(scene.id + '/' + f.name + '.hint', f.hint, VISIBLE_FORBIDDEN);
  }
  return out;
}

/** 形状断言（fail-closed）：裁决 6／7／8／14 的每一个数都在这里钉住。 */
function assertShape(groups, preClean) {
  const bad = (msg) => { throw new Error('形状断言不过：' + msg); };
  const subs = groups.flatMap((g) => g.subgroups);
  const scenes = subs.flatMap((s) => s.scenes);
  const fields = scenes.flatMap((s) => s.editable_fields || []);
  const atoms = scenes.flatMap((s) => s.types).reduce((m, t) => (m[t] = (m[t] || 0) + 1, m), {});
  const eq = (what, a, b) => { if (a !== b) bad(what + ' ＝ ' + a + '，应为 ' + b); };
  eq('域数', groups.length, 8);
  eq('二级组数', subs.length, 13);
  eq('兜底组数(基础)', subs.filter((s) => s.label === '基础').length, 4);
  eq('场景数', scenes.length, 30);
  eq('场景 id 唯一数', new Set(scenes.map((s) => s.id)).size, 30);
  eq('清洗后字段数', fields.length, 64);
  eq('老侧涉及场景数', preClean.filter((s) => s.editable_fields).length, 29);
  eq('清洗后仍带字段的场景数', scenes.filter((s) => s.editable_fields).length, 27);
  eq('老侧字段数', preClean.flatMap((s) => s.editable_fields || []).length, 76);
  eq('老侧 html 字段数', preClean.flatMap((s) => s.editable_fields || []).filter((f) => f.name === 'html').length, 12);
  eq('老侧布尔脏字段数', preClean.flatMap((s) => s.editable_fields || []).filter((f) => typeof f.name !== 'string').length, 1);
  eq('types 行数', scenes.filter((s) => s.types.length).length, 30);
  eq('原子合计', Object.values(atoms).reduce((a, b) => a + b, 0), 64);
  for (const [k, v] of Object.entries({ 回执: 30, 采集: 20, 查看: 10, 向导: 4 })) eq('原子 ' + k, atoms[k], v);
  if (atoms['选择']) bad('types 里不该出现「选择」');
  const aliasWords = scenes.flatMap((s) => s.aliases || []);
  eq('别名条数', aliasWords.length, 12);
  eq('别名唯一词数', new Set(aliasWords).size, 12);
  const mains = new Set(scenes.map((s) => s.wake_word));
  for (const a of aliasWords) if (mains.has(a)) bad('别名与主词撞词：' + a);
  for (const s of scenes) {
    if (s.status !== '') bad(s.id + ' 的 status 非空串（不许标缺失）');
    if (!s.prompt_template.includes('唤醒词:')) bad(s.id + ' 的 prompt 丢了唤醒词锚点');
    for (const f of s.editable_fields || []) {
      if (typeof f.name !== 'string' || typeof f.label !== 'string' || typeof f.value !== 'string') bad(s.id + '/' + String(f.name) + ' 字段非 string');
      if (f.required !== false) bad(s.id + '/' + f.name + ' required 非 false');
    }
  }
  groups.forEach((g, i) => g.subgroups.forEach((s, j) => {
    if (s.id !== g.id + '_' + (j + 1)) bad('二级组 id 不是 1 起连号：' + s.id);
  }));
  if (new Set(groups.map((g) => g.id)).size !== 8) bad('域 id 有重复');
  return { scenes, subs, fields, atoms };
}

function header(what, extra) {
  return ['/** #227 · 备忘录 HELP 内容资产 · ' + what,
    ' *',
    ' * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。',
    ' *    改内容＝改生成器里的声明表（prompt 清洗／字段清洗／别名），再跑',
    ' *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。',
    ' *',
    ' * 事实源（仓外，全程只读）：',
    ' *   ① 老实物契约载荷 `' + basename(SRC) + '`（老 `script/memo_render.py:527-599` 的产出，逐字零改写）；',
    ' *   ② 老 `references/scenarios.yaml` 顶层 `version`（＝' + VERSION + '，不写死第四份副本，裁决 9）。',
    ' * 摘要锁：老 30 条 sha256＝' + LEGACY_DIGEST,
    ' *           清洗后 30 条 sha256＝' + ASSET_DIGEST,
    ' *',
    ' * 与老骨架的**有意偏离**（逐条对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`）：',
    ' *   1. 二级组 id 老 0 起 → 新 1 起（票 6 V8=A）；',
    ' *   2. `prompt_template` 去命令化（用户 U6）＋ 去 DB／实现细节（老 yaml `:9`）；',
    ' *      `title`／`label`／`hint` 同一条规则换说法（裁决 21 D5／D7 ＋ 复审 M1，逐条见对账表）；',
    ' *   3. `editable_fields` 清洗（裁决 6）：剔 12 条 `html` 开关 ＋ 补 10 条中文名；',
    ' *   4. 新增 `aliases`（住技能侧资产、渲染时剥离，裁决 5；老 yaml `:30` 的禁令管不到本仓）；',
    ' *   5. `status` 全空串（用户 U1／U2／U3：HELP 是完整体，不是现状快照）。',
    ...(extra || []),
    ' */'].join('\n');
}

function renderDomain(g) {
  const scenes = g.subgroups.flatMap((s) => s.scenes);
  const head = header('`' + g.id + '` 域（' + g.label + '）：' + g.subgroups.length + ' 个二级组／' + scenes.length + ' 个场景',
    [' *', ' * 本文件只给 1 个导出：`' + 'MEMO_HELP_' + g.id.toUpperCase() + '`＝该域**一个** `groups[]` 条目。']);
  const L = [head, 'export const MEMO_HELP_' + g.id.toUpperCase() + ' = {',
    '  id: ' + q(g.id) + ',', '  icon: ' + q(g.icon) + ',', '  label: ' + q(g.label) + ',', '  subgroups: ['];
  for (const sub of g.subgroups) {
    L.push('    {', '      id: ' + q(sub.id) + ',', '      label: ' + q(sub.label) + ',', '      scenes: [');
    for (const sc of sub.scenes) {
      L.push('        {', '          id: ' + q(sc.id) + ',', '          title: ' + q(sc.title) + ',',
        '          wake_word: ' + q(sc.wake_word) + ',', '          status: ' + q(sc.status) + ',',
        '          prompt_template: ' + q(sc.prompt_template) + ',',
        '          types: [' + sc.types.map(q).join(', ') + '],');
      if (sc.editable_fields) {
        L.push('          editable_fields: [');
        for (const f of sc.editable_fields) {
          L.push('            { name: ' + q(f.name) + ', label: ' + q(f.label) + ', value: ' + q(f.value) +
            ', hint: ' + q(f.hint) + ', required: ' + f.required + ' },');
        }
        L.push('          ],');
      }
      if (sc.aliases) L.push('          aliases: [' + sc.aliases.map(q).join(', ') + '],');
      L.push('        },');
    }
    L.push('      ],', '    },');
  }
  L.push('  ],', '};');
  return { path: join(SCENES_DIR, g.id + '.ts'), text: L.join('\n') + '\n' };
}

function renderSceneData(groups) {
  const head = header('组装件：8 个域文件 → 全量 `groups` ＋ 域级索引',
    [' *', ' * 本文件给 **2 个导出**：`MEMO_HELP_GROUPS`（全量 `groups`，给渲染件 `helpFile.ts` 直接吃）与',
      ' * `buildHelpSceneIndex()`（域级索引载荷，计数全派生、不写死）。`version` **随索引载荷出去**',
      ' * （`buildHelpSceneIndex().version`）：盘上 `src/help/helpFile.ts:181` 逐字就是',
      ' * `const version = String(buildHelpSceneIndex().version);` ⇒ 版本有单一来源、不必另开一个独立导出',
      ' * （复审 M2：独立 `MEMO_HELP_VERSION` 导出零消费者，已撤）。与票 5 §2.2 的「2 个导出」一致。',
      ' * 新件**不进** `src/help/index.ts` 转发（裁决 16）。']);
  const L = [head];
  for (const g of groups) L.push("import { MEMO_HELP_" + g.id.toUpperCase() + " } from './scenes/" + g.id + ".js';");
  L.push('', '/** 技能数据世代：**取自老 `references/scenarios.yaml` 顶层**（生成器读入，不是手写的第四份副本）。',
    ' *  不导出：只经 `buildHelpSceneIndex()` 的载荷对外（复审 M2）。 */',
    'const MEMO_HELP_VERSION = ' + q(VERSION) + ';', '',
    '/** 8 域／13 二级组／30 场景（域顺序＝老 `categories` 顺序，**不是**场景出现顺序；组内序＝书写序）。 */',
    'export const MEMO_HELP_GROUPS = [');
  for (const g of groups) L.push('  MEMO_HELP_' + g.id.toUpperCase() + ',');
  L.push('];', '',
    '/** 域级索引载荷（`memo.help.lookup` envelope 的 `data`，`list` 形）：一行一域，计数全部派生。 */',
    'export function buildHelpSceneIndex() {',
    '  const items = MEMO_HELP_GROUPS.map((g) => {',
    '    let sceneCount = 0;',
    '    for (const sub of g.subgroups) sceneCount += sub.scenes.length;',
    '    return { id: g.id, icon: g.icon, label: g.label, subgroupCount: g.subgroups.length, sceneCount };',
    '  });',
    '  let subgroupTotal = 0;',
    '  let sceneTotal = 0;',
    '  for (const it of items) { subgroupTotal += it.subgroupCount; sceneTotal += it.sceneCount; }',
    '  return { items, total: items.length, subgroupTotal, sceneTotal, version: MEMO_HELP_VERSION };',
    '}');
  return { path: SCENE_DATA, text: L.join('\n') + '\n' };
}

/** LF 行数（只数 `\\n`，包内口径）。 */
const lf = (text) => (text.match(/\n/g) || []).length;

const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const SRC = resolve(argOf('--src', DEFAULT_SRC));
const YAML = resolve(argOf('--yaml', DEFAULT_YAML));
const check = argv.includes('--check');

const { payload, bytes } = readPayload(SRC);
const yaml = readYamlMeta(YAML);
const VERSION = yaml.top.version;
if (!VERSION || yaml.top.skill !== '备忘录') throw new Error('老 yaml 顶层对不上：' + JSON.stringify(yaml.top));
if (payload.version !== VERSION) throw new Error('version 两地不一：载荷 ' + payload.version + ' ≠ yaml ' + VERSION);
crossCheck(payload.groups, yaml);

const legacy = payload.groups.flatMap((g) => g.subgroups.flatMap((s) => s.scenes));
const hits = [];
const groups = payload.groups.map((g) => ({
  id: g.id, icon: g.icon, label: g.label,
  subgroups: g.subgroups.map((sub, j) => ({
    id: g.id + '_' + (j + 1), // 声明 1：老 0 起 → 新 1 起
    label: sub.label,
    scenes: sub.scenes.map((sc) => cleanScene(sc, hits)),
  })),
}));
const stat = assertShape(groups, legacy);
const out = [...groups.map(renderDomain), renderSceneData(groups)];

const srcSha = sha256(readFileSync(SRC, 'utf8'));
const legacyDigest = sha256(canonical(legacy));
const assetDigest = sha256(canonical(stat.scenes));
for (const [name, got, want] of [['事实源文件 sha256', srcSha, SOURCE_SHA256],
  ['老 30 条 sha256', legacyDigest, LEGACY_DIGEST], ['清洗后 30 条 sha256', assetDigest, ASSET_DIGEST]]) {
  if (want.startsWith('FILL_')) throw new Error('摘要锁未回填（fail-closed）：' + name + ' = ' + got);
  if (got !== want) throw new Error('摘要锁对不上：' + name + ' 实测 ' + got + ' ≠ 锁定 ' + want);
}

console.log('事实源：' + SRC + '（' + bytes + ' 字节，sha256=' + srcSha.slice(0, 16) + '…）');
console.log('老 yaml 顶层：' + JSON.stringify(yaml.top) + '；两地交叉复核 30/30 条逐字对上');
console.log('形状：域 ' + groups.length + '／二级组 ' + stat.subs.length + '（兜底 '
  + stat.subs.filter((s) => s.label === '基础').length + '）／场景 ' + stat.scenes.length
  + '／字段 ' + stat.fields.length + '（含字段场景 ' + stat.scenes.filter((s) => s.editable_fields).length + '）'
  + '／别名 ' + stat.scenes.flatMap((s) => s.aliases || []).length);
console.log('原子：' + JSON.stringify(stat.atoms));
const byKind = (k) => hits.filter((h) => h[1] === k).length;
const washed = ['CLI', 'DB', 'IMPL', 'title', 'label', 'hint'];
console.log('清洗：prompt 改动 ' + (byKind('CLI') + byKind('DB') + byKind('IMPL')) + ' 处（CLI ' + byKind('CLI')
  + ' ／ DB ' + byKind('DB') + ' ／ IMPL ' + byKind('IMPL') + '）／title ' + byKind('title') + ' ／label ' + byKind('label')
  + ' ／hint ' + byKind('hint') + '／剔除字段 ' + byKind('drop:html') + ' 条／牵动场景 '
  + new Set(hits.filter((h) => washed.includes(h[1])).map((h) => h[0])).size + ' 个');
console.log('摘要锁：老 30 条 ' + legacyDigest + '；清洗后 30 条 ' + assetDigest);
if (check) {
  let drift = 0;
  for (const f of out) {
    const now = existsSync(f.path) ? readFileSync(f.path, 'utf8') : '';
    if (now !== f.text) { console.error('DRIFT：' + f.path + ' 与生成结果不一致（禁手改；重跑不带 --check 即覆盖）'); drift++; }
  }
  if (drift) process.exit(1);
  console.log('OK：' + out.length + ' 个文件与生成结果字节一致（--check 不落盘）');
} else {
  mkdirSync(SCENES_DIR, { recursive: true });
  for (const f of out) writeFileSync(f.path, f.text, 'utf8');
  console.log('已写入 ' + out.length + ' 个文件：');
  for (const f of out) console.log('  ' + f.path.replace(PKG_DIR + '\\', '') + '　' + lf(f.text) + ' LF');
}
