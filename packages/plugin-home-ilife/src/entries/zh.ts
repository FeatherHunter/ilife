/** plugin-home-ilife · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
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
  /* ── packages/plugin-home-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-home-ilife.index.c001': "载荷须为 {values: object}",
  'plugin-home-ilife.index.c002': "未知端点：{p0}",
  'plugin-home-ilife.index.c003': "[dsh-home-ilife] connection.fetch 缺席：设置页的配置端点未注册",
  /* ── packages/plugin-home-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-home-ilife.skill-tool.c001': "命令（home.* 键），例如 home.help.lookup",
  'plugin-home-ilife.skill-tool.c002': "可选参数对象，原样交技能出口（--params JSON）",
  'plugin-home-ilife.skill-tool.c003': "运行居家管家技能的唯一出口（argv+JSON+exit），返回 envelope JSON。写完／看完居家管家数据的唯一途径；不经 shell、不依赖 PATH。key 例：home.help.lookup（居家管家帮助）、home.item.search（查物品）。如果这次带了个文件地址，就把文件交给用户，同时贴出地址；如果没带文件，就只回答文字，不要编造文件。",
  /* ── packages/plugin-home-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-home-ilife.settings.c001': "数据目录",
  'plugin-home-ilife.settings.c002': "库文件与产物的根目录。留空＝用默认目录。",
  'plugin-home-ilife.settings.c003': "库文件名",
  'plugin-home-ilife.settings.c004': "数据目录下的库文件。",
  'plugin-home-ilife.settings.c005': "HTML 产物目录",
  'plugin-home-ilife.settings.c006': "交付页面的存放目录。`.`或留空＝产物放库根。",
  'plugin-home-ilife.settings.c007': "备份目录",
  'plugin-home-ilife.settings.c008': "备份与恢复的读写目录。",
  'plugin-home-ilife.settings.c009': "主密钥文件",
  'plugin-home-ilife.settings.c010': "主密钥文件的位置。",
  /* ── packages/plugin-home-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-home-ilife.index.c004': "body is not JSON",
  'plugin-home-ilife.index.c005': "Invalid home request.",
  /* ══ #1231 共享词条：由 tooling/gen-shared-copy.mjs 自 tooling/shared-copy.json 生成，勿手改 ══ */
  'plugin-home-ilife.slot.c001': "居家管家",
  'plugin-home-ilife.settings.c011': "高级",
  'plugin-home-ilife.bridge.c001': "总管缺席，请补装：dsh plugin add dsh-life-pack dsh-home-ilife（不许单卸总管）",
  /* ══ #1231 共享词条生成段结束 ══ */
} as const satisfies MessageTable;
