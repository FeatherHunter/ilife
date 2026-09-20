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
  RootRow,
} from './directory-browser-contract.js';
import {
  browseFaceOf,
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
  /** 可跳转的根（Windows 上的盘符等）：取数方给什么就是什么，空数组＝不画那一行。 */
  readonly roots: readonly RootRow[];
}

/** 订阅者拿到的状态（不可变，每次变更是新对象）。 */
export type BrowseListener = (state: BrowseState) => void;

/** 操作面：视图与用例都只用这些方法。 */
export interface BrowseController {
  getState(): BrowseState;
  subscribe(listener: BrowseListener): () => void;
  /** 开图：先试配置里那个目录（空则直接家目录），读不出来（不存在、没权限）退回宿主家目录。
   *
   * 回**第一份落定的状态**：调用方据此分辨「这条路宿主没给」与「这一层读不出来」。 */
  open(): Promise<BrowseState>;
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
  /** 可跳转的根从哪来；不给就是没有这一行（都是空清单，一样不画）。 */
  readonly rootsSource?: () => Promise<readonly RootRow[]>;
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
    roots: [],
  };

  /** 每次列举带一个序号：晚回来的旧回执直接丢掉，不许覆盖新一层。 */
  let generation = 0;

  const emit = (next: Partial<BrowseState>): void => {
    state = { ...state, ...next };
    for (const listener of [...listeners]) listener(state);
  };

  /** 根清单只问一次：取不到就是空（不报错、不重试——它只是图上的一行入口）。
   *
   * 「问一次」钉在这里而不是图里：视图那半每次重画都会重新求值，问在这里才谈得上一次。 */
  let rootsAsked = false;
  const loadRoots = async (): Promise<void> => {
    if (rootsAsked || deps.rootsSource === undefined) return;
    rootsAsked = true;
    try {
      const roots = await deps.rootsSource();
      if (roots.length > 0) emit({ roots });
    } catch {
      /* 取不到就当没有这一行：浏览本身照常。 */
    }
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
    async open(): Promise<BrowseState> {
      // 根清单一并去问，但**不等它**：它只是图上的一行入口，落定了自会推一次重画；
      // 等它就等于让「宿主那台机器列盘符快不快」决定对话框什么时候开。
      void loadRoots();
      const wanted = deps.initialPath.trim();
      if (wanted !== '') {
        await load(wanted);
        if (state.phase === 'ready') return state;
      }
      await load(null);
      return state;
    },
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

/** 目录行接线的返回：**不碰 React**——`actions` 原样喂给 `directory-browser-ui` 的组件 props，
 *  `isOpen`／`setOpen` 由调用方自己接进它的状态（宿主怎么重画是它的事，本件不管）。 */
export interface DirectoryRowBrowser {
  readonly actions: {
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
  };
  /** 开图（先试配置里那个目录，读不出来退回家目录），回第一份落定的状态。 */
  open(): Promise<BrowseState>;
  /** 状态变更订阅：视图那半靠 `useSyncExternalStore` 用它重画。
   *
   * **没有它图上只有第一帧**——列举是异步落定的，React 不订阅就永远停在开图那一刻的状态。 */
  subscribe(listener: BrowseListener): () => void;
  state(): BrowseState;
  /** 一段可读的当前状态（用例与调试用）。 */
  summary(): string;
}

/** 建一份「目录行接线」：给一个取数面与初值，回一组动作。
 *
 * 只做接线：把控制器算出来的状态与回调打包好，不取数、不画图、不认宿主。 */
export function createDirectoryRowBrowser(deps: {
  readonly face: DirectoryBrowseFace;
  readonly initialPath: string;
  readonly onPicked: (path: string) => void;
  readonly onClosed?: () => void;
  readonly failureLabel?: string;
  /** 可跳转的根从哪来（各家给的是同一份「总管电话」的取数器）；不给就没有那一行。 */
  readonly rootsSource?: () => Promise<readonly RootRow[]>;
}): DirectoryRowBrowser {
  const controller = createBrowseController({
    face: deps.face,
    initialPath: deps.initialPath,
    onPicked: deps.onPicked,
    onClose: () => deps.onClosed?.(),
    ...(deps.failureLabel === undefined ? {} : { failureLabel: deps.failureLabel }),
    ...(deps.rootsSource === undefined ? {} : { rootsSource: deps.rootsSource }),
  });
  return {
    open: () => controller.open(),
    subscribe: (listener) => controller.subscribe(listener),
    state: () => controller.getState(),
    summary: () => describe(controller.getState()),
    actions: {
      onPick: () => controller.pick(),
      onClose: () => controller.cancel(),
      onEnter: (path) => void controller.enter(path),
      onUp: () => void controller.up(),
      onSelect: (path) => controller.select(path),
      onToggleHidden: () => controller.toggleHidden(),
      onDraft: (draft) => controller.setDraft(draft),
      onCommitDraft: () => void controller.commitDraft(),
      onCreate: (name) => void controller.createFolder(name),
      onCreatingChange: (name) => controller.setCreating(name),
    },
  };
}

/** 一条目录行点下去该走哪条路（**六家共用这一处策略**，单独写在各家就会各错各的）。
 *
 * 顺序是「先应用内浏览，被拒再换系统对话框」，因为客户端命名空间上三条动词都在、问不出组合里服务哪种
 * 能力（见 `pickerModeOf`）。回执：
 *  - `undefined`＝连两格浏览原语都没有（这条路没有，调用方自己想办法）；
 *  - `'refused'`＝宿主回了 `refusalCode`（组合里是系统对话框），图已收起；
 *  - `'open'`＝图开着，后面的事都在图里。
 *
 * **状态由调用方持有**：`onRow` 收到刚建好的那条（或 null＝收起），React 那边据此决定画不画图。
 *
 * `refusalCode` 是**宿主的回执码**（各家自己从宿主镜像里拿，本件只照比不认名）：
 * 它换名字本件照样跑，六家一起换。 */
export function openRowBrowser(input: {
  readonly picker: unknown;
  readonly initialPath: string;
  readonly onChange: (next: string) => void;
  readonly onRow: (row: DirectoryRowBrowser | null) => void;
  readonly refusalCode: string;
  /** 可跳转的根从哪来（可选：不给就是图上没有那一行）。 */
  readonly rootsSource?: () => Promise<readonly RootRow[]>;
}): Promise<'open' | 'refused'> | undefined {
  const face = browseFaceOf(input.picker);
  if (face === null) return undefined;
  const row = createDirectoryRowBrowser({
    face,
    initialPath: input.initialPath,
    onPicked: (picked) => {
      input.onChange(picked);
      input.onRow(null);
    },
    onClosed: () => input.onRow(null),
    ...(input.rootsSource === undefined ? {} : { rootsSource: input.rootsSource }),
  });
  input.onRow(row);
  return row.open().then((settled) => {
    if (settled.phase === 'failed' && settled.failure?.code === input.refusalCode) {
      input.onRow(null);
      return 'refused' as const;
    }
    return 'open' as const;
  });
}
