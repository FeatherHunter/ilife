/** plugin-schedule-ilife · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
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
  /* ── packages/plugin-schedule-ilife/src/client.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.client.c001': "宿主连接缺席：connection.rpc.call 不可用",
  'plugin-schedule-ilife.client.c002': "回执信封异常（非 ok 信封）",
  'plugin-schedule-ilife.client.c003': "体检回执被拒（宿主未给报文）",
  'plugin-schedule-ilife.client.c004': "配置请求超时（{p0}s）：宿主未回",
  'plugin-schedule-ilife.client.c005': "体检失败：{p0}",
  'plugin-schedule-ilife.client.c006': "体检回执里没有飞书 CLI 那一项",
  'plugin-schedule-ilife.client.c007': "飞书 CLI",
  'plugin-schedule-ilife.client.c008': "还没检测，点「重新检测」跑一次体检",
  'plugin-schedule-ilife.client.c009': "复制安装指引",
  'plugin-schedule-ilife.client.c010': "重新检测",
  'plugin-schedule-ilife.client.c011': "飞书 CLI",
  'plugin-schedule-ilife.client.c012': "检测中",
  'plugin-schedule-ilife.client.c013': "复制安装指引",
  'plugin-schedule-ilife.client.c014': "重新检测",
  'plugin-schedule-ilife.client.c015': "飞书 CLI",
  'plugin-schedule-ilife.client.c016': "重新检测",
  'plugin-schedule-ilife.client.c017': "飞书 CLI",
  'plugin-schedule-ilife.client.c018': "已登录，日历可读",
  'plugin-schedule-ilife.client.c019': "没找到飞书 CLI",
  'plugin-schedule-ilife.client.c020': "找到了，但还没登录／日历读不到",
  'plugin-schedule-ilife.client.c021': "复制安装指引",
  'plugin-schedule-ilife.client.c022': "重新检测",
  'plugin-schedule-ilife.client.c023': "已复制安装指引",
  'plugin-schedule-ilife.client.c024': "复制失败：剪贴板不可用，请手动复制对话框里的安装指引",
  /* ── packages/plugin-schedule-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.index.c001': "载荷须为 {values: object}",
  'plugin-schedule-ilife.index.c002': "未知端点：{p0}",
  'plugin-schedule-ilife.index.c003': "[dsh-schedule-ilife] connection.fetch 缺席：设置页的配置端点未注册",
  /* ── packages/plugin-schedule-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.skill-tool.c001': "命令（schedule.* 键），例如 schedule.help.lookup",
  'plugin-schedule-ilife.skill-tool.c002': "可选参数对象，原样交技能出口（--params JSON）",
  'plugin-schedule-ilife.skill-tool.c003': "运行作息技能的唯一出口（argv+JSON+exit），返回 envelope JSON。写完／看完作息数据的唯一途径；不经 shell、不依赖 PATH。key 例：schedule.help.lookup（作息管家HELP）、schedule.today.summary（今天总结）。如果这次带了个文件地址，就把文件交给用户，同时贴出地址；如果没带文件，就只回答文字，不要编造文件。",
  /* ── packages/plugin-schedule-ilife/src/bridge.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.bridge.c001': "总管缺席，请补装：dsh plugin add dsh-life-pack dsh-schedule-ilife（不许单卸总管）",
  /* ── packages/plugin-schedule-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.settings.c001': "数据目录",
  'plugin-schedule-ilife.settings.c002': "库文件与产物的根目录。留空＝用默认目录。",
  'plugin-schedule-ilife.settings.c003': "库文件名",
  'plugin-schedule-ilife.settings.c004': "数据目录下的库文件。",
  'plugin-schedule-ilife.settings.c005': "HELP 产物目录",
  'plugin-schedule-ilife.settings.c006': "HELP 页面的存放目录。",
  'plugin-schedule-ilife.settings.c007': "高级",
  /* ── packages/plugin-schedule-ilife/src/slot.ts（#1229 迁入） ── */
  'plugin-schedule-ilife.slot.c001': "作息管家",
  /* ── packages/plugin-schedule-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-schedule-ilife.index.c004': "body is not JSON",
  'plugin-schedule-ilife.index.c005': "Invalid schedule request.",
  /* ── packages/plugin-schedule-ilife/src/client.ts（#1229 迁入·飞书官网行） ── */
  'plugin-schedule-ilife.client.c025': "飞书CLI官网为：{p0}",
} as const satisfies MessageTable;
