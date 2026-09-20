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
import { MANAGER_PLUGIN, MANAGER_TABS, MORE_PLUGINS, PANEL_LINKS, recoFor } from './nav.js';
import type { ManagerTab } from './nav.js';
import { AbsentCard, CheckUpdateButton, UpdateResults, useUpdateRows } from './update-panel.js';
import { loadManagerVersion } from './update-client.js';
import type { CallFace } from './update-client.js';
import { CONFIG_TAB_SLOT, VERSION_UNKNOWN } from './update-contract.js';
import { summaryErrorOf, useHealthPanel } from './health-panel.js';
import { HealthSummaryLine, HealthTable, STATUS_TEXT, TAB_DOT, TAB_NOTE_STYLE, lightsOf, tabDotColor, tabNote } from './health-view.js';
import { HEALTH_ENDPOINT } from './health-contract.js';
import type {
  ClientCtx,
  ConfigTabRow,
  LifePackSectionProps,
  SlotLedgerEntry,
} from './dsh-ctx.js';

export const inject = ['slots', 'connection'];

/** 爱生活页签槽名：定义在 `update-contract.ts`（宿主判「已装产物有没有注册代码」也用这个名字，一处定义）。 */
export { CONFIG_TAB_SLOT } from './update-contract.js';

/** 共用件「目录浏览器」从包门转出（票 #744）：六个单品插件的设置页要用的就是这两样——
 *  「开图接线 ＋ 入口三态判定」（纯逻辑，`./directory-browser` 子路径）与
 *  「对话框组件」（`./directory-browser-ui` 子路径，吃 React）。
 *
 *  六家的 client 束**不能**从本条 `./client` 取：这一条是 loader 工厂包
 *  （`window.__ModuleLoader__.load(...)` 的注册壳），`require` 拿到的是空 exports。
 *  所以对外要用的是那两个普通子路径；这里只是同源转出，供本包内部与用例使用。 */
export { DirectoryBrowserFromRow } from './directory-browser-ui.js';
export type { DirectoryBrowserLabels, DirectoryBrowserProps } from './directory-browser-ui.js';
export { createBrowseController, createDirectoryRowBrowser, rowsOf, canGoUp, targetOf, entryPath } from './directory-browser-state.js';
export type { BrowseController, BrowseState, DirectoryRowBrowser } from './directory-browser-state.js';
export { pickerModeOf, readPickAnswer } from './directory-browser-contract.js';
export type { DirectoryBrowseFace, DirectoryListing, PickOutcome, RootKind, RootRow } from './directory-browser-contract.js';
export { createRootsSource, readRootsAnswer } from './directory-browser-roots.js';

/** 包名 → 本家那条客户端通道（票 #735）。取值面是导航表那份镜像，不再从页签槽账本的自定义选项里读：
 *  装机槽位面不透传自定义键，读了恒是空串（详见 `nav.ts` 上 `ManagerTab.channel` 的注释）。 */
const CHANNEL_BY_PLUGIN = new Map(MANAGER_TABS.map((tab) => [tab.plugin, tab.channel]));

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

/** 总管自述版本（票 #737）：**不手写**，问宿主——宿主读自己这份已安装包的 `package.json`。
 *
 * 单次取数（`loadManagerVersion`），无轮询；初值 `unknown`，读不到也停在 `unknown`。
 * 与卡路里 #130 同一条路：面板是浏览器产物、禁 node 内建，读盘只许在宿主半。 */
function useManagerVersion(getCall: () => CallFace | null): string {
  const [version, setVersion] = React.useState<string>(VERSION_UNKNOWN);
  React.useEffect(() => {
    let alive = true;
    void loadManagerVersion(getCall()).then((next) => {
      if (alive) setVersion(next);
    });
    return () => {
      alive = false;
    };
  }, [getCall]);
  return version;
}

/** 爱生活面板：总设置区 ＋ 检查更新（七家）＋ 爱生活页签条（slot 驱动）＋ 技能设置页投影/缺席卡。 */
function LifePackSection(props: LifePackSectionProps & { getCall: () => CallFace | null }): React.ReactElement {
  const tabsId = React.useId();
  const tabRefs = React.useRef<Array<HTMLButtonElement | null>>([]);
  const rows: ConfigTabRow[] = props.useTabs((value) => value);
  const present = new Set(rows.map((r) => r.id));
  const face = useUpdateRows(props.getCall);
  const managerVersion = useManagerVersion(props.getCall);
  // 配置体检（#706）：一张表六份报告，顶部那行汇总与各家那张表都从它读（同一份数据）。
  // 通道名的来源见 CHANNEL_BY_PLUGIN（#735：账本那一格读不到，改取导航表那份镜像）。
  const healthTabs = React.useMemo(
    () => rows.filter((row) => row.channel.length > 0).map((row) => ({ id: row.id, channel: row.channel })),
    [rows],
  );
  const health = useHealthPanel(() => props.getCall(), healthTabs);
  /** 六家的灯（票 #732）：按**页签槽账本**那一排过（装了但没体检通道的也在内，它显缺席态）。 */
  const lights = React.useMemo(
    () => lightsOf(
      rows.map((row) => ({ id: row.id, title: row.label, hasChannel: row.channel.length > 0 })),
      Object.fromEntries(Object.entries(health.rows).map(([id, row]) => [id, row.report ?? undefined])),
    ),
    [rows, health.rows],
  );
  const lightOf = (id: string) => lights.find((light) => light.id === id);
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
      // 版本行（#737）：包名取自 nav.ts 那处唯一定义，版本号取自宿主读到的装机包版本。
      // 这段 meta 区此前还挂着一行静态文本，说有个「缺省启用、只读的开关」——那个开关今天并不存在
      // （全仓没有任何代码读它或写它，设置页的行表里也没有「启用」这一项），票 #738 原地删除。
      React.createElement('div', null, '总管 ' + MANAGER_PLUGIN + ' · ' + managerVersion),
    ),
    React.createElement(UpdateResults, { face }),
    React.createElement(HealthSummaryLine, {
      lights,
      running: health.running,
      // #735：取数失败也要在这一行看得见（各家的错只画在那家页签里的表上，摘要行沉默＝用户以为按钮坏了）。
      error: summaryErrorOf(health),
      onRun: health.run,
    }),
    React.createElement(
      'div',
      { role: 'tablist', 'aria-label': '爱生活技能页签', style: S.tablist },
      MANAGER_TABS.map((tab, index) => {
        const selected = tab.plugin === active;
        const light = lightOf(tab.plugin);
        // 圆点从「实心／空心＝装没装」换成「颜色＝体检档位」（票 #732）：装了就是实心、
        // 颜色按档位走；没装的保持缺席态、不许点（点它只会跳到一张缺席卡）。
        const dotColor = light === undefined
          ? (present.has(tab.plugin) ? TAB_DOT.unchecked : TAB_DOT.absent)
          : tabDotColor(light);
        const note = light === undefined ? null : tabNote(light);
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
            title: light === undefined
              ? '这一家没装（或产物没注册页签槽）'
              : light.title + '：' + (light.hasChannel
                ? (light.status === null ? '还没体检' : '体检读数见本页签下方的表')
                : '没有配置体检出口'),
          },
          React.createElement('span', {
            'data-ilife-health': 'tab-dot',
            style: {
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: dotColor,
              display: 'inline-block',
              flex: '0 0 auto',
            },
          }),
          labelFor(tab),
          note === null
            ? null
            : React.createElement(
                'span',
                {
                  'data-ilife-health': 'tab-note',
                  // 红黄各自那一截带**自己**的档位色，不许一个色管两档（#706 复评逮过的缺陷）。
                  style: { ...TAB_NOTE_STYLE, color: note.status === null ? undefined : STATUS_TEXT[note.status] },
                },
                note.text,
              ),
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
              // 账本事实与装机读数分开给：缺席卡按两处事实分三态，不许互相顶替（见 update-view.ts 的 slotStateOf）。
              inLedger: present.has(tab.plugin),
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
                // #735 配置体检的通道：取自导航表（账本那一格读不到）。表里没有这家 ⇒ 空串 ⇒
                // 这家没有体检出口（灯显缺席态、按钮不会为它取数）。
                channel: CHANNEL_BY_PLUGIN.get(entry.options.id ?? '') ?? '',
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
