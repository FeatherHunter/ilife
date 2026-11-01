/** plugin-calorie · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
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
  /* ── packages/plugin-calorie/src/client.ts（#1229 迁入） ── */
  'plugin-calorie.client.c001': "{p0} · 技能 {p1}",
  'plugin-calorie.client.c002': "宿主连接缺席：connection.rpc.call 不可用",
  'plugin-calorie.client.c003': "回执信封异常（非 ok 信封）",
  'plugin-calorie.client.c004': "取数超时（20s）：宿主未回，先查宿主日志与 DB 环境",
  'plugin-calorie.client.c005': "取数失败：{p0}",
  'plugin-calorie.client.c006': "技能出口缺席（missing-cli）：{p0}",
  'plugin-calorie.client.c007': "取数失败（{p0}）：{p1}",
  'plugin-calorie.client.c008': "取数为空（不冒充正常）",
  'plugin-calorie.client.c009': "取数失败：{p0}",
  'plugin-calorie.client.c010': "卡路里加载中",
  'plugin-calorie.client.c011': "卡路里 · {p0}",
  'plugin-calorie.client.c012': "卡路里",
  /* ── packages/plugin-calorie/src/index.ts（#1229 迁入） ── */
  'plugin-calorie.index.c001': "载荷须为 {key: string, params: object}",
  'plugin-calorie.index.c002': "载荷须为 {values: object}",
  'plugin-calorie.index.c003': "未知端点：{p0}",
  /* ── packages/plugin-calorie/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-calorie.skill-tool.c001': "命令（calorie.* 键），例如 calorie.help.center",
  'plugin-calorie.skill-tool.c002': "可选参数对象，原样交技能出口（--params JSON）",
  'plugin-calorie.skill-tool.c003': "运行卡路里技能的唯一出口（argv+JSON+exit），返回 envelope JSON。写完／看完卡路里数据的唯一途径；不经 shell、不依赖 PATH。key 例：calorie.help.center（卡路里HELP）、calorie.view.home（看今日主页）、calorie.diet.add（记一餐）。如果这次带了个文件地址，就把文件交给用户，同时贴出地址；如果没带文件，就只回答文字，不要编造文件。",
  /* ── packages/plugin-calorie/src/bridge.ts（#1229 迁入） ── */
  'plugin-calorie.bridge.c001': "总管缺席，请补装：dsh plugin add dsh-life-pack dsh-calorie（不许单卸总管）",
  /* ── packages/plugin-calorie/src/settings.ts（#1229 迁入） ── */
  'plugin-calorie.settings.c001': "数据目录",
  'plugin-calorie.settings.c002': "库文件与各类产物的根目录。留空＝用默认目录。",
  'plugin-calorie.settings.c003': "库文件名",
  'plugin-calorie.settings.c004': "数据目录下的数据库文件。",
  'plugin-calorie.settings.c005': "HTML 产物目录名",
  'plugin-calorie.settings.c006': "数据目录下存放交付页面的子目录。",
  'plugin-calorie.settings.c007': "照片目录",
  'plugin-calorie.settings.c008': "身材照的存放目录。留空＝用默认目录（数据目录下的 photos）。",
  'plugin-calorie.settings.c009': "训记 KEY",
  'plugin-calorie.settings.c010': "训记的凭据。留空＝未配置，推送与回写会被拦下。",
  'plugin-calorie.settings.c011': "照片 GIF 子目录",
  'plugin-calorie.settings.c012': "照片目录下存放 GIF 的子目录。",
  'plugin-calorie.settings.c013': "训记状态文件目录",
  'plugin-calorie.settings.c014': "训记的限频与同步游标存放目录。",
  'plugin-calorie.settings.c015': "训记动作库路径",
  'plugin-calorie.settings.c016': "动作名判定用的动作库。",
  'plugin-calorie.settings.c017': "回写默认天数",
  'plugin-calorie.settings.c018': "从训记拉实绩时默认回溯的天数。",
  'plugin-calorie.settings.c019': "训记调用限时（秒）",
  'plugin-calorie.settings.c020': "调用训记的超时秒数。",
  'plugin-calorie.settings.c021': "落地调用限时（秒）",
  'plugin-calorie.settings.c022': "落地训练各步骤的超时秒数。",
  'plugin-calorie.settings.c023': "高级",
  /* ── packages/plugin-calorie/src/slot.ts（#1229 迁入） ── */
  'plugin-calorie.slot.c001': "卡路里",
  /* ── packages/plugin-calorie/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-calorie.index.c004': "body is not JSON",
  'plugin-calorie.index.c005': "Invalid calorie request.",
  /* ── packages/plugin-calorie/src/client.ts（#1229 迁入·超时提示） ── */
  'plugin-calorie.client.c013': "取数超时（{p0}s）：宿主未回，先查宿主日志与 DB 环境",
} as const satisfies MessageTable;
