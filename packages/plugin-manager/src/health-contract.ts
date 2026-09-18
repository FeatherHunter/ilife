/** 配置体检：各家技能回给面板的那份报告的形状（唯一真相在技能侧，本件只是面板侧镜像）。
 *
 * 为什么形状这样定（票 #706「开工前的形状裁定」第一条）：**判据住技能侧**。
 * 每条检查项的有效值只有技能源码算得出来（例：`resolveDbDir()` 里「空串＝按默认落点」），
 * 插件包对技能的全部能力是 spawn `cmd_read` 与读 stdout 信封，看不到那些算式。所以：
 *
 *   技能侧出**判据**（每条给红／黄／绿 ＋ 一句话 ＋ 去哪修）；
 *   插件包出**透传**（把技能回执原样交回，不重写一个字）；
 *   总管出**总览与渲染**（零特例：不认任何一家，只认下面这个形状）。
 *
 * 于是「同一份数据、不许两处各算一遍」是结构上的性质：面板一次取数拿到六份报告，
 * 总览一行与各家那张表都从同一个快照读（见 `health-panel.ts` 的单一状态源）。
 *
 * 三档判据的语义（照检查表 `docs/research/check-table-671-life-panel-20260917.html`）：
 *   · `red`＝现在用不了，必须去修；
 *   · `yellow`＝现在这状态能用，但有人真去用那个功能时会撞上（例：照片目录没配）；
 *   · `green`＝正常。
 */

/** 三档判据。 */
export type HealthStatus = 'red' | 'yellow' | 'green';

/** 一条检查项的回执。 */
export interface HealthItem {
  /** 稳定标识：配置项就是它在配置文件里的键路径（`db.dir`），非配置项用点式名（`xunji.cli`）。 */
  readonly id: string;
  /** 页面上那一行的中文标题（技能侧定，面板不重写）。 */
  readonly title: string;
  readonly status: HealthStatus;
  /** 一句话：现在是什么状态，带上路径或门槛这类实证。 */
  readonly message: string;
  /** 去哪修。`green` 时可为空。 */
  readonly action: string;
  /** 这个值从哪来（只陈述，不判好坏）：`配置文件`／`默认值`／`环境`。非取值类检查项可省。 */
  readonly source?: string;
}

/** 一家的体检报告。 */
export interface HealthReport {
  /** 技能名（`calorie`／`bill`／…），等于该家配置文件的主体名。 */
  readonly skill: string;
  /** 实际生效的那份配置文件路径。 */
  readonly configPath: string;
  /** 实际生效的数据目录。 */
  readonly dataDir: string;
  readonly items: readonly HealthItem[];
}

/** 体检出口：技能侧在**进分派层之前**拦下的那一类只读命令名（照三个配置命令的先例）。
 *
 * 载荷：入参 `{}`；回包 `{report}`（技能侧 envelope 的 `data`）。**只报不改**：
 * 不建目录、不写文件、不落默认配置——凡是要建目录才算得出的结论，一律当「不在」报。 */
export const HEALTH_CHECK_KEY = 'config.check' as const;

/** 面板第二段参数（与各家的端点名同值，和各家的 `RPC_CHANNEL` 配成一次调用）。 */
export const HEALTH_ENDPOINT = 'config.check' as const;

/** 三档排序：数字大的更严重（总览一行取**最严重**那档当那一家的灯）。 */
const RANK: Readonly<Record<HealthStatus, number>> = { green: 0, yellow: 1, red: 2 };

/** 一家的总判据：全部项里最严重的那一档；一条都没有时回 `null`（不冒充绿）。 */
export function worstStatus(items: readonly HealthItem[]): HealthStatus | null {
  let worst: HealthStatus | null = null;
  for (const item of items) {
    if (worst === null || RANK[item.status] > RANK[worst]) worst = item.status;
  }
  return worst;
}

/** 三档计数（面板那一行「红 N 黄 N」用的就是它）。 */
export function countByStatus(items: readonly HealthItem[]): Readonly<Record<HealthStatus, number>> {
  const out = { red: 0, yellow: 0, green: 0 };
  for (const item of items) out[item.status] += 1;
  return out;
}

/** 回执校验：面板只渲染自己认得的形状，认不出即报「回执异常」，不猜、不返空冒充正常。 */
export function isHealthReport(raw: unknown): raw is HealthReport {
  if (typeof raw !== 'object' || raw === null) return false;
  const report = raw as Partial<HealthReport>;
  if (typeof report.skill !== 'string' || report.skill.length === 0) return false;
  if (typeof report.configPath !== 'string' || typeof report.dataDir !== 'string') return false;
  if (!Array.isArray(report.items)) return false;
  return report.items.every((item: unknown) => {
    if (typeof item !== 'object' || item === null) return false;
    const row = item as Partial<HealthItem>;
    return typeof row.id === 'string' && typeof row.title === 'string'
      && (row.status === 'red' || row.status === 'yellow' || row.status === 'green')
      && typeof row.message === 'string' && typeof row.action === 'string';
  });
}
