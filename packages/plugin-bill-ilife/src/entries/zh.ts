/** plugin-bill-ilife · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
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
  /* ── packages/plugin-bill-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-bill-ilife.index.c001': "载荷须为 {key: string, params: object}",
  'plugin-bill-ilife.index.c002': "载荷须为 {values: object}",
  'plugin-bill-ilife.index.c003': "未知端点：{p0}",
  'plugin-bill-ilife.index.c004': "[dsh-bill-ilife] connection.fetch 缺席：设置页的配置端点未注册",
  /* ── packages/plugin-bill-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-bill-ilife.skill-tool.c001': "命令（bill.* 键），例如 bill.help.lookup",
  'plugin-bill-ilife.skill-tool.c002': "可选参数对象，原样交技能出口（--params JSON）",
  'plugin-bill-ilife.skill-tool.c003': "运行记账技能的唯一出口（argv+JSON+exit），返回 envelope JSON。写完／看完记账数据的唯一途径；不经 shell、不依赖 PATH。key 例：bill.help.lookup（饼干记账HELP）、bill.record.add（记一笔）。如果这次带了个文件地址，就把文件交给用户，同时贴出地址；如果没带文件，就只回答文字，不要编造文件。",
  /* ── packages/plugin-bill-ilife/src/bridge.ts（#1229 迁入） ── */
  'plugin-bill-ilife.bridge.c001': "总管缺席，请补装：dsh plugin add dsh-life-pack dsh-bill-ilife（不许单卸总管）",
  /* ── packages/plugin-bill-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-bill-ilife.settings.c001': "数据目录",
  'plugin-bill-ilife.settings.c002': "库文件与备份的根目录。留空＝用默认目录。",
  'plugin-bill-ilife.settings.c003': "库文件名",
  'plugin-bill-ilife.settings.c004': "数据目录下的库文件。",
  'plugin-bill-ilife.settings.c005': "预算／账户文件名",
  'plugin-bill-ilife.settings.c006': "与库同目录的预算与账户文件。",
  'plugin-bill-ilife.settings.c007': "HELP 产物目录名",
  'plugin-bill-ilife.settings.c008': "HELP 与速查表的存放目录。",
  'plugin-bill-ilife.settings.c009': "备份目录",
  'plugin-bill-ilife.settings.c010': "备份与恢复的读写目录。",
  'plugin-bill-ilife.settings.c011': "备份文件名前缀",
  'plugin-bill-ilife.settings.c012': "备份文件名的前缀，后面自动加时间戳。",
  'plugin-bill-ilife.settings.c013': "高级",
  /* ── packages/plugin-bill-ilife/src/slot.ts（#1229 迁入） ── */
  'plugin-bill-ilife.slot.c001': "饼干记账",
  /* ── packages/plugin-bill-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-bill-ilife.index.c005': "body is not JSON",
  'plugin-bill-ilife.index.c006': "Invalid bill request.",
} as const satisfies MessageTable;
