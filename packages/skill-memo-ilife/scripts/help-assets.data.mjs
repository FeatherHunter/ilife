#!/usr/bin/env node
/** 备忘录 HELP 内容资产 · **摘要锁与禁用记号表**（票 #855 从 `gen-help-assets.mjs` 抽出来；#974 收窄）。
 *
 * 为什么单列一件：三枚摘要锁（老实物文件／老 30 条／资产 30 条）与两张「不许上页面」的记号表是本资产的
 * **事实**，生成器只是把它们读出来跑一遍。事实与跑法分开，改内容只碰本件。
 * 本件**纯字面量、零 import**：谁读它都不带副作用。
 *
 * ⚠️ **#974 退役了两组声明表**（内容改由 `help-assets.rewrite.mjs` 全量重写，逐句重写不吃「老片段替换」）：
 *   - `PROMPT_EDITS`（#227 的去命令化／去 DB 实现细节 33 条）；
 *   - `TEXT_EDITS`（裁决 21 D5／复审 M1 的 title／label／hint 换说法 13 条）；
 *   - `DROP_FIELDS`／`LABEL_FIX`／`BOOL_FIELD`（裁决 6 的字段清洗：剔 12 条 html ＋ 补中文名 ＋ 1 条布尔脏数据）。
 *   它们记录的是「老骨架逐字搬运＋清洗」那一代的口径（对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`
 *   与 `t858-实施-证据.md`）；重写之后资产不再由它们派生，留着就是死代码，故撤。**保留的是同一件事的另一半**：
 *   下面两张禁用记号表——「实现细节不许上页面」这条规则与老片段怎么改无关，重写后的正文与可见文案照样要过它。
 */
/** 摘要锁（fail-closed）：① 老实物文件字节；② 老 30 条老骨架 canonical；③ 资产 30 条 canonical。
 *  #858 起 ③ 由 `444f6451…` 变为 `bdac11bc…`；**#974 起 ③ 随 30 场景逐句重写再变一次**（老侧两枚锁不动）。 */
const SOURCE_SHA256 = '8a25dd587d6b96ae2b56a16a17812def84d819dafefa4daa134e1c01b68efd8a';
const LEGACY_DIGEST = '0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c';
const ASSET_DIGEST = '5d0d0ab256e942366293c6c17dada82f391a855be48dff488c41cd266defa660';

/** 重写后 `prompt_template` 里不许出现的实现记号（页面只出现唤醒词与参数）。
 *  与 `help-assets.rewrite.mjs` 的 `REWRITE_FORBIDDEN`（骨架残留：`请按以下格式` / `期望效果` / `____`）各管一半。 */
const PROMPT_FORBIDDEN = ['--', '-c ', 'memo.', 'memo_cli', 'notes.', 'note', 'task', 'due',
  'Cron', 'GUID', 'guid', 'active', 'dismissed', 'SQL', '.py', 'SELECT', 'INSERT', 'UPDATE', 'script/',
  '原子操作', '同事务', '影响行数', '级联', '全文索引', '字段', '二阶属性', '批量版', '自动化', 'HTML', 'UI'];

/** 逐场景额外禁用。`memo_init_setup` 那条：编程语言名与接口名不许上页面（裁决 21 D7）。
 *  `Python` **不入全局表**——它曾是 `memo_add_wish` 的用户内容示例（`如"想学 Python"`）；
 *  #974 重写把那条示例换成 `如 想学游泳`，全局表照旧不收它，仍按场景精确禁用。 */
const SCENE_FORBIDDEN = { memo_init_setup: ['Python', 'CLI', '环境变量'] };

/** `title`／`label`／`hint` 里不许出现的实现记号（裁决 21 ＋ 复审 M1：可见文案与 prompt 同一条规则）。
 *  **不列入**（有意保留，且都不是实现细节）：`ID`（老侧用户词，裁决 21 给的替换词就是「任务清单 ID」）、
 *  `YYYY-MM-DD`／`HH:MM` 等格式占位、`Python`（若某场景确有用户内容示例）。 */
const VISIBLE_FORBIDDEN = ['GUID', 'null', 'active', 'dismissed', 'due',
  'Cron', 'note', 'task', '--', 'memo.', 'notes.', 'script/',
  '原子操作', '同事务', '影响行数', '级联', '全文索引', '字段', '二阶属性', '批量版', '自动化', 'HTML', 'UI'];

/** 别名 12 条（裁决 5 收词规则：只收老侧会路由的词；42 条口语样例／HELP 自身 9 条不进）。
 *  **#974 一行未动**：别名是路由兼容面（map Q3「路由冻结」），只随场景 id 挂载。
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
export { SOURCE_SHA256, LEGACY_DIGEST, ASSET_DIGEST, PROMPT_FORBIDDEN, SCENE_FORBIDDEN, VISIBLE_FORBIDDEN, ALIASES };
