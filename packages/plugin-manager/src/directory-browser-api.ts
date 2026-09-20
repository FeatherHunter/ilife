/** 目录浏览器的公开门（**六家只 import 这一个名字**）。
 *
 * 为什么需要它：`package.json` 的 exports 一条子路径只能指一个文件，而本件分五份写
 * （契约／状态／视图／零件／根取数）。若把 `./directory-browser` 直接指到 `directory-browser-contract.js`，
 * 六家就取不到「开图接线」（它在 state 那份里）。故设这一个门，把纯逻辑与取数接线都转出；
 * 视图那一份走 `./directory-browser-ui`（它要吃 React，单独一条）。
 *
 * 本件不含实现、也不含判断，只做转出——实现见同目录那几份。
 */

export {
  browseFaceOf,
  filterEntries,
  hasPickFn,
  hiddenCount,
  isBrowseFace,
  joinPath,
  parentOf,
  pickerModeOf,
  readBrowseAnswer,
  readPickAnswer,
  splitDraft,
  validateFolderName,
  visibleEntries,
} from './directory-browser-contract.js';
export { BrowseAnswerError } from './directory-browser-contract.js';
export type {
  BrowseFailure,
  DirectoryBrowseFace,
  DirectoryCrumb,
  DirectoryEntry,
  DirectoryListing,
  PickEnvelope,
  PickerMode,
  PickOutcome,
  RootKind,
  RootRow,
} from './directory-browser-contract.js';

export {
  canGoUp,
  createBaseOf,
  createBrowseController,
  createDirectoryRowBrowser,
  describe,
  entryPath,
  openRowBrowser,
  rowsOf,
  targetOf,
} from './directory-browser-state.js';
export type {
  BrowseController,
  BrowseListener,
  BrowsePhase,
  BrowseState,
  DirectoryRowBrowser,
} from './directory-browser-state.js';

export { createRootsSource, readRootsAnswer } from './directory-browser-roots.js';
export type { RootsCall } from './directory-browser-roots.js';

import type { PickerMode } from './directory-browser-contract.js';

/** 一行目录配置的入口（**六家画按钮就靠这两格**）：
 *  `mode` 决定按钮写什么（`native`＝「选择文件夹…」／`browse`＝「浏览…」），
 *  `onOpen` 是点下去的动作（系统对话框或应用内浏览器，由各家自己接线）。
 *  `mode === 'none'` 时调用方不该画入口——供不了就收起入口，不是失败。 */
export interface DirectoryRowEntry {
  readonly mode: PickerMode;
  readonly onOpen: (key: string) => Promise<void> | undefined;
}
