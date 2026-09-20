/** 文件浏览器的操作半：把「进哪一层、这一层显示什么、选到了什么」算成状态，**IO 全部由调用方注入**。
 *
 * 分两层的原因：本件（操作）在 Node 里就能直测——喂一个假的取数面，就能把「进目录／回上一级／
 * 跳面包屑／筛选／新建文件夹／失败出人话」全跑一遍；视图那半（`directory-browser-ui.ts`）
 * 只负责把这份状态画成 DOM。两边都不认识宿主。
 *
 * 数据来源只有两格：`list(path?)` 与 `createDirectory(path, name)`（调用方注入的 `DirectoryBrowseFace`）。
 */

import type {
  BrowseFailure,
  DirectoryBrowseFace,
  DirectoryEntry,
  DirectoryListing,
} from './directory-browser-contract.js';
import {
  filterEntries,
  joinPath,
  parentOf,
  splitDraft,
  validateFolderName,
  visibleEntries,
} from './directory-browser-contract.js';

/** 一层列举的三态：加载中／拿到了／这一层读不出来。 */
export type BrowsePhase = 'idle' | 'loading' | 'ready' | 'failed';

/** 图上的全部状态。视图只读它，不改它。 */
export interface BrowseState {
  readonly phase: BrowsePhase;
  readonly listing: DirectoryListing | null;
  /** 这一层读失败时的人话；`phase==='failed'` 时一定有。 */
  readonly failure: BrowseFailure | null;
  /** 当前选中的子目录（点行选中；选中后再点「打开」就是它）。 */
  readonly selected: string | null;
  /** 面包屑上那一层的编号，只用于画图。 */
  readonly showHidden: boolean;
  /** 路径框里的草稿（用户可能正在编辑）。 */
  readonly draft: string;
  /** 草稿指向的那一层已经列举过之后，用来按末段过滤的词。 */
  readonly filter: string;
  /** 正在建的文件夹名；null＝没在建。 */
  readonly creating: string | null;
  /** 上一次操作的失败人话（新建失败等）；看一眼就好，下一次操作清掉。 */
  readonly notice: string | null;
}

/** 订阅者拿到的状态（不可变，每次变更是新对象）。 */
export type BrowseListener = (state: BrowseState) => void;

/** 操作面：视图与用例都只用这些方法。 */
export interface BrowseController {
  getState(): BrowseState;
  subscribe(listener: BrowseListener): () => void;
  /** 开图：初次列举（`list()` 不带路径＝宿主给的家目录）。 */
  open(): Promise<void>;
  /** 进某一层（绝对路径，或 `list()` 的默认家目录当入参为 null）。 */
  enter(path: string | null): Promise<void>;
  /** 回上一级（当前层就是根时原地不动）。 */
  up(): Promise<void>;
  /** 采纳当前选择（选中行，没有选中就用当前层）并回调 `onPicked`。 */
  pick(): void;
  /** 取消：关图，什么都不回调。 */
  cancel(): void;
  /** 选中一个子目录（再点一次同一条＝取消选中）。 */
  select(path: string): void;
  /** 切换隐藏目录。 */
  toggleHidden(): void;
  /** 改路径框草稿（不列举，只更新草稿与筛选词）。 */
  setDraft(draft: string): void;
  /** 提交路径框草稿：指到哪一层就去哪一层。 */
  commitDraft(): Promise<void>;
  /** 开「新建文件夹」；传 null 收起。 */
  setCreating(name: string | null): void;
  /** 在当前层（或选中的那一层）下建一个新文件夹，成功后进它并选中它。 */
  createFolder(name: string): Promise<void>;
  /** 关图（与 `cancel` 同义，供宿主侧统一收口）。 */
  close(): void;
}

/** 建一个浏览器控制器。取数、回调、初值全部由调用方给。 */
export function createBrowseController(deps: {
  readonly face: DirectoryBrowseFace;
  readonly initialPath: string;
  readonly onPicked: (path: string) => void;
  readonly onClose: () => void;
  /** 失败人话的前缀，默认「浏览失败」。 */
  readonly failureLabel?: string;
}): BrowseController {
  const label = deps.failureLabel ?? '浏览失败';
  const listeners = new Set<BrowseListener>();
  let state: BrowseState = {
    phase: 'idle',
    listing: null,
    failure: null,
    selected: null,
    showHidden: false,
    draft: deps.initialPath,
    filter: '',
    creating: null,
    notice: null,
  };

  /** 每次列举带一个序号：晚回来的旧回执直接丢掉，不许覆盖新一层。 */
  let generation = 0;

  const emit = (next: Partial<BrowseState>): void => {
    state = { ...state, ...next };
    for (const listener of [...listeners]) listener(state);
  };

  const humanize = (cause: unknown): BrowseFailure => {
    const raw = (typeof cause === 'object' && cause !== null ? cause : {}) as {
      code?: unknown;
      message?: unknown;
      name?: unknown;
    };
    const message = typeof raw.message === 'string' && raw.message.trim() !== '' ? raw.message.trim() : String(cause);
    const code = typeof raw.code === 'string' && raw.code !== '' ? raw.code : 'browse-failed';
    return { code, message: `${label}：${message}` };
  };

  const load = async (path: string | null): Promise<void> => {
    const mine = ++generation;
    emit({ phase: 'loading', failure: null, notice: null });
    try {
      const listing = path === null ? await deps.face.list() : await deps.face.list(path);
      if (mine !== generation) return;
      emit({
        phase: 'ready',
        listing,
        failure: null,
        selected: null,
        draft: listing.path,
        filter: '',
      });
    } catch (cause) {
      if (mine !== generation) return;
      emit({ phase: 'failed', listing: null, failure: humanize(cause), selected: null });
    }
  };

  /** 草稿指到的那一层已经列举过时，按末段筛当前这一层的行；否则不过滤。
   *
   * 两边都先掐掉尾分隔符再比：草稿那边切开后天然带尾分隔符（`C:\a\` ＋ `b`），
   * 而这一层的 `path` 由宿主给、不带尾分隔符。 */
  const applyDraft = (draft: string): void => {
    const { directory, filter } = splitDraft(draft);
    const listing = state.listing;
    const sameLevel = listing !== null && directory !== null && normalize(directory) === normalize(listing.path);
    emit({ draft, filter: sameLevel ? filter : '' });
  };

  const normalize = (path: string): string => path.replace(/[\\/]+$/, '');

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    open: () => load(null),
    enter: (path) => load(path),
    async up() {
      const listing = state.listing;
      if (listing === null) return;
      const parent = parentOf(listing.path);
      if (parent === listing.path) return;
      await load(parent);
    },
    pick() {
      const target = state.selected ?? state.listing?.path ?? null;
      if (target === null) return;
      deps.onPicked(target);
    },
    cancel() {
      deps.onClose();
    },
    close() {
      deps.onClose();
    },
    select(path) {
      emit({ selected: state.selected === path ? null : path, notice: null });
    },
    toggleHidden() {
      emit({ showHidden: !state.showHidden });
    },
    setDraft(draft) {
      applyDraft(draft);
    },
    async commitDraft() {
      const trimmed = state.draft.trim();
      if (trimmed === '') return;
      await load(trimmed);
    },
    setCreating(name) {
      emit({ creating: name, notice: null });
    },
    async createFolder(name) {
      const checked = validateFolderName(name);
      if (!checked.ok) {
        emit({ notice: checked.reason });
        return;
      }
      const base = state.selected ?? state.listing?.path ?? null;
      if (base === null) {
        emit({ notice: '还没有打开任何目录，无法新建文件夹。' });
        return;
      }
      try {
        const created = await deps.face.createDirectory(base, name.trim());
        emit({ creating: null, notice: null });
        await load(created);
        emit({ selected: created });
      } catch (cause) {
        const failure = humanize(cause);
        emit({ notice: failure.message, creating: null });
      }
    },
  };
}

/** 图上这一层要画的行（按隐藏开关与草稿末段过滤之后的）。 */
export function rowsOf(state: BrowseState): readonly DirectoryEntry[] {
  if (state.listing === null) return [];
  return filterEntries(visibleEntries(state.listing, state.showHidden), state.filter);
}

/** 图上这一层能不能回上一级（根目录不能）。 */
export function canGoUp(state: BrowseState): boolean {
  if (state.listing === null) return false;
  return parentOf(state.listing.path) !== state.listing.path;
}

/** 「打开」这颗按钮的目标：选中行优先，没选中就是当前层。 */
export function targetOf(state: BrowseState): string | null {
  return state.selected ?? state.listing?.path ?? null;
}

/** 新建文件夹那一行要展示的位置（"在 <这里> 下新建"）。 */
export function createBaseOf(state: BrowseState): string | null {
  return state.selected ?? state.listing?.path ?? null;
}

/** 一段路径拼成可读的一句话（给用例与调试用；图上不直接显示）。 */
export function describe(state: BrowseState): string {
  if (state.phase === 'failed') return `${state.failure?.code ?? 'browse-failed'} @ ${state.draft}`;
  if (state.listing === null) return `${state.phase}`;
  return `${state.listing.path}（${rowsOf(state).length} 行）`;
}

/** 一行子目录的完整路径（图上点行时用）。 */
export function entryPath(directory: string, entry: DirectoryEntry): string {
  return entry.path === '' ? joinPath(directory, entry.name) : entry.path;
}
