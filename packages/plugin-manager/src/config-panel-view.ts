/** 共用配置面板 · 视图半：一行怎么画（`Row`）、整面怎么画（`PanelBody`）。
 *
 * 本件是**纯函数**：吃一份状态与一组回调，回一棵 React 元素树，自己不留任何状态、不取任何数。
 * 为什么这么分：状态机与副作用住在 `config-panel.ts` 那一层，于是本件在 Node 里就能直测
 * （照 `directory-browser-ui.ts` 的既有作法：用例把组件当普通函数调，直接读回那棵树）。
 *
 * 手写 `React.createElement`（本包 client 束禁 JSX）。样式表 `S` 就在本件里——面板怎么画只有这一处。
 *
 * 三条定稿（v3）在本件落地：
 *   ① **只读行的目录按钮不画**（不画一枚点了也没反应的死按钮）；
 *   ② 目录行的按钮字面**两档合一**，一律「浏览文件夹」（入口供不了时整枚不画）；
 *   ③ **每行一枚「复制」**：复制这一行完好的值文本；点下去按钮就地变「已复制」再变回，不弹提示。
 *
 * 对外只经 `config-panel-api.ts` 那一道门；本件自己不出门。
 */

import * as React from 'react';
import { ADVANCED_GROUP_NOTE, ADVANCED_GROUP_TITLE } from './config-panel-contract.js';
import type { ConfigItem, ConfigSurfaceReply } from './config-panel-contract.js';
import { DirectoryBrowserFromRow } from './directory-browser-ui.js';
import type { DirectoryRowBrowser } from './directory-browser-state.js';
import type { DirectoryRowEntry } from './directory-browser-api.js';

/** 面板的样式表：颜色走 DSH 主题别名（深浅主题自适应，写死值只做回退），字号一律相对单位（em）。 */
const S = {
  card: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    lineHeight: 1.6,
  } as React.CSSProperties,
  title: { fontSize: '1.08em', fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  muted: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em'} as React.CSSProperties,
  error: { marginTop: 8, color: 'var(--dsw-alias-label-error, #b3261e)', fontSize: '1em', whiteSpace: 'pre-wrap' } as React.CSSProperties,
  okText: { marginTop: 8, color: 'var(--dsw-alias-state-success-primary, #12805c)', fontSize: '0.96em'} as React.CSSProperties,
  rows: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))', paddingTop: 8 } as React.CSSProperties,
  info: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em', overflowWrap: 'anywhere' } as React.CSSProperties,
  row: { marginBottom: 10 } as React.CSSProperties,
  label: { fontWeight: 600 } as React.CSSProperties,
  hint: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em', marginBottom: 4 } as React.CSSProperties,
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
  } as React.CSSProperties,
  pickRow: { display: 'flex', gap: 6, alignItems: 'center' } as React.CSSProperties,
  acts: { display: 'flex', gap: 6, alignItems: 'center', flex: '0 0 auto' } as React.CSSProperties,
  btnPick: {
    flex: '0 0 auto',
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  } as React.CSSProperties,
  invalid: { marginTop: 6, padding: '6px 8px', borderRadius: 6, background: 'color-mix(in srgb, var(--dsw-alias-state-warning-primary, #b26a00) 16%, transparent)', border: '1px solid var(--dsw-alias-state-warning-primary, #b26a00)', color: 'var(--dsw-alias-label-primary, inherit)', fontSize: '0.92em' } as React.CSSProperties,
  bar: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', position: 'sticky', bottom: 0, zIndex: 1, background: 'var(--dsw-alias-bg-layer-1, #232329)', padding: '8px 0', borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))' } as React.CSSProperties,
  saveMsg: { marginRight: 'auto', alignSelf: 'center', color: 'var(--dsw-alias-state-warning-primary, #b26a00)', fontSize: '0.9em' } as React.CSSProperties,
  dirtyDot: { color: 'var(--dsw-alias-state-warning-primary, #b26a00)', fontSize: '0.85em', marginLeft: 6, fontWeight: 400 } as React.CSSProperties,
  followNote: { color: 'var(--dsw-alias-state-warning-primary, #b26a00)', fontSize: '0.85em', marginBottom: 4 } as React.CSSProperties,
  btn: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-brand-primary, #2f6fed)',
    background: 'var(--dsw-alias-brand-primary, #2f6fed)',
    color: '#fff',
    cursor: 'pointer',
  } as React.CSSProperties,
  advanced: { marginTop: 12 } as React.CSSProperties,
  summary: { cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
  version: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.25))',
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontSize: '0.92em',
  } as React.CSSProperties,
};

/** 样式表的形状（附加块照面板的视觉写，不各写一套内联样式）。 */
export type ConfigStyles = typeof S;

/** 附加块拿到的那两格。 */
export interface PanelParts {
  /** 面板自己的样式表。 */
  readonly styles: ConfigStyles;
  /** 配置面整面回执；还没读到（读取中／读取失败）时为 null。 */
  readonly reply: ConfigSurfaceReply | null;
}

/** 一行点「复制」之后就地显示成哪一档字面。 */
export type CopyState = 'idle' | 'done' | 'failed';

/** 复制那一枚按钮的字面（定稿 v3 第三条：就地变，不弹提示）。 */
export function copyLabelOf(state: CopyState | undefined): string {
  if (state === 'done') return '已复制';
  if (state === 'failed') return '复制失败';
  return '复制';
}

export interface RowProps {
  readonly item: ConfigItem;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (key: string, next: string) => void;
  /** 目录行才有：入口三态（`native`／`browse`／`none`）。 */
  readonly browser?: DirectoryRowEntry | null | undefined;
  /** 脏行：这一行与刚读到的整面不一致时画标记。 */
  readonly dirty?: boolean;
  /** 跟随行：只读派生行在触发键变脏时给「将跟随更新」态。 */
  readonly follow?: boolean;
  /** 点这一行的「复制」：把该行的值文本交出去。
   *  定稿 v3 要求每行一枚，所以按钮**一律画**；这一格缺席时按钮 `disabled` 而不是点了就炸
   *  （面板那边永远给这一格，缺席只可能是别的调用点少交了东西）。 */
  readonly onCopy?: ((key: string, text: string) => void) | undefined;
  /** 复制那一枚按钮当刻的字面（不给＝「复制」）。 */
  readonly copyState?: CopyState | undefined;
}

/** 一行输入（四种控件对齐受限 YAML 子集：文本／数字／布尔／目录）。
 *
 * 目录档＝文本框 ＋ 一枚唤起目录选择的按钮；入口三态是 `none`（命名空间拿不到、或这条路已被拒）
 * **就不画按钮**，文本框照旧——那是该缝自己的契约（供不了就收起入口，不是失败）。
 * **只读行**：控件一律 `disabled`、`onChange` 不接，目录行的按钮**一枚都不画**（定稿 v3 ①）。 */
export function Row(props: RowProps): React.ReactElement {
  const { item } = props;
  const readonly = item.readonly === true;
  const disabled = props.disabled || readonly;
  const onChange = readonly
    ? undefined
    : (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.value);
  const control =
    item.control === 'switch'
      ? React.createElement('input', {
          type: 'checkbox',
          checked: props.value === 'true',
          disabled,
          onChange: readonly
            ? undefined
            : (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.checked ? 'true' : 'false'),
        })
      : React.createElement('input', {
          style: props.dirty === true
            ? { ...S.input, borderColor: 'var(--dsw-alias-state-warning-primary, #b26a00)' }
            : readonly && props.follow === true
              ? { ...S.input, opacity: 0.55 }
              : S.input,
          type: item.control === 'number' ? 'number' : 'text',
          value: props.value,
          disabled,
          spellCheck: false,
          onChange,
        });
  /** 目录入口：只读行不画（定稿 v3 ①），供不了（`none`／缺席）也不画。 */
  const entry = props.browser ?? null;
  const browse =
    item.control === 'directory' && !readonly && entry !== null && entry.mode !== 'none'
      ? React.createElement(
          'button',
          {
            style: S.btnPick,
            type: 'button',
            disabled,
            // 回这枚 Promise 是有意的：React 不看 onClick 的返回值，而用例能直接 await 它。
            onClick: () => entry.onOpen(item.key),
          },
          '浏览文件夹',
        )
      : null;
  const copy = React.createElement(
    'button',
    {
      style: S.btnPick,
      type: 'button',
      disabled: props.onCopy === undefined,
      onClick: () => props.onCopy?.(item.key, props.value),
    },
    copyLabelOf(props.copyState),
  );
  const acts = React.createElement('div', { style: S.acts }, browse, copy);
  return React.createElement(
    'div',
    { style: S.row },
    React.createElement(
      'div',
      { style: S.label },
      item.title,
      props.dirty === true ? React.createElement('span', { style: S.dirtyDot }, '●已改动') : null,
    ),
    React.createElement('div', { style: S.hint }, item.hint),
    readonly && props.follow === true ? React.createElement('div', { style: S.followNote }, '将跟随更新，保存后生效。') : null,
    React.createElement('div', { style: S.pickRow }, control, acts),
  );
}

/** 面板状态：读取中／就绪／整面读取失败。 */
export type PanelState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly surface: ConfigSurfaceReply }
  | { readonly kind: 'failed'; readonly message: string };

/** 整面的全部输入：状态 ＋ 行表 ＋ 各档回调（本件只读它、只回调）。 */
export interface PanelBodyProps {
  /** 卡片标题（各家自己的产品名）。 */
  readonly title: string | undefined;
  readonly items: readonly ConfigItem[];
  readonly state: PanelState;
  readonly draft: Readonly<Record<string, string>>;
  readonly busy: boolean;
  /** 成功提示（已保存／已重置）。 */
  readonly notice: string | null;
  /** 写入失败那一支：落点在底栏紧下面（与「就地失败」分开摆）。 */
  readonly writeError: string | null;
  /** 就地失败那一支（选目录那类）。 */
  readonly error: string | null;
  readonly picking: boolean;
  readonly browseRow: DirectoryRowBrowser | null;
  readonly rowEntry: DirectoryRowEntry | null;
  readonly dirtyKeys: readonly string[];
  readonly followKeys: readonly string[];
  readonly copy: { readonly key: string; readonly ok: boolean } | null;
  readonly onCopy: (key: string, text: string) => void;
  readonly onChange: (key: string, next: string) => void;
  readonly onSave: () => void;
  readonly onReset: () => void;
  readonly onRetry: () => void;
  /** 自家附加块（版本行／状态行）：给了就画在面板主体之后、动作条之前。 */
  readonly extra?: ((parts: PanelParts) => React.ReactNode) | undefined;
}

/** 应用内浏览器对话框的文案（面板自带，逐条对应图上那几个位置）。 */
const BROWSER_LABELS = {
  title: '选择文件夹',
  close: '关闭',
  up: '上一级',
  pathPlaceholder: '直接填绝对路径，回车即进入',
  go: '转到',
  showHidden: (n: number) => '显示隐藏目录（' + n + '）',
  empty: '这个目录里没有子目录。',
  loading: '正在读取',
  newFolder: '新建文件夹',
  createConfirm: '创建',
  createCancel: '取消',
  select: '选',
  selected: '已选',
  open: '选定这个目录',
  cancel: '取消',
  willPick: '将选定：',
} as const;

/** 画整面（四支控件、三支错误落位、底栏、附加块槽都在这里）。 */
export function PanelBody(props: PanelBodyProps): React.ReactElement {
  const { state, title } = props;
  const surface = state.kind === 'ready' ? state.surface : null;
  const headText = title === undefined ? '配置' : `${title} · 配置`;
  const headDataDir = surface === null ? '' : surface.resolved?.['dbDir'] ?? surface.dataDir;
  const head = React.createElement(
    'div',
    null,
    React.createElement('div', { style: S.title }, headText),
    surface === null
      ? null
      : React.createElement(
          'div',
          null,
          React.createElement('div', { style: S.info }, `配置文件 ${surface.path}`),
          React.createElement('div', { style: S.info }, `数据目录 ${headDataDir}`),
          surface.created ? React.createElement('div', { style: S.muted }, '（配置文件刚按默认值生成）') : null,
        ),
  );

  const parts: PanelParts = { styles: S, reply: surface };
  const extra = props.extra === undefined ? null : props.extra(parts);

  if (state.kind === 'failed') {
    return React.createElement(
      'div',
      { style: S.card },
      head,
      React.createElement('div', { style: S.error }, state.message),
      extra,
      React.createElement(
        'div',
        { style: S.bar },
        React.createElement('button', { style: S.btn, type: 'button', onClick: props.onRetry }, '重试'),
        React.createElement('button', { style: S.btn, type: 'button', onClick: props.onReset }, '重置为默认'),
      ),
    );
  }

  const common = props.items.filter((item) => item.tier === 'common');
  const advanced = props.items.filter((item) => item.tier === 'advanced');
  /** 还没读到整面（`loading`）时**框架照画**：行表与控件形状是客户端常量，不必等任何回执。
   *  值先空着、控件与三枚底栏键一律不可用；回执到了由 `ready` 那一支把值填上（见 `config-panel.ts`）。 */
  const ready = state.kind === 'ready';
  const frozen = props.busy || !ready;
  const renderRow = (item: ConfigItem) =>
    React.createElement(Row, {
      key: item.key,
      item,
      value: props.draft[item.key] ?? '',
      disabled: frozen,
      onChange: props.onChange,
      browser: props.rowEntry,
      dirty: ready && props.dirtyKeys.includes(item.key),
      follow: ready && props.followKeys.includes(item.key),
      onCopy: ready ? props.onCopy : undefined,
      copyState: props.copy !== null && props.copy.key === item.key ? (props.copy.ok ? 'done' : 'failed') : 'idle',
    });

  const dirtyCount = props.dirtyKeys.length;
  const dirty = ready && dirtyCount > 0;
  return React.createElement(
    'div',
    { style: S.card },
    head,
    ready ? null : React.createElement('div', { style: S.muted }, '配置读取中'),
    React.createElement('div', { style: S.rows }, common.map(renderRow)),
    advanced.length === 0
      ? null
      : React.createElement(
          'details',
          { style: S.advanced },
          React.createElement('summary', { style: S.summary }, ADVANCED_GROUP_TITLE),
          React.createElement('div', { style: S.muted }, ADVANCED_GROUP_NOTE),
          advanced.map(renderRow),
        ),
    extra,
    React.createElement(
      'div',
      { style: S.bar },
      dirty
        ? React.createElement('div', { style: S.saveMsg }, `浏览改动后请点保存（${dirtyCount} 项未保存），保存后跟随项自动更新`)
        : null,
      React.createElement(
        'button',
        { style: dirty ? S.btnPrimary : S.btn, type: 'button', disabled: frozen || !dirty, onClick: props.onSave },
        props.busy ? '处理中' : dirty ? `保存（${dirtyCount} 项未保存）` : '保存',
      ),
      React.createElement('button', { style: S.btn, type: 'button', disabled: frozen, onClick: props.onReset }, '重置为默认'),
      React.createElement('button', { style: S.btn, type: 'button', disabled: frozen, onClick: props.onRetry }, '重新读取'),
    ),
    props.picking ? React.createElement('div', { style: S.muted }, '已唤起系统文件夹对话框：选中后自动填上，取消则不动。') : null,
    props.browseRow !== null
      ? React.createElement(DirectoryBrowserFromRow, { open: true, row: props.browseRow, labels: BROWSER_LABELS })
      : null,
    props.writeError !== null
      ? React.createElement('div', { style: S.error, role: 'alert' }, props.writeError)
      : null,
    props.error !== null ? React.createElement('div', { style: S.error }, props.error) : null,
    props.notice !== null ? React.createElement('div', { style: S.okText }, props.notice) : null,
  );
}
