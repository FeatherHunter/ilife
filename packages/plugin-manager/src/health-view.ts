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

/** 三档的配色（走 DSH 主题别名，写死值只做回退）。 */
const STATUS_COLOR: Readonly<Record<HealthStatus, string>> = {
  red: 'var(--dsw-alias-state-error-primary, #ff6b6b)',
  yellow: 'var(--dsw-alias-state-warning-primary, #d8a300)',
  green: 'var(--dsw-alias-state-success-primary, #4ec9a0)',
};

const STATUS_LABEL: Readonly<Record<HealthStatus, string>> = { red: '红', yellow: '黄', green: '绿' };

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
  headRow: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 6 } as React.CSSProperties,
  head: { fontSize: 13, fontWeight: 700, color: INK } as React.CSSProperties,
  btn: {
    marginLeft: 'auto',
    border: '1px solid ' + BORDER,
    background: 'transparent',
    color: INK,
    borderRadius: 8,
    padding: '3px 10px',
    fontSize: 12.5,
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
  meta: { color: INK_DIM, fontSize: 12, lineHeight: 1.7, marginTop: 6 } as React.CSSProperties,
  error: { color: STATUS_COLOR.red, fontSize: 12, lineHeight: 1.7, marginTop: 6 } as React.CSSProperties,
} as const;

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
    return {
      id: tab.id,
      title: tab.title,
      status: report ? worstStatus(report.items) : null,
      counts: countByStatus(report?.items ?? []),
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
            style: light.status === null ? { ...HEALTH_STYLE.light, ...HEALTH_STYLE.lightIdle } : HEALTH_STYLE.light,
            disabled: light.status === null,
            onClick: () => props.onJump(light.id),
            title: light.status === null
              ? '还没体检（或这一家没装）'
              : light.title + '：' + countsText(light.counts),
          },
          React.createElement('span', {
            style: {
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: light.status === null ? INK_DIM : STATUS_COLOR[light.status],
              display: 'inline-block',
            },
          }),
          React.createElement('span', null, light.title),
          React.createElement('span', { style: { color: INK_DIM } }, light.status === null ? '—' : countsText(light.counts)),
        ),
      ),
    ),
    React.createElement(
      'div',
      { style: HEALTH_STYLE.meta },
      props.error !== null ? props.error : '只看不改：不建目录、不改配置、不重置。灯＝那一家最严重的那一档。点一下跳到那家配置页。',
    ),
  );
}

/** 手动展开某一档？——只有红黄要展开细看；绿的行折成一行（票面验收第一条）。 */
export function visibleItems(report: HealthReport): readonly HealthItem[] {
  return report.items;
}

/** 一家那张表：每条一行，正常的也都在（绿行字淡一点）。 */
export function HealthTable(props: {
  readonly title: string;
  readonly phase: 'idle' | 'running' | 'ready' | 'failed';
  readonly report: HealthReport | null;
  readonly error: string | null;
}): React.ReactElement {
  const { report } = props;
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
          React.createElement('div', { style: HEALTH_STYLE.meta }, '配置文件 ' + report.configPath + ' · 数据目录 ' + report.dataDir),
          report.items.map((item) =>
            React.createElement(
              'div',
              { key: item.id, style: { padding: '7px 0', borderTop: '1px solid ' + BORDER, fontSize: 12.5, lineHeight: 1.7 } },
              React.createElement(
                'div',
                { style: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 } },
                React.createElement('span', {
                  style: {
                    width: 8, height: 8, borderRadius: '50%', display: 'inline-block', background: STATUS_COLOR[item.status],
                  },
                }),
                React.createElement('span', { style: { fontWeight: 650, color: INK } }, item.title),
                React.createElement('span', { style: { color: INK_DIM } }, STATUS_LABEL[item.status]),
                item.source ? React.createElement('span', { style: { color: INK_DIM } }, '· 来自' + item.source) : null,
              ),
              React.createElement('div', { style: { color: item.status === 'green' ? INK_DIM : INK } }, item.message),
              item.action.length > 0
                ? React.createElement('div', { style: { color: INK_DIM } }, '去哪修：' + item.action)
                : null,
            ),
          ),
        )
      : null,
  );
}
