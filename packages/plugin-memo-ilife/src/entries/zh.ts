/** plugin-memo-ilife · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
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
  /* ── packages/plugin-memo-ilife/src/client.ts（#1229 迁入） ── */
  'plugin-memo-ilife.client.c001': "宿主连接缺席：connection.rpc.call 不可用",
  'plugin-memo-ilife.client.c002': "回执信封异常（非 ok 信封）",
  'plugin-memo-ilife.client.c003': "体检回执被拒（宿主未给报文）",
  'plugin-memo-ilife.client.c004': "体检请求超时（{p0}s）：宿主未回，点重新检测",
  'plugin-memo-ilife.client.c005': "体检失败：{p0}",
  'plugin-memo-ilife.client.c006': "{p0} · 技能 {p1}",
  'plugin-memo-ilife.client.c007': "宿主连接缺席：connection.rpc.call 不可用",
  'plugin-memo-ilife.client.c008': "回执信封异常（非 ok 信封）",
  'plugin-memo-ilife.client.c009': "取数超时（20s）：宿主未回，先查宿主日志与 DB 环境",
  'plugin-memo-ilife.client.c010': "取数失败：{p0}",
  'plugin-memo-ilife.client.c011': "技能出口缺席（missing-cli）：{p0}",
  'plugin-memo-ilife.client.c012': "取数失败（{p0}）：{p1}",
  'plugin-memo-ilife.client.c013': "取数为空（不冒充正常）",
  'plugin-memo-ilife.client.c014': "备忘录加载中",
  'plugin-memo-ilife.client.c015': "飞书 CLI",
  'plugin-memo-ilife.client.c016': "状态未知（技能回执无此格，请升级技能包）",
  'plugin-memo-ilife.client.c017': "飞书 CLI",
  'plugin-memo-ilife.client.c018': "已登录，task 域可写",
  'plugin-memo-ilife.client.c019': "找到了，但还没登录或没拿到 task 域授权",
  'plugin-memo-ilife.client.c020': "没找到飞书 CLI",
  'plugin-memo-ilife.client.c021': "复制安装指引",
  'plugin-memo-ilife.client.c022': "重新检测",
  'plugin-memo-ilife.client.c023': "体检回执里没有飞书 CLI 那一项",
  'plugin-memo-ilife.client.c024': "已复制，去粘贴给 AI",
  'plugin-memo-ilife.client.c025': "复制失败，长按选择下方文本手动复制",
  'plugin-memo-ilife.client.c026': "复制安装指引",
  'plugin-memo-ilife.client.c027': "飞书 CLI",
  'plugin-memo-ilife.client.c028': "还没检测，点「重新检测」跑一次体检",
  'plugin-memo-ilife.client.c029': "重新检测",
  'plugin-memo-ilife.client.c030': "飞书 CLI",
  'plugin-memo-ilife.client.c031': "重新检测",
  'plugin-memo-ilife.client.c032': "飞书 CLI",
  'plugin-memo-ilife.client.c033': "检测中",
  'plugin-memo-ilife.client.c034': "重新检测",
  'plugin-memo-ilife.client.c035': "飞书 CLI",
  'plugin-memo-ilife.client.c036': "重新检测",
  'plugin-memo-ilife.client.c037': "备忘录",
  /* ── packages/plugin-memo-ilife/src/index.ts（#1229 迁入） ── */
  'plugin-memo-ilife.index.c001': "载荷须为 {key: string, params: object}",
  'plugin-memo-ilife.index.c002': "载荷须为 {values: object}",
  'plugin-memo-ilife.index.c003': "未知端点：{p0}",
  /* ── packages/plugin-memo-ilife/src/skill-tool.ts（#1229 迁入） ── */
  'plugin-memo-ilife.skill-tool.c001': "命令（memo.* 键），例如 memo.help.lookup",
  'plugin-memo-ilife.skill-tool.c002': "可选参数对象，原样交技能出口（--params JSON）",
  'plugin-memo-ilife.skill-tool.c003': "运行备忘录技能的唯一出口（argv+JSON+exit），返回 envelope JSON。写完／看完备忘录数据的唯一途径；不经 shell、不依赖 PATH。key 例：memo.help.lookup（备忘录HELP）、memo.search（搜笔记）。如果这次带了个文件地址，就把文件交给用户，同时贴出地址；如果没带文件，就只回答文字，不要编造文件。",
  /* ── packages/plugin-memo-ilife/src/bridge.ts（#1229 迁入） ── */
  'plugin-memo-ilife.bridge.c001': "总管缺席，请补装：dsh plugin add dsh-life-pack dsh-memo-ilife（不许单卸总管）",
  /* ── packages/plugin-memo-ilife/src/settings.ts（#1229 迁入） ── */
  'plugin-memo-ilife.settings.c001': "数据目录",
  'plugin-memo-ilife.settings.c002': "库文件与产物的根目录。留空＝用默认目录。",
  'plugin-memo-ilife.settings.c003': "库文件名",
  'plugin-memo-ilife.settings.c004': "数据目录下的库文件（备忘不建库，显示的是会落在哪）。",
  'plugin-memo-ilife.settings.c005': "HTML 产物目录名",
  'plugin-memo-ilife.settings.c006': "数据目录下存放 HELP 页面的子目录名。",
  'plugin-memo-ilife.settings.c007': "附件目录",
  'plugin-memo-ilife.settings.c008': "附件的存放根目录。留空＝数据目录下的 media（目录须已存在，技能不替你建）。",
  'plugin-memo-ilife.settings.c009': "高级",
  /* ── packages/plugin-memo-ilife/src/slot.ts（#1229 迁入） ── */
  'plugin-memo-ilife.slot.c001': "备忘录",
  /* ── packages/plugin-memo-ilife/src/index.ts（#1229 迁入·协议报文） ── */
  'plugin-memo-ilife.index.c004': "body is not JSON",
  'plugin-memo-ilife.index.c005': "Invalid memo request.",
  /* ── packages/plugin-memo-ilife/src/client.ts（#1229 迁入·超时提示） ── */
  'plugin-memo-ilife.client.c038': "取数超时（{p0}s）：宿主未回，先查宿主日志与 DB 环境",
} as const satisfies MessageTable;
