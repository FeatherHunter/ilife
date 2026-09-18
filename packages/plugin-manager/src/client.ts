/** dsh-life-pack client 适配器（六边形：browser 侧；爱生活单卡方案）。
 *
 * 真实 DSH 契约（出处见 docs/agents/dsh-client-contract.md §5/§11）：
 * - 本文件经 tsdown 打成 loader 工厂包（browser/CJS + 注册包裹），classic 执行
 *   只注册，副作用全在 factory 内；传递闭包禁 node 内建与 ESM 语法（回路
 *   test/client-bundle-48.test.mjs 看门）。
 * - inject 短名 ['slots','connection']：本包现在有 RPC（装与更新的能力由宿主半提供，
 *   电话名与轮询间隔由宿主转交，面板不写死），读了 ctx.connection 就必须声明 'connection'（#48 血例）。
 * - 爱生活页签条走 slot 驱动（settings-plugins 先例，禁纯 useState 手画 tab）：
 *   section 声明 children 爱生活页签槽，各技能往里注册自家技能设置页；
 *   tab 行从 ledger 投影（entries+getVersion+subscribe），面板用 props.renderSlot
 *   按 `{only}` 投影（一次只挂载一个）+ visited 缓存；ledger 无某技能=缺席，
 *   显示推荐安装只读文本（不返空冒充）。
 * - 组件 React.createElement 手写（禁 JSX），无数据轮询、无 document/window/process。
 * - 面板外壳两处（票 #679）：标题行右上角两个入口（星／气泡，悬停出说明文字，
 *   窄窗口折到标题下方）；页签面板之后是底部「作者其他插件」引流卡（四行，点开新窗口）。
 *   文案与网址都取自 nav.ts 的两张静态表，本文件只画不算。
 */

import * as React from 'react';
import { MANAGER_TABS, MANAGER_VERSION, MORE_PLUGINS, PANEL_LINKS, recoFor } from './nav.js';
import type { ManagerTab } from './nav.js';
import { AbsentCard, CheckUpdateButton, UpdateResults, useUpdateRows } from './update-panel.js';
import type { CallFace } from './update-client.js';
import { useHealthPanel } from './health-panel.js';
import { HealthOverview, HealthTable, lightsOf } from './health-view.js';
import { HEALTH_ENDPOINT } from './health-contract.js';
import type {
  ClientCtx,
  ConfigTabRow,
  LifePackSectionProps,
  SlotLedgerEntry,
} from './dsh-ctx.js';

export const inject = ['slots', 'connection'];

/** 爱生活页签槽（总管声明的 children，技能设置页注册进来；单段名，避开官方 settings.* 前缀）。 */
export const CONFIG_TAB_SLOT = 'ilife.config-tab' as const;

/** 总管视觉（内联 style；颜色走 DSH 主题别名，深浅主题自适应，写死值只做回退；与技能面板同语言）。 */
const S = {
  headRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
    margin: '2px 0 8px',
  } as React.CSSProperties,
  head: { fontSize: 15, fontWeight: 700, flex: '0 0 auto', color: 'var(--dsw-alias-label-primary, inherit)' } as React.CSSProperties,
  headActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 2,
    marginLeft: 'auto',
    flex: '0 0 auto',
  } as React.CSSProperties,
  iconLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 6,
    border: '1px solid transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    textDecoration: 'none',
    fontSize: 14,
    lineHeight: 1,
  } as React.CSSProperties,
  meta: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: 12, lineHeight: 1.7, marginBottom: 10 } as React.CSSProperties,
  tablist: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 } as React.CSSProperties,
  tab: {
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'transparent',
    color: 'var(--dsw-alias-label-primary, inherit)',
    borderRadius: 999,
    padding: '4px 12px',
    fontSize: 13,
    cursor: 'pointer',
  } as React.CSSProperties,
  tabActive: {
    background: 'var(--dsw-alias-brand-primary, #0a84ff)',
    borderColor: 'transparent',
    color: '#fff',
    fontWeight: 700,
  } as React.CSSProperties,
  reco: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.45))',
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
    fontSize: 13,
    lineHeight: 1.7,
  } as React.CSSProperties,
  cmd: {
    display: 'block',
    marginTop: 8,
    padding: '8px 10px',
    borderRadius: 8,
    background: 'var(--dsw-alias-bg-base, rgba(128,128,128,.12))',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    userSelect: 'all',
  } as React.CSSProperties,
  moreCard: {
    marginTop: 16,
    padding: '10px 12px',
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
  } as React.CSSProperties,
  moreTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 4,
    color: 'var(--dsw-alias-label-primary, inherit)',
  } as React.CSSProperties,
  moreRow: {
    display: 'flex',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: '2px 8px',
    padding: '7px 4px',
    textDecoration: 'none',
    color: 'inherit',
  } as React.CSSProperties,
  morePkg: {
    flex: '0 1 auto',
    minWidth: 0,
    overflowWrap: 'anywhere',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
    fontSize: 12,
    fontWeight: 650,
  } as React.CSSProperties,
  moreDesc: {
    flex: '1 1 180px',
    minWidth: 0,
    fontSize: 11.5,
    lineHeight: 1.6,
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
  } as React.CSSProperties,
  moreIcon: {
    flex: '0 0 auto',
    marginLeft: 'auto',
    display: 'inline-flex',
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
  } as React.CSSProperties,
};

/** 缺席卡的画法与流程住 `update-panel.ts`（票 #678：一句人话 ＋「装上」按钮 ＋ 可复制命令），
 *  `recoFor` 的补装命令仍是卡里那条辅助展示（B11 口径不变）。 */

/** 标签解析（resolveSlotLabel 同形：thunk 跟活，无则空字串；见 slots lib:27-29）。 */
function resolveLabel(label: SlotLedgerEntry['options']['label']): string {
  if (typeof label === 'function') return label();
  return label ?? '';
}

/** 外链图标（行尾那个；纯装饰，语义在链接自己的 aria-label／文字上）。 */
function ExternalIcon(): React.ReactElement {
  return React.createElement(
    'svg',
    {
      viewBox: '0 0 24 24',
      width: 13,
      height: 13,
      fill: 'none',
      stroke: 'currentColor',
      strokeWidth: 1.9,
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      'aria-hidden': 'true',
      focusable: 'false',
    },
    React.createElement('path', { d: 'M13.5 4.5H19.5V10.5' }),
    React.createElement('path', { d: 'M19.5 4.5L11 13' }),
    React.createElement('path', { d: 'M18 14.5V18A2 2 0 0 1 16 20H6A2 2 0 0 1 4 18V8A2 2 0 0 1 6 6H9.5' }),
  );
}

/** 标题行右上角两件：星（去本仓点 Star）＋ 气泡（去本仓开 issue），悬停出说明文字。
 *
 * 三件并排里的第三件「检查更新」住隔壁票（#678）：本票只留位子——它就接在本组件之前，
 * 不画一个点了没反应的假按钮。窄窗口靠 headRow 的 flexWrap 折到标题下方，
 * 标题与两件都是 flex:'0 0 auto'，谁也不挤谁。
 */
function PanelActions(): React.ReactElement {
  return React.createElement(
    'div',
    { style: S.headActions },
    PANEL_LINKS.map((link) =>
      React.createElement(
        'a',
        {
          key: link.key,
          href: link.url,
          target: '_blank',
          rel: 'noreferrer',
          title: link.tip,
          'aria-label': link.tip,
          style: S.iconLink,
        },
        React.createElement('span', { 'aria-hidden': 'true' }, link.glyph),
      ),
    ),
  );
}

/** 底部「作者其他插件」引流卡：四行（包名 ＋ 一句说明 ＋ 行尾外链图标），点开新窗口。
 *
 * 卡片在页签面板之后，六页签切换它都在（它不属于任何一个页签）。
 */
function MorePluginsCard(): React.ReactElement {
  return React.createElement(
    'div',
    { style: S.moreCard },
    React.createElement('div', { style: S.moreTitle }, '作者其他插件'),
    MORE_PLUGINS.map((row) =>
      React.createElement(
        'a',
        {
          key: row.pkg,
          href: row.url,
          target: '_blank',
          rel: 'noreferrer',
          title: row.pkg + ' 的 GitHub 仓库',
          style: S.moreRow,
        },
        React.createElement('span', { style: S.morePkg }, row.pkg),
        React.createElement('span', { style: S.moreDesc }, row.desc),
        React.createElement('span', { style: S.moreIcon }, React.createElement(ExternalIcon, null)),
      ),
    ),
  );
}

/** 爱生活面板：总设置区 ＋ 检查更新（七家）＋ 爱生活页签条（slot 驱动）＋ 技能设置页投影/缺席卡。 */
function LifePackSection(props: LifePackSectionProps & { getCall: () => CallFace | null }): React.ReactElement {
  const tabsId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const rows: ConfigTabRow[] = props.useTabs((value) => value);
  const present = new Set(rows.map((r) => r.id));
  const face = useUpdateRows(props.getCall);
  // 配置体检（#706）：一张表六份报告，总览那行与各家那张表都从它读（同一份数据）。
  // 通道名由各家注册时写进页签槽 options，总管源码里不出现任何一家的通道名。
  const healthTabs = React.useMemo(
    () => rows.filter((row) => row.channel.length > 0).map((row) => ({ id: row.id, channel: row.channel })),
    [rows],
  );
  const health = useHealthPanel(() => props.getCall(), healthTabs);
  const [activeId, setActiveId] = React.useState<string | undefined>(undefined);
  const [visitedIds, setVisitedIds] = React.useState<ReadonlySet<string>>(() => new Set());
  const active = MANAGER_TABS.some((t) => t.plugin === activeId)
    ? (activeId as string)
    : MANAGER_TABS[0].plugin;
  React.useEffect(() => {
    setVisitedIds((previous) => {
      if (previous.has(active)) return previous;
      return new Set([...previous, active]);
    });
  }, [active]);
  function labelFor(tab: ManagerTab): string {
    const row = rows.find((r) => r.id === tab.plugin);
    return row && row.label.length > 0 ? row.label : tab.title;
  }
  /** 按包名取页签标题（总览那行按账本行过，账本里没有的退到导航表的标题）。 */
  function labelForTab(id: string): string {
    const row = rows.find((r) => r.id === id);
    if (row && row.label.length > 0) return row.label;
    const tab = MANAGER_TABS.find((t) => t.plugin === id);
    return tab ? tab.title : id;
  }
  function targetForTab(tab: ManagerTab) {
    return face.targets.find((t) => t.packageName === tab.plugin) ?? null;
  }
  function onTabKeyDown(event: React.KeyboardEvent, index: number): void {
    let nextIndex: number | undefined;
    switch (event.key) {
      case 'ArrowRight': nextIndex = (index + 1) % MANAGER_TABS.length; break;
      case 'ArrowLeft': nextIndex = (index - 1 + MANAGER_TABS.length) % MANAGER_TABS.length; break;
      case 'Home': nextIndex = 0; break;
      case 'End': nextIndex = MANAGER_TABS.length - 1; break;
      default: return;
    }
    event.preventDefault();
    const next = MANAGER_TABS[nextIndex];
    setActiveId(next.plugin);
    tabRefs.current[nextIndex]?.focus();
  }
  return React.createElement(
    'div',
    null,
    React.createElement(
      'div',
      { style: S.headRow },
      React.createElement('div', { style: S.head }, '爱生活'),
      // 三件并排：本票的「检查更新」在左，隔壁票（#679）的星与气泡在右，整组靠右（窄窗口折行）。
      React.createElement(
        'div',
        { style: S.headActions },
        React.createElement(CheckUpdateButton, { face }),
        React.createElement(PanelActions, null),
      ),
    ),
    React.createElement(
      'div',
      { style: S.meta },
      React.createElement('div', null, '总开关 · 开关（缺省启用，只读）'),
      React.createElement('div', null, '总管 dsh-life-pack · ' + MANAGER_VERSION),
    ),
    React.createElement(UpdateResults, { face }),
    React.createElement(HealthOverview, {
      lights: lightsOf(
        rows.map((row) => ({ id: row.id, title: labelForTab(row.id) })),
        Object.fromEntries(Object.entries(health.rows).map(([id, row]) => [id, row.report ?? undefined])),
      ),
      running: health.running,
      error: health.error,
      onRun: health.run,
      onJump: setActiveId,
    }),
    React.createElement(
      'div',
      { role: 'tablist', 'aria-label': '爱生活技能页签', style: S.tablist },
      MANAGER_TABS.map((tab, index) => {
        const selected = tab.plugin === active;
        return React.createElement(
          'button',
          {
            key: tab.plugin,
            ref: (element: HTMLButtonElement | null) => {
              tabRefs.current[index] = element;
            },
            id: tabsId + '-tab-' + tab.plugin,
            type: 'button',
            role: 'tab',
            'aria-selected': selected,
            'aria-controls': tabsId + '-panel-' + tab.plugin,
            tabIndex: selected ? 0 : -1,
            style: selected ? { ...S.tab, ...S.tabActive } : S.tab,
            onClick: () => {
              setActiveId(tab.plugin);
            },
            onKeyDown: (event: React.KeyboardEvent) => {
              onTabKeyDown(event, index);
            },
          },
          (present.has(tab.plugin) ? '● ' : '○ ') + labelFor(tab),
        );
      }),
    ),
    MANAGER_TABS.filter((tab) => tab.plugin === active || visitedIds.has(tab.plugin)).map((tab) => {
      const selected = tab.plugin === active;
      return React.createElement(
        'div',
        {
          key: tab.plugin,
          id: tabsId + '-panel-' + tab.plugin,
          role: 'tabpanel',
          'aria-labelledby': tabsId + '-tab-' + tab.plugin,
          hidden: !selected,
        },
        present.has(tab.plugin)
          ? React.createElement(
              'div',
              null,
              props.renderSlot(CONFIG_TAB_SLOT, {}, { only: tab.plugin }) as React.ReactNode,
              // 那家的体检表：与总览那行读同一份快照（`health.rows`），不是各算一遍。
              React.createElement(HealthTable, {
                title: labelFor(tab),
                phase: health.rows[tab.plugin]?.phase ?? 'idle',
                report: health.rows[tab.plugin]?.report ?? null,
                error: health.rows[tab.plugin]?.error ?? null,
              }),
            )
          : React.createElement(AbsentCard, {
              target: targetForTab(tab),
              fallbackCommand: recoFor(tab).installCmd,
              face,
            }),
      );
    }),
    React.createElement(MorePluginsCard, null),
  );
}

export function apply(ctx: ClientCtx): void {
  // 调用口取用器：每次取数时现取（connection 后到也不永久缺席），透传给面板组件。
  const getCall = (): CallFace | null => (ctx.connection?.rpc?.call as CallFace | undefined) ?? null;
  // ledger 观测源（settings-plugins:1744-1767 同形；无 locale 面声明，故只订 ledger）。
  let tabsVersion = -1;
  let tabs: ConfigTabRow[] = [];
  const sectionInjected = () => ({
    hooks: {
      tabs: {
        getSnapshot: () => {
          const version = ctx.slots.getVersion(CONFIG_TAB_SLOT);
          if (version !== tabsVersion) {
            tabsVersion = version;
            tabs = ctx.slots
              .entries(CONFIG_TAB_SLOT)
              .map((entry) => ({
                id: entry.options.id ?? '',
                order: entry.options.order ?? 0,
                label: resolveLabel(entry.options.label),
                // #706 配置体检的通道：各家注册时写进 options，缺席即这一家没有体检出口（灯显 —）。
                channel: entry.options.channel ?? '',
              }))
              .sort((a, b) => a.order - b.order);
          }
          return tabs;
        },
        subscribe: (listener: () => void) => ctx.slots.subscribe(CONFIG_TAB_SLOT, listener),
      },
    },
  });
  ctx.slots.inject('settings.section', () =>
    ctx.slots.register(
      {
        name: 'settings.section',
        id: 'dsh-life-pack',
        order: 21,
        label: () => '爱生活',
        inject: sectionInjected,
        children: { 'ilife.config-tab': { kind: 'list', scope: 'root' } },
      },
      (props: LifePackSectionProps) => React.createElement(LifePackSection, { ...props, getCall }),
    ),
  );
}
