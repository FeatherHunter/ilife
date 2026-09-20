/** 文件浏览器视图半的**零件**：样式表与四行控件（面包屑／根／一行子目录／新建行）。
 *
 * 为什么拆出来：整张对话框的组版与这些零件的变化频率不同——零件跟着「图上多一行／少一行」动，
 * 组版跟着「对话框长什么样」动。拆开之后两边都在 350 行告警线内，而对外面不变
 * （`directory-browser-ui.ts` 照旧转出组件与两个接线函数）。
 *
 * 本件与视图半同样**不认识宿主**：只认状态与文案。
 */

import * as React from 'react';
import type { BrowseState } from './directory-browser-state.js';
import type { DirectoryEntry, RootKind } from './directory-browser-contract.js';

/** 图上出现的每一句文案；调用方给（本件不自造口径）。 */
export interface DirectoryBrowserLabels {
  /** 对话框标题，例：「选择数据目录」。 */
  readonly title: string;
  readonly close: string;
  readonly up: string;
  readonly pathPlaceholder: string;
  readonly go: string;
  readonly showHidden: (count: number) => string;
  readonly empty: string;
  readonly loading: string;
  readonly newFolder: string;
  readonly createConfirm: string;
  readonly createCancel: string;
  readonly select: string;
  readonly selected: string;
  readonly open: string;
  readonly cancel: string;
  /** 选中预览那一行的前缀，例：「将选定：」。 */
  readonly willPick: string;
  /** 根那一行的行首说明，例：「其他磁盘：」。 */
  readonly roots: string;
}

/** 根的类型说明（悬停可见）：**本件自己的词汇**，与取数方无关。 */
const ROOT_KIND_TEXT: Record<RootKind, string> = {
  fixed: '固定磁盘',
  network: '网络驱动器',
  removable: '可移动磁盘',
  optical: '光驱',
  other: '磁盘',
};

export const S = {
  scrim: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.35)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  } as React.CSSProperties,
  dialog: {
    width: 680,
    maxWidth: '92vw',
    height: 500,
    maxHeight: '86vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--dsw-alias-bg-layer-1, #1f1f23)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
    borderRadius: 10,
    boxShadow: '0 12px 32px rgba(0,0,0,0.35)',
    overflow: 'hidden',
  } as React.CSSProperties,
  head: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700 } as React.CSSProperties,
  headTail: { marginLeft: 'auto', fontSize: 12, opacity: 0.72, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
  crumbs: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, padding: '8px 12px 0', fontSize: 12 } as React.CSSProperties,
  chromeButton: {
    background: 'transparent',
    border: 'none',
    color: 'var(--dsw-alias-label-primary, inherit)',
    cursor: 'pointer',
    padding: '2px 4px',
    fontSize: 12,
    opacity: 0.85,
  } as React.CSSProperties,
  crumbSep: { opacity: 0.45, fontSize: 12 } as React.CSSProperties,
  roots: { display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, padding: '0 12px 8px', fontSize: 12 } as React.CSSProperties,
  rootsLabel: { opacity: 0.72, marginRight: 2 } as React.CSSProperties,
  rootButton: {
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
    borderRadius: 6,
    padding: '3px 8px',
    opacity: 1,
  } as React.CSSProperties,
  pathRow: { display: 'flex', gap: 6, padding: '8px 12px' } as React.CSSProperties,
  input: {
    flex: 1,
    minWidth: 0,
    fontSize: 12,
    padding: '5px 8px',
    background: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12))',
    color: 'inherit',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
    borderRadius: 6,
  } as React.CSSProperties,
  button: {
    fontSize: 12,
    padding: '5px 10px',
    cursor: 'pointer',
    background: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.12))',
    color: 'inherit',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.35))',
    borderRadius: 6,
  } as React.CSSProperties,
  buttonOff: { opacity: 0.45, cursor: 'default' } as React.CSSProperties,
  list: {
    flex: 1,
    minHeight: 0,
    overflowY: 'auto',
    margin: '0 12px',
    border: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
    borderRadius: 6,
  } as React.CSSProperties,
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    width: '100%',
    padding: '6px 10px',
    textAlign: 'left',
    background: 'transparent',
    color: 'inherit',
    border: 'none',
    borderBottom: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.12))',
    cursor: 'pointer',
    fontSize: 13,
  } as React.CSSProperties,
  rowSelected: { background: 'var(--dsw-alias-bg-layer-2, rgba(128,128,128,0.18))' } as React.CSSProperties,
  empty: { padding: '14px 12px', fontSize: 12, opacity: 0.7 } as React.CSSProperties,
  footNote: { padding: '6px 12px 0', fontSize: 12, minHeight: 20 } as React.CSSProperties,
  foot: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 12px',
    borderTop: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))',
  } as React.CSSProperties,
  target: { marginRight: 'auto', fontSize: 12, opacity: 0.8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } as React.CSSProperties,
  error: { color: 'var(--dsw-alias-label-error, #e66)' } as React.CSSProperties,
} as const;

/** 面包屑：从文件系统根到当前层，每一格都是跳转目标（`listing.crumbs` 由取数方给）。 */
export function crumbRow(state: BrowseState, onEnter: (path: string) => void): React.ReactElement | null {
  const listing = state.listing;
  if (listing === null || listing.crumbs.length === 0) return null;
  const parts: React.ReactNode[] = [];
  listing.crumbs.forEach((crumb, index) => {
    if (index > 0) parts.push(React.createElement('span', { key: 'sep-' + crumb.path, style: S.crumbSep }, '›'));
    const isCurrent = crumb.path === listing.path;
    parts.push(
      React.createElement(
        'button',
        {
          key: crumb.path,
          type: 'button',
          style: { ...S.chromeButton, fontWeight: isCurrent ? 700 : 400 },
          title: crumb.path,
          onClick: () => onEnter(crumb.path),
        },
        // 每一格都写**它自己那一层的名字**：第一格是文件系统根（`C:\`），不是「上一级」——
        // 「上一级」是路径行那颗按钮的活（#744 返修：这一格原先串了那颗按钮的文案）。
        crumb.name,
      ),
    );
  });
  return React.createElement('div', { style: S.crumbs }, parts);
}

/** 可跳转的根那一行（Windows 上的盘符等）。**少于两个根就不画**：一个根没有「跳到别处」可言。 */
export function rootsRow(
  state: BrowseState,
  labels: DirectoryBrowserLabels,
  onEnter: (path: string) => void,
): React.ReactElement | null {
  if (state.roots.length < 2) return null;
  const parts: React.ReactNode[] = [
    React.createElement('span', { key: 'roots-label', style: S.rootsLabel }, labels.roots),
  ];
  for (const root of state.roots) {
    parts.push(
      React.createElement(
        'button',
        {
          key: root.path,
          type: 'button',
          style: { ...S.chromeButton, ...S.rootButton },
          title: ROOT_KIND_TEXT[root.kind] ?? ROOT_KIND_TEXT.other,
          onClick: () => onEnter(root.path),
        },
        root.path,
      ),
    );
  }
  return React.createElement('div', { style: S.roots, role: 'group', 'aria-label': labels.roots }, parts);
}

/** 一行子目录：点名字进它，点「选」把它当目标（「选」再点一次取消）。 */
export function entryRow(
  entry: DirectoryEntry,
  selected: boolean,
  labels: DirectoryBrowserLabels,
  onToggleSelect: (path: string) => void,
  onEnter: (path: string) => void,
): React.ReactElement {
  return React.createElement(
    'div',
    { key: entry.path, style: { ...S.row, padding: 0, ...(selected ? S.rowSelected : {}) } },
    React.createElement(
      'button',
      { type: 'button', style: { ...S.row, flex: 1, border: 'none' }, onClick: () => onEnter(entry.path) },
      '📁 ' + entry.name,
    ),
    React.createElement(
      'button',
      {
        type: 'button',
        style: { ...S.button, marginRight: 8, padding: '2px 8px' },
        'aria-pressed': selected,
        title: selected ? labels.selected : labels.select,
        onClick: () => onToggleSelect(entry.path),
      },
      selected ? '✓' : labels.select,
    ),
  );
}

/** 「新建文件夹」那一行（`creatingName === null` 时收起）。 */
export function createRow(
  labels: DirectoryBrowserLabels,
  onName: (name: string) => void,
  onCancel: () => void,
  onCreate: (name: string) => void,
  creatingName: string | null,
): React.ReactElement | null {
  if (creatingName === null) return null;
  return React.createElement(
    'div',
    { style: { ...S.pathRow, borderTop: '1px solid var(--dsw-alias-border-l2, rgba(128,128,128,0.25))' } },
    React.createElement('input', {
      style: S.input,
      value: creatingName,
      placeholder: labels.newFolder,
      'aria-label': labels.newFolder,
      onChange: (event: React.ChangeEvent<HTMLInputElement>) => onName(event.currentTarget.value),
      onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') onCreate(creatingName);
        if (event.key === 'Escape') onCancel();
      },
    }),
    React.createElement('button', { type: 'button', style: S.button, onClick: () => onCreate(creatingName) }, labels.createConfirm),
    React.createElement('button', { type: 'button', style: S.button, onClick: onCancel }, labels.createCancel),
  );
}
