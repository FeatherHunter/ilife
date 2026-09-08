/** dsh-life-pack client 适配器（六边形：browser 侧；爱生活单卡方案）。
 *
 * 真实 DSH 契约（出处见 docs/agents/dsh-client-contract.md §5/§11）：
 * - 本文件经 tsdown 打成 loader 工厂包（browser/CJS + 注册包裹），classic 执行
 *   只注册，副作用全在 factory 内；传递闭包禁 node 内建与 ESM 语法（回路
 *   test/client-bundle-48.test.mjs 看门）。
 * - inject 短名 ['slots']（总管机制范围无 RPC，不声明 connection，不碰 sidebar）；
 *   apply 只注册一处 DSH设置面板槽（kind list，id 必填）。
 * - 爱生活页签条走 slot 驱动（settings-plugins 先例，禁纯 useState 手画 tab）：
 *   section 声明 children 爱生活页签槽，各技能往里注册自家技能设置页；
 *   tab 行从 ledger 投影（entries+getVersion+subscribe），面板用 props.renderSlot
 *   按 `{only}` 投影（一次只挂载一个）+ visited 缓存；ledger 无某技能=缺席，
 *   显示推荐安装只读文本（不返空冒充）。
 * - 组件 React.createElement 手写（禁 JSX），无数据轮询、无 document/window/process。
 */

import * as React from 'react';
import { MANAGER_TABS, MANAGER_VERSION, recoFor } from './nav.js';
import type { ManagerTab } from './nav.js';
import type {
  ClientCtx,
  ConfigTabRow,
  LifePackSectionProps,
  SlotLedgerEntry,
} from './dsh-ctx.js';

export const inject = ['slots'];

/** 爱生活页签槽（总管声明的 children，技能设置页注册进来；单段名，避开官方 settings.* 前缀）。 */
export const CONFIG_TAB_SLOT = 'ilife.config-tab' as const;

/** 总管视觉（内联 style；颜色走 DSH 主题别名，深浅主题自适应，写死值只做回退；与技能面板同语言）。 */
const S = {
  head: { fontSize: 15, fontWeight: 700, margin: '2px 0 8px', color: 'var(--dsw-alias-label-primary, inherit)' } as React.CSSProperties,
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
};

/** 缺席卡：未安装技能的占位（样式化推荐安装；只读文本，不做假导航）。 */
function AbsentCard(props: { tab: ManagerTab }): React.ReactElement {
  const reco = recoFor(props.tab);
  return React.createElement(
    'div',
    { style: S.reco },
    React.createElement('div', null, reco.hint),
    React.createElement('code', { style: S.cmd }, reco.installCmd),
  );
}

/** 标签解析（resolveSlotLabel 同形：thunk 跟活，无则空字串；见 slots lib:27-29）。 */
function resolveLabel(label: SlotLedgerEntry['options']['label']): string {
  if (typeof label === 'function') return label();
  return label ?? '';
}

/** 爱生活面板：总设置区 + 爱生活页签条（slot 驱动）+ 技能设置页投影/缺席文案。 */
function LifePackSection(props: LifePackSectionProps): React.ReactElement {
  const tabsId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const rows: ConfigTabRow[] = props.useTabs((value) => value);
  const present = new Set(rows.map((r) => r.id));
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
    React.createElement('div', { style: S.head }, '爱生活'),
    React.createElement(
      'div',
      { style: S.meta },
      React.createElement('div', null, '总开关 · 开关（缺省启用，只读）'),
      React.createElement('div', null, '总管 dsh-life-pack · ' + MANAGER_VERSION),
    ),
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
          ? (props.renderSlot(CONFIG_TAB_SLOT, {}, { only: tab.plugin }) as React.ReactNode)
          : React.createElement(AbsentCard, { tab }),
      );
    }),
  );
}

export function apply(ctx: ClientCtx): void {
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
      LifePackSection,
    ),
  );
}
