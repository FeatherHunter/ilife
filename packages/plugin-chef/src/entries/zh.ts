/** plugin-chef · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
 *
 *  归属：本包自己的命名空间（ADR-0004 §3「词条随包存放，命名空间＝包名」）。
 *  key 形态（第一轮＝**派生命名**，见地图 #1197 决定记录）：<件名>.<位置>.<键>。
 *
 *  **生成段别手改**：迁移票迁入本包词条时，由 `tooling/i18n-migrate.mjs` 往下面那张表**追加**条目。
 *
 *  本表现在是空的——本包还没有迁入任何用户可见文案；空表由迁移票内补齐。
 */
import type { MessageTable } from 'base-entries';

export const zh = {
  /* ── packages/plugin-chef/src/index.ts（#1229 迁入） ── */
  'plugin-chef.index.c001': "载荷须为 {values: object}",
  'plugin-chef.index.c002': "未知端点：{p0}",
  'plugin-chef.index.c003': "[dsh-chef] connection.fetch 缺席：设置页的配置端点未注册",
  /* ── packages/plugin-chef/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-chef.skill-tool.c001': "命令（chef.* 键），例如 chef.help.lookup",
  'plugin-chef.skill-tool.c002': "可选参数对象，原样交技能出口（--params JSON）",
  'plugin-chef.skill-tool.c003': "运行私家大厨技能的唯一出口（argv+JSON+exit），返回 envelope JSON。写完／看完私家大厨数据的唯一途径；不经 shell、不依赖 PATH。key 例：chef.help.lookup（私家大厨HELP）、chef.recipe.view（看菜谱）。如果这次带了个文件地址，就把文件交给用户，同时贴出地址；如果没带文件，就只回答文字，不要编造文件。",
  /* ── packages/plugin-chef/src/bridge.ts（#1229 迁入） ── */
  'plugin-chef.bridge.c001': "总管缺席，请补装：dsh plugin add dsh-life-pack dsh-chef（不许单卸总管）",
  /* ── packages/plugin-chef/src/settings.ts（#1229 迁入） ── */
  'plugin-chef.settings.c001': "数据目录",
  'plugin-chef.settings.c002': "库文件与产物的根目录。留空＝用默认目录。",
  'plugin-chef.settings.c003': "库文件名",
  'plugin-chef.settings.c004': "数据目录下的库文件。",
  'plugin-chef.settings.c005': "HELP 产物目录",
  'plugin-chef.settings.c006': "HELP 与速查表的存放目录。",
  'plugin-chef.settings.c007': "场景产物目录",
  'plugin-chef.settings.c008': "场景面的存放目录。",
  'plugin-chef.settings.c009': "高级",
  /* ── packages/plugin-chef/src/slot.ts（#1229 迁入） ── */
  'plugin-chef.slot.c001': "私家大厨",
  /* ── packages/plugin-chef/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-chef.index.c004': "body is not JSON",
  'plugin-chef.index.c005': "Invalid chef request.",
} as const satisfies MessageTable;
