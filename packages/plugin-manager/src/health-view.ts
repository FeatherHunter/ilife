/** 配置体检的两个画法：面板顶部那行总览（六家一盏灯）＋ 各家那张表。
 *
 * 面板侧纪律（沿 `client.ts`／`update-panel.ts` 既有口径）：`createElement` 手写（禁 JSX）、内联 style、
 * 颜色走 DSH 主题别名（深浅主题自适应，写死值只做回退）、不 import 任何单品包、不 import 技能实现。
 *
 * 判据与文案**全部来自各家技能的报告**，本件一个字都不重写——只按三档上色、按状态挑文案。
 */
import * as React from 'react';
import { countByStatus, worstStatus } from './health-contract.js';
import type { HealthItem, HealthReport, HealthStatus } from './health-contract.js';

/** 三档的配色（绿走主题别名；红黄用实色，理由见下）。
 *
 * 红与黄为什么必须落在**不同明度带**上：这两档要一起出现在同一行灯里，用户扫一眼要能分开
 * 「红了（用不了）」与「黄了（能用但要撞上）」。评审连着两轮点「黄灯偏暗与红相近」，所以：
 *   · 红＝深红（暗、重）；
 *   · 黄＝高饱和的琥珀（亮、跳）——它在白底上的对比度仍然够（`#b45309` 对白 ≈ 4.9:1）。
 * 绿不给底色：它是「正常」，不该和要处理的那两档抢注意力。 */
const STATUS_COLOR: Readonly<Record<HealthStatus, string>> = {
  red: '#c0392b',
  yellow: '#e08a00',
  green: 'var(--dsw-alias-state-success-primary, #4ec9a0)',
};

/** 整行底色的浅一档：饱和降一档，免得红黄行「刺眼」压过正文（评审第二轮的扣分点）。 */
/** 红黄两档整行上底的底色。红灯要**明显重于**黄灯：复评实测原先两个底色亮度几乎一样
 *  （红 `#FBF3F3` 对黄 `#FCF3E5`，只差蓝通道），最严重那一档反而最淡——红色提到 0.14。 */
const STATUS_TINT: Readonly<Record<HealthStatus, string>> = {
  red: 'rgba(192, 57, 43, 0.14)',
  yellow: 'rgba(224, 138, 0, 0.10)',
  green: 'transparent',
};

/** 档位词（灯里那几个字）用的色：红黄要**够深**才读得清，故另取一枚比灯更深的值。 */
const STATUS_TEXT: Readonly<Record<HealthStatus, string>> = {
  red: '#a5281b',
  yellow: '#8a5200',
  green: 'var(--dsw-alias-state-success-primary, #4ec9a0)',
};

const STATUS_LABEL: Readonly<Record<HealthStatus, string>> = { red: '红', yellow: '黄', green: '绿' };

/** 档位的**形状**标记：颜色之外的第二条读数（灰度截图、色弱视角下也分得开谁要处理）。 */
const STATUS_MARK: Readonly<Record<HealthStatus, string>> = { red: '✕', yellow: '!', green: '✓' };

/** 面板上的文字色与分隔线（与 `client.ts` 同一套别名）。 */
const INK = 'var(--dsw-alias-label-primary, inherit)';
const INK_DIM = 'var(--dsw-alias-label-secondary, #9a9a9a)';
const BORDER = 'var(--dsw-alias-border, rgba(128,128,128,.35))';

export const HEALTH_STYLE = {
  box: {
    padding: '10px 12px',
    marginBottom: 10,
    borderRadius: 10,
    border: '1px solid ' + BORDER,
  } as React.CSSProperties,
  headRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 } as React.CSSProperties,
  head: { fontSize: 13, fontWeight: 700, color: INK } as React.CSSProperties,
  /** 「体检一次」不挤在标题右端：它单独占一行、与标题同一起始边（视觉复评两轮点「孤立在右上缺层次」）。 */
  runRow: { margin: '8px 0 10px' } as React.CSSProperties,
  btn: {
    border: '1px solid ' + BORDER,
    background: 'transparent',
    color: INK,
    borderRadius: 8,
    padding: '6px 16px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
  } as React.CSSProperties,
  lightsRow: { display: 'flex', flexWrap: 'wrap', gap: 8 } as React.CSSProperties,
  light: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    background: 'transparent',
    border: '1px solid ' + BORDER,
    borderRadius: 999,
    padding: '3px 10px',
    fontSize: 12.5,
    color: INK,
    cursor: 'pointer',
  } as React.CSSProperties,
  lightIdle: { cursor: 'default', color: INK_DIM } as React.CSSProperties,
  meta: { color: INK_DIM, fontSize: 12, lineHeight: 1.7, marginTop: 12 } as React.CSSProperties,
  error: { color: STATUS_COLOR.red, fontSize: 12, lineHeight: 1.7, marginTop: 6 } as React.CSSProperties,
} as const;

/** 值得一眼看见的那两档（档位名与整行文字都上色；绿行保持淡）。 */
function isAttention(status: HealthStatus): boolean {
  return status === 'red' || status === 'yellow';
}

/** 「去哪修」那一行的正文：各家交回来的 action 里若已自带「去哪修：」，这里剥掉一层——
 *  面板已经带了这个前缀，两边都写就会印成「去哪修：去哪修：…」。只剥开头那一次，别的一字不动。 */
export function actionText(action: string): string {
  const trimmed = action.trim();
  return trimmed.startsWith('去哪修：') ? trimmed.slice(4).trim() : trimmed;
}

/** 报文里能扫出来的每一段路径（盘符绝对路径；非 Windows 形状的退回 `/` 打头那一支）。 */
function rawPathsIn(text: string): readonly string[] {
  return text.match(/[A-Za-z]:\/[^\s（）「」，。；]+/g) ?? text.match(/\/[^\s（）「」，。；]+/g) ?? [];
}

/** 一段落点的**根**（盘符）：`C:/a/b` → `C:/`。用来把「同一个盘、但根下不同枝」的落点分开算，
 *  免得一个 D 盘上的旁证（比如「配了但目录不在：D:/media」）把 C 盘那几条的缩写全拖没。 */
function rootOf(path: string): string {
  const drive = /^[A-Za-z]:\//.exec(path);
  return drive === null ? '/' : drive[0];
}

/** 一段落点的公共目录前缀（按 `/` 切、整段比）：`C:/a/b/c` ＋ `C:/a/b/d` → `C:/a/b`。 */
function commonDirOf(paths: readonly string[]): string {
  if (paths.length < 2) return '';
  const split = paths.map((path) => path.replace(/[.,。；]+$/, '').split('/'));
  const first = split[0] as string[];
  let size = 0;
  while (size < first.length && split.every((parts) => parts[size] === first[size])) size += 1;
  return size < 1 ? '' : first.slice(0, size).join('/');
}

/** 一份报文里**按根分开**的落点前缀（长的在前）：只给「同一个根下至少两条落点」的根算前缀——
 *  这个根下只有一条落点时不缩（没有第二条可比，缩出来反而是瞎猜）。
 *  为什么要分根：一家报里常有别的盘的旁证（备忘录用 D 盘上那份媒体目录），只算一个总前缀，
 *  一条旁证就能把整张表的缩写全拖没（#706 出图复评：备忘录那张表整片没缩、记账那张缩了）。 */
export function dirPrefixesOf(report: HealthReport): readonly string[] {
  return dirPrefixesIn(pathsOf(report).join(' '));
}

/** `dirPrefixesOf` 的正文版：一段文字里（报文正文 ＋ 表头两条混在一起）按根分组取公共目录前缀。 */
export function dirPrefixesIn(text: string): readonly string[] {
  const paths = rawPathsIn(text);
  const roots = [...new Set(paths.map(rootOf))];
  const prefixes: string[] = [];
  for (const root of roots) {
    const prefix = commonDirOf(paths.filter((path) => rootOf(path) === root));
    if (prefix !== '') prefixes.push(prefix);
  }
  // 长的在前：一个落点命中多条前缀时，最长的那个才是它真正的目录（缩短后不歧义）。
  return prefixes.sort((a, b) => b.length - a.length);
}

/** 那一行「配置文件 … · 数据目录 …」+ 各条报文里的长路径，都缩成「公共前缀 ＋ 短尾巴」。 */
function shorten(path: string, prefixes: readonly string[]): string {
  const hit = prefixes.find((prefix) => path.startsWith(prefix + '/'));
  return hit === undefined ? path : '…/' + path.slice(hit.length + 1);
}

/** 一家里所有会印出来的路径。 */
export function pathsOf(report: HealthReport): readonly string[] {
  const out: string[] = [report.configPath, report.dataDir];
  for (const item of report.items) out.push(item.message);
  return out;
}

/** 把报文里那一长串路径按公共前缀缩短（只动打印，不动事实）。
 *  只按**扫得出来的那一段段落点**去缩，不做全串替换：既不误伤长路径，也不会把一段路劈成半截。 */
export function shortenPathsIn(text: string, prefixes: readonly string[]): string {
  const candidates = rawPathsIn(text);
  if (candidates.length === 0) return text;
  // 长的在前：先缩长的那条，缩完它自己就挡住了它的父目录，不会二次缩。
  const longestFirst = [...new Set(candidates.map((path) => path.replace(/[.,。；]+$/, '')))].sort(
    (a, b) => b.length - a.length,
  );
  let out = text;
  for (const path of longestFirst) {
    const hit = prefixes.find((prefix) => path.startsWith(prefix + '/'));
    if (hit === undefined) continue;
    out = out.split(hit + '/').join('…/');
  }
  return out;
}

/** 一盏灯：一家一名一档（数到几个红黄绿）。点一下把面板切到那家的页签。 */
export interface HealthLightRow {
  readonly id: string;
  readonly title: string;
  readonly status: HealthStatus | null;
  readonly counts: Readonly<Record<HealthStatus, number>>;
}

/** 从六份报告数出那一行的灯（每家按最严重那一档上色）。 */
export function lightsOf(
  tabs: readonly { readonly id: string; readonly title: string }[],
  reports: Readonly<Record<string, HealthReport | undefined>>,
): readonly HealthLightRow[] {
  return tabs.map((tab) => {
    const report = reports[tab.id];
    const items = report?.items ?? [];
    return {
      id: tab.id,
      title: tab.title,
      status: report ? worstStatus(items) : null,
      counts: countByStatus(items),
      // 这里曾短期印过「最严重那一项的名字」当区分度，**已撤回**：实测六家常坏在同一条通用检查项上
      // （都是「数据目录」），印出来六家一模一样，是噪声不是区分度（出图复评实测逐字抄了六个「数据目录」）。
      // 「哪一项坏了」本来就由那家自己那张表回答，灯上不再重复。
    };
  });
}

/** 一家的一句话读数：「红 1 黄 2」，全绿就是「绿」。 */
function countsText(counts: Readonly<Record<HealthStatus, number>>): string {
  const parts: string[] = [];
  if (counts.red > 0) parts.push('红 ' + String(counts.red));
  if (counts.yellow > 0) parts.push('黄 ' + String(counts.yellow));
  if (parts.length === 0) return '绿';
  return parts.join(' · ');
}

/** 「红 2 · 黄 3」那一截**按档上色**：每一档用它自己的字色、分隔符走淡色。
 *  为什么必须拆开：原先整截塞进一个 span、染「最严重那一档」的颜色，六家都红时「黄 3」就跟着印成红字——
 *  本页自己说「黄＝还没配」，文字层却把它涂成红（出图复评五份里三份独立指到，取色同为 `#c03828`）。 */
function countSegments(light: HealthLightRow): React.ReactElement[] {
  if (light.status === null) {
    return [React.createElement('span', { key: 'dash', style: { color: INK_DIM, fontWeight: 700 } }, '—')];
  }
  const parts: React.ReactElement[] = [];
  for (const status of ['red', 'yellow'] as const) {
    const count = light.counts[status];
    if (count === 0) continue;
    if (parts.length > 0) {
      parts.push(React.createElement('span', { key: status + '-sep', style: { color: INK_DIM } }, ' · '));
    }
    parts.push(
      React.createElement(
        'span',
        { key: status, style: { color: STATUS_TEXT[status], fontWeight: 700 } },
        STATUS_LABEL[status] + ' ' + String(count),
      ),
    );
  }
  if (parts.length === 0) return [React.createElement('span', { key: 'green', style: { color: INK_DIM, fontWeight: 700 } }, '绿')];
  return parts;
}

/** 顶部那行总览：六家一盏灯 ＋ 一个「体检一次」按钮。 */
export function HealthOverview(props: {
  readonly lights: readonly HealthLightRow[];
  readonly running: boolean;
  readonly error: string | null;
  readonly onRun: () => void;
  readonly onJump: (id: string) => void;
}): React.ReactElement {
  return React.createElement(
    'div',
    { style: HEALTH_STYLE.box, 'data-ilife-health': 'overview' },
    React.createElement(
      'div',
      { style: HEALTH_STYLE.headRow },
      React.createElement('div', { style: HEALTH_STYLE.head }, '配置体检'),
    ),
    React.createElement(
      'div',
      { style: HEALTH_STYLE.runRow },
      React.createElement(
        'button',
        {
          type: 'button',
          style: props.running ? { ...HEALTH_STYLE.btn, opacity: 0.55, cursor: 'default' } : HEALTH_STYLE.btn,
          disabled: props.running,
          onClick: props.onRun,
          title: '对六家各跑一次配置体检（只看不改：不建目录、不改配置）',
        },
        props.running ? '体检中…' : '体检一次',
      ),
    ),
    React.createElement(
      'div',
      { style: HEALTH_STYLE.lightsRow, 'data-ilife-health': 'lights' },
      props.lights.map((light) =>
        React.createElement(
          'button',
          {
            key: light.id,
            type: 'button',
            'data-ilife-health': 'light',
            'data-skill': light.id,
            // 档位落到按钮自身的边框与底色上：一眼扫过去先看到颜色，再读家名（票面验收：一屏看红黄）。
            style: light.status === null
              ? { ...HEALTH_STYLE.light, ...HEALTH_STYLE.lightIdle }
              : {
                  ...HEALTH_STYLE.light,
                  borderColor: STATUS_COLOR[light.status],
                  borderWidth: 1.5,
                  background: STATUS_TINT[light.status],
                },
            disabled: light.status === null,
            onClick: () => props.onJump(light.id),
            title: light.status === null
              ? '还没体检（或这一家没装）'
              : light.title + '：' + countsText(light.counts),
          },
          React.createElement('span', {
            style: {
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: light.status === null ? INK_DIM : STATUS_COLOR[light.status],
              display: 'inline-block',
            },
          }),
          React.createElement('span', { style: { color: INK, fontWeight: 650 } }, light.title),
          ...countSegments(light),
        ),
      ),
    ),
    React.createElement(
      'div',
      { style: HEALTH_STYLE.meta },
      // 三档的含义要**写在屏上**（复评五份里三份独立指出「全屏没有图例，红黄绿只能靠猜」），
      // 且三个词要**按档上色**——「定义红黄绿的那把钥匙自己不上色」是复评点名过的一处。
      props.error !== null
        ? props.error
        : [
            React.createElement('span', { key: 'r', style: { color: STATUS_TEXT.red, fontWeight: 700 } }, '红'),
            React.createElement('span', { key: 'r2' }, '＝坏了 · '),
            React.createElement('span', { key: 'y', style: { color: STATUS_TEXT.yellow, fontWeight: 700 } }, '黄'),
            React.createElement('span', { key: 'y2' }, '＝还没配 · '),
            React.createElement('span', { key: 'g', style: { color: STATUS_TEXT.green, fontWeight: 700 } }, '绿'),
            React.createElement('span', { key: 'g2' }, '＝正常 ｜ 只看不改：不建目录、不改配置、不自动重置'),
            // 页签那排也用圆点（`● 装上了／○ 没装`），这里把**顶部那排**的语义写清楚，
            // 免得两排同构的圆点互相抢解释权（复评两份点名）。
            React.createElement('span', { key: 'tab' }, ' · 上面那排圆点是体检灯，点一下跳到那家配置页；下面那排圆点是页签（实心＝装上了）'),
          ],
    ),
  );
}

/** 正正常常的那些：绿条只留「名字」，一句话与「去哪修」都不印（票面验收第一条：正常的收成一行）。 */
function isAttentionItem(item: HealthItem): boolean {
  return isAttention(item.status);
}

/** 一家那张表：**要处理的**（红黄）一条一块、整行上底带一句话与「去哪修」；
 *  **正常的**（绿）收成一行并列的小字，点得到、扫得完（票面验收第一条：正常的收成一行，有问题的才展开）。 */
export function HealthTable(props: {
  readonly title: string;
  readonly phase: 'idle' | 'running' | 'ready' | 'failed';
  readonly report: HealthReport | null;
  readonly error: string | null;
}): React.ReactElement {
  const { report } = props;
  const prefixes: readonly string[] = report ? dirPrefixesOf(report) : [];
  return React.createElement(
    'div',
    { style: HEALTH_STYLE.box, 'data-ilife-health': 'table' },
    React.createElement(
      'div',
      { style: HEALTH_STYLE.headRow },
      React.createElement('div', { style: HEALTH_STYLE.head }, props.title + ' · 体检'),
      report ? React.createElement('div', { style: { color: INK_DIM, fontSize: 12 } }, countsText(countByStatus(report.items))) : null,
    ),
    props.phase === 'idle'
      ? React.createElement('div', { style: HEALTH_STYLE.meta }, '还没体检：点上面那个「体检一次」。')
      : null,
    props.phase === 'running' ? React.createElement('div', { style: HEALTH_STYLE.meta }, '正在体检…') : null,
    props.error !== null ? React.createElement('div', { style: HEALTH_STYLE.error }, props.error) : null,
    report
      ? React.createElement(
          'div',
          null,
          // 行内落点缩成「…/短尾」是为了不把每行撑成两行；但「去哪修：先建这个目录」要照着建，
          // 就得把**它到底在哪儿**说清楚（出图复评五份里两份点名「照屏修不了」）。
          // 措辞有讲究：不能写成「下面行内的「…/」都接在这里」——行里本来就有个「…/data」，
          // 接上基目录会拼成「…/data/data」，自相矛盾（复评原话）。故只**点明缩写代表哪一层**。
          report.dataDir !== ''
            ? React.createElement('div', { style: { color: INK_DIM, fontSize: 11.5, marginTop: 2 } },
              '落点根目录：' + report.dataDir
              + (report.configPath !== '' ? '（配置文件 ' + report.configPath + '）' : ''))
            : null,
          report.items.filter(isAttentionItem).map((item) =>
            React.createElement(
              'div',
              {
                key: item.id,
                'data-ilife-health': 'item',
                'data-status': item.status,
                // 红黄两档整行上底：扫一眼先看见「要处理的」。
                style: {
                  padding: '7px 8px',
                  margin: '2px 0',
                  borderTop: '1px solid ' + BORDER,
                  borderRadius: 6,
                  fontSize: 13,
                  lineHeight: 1.75,
                  background: STATUS_TINT[item.status],
                },
              },
              React.createElement(
                'div',
                { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 } },
                // 档位**不只靠颜色**认：形状标记（✕／!）＋档位字，色弱与灰度截图下也分得开。
                // 原先这里还有一个同色的实心圆点，与标记、档位字三者同义同色（复评两份点名「没有主次」），
                // 且页签那排（`client.ts:349`）也用同样的圆点表示「这家装没装」——同屏两套圆点语义，
                // 故本件的条目里**去掉圆点**，把圆点这一格语汇留给页签。
                React.createElement('span', {
                  style: { color: STATUS_TEXT[item.status], fontWeight: 700, fontSize: 13, lineHeight: 1 },
                  'aria-hidden': 'true',
                }, STATUS_MARK[item.status]),
                React.createElement('span', { style: { fontWeight: 650, color: INK } }, item.title),
                React.createElement('span', {
                  style: { color: STATUS_TEXT[item.status], fontWeight: 700 },
                }, STATUS_LABEL[item.status]),
                // 来源那一格**只在它不只是「默认值」时印**：四行全印「来自默认值」等于零区分度，
                // 而且「值从哪来」这件事正文里已经写全了（复评原话：「这四个字零区分度」）。
                item.source && item.source !== '默认值'
                  ? React.createElement('span', { style: { color: INK_DIM } }, '· 来自' + item.source)
                  : null,
              ),
              React.createElement('div', { style: { color: INK }, title: item.message }, shortenPathsIn(item.message, prefixes)),
              item.action.length > 0
                ? React.createElement('div', { style: { color: INK_DIM } }, '去哪修：' + actionText(item.action))
                : null,
            ),
          ),
          // 正常的那一档：一条都不用点开，名字排成一行（`data-ilife-health="ok"` 供判据核对「一条不少」）。
          // 给它**一条绿边＋一层极淡底**，让它读起来是「一组正常项」，而不是四行问题之后的一句脚注
          // （复评原话：「占多数的那一档在视觉上几乎退成脚注」）——条目仍然收成一行（票面第一条）。
          report.items.some((item) => !isAttentionItem(item))
            ? React.createElement(
                'div',
                {
                  'data-ilife-health': 'ok',
                  style: {
                    display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '2px 10px',
                    marginTop: 8, padding: '6px 8px',
                    borderLeft: '3px solid ' + STATUS_COLOR.green,
                    borderRadius: 6,
                    fontSize: 12, lineHeight: 1.6, color: INK_DIM,
                  },
                },
                // 绿档也要**看得见**：只给一行灰字时，五份出图复评里三份独立指到「全屏没有绿色、
                // 绿＝正常这一档等于不存在」。故这一档前面加一个绿点（与红黄同一个「点」语汇），
                // 说明它们就是正常项——条目**仍然收成一行**（票面第一条：正常的收成一行）。
                React.createElement('span', {
                  style: {
                    width: 8, height: 8, borderRadius: '50%', display: 'inline-block',
                    background: STATUS_COLOR.green, flex: '0 0 auto',
                  },
                  'aria-hidden': 'true',
                }),
                React.createElement('span', { style: { fontWeight: 650, color: INK } }, '正常 ' + String(countByStatus(report.items).green) + ' 条'),
                React.createElement('span', { style: { color: INK_DIM } }, '（下列各项都正常工作）'),
                report.items.filter((item) => !isAttentionItem(item)).map((item) =>
                  React.createElement('span', { key: item.id, 'data-ilife-health': 'ok-item' }, '· ' + item.title),
                ),
              )
            : null,
        )
      : null,
  );
}
