/** 文件浏览器的视图半：把 `BrowseState` 画成一张对话框。**不认识宿主**，也不自己做 IO。
 *
 * 手写 `React.createElement`（本包 client 束禁 JSX，见 `tsdown.config.ts` 的既成口径）。
 * 只读状态、只回调；进哪一层、选到什么由操作半（`directory-browser-state.ts`）算。
 */

import * as React from 'react';
import { rowsOf, targetOf } from './directory-browser-state.js';
import type { BrowseState, DirectoryRowBrowser } from './directory-browser-state.js';
import { hiddenCount, locationLabel } from './directory-browser-contract.js';
import type { DirectoryEntry, DirectoryListing } from './directory-browser-contract.js';

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
}

/** 组件 props：样式只吃这一格，别的一律不给。 */
export interface DirectoryBrowserProps {
  readonly open: boolean;
  readonly state: BrowseState;
  readonly labels: DirectoryBrowserLabels;
  readonly onPick: () => void;
  readonly onClose: () => void;
  readonly onEnter: (path: string) => void;
  readonly onUp: () => void;
  readonly onSelect: (path: string) => void;
  readonly onToggleHidden: () => void;
  readonly onDraft: (draft: string) => void;
  readonly onCommitDraft: () => void;
  readonly onCreate: (name: string) => void;
  readonly onCreatingChange: (name: string | null) => void;
}

const EMPTY_LISTING: DirectoryListing = { path: '', home: '', crumbs: [], entries: [], truncated: false };

const S = {
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

function crumbRow(
  state: BrowseState,
  onEnter: (path: string) => void,
): React.ReactElement | null {
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

function entryRow(
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

function createRow(
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

/** 画一张文件浏览器对话框。`open=false` 时返回 null（本件不挂 portal，由调用方决定挂在哪）。 */
export function DirectoryBrowser(props: DirectoryBrowserProps): React.ReactElement | null {
  const { open, state, labels } = props;
  if (!open) return null;
  const rows = rowsOf(state);
  const target = targetOf(state);
  const listing = state.listing ?? EMPTY_LISTING;
  const hidden = hiddenCount(listing);
  const body: React.ReactNode[] = [];
  body.push(crumbRow(state, props.onEnter));
  body.push(
    React.createElement(
      'div',
      { style: S.pathRow },
      React.createElement('input', {
        style: S.input,
        value: state.draft,
        placeholder: labels.pathPlaceholder,
        'aria-label': labels.pathPlaceholder,
        onChange: (event: React.ChangeEvent<HTMLInputElement>) => props.onDraft(event.currentTarget.value),
        onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => {
          if (event.key === 'Enter') props.onCommitDraft();
        },
      }),
      React.createElement('button', { type: 'button', style: S.button, onClick: props.onUp }, labels.up),
      React.createElement('button', { type: 'button', style: S.button, onClick: props.onCommitDraft }, labels.go),
    ),
  );
  body.push(
    React.createElement(
      'div',
      { style: S.list, role: 'listbox', 'aria-label': labels.title },
      rows.length === 0
        ? React.createElement('div', { style: S.empty }, state.phase === 'loading' ? labels.loading : labels.empty)
        : rows.map((entry) => entryRow(entry, state.selected === entry.path, labels, props.onSelect, props.onEnter)),
    ),
  );
  body.push(createRow(labels, props.onDraft, () => props.onCreatingChange(null), props.onCreate, state.creating));
  body.push(
    React.createElement(
      'div',
      { style: S.footNote },
      hidden > 0
        ? React.createElement(
            'label',
            { style: { fontSize: 12, cursor: 'pointer', marginRight: 10 } },
            React.createElement('input', { type: 'checkbox', checked: state.showHidden, onChange: props.onToggleHidden }),
            ' ' + labels.showHidden(hidden),
          )
        : null,
      state.creating === null
        ? React.createElement('button', { type: 'button', style: { ...S.chromeButton, textDecoration: 'underline' }, onClick: () => props.onCreatingChange('') }, labels.newFolder)
        : null,
      state.notice !== null ? React.createElement('div', { style: S.error }, state.notice) : null,
      state.phase === 'failed' && state.failure !== null
        ? React.createElement('div', { style: S.error }, state.failure.message)
        : null,
    ),
  );
  body.push(
    React.createElement(
      'div',
      { style: S.foot },
      React.createElement('span', { style: S.target, title: target ?? '' }, target === null ? '' : labels.willPick + target),
      React.createElement(
        'button',
        { type: 'button', style: { ...S.button, ...(target === null ? S.buttonOff : {}) }, onClick: props.onPick },
        labels.open,
      ),
      React.createElement('button', { type: 'button', style: S.button, onClick: props.onClose }, labels.cancel),
    ),
  );
  return React.createElement(
    'div',
    {
      style: S.scrim,
      role: 'presentation',
      onMouseDown: (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget) props.onClose();
      },
    },
    React.createElement(
      'div',
      { style: S.dialog, role: 'dialog', 'aria-modal': true, 'aria-label': labels.title },
      React.createElement(
        'div',
        { style: S.head },
        React.createElement('span', { style: S.title }, labels.title),
        React.createElement('span', { style: S.headTail, title: listing.path }, state.listing === null ? '' : locationLabel(listing)),
        React.createElement(
          'button',
          { type: 'button', style: S.button, 'aria-label': labels.close, title: labels.close, onClick: props.onClose },
          '✕',
        ),
      ),
      body,
    ),
  );
}

/** 目录行接线的 React 半边：把操作半那组动作直接喂给组件。
 *
 * 操作半（`directory-browser-state.ts` 的 `createDirectoryRowBrowser`）不碰 React，
 * 这里只把它的 `actions` 摊进 props —— 于是「进哪一层」那套在 Node 里可测，这里只做接线。
 *
 * `useSyncExternalStore` 是**必需**的：列举是异步落定的，不订阅的话这一帧画完就再没有重画，
 * 图上会永远停在「正在读取…」（#744 实测）。 */
export function DirectoryBrowserFromRow(props: {
  readonly open: boolean;
  readonly row: DirectoryRowBrowser;
  readonly labels: DirectoryBrowserLabels;
}): React.ReactElement | null {
  const state = React.useSyncExternalStore(props.row.subscribe, props.row.state);
  return DirectoryBrowser({
    open: props.open,
    state,
    labels: props.labels,
    ...props.row.actions,
  });
}

export { createBrowseController, createDirectoryRowBrowser, describe, rowsOf, targetOf } from './directory-browser-state.js';
export type { BrowseController, BrowseState, DirectoryRowBrowser } from './directory-browser-state.js';
export type { DirectoryEntry, DirectoryListing } from './directory-browser-contract.js';
