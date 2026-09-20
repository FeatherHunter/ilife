/** 文件浏览器的视图半：把 `BrowseState` 画成一张对话框。**不认识宿主**，也不自己做 IO。
 *
 * 手写 `React.createElement`（本包 client 束禁 JSX，见 `tsdown.config.ts` 的既成口径）。
 * 只读状态、只回调；进哪一层、选到什么由操作半（`directory-browser-state.ts`）算。
 * 样式与四行控件在 `directory-browser-parts.ts`（那里跟着「多一行／少一行」动，本件只管组版）。
 */

import * as React from 'react';
import { rowsOf, targetOf } from './directory-browser-state.js';
import type { BrowseState, DirectoryRowBrowser } from './directory-browser-state.js';
import { hiddenCount, locationLabel } from './directory-browser-contract.js';
import type { DirectoryListing } from './directory-browser-contract.js';
import { S, createRow, crumbRow, entryRow, rootsRow } from './directory-browser-parts.js';
import type { DirectoryBrowserLabels } from './directory-browser-parts.js';

export type { DirectoryBrowserLabels } from './directory-browser-parts.js';

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
  body.push(rootsRow(state, labels, props.onEnter));
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
export type { DirectoryEntry, DirectoryListing, RootKind, RootRow } from './directory-browser-contract.js';
