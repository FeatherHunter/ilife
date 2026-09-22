/** 共用配置面板 · 组件本体：一台状态机 ＋ 一圈副作用，渲染交给 `config-panel-view.ts`。
 *
 * 这一件就是六个技能设置页的那张卡片：六家只交「连哪条通道」与「有哪些配置项」（行表），
 * 另加三个可选钩子（跟随映射／卡片标题／自家附加块）。卡片怎么画、值怎么取又怎么填回去、
 * 哪些行被改过还没保存、保存／重置／重新读取怎么走、出错时说什么话，全在本件与它下面那几件里。
 *
 * 状态：读到了没（loading／ready／failed）、哪些行被改过（脏基线）、正在写（busy）、
 * 写完的结果（notice／writeError）、就地失败（error）、目录选择那一路（picking／browseRow）、
 * 复制回执（copy）。**脏基线只看可改行**：只读行显示的是技能算好的绝对路径，拿它当「改动」
 * 会让面板一打开就显示「未保存」。**写完一律重新读一份整面**：写回执不是整面，拿它当整面用
 * 会让页头那行「数据目录」显示成空。
 *
 * 只挂一个副作用（挂载期读一次整面）：取数口是**取用器**，每次调它现取，所以那个 effect
 * 不需要跟着任何一格重跑——否则回执一落定就再读一次，会自己把自己转起来。
 *
 * 对外只经 `config-panel-api.ts` 那一道门；本件自己不出门。
 */

import * as React from 'react';
import { COPY_FEEDBACK_MS, DIRECTORY_PICKER_REFUSED, REMOTE_DIRECTORY_PICKER } from './config-panel-contract.js';
import type { ConfigItem, ConfigSurfaceReply } from './config-panel-contract.js';
import {
  dirtyKeysOf,
  fetchConfigSurface,
  fromDraft,
  noFollowKeys,
  resetConfigSurface,
  saveConfigSurface,
  toDraft,
} from './config-panel-value.js';
import type { GetCall } from './config-panel-value.js';
import { PanelBody } from './config-panel-view.js';
import type { PanelParts, PanelState } from './config-panel-view.js';
import { openRowBrowser, pickerModeOf, readPickAnswer } from './directory-browser-api.js';
import type { DirectoryRowBrowser, DirectoryRowEntry, PickOutcome } from './directory-browser-api.js';
import { createRootsSource } from './directory-browser-roots.js';
import { MANAGER_ACTIONS, MANAGER_RPC } from './update-contract.js';

/** 目录选择命名空间：本件只认「有一格 `pick`」这一件事（软依赖守卫用）。 */
interface PickerFace {
  pick(): Promise<unknown>;
}

/** 认一认某个值像不像目录选择命名空间（认不出就当没有，绝不把设置页带下来）。 */
function isPickerFace(raw: unknown): raw is PickerFace {
  if (typeof raw !== 'object' || raw === null) return false;
  return typeof (raw as { pick?: unknown }).pick === 'function';
}

/** 现取目录选择命名空间：**软依赖**，拿不到回 null（页面据此不出入口）。 */
function resolvePicker(getService: ((name: string) => unknown) | undefined): PickerFace | null {
  if (getService === undefined) return null;
  try {
    const raw = getService(REMOTE_DIRECTORY_PICKER);
    return isPickerFace(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** 唤起一次系统文件夹选择器并归一结果（**永不抛**）。 */
async function pickDirectory(picker: PickerFace): Promise<PickOutcome> {
  try {
    return readPickAnswer(await picker.pick());
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return { kind: 'unavailable', message: '打不开系统文件夹对话框（' + reason + '）：请直接在框里填绝对路径。' };
  }
}

/** 写一次剪贴板：**不碰 DOM**，只读当刻环境的 `globalThis.navigator`（拿不到就回 false，不抛）。
 *
 * 为什么不照原型那样退到 `document.execCommand`：本仓插件侧禁 DOM 直写（`document`／`window`），
 * 所以没有那条兜底；拿不到剪贴板就如实回 false，界面上那一枚按钮就地显示「复制失败」。 */
async function writeClipboard(text: string): Promise<boolean> {
  try {
    const nav = (globalThis as { navigator?: { clipboard?: { writeText(t: string): Promise<void> } } }).navigator;
    const clip = nav?.clipboard;
    if (clip === undefined || typeof clip.writeText !== 'function') return false;
    await clip.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** 六家的接入面：**一个通道路由名 ＋ 一张行表 ＋ 三个可选钩子**，另加两格六家同形的宿主取数接线。 */
export interface ConfigPanelProps {
  /** 通道路由名（各家唯一那个真变量，形如 `/ilife-bill-ilife`）。 */
  readonly channel: string;
  /** 行表：顺序即页面顺序，分级写在每一行自己的 `tier` 上。 */
  readonly items: readonly ConfigItem[];
  /** 卡片标题（钩子之一，各家的产品名）；不给就只写「配置」。 */
  readonly title?: string | undefined;
  /** 跟随映射（钩子之一）：脏键 → 要显示「将跟随更新」的只读行；不给＝一行都不跟随。 */
  readonly followKeysOf?: ((dirtyKeys: readonly string[]) => readonly string[]) | undefined;
  /** 自家附加块（钩子之一：版本行／状态行）：画在面板主体之后、动作条之前。 */
  readonly extra?: ((parts: PanelParts) => React.ReactNode) | undefined;
  /** 宿主取数口取用器（六家同形的接线，不是各家数据）：每次取数时现取，连接后到也不永久缺席。 */
  readonly getCall: GetCall;
  /** 宿主服务查找（六家同形的接线）：目录选择是**软依赖**，缺席只是没有入口。 */
  readonly getService?: ((name: string) => unknown) | undefined;
}

/** 技能设置页：承载一家自己的全部可配置项（只配置，不干活）。 */
export function ConfigPanel(props: ConfigPanelProps): React.ReactElement {
  const [state, setState] = React.useState<PanelState>({ kind: 'loading' });
  const [pickerGone, setPickerGone] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [writeError, setWriteError] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [browseRow, setBrowseRow] = React.useState<DirectoryRowBrowser | null>(null);
  const [copy, setCopy] = React.useState<{ readonly key: string; readonly ok: boolean } | null>(null);

  /** 复制回执的复位定时器：**一次性 UI 回执**，不是数据轮询——点一次起一个，到点自我复位，
   *  下一次点击先清掉旧的，卸载时也清掉（下面那个清扫 effect 就是那一半）。 */
  const copyTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  React.useEffect(
    () => () => {
      if (copyTimer.current !== null) {
        clearTimeout(copyTimer.current);
        copyTimer.current = null;
      }
    },
    [],
  );

  /** 挂载期读一次整面：卸载之后回来的回执丢掉（不许往已经没了的页面上写）。 */
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetchConfigSurface(props.getCall(), props.channel);
      if (!alive) return;
      if (r.ok) {
        setState({ kind: 'ready', surface: r.surface });
        setDraft(toDraft(props.items, r.surface.values, r.surface));
      } else {
        setState({ kind: 'failed', message: r.message });
      }
    })();
    return () => {
      alive = false;
    };
    // 只跑一次：`getCall` 本身是取用器，调用时现取连接；行表与通道在一张卡片里不会换。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 把一份整面铺到页面上（读到之后唯一那一处落点）。 */
  const apply = (surface: ConfigSurfaceReply): void => {
    setState({ kind: 'ready', surface });
    setDraft(toDraft(props.items, surface.values, surface));
  };

  const load = async (): Promise<void> => {
    setNotice(null);
    setWriteError(null);
    setError(null);
    const r = await fetchConfigSurface(props.getCall(), props.channel);
    if (r.ok) apply(r.surface);
    else setState({ kind: 'failed', message: r.message });
  };

  /** 写完（保存／重置）之后重新读一份整面：写回执只有 `{path, values}`、重置回执只有
   *  `{path, backupPath}`，都不是整面——拿它当整面用，页头那行「数据目录」会显示成空。 */
  const writeThenReload = async (done: string): Promise<void> => {
    setBusy(true);
    setNotice(null);
    setWriteError(null);
    setError(null);
    const r = await fetchConfigSurface(props.getCall(), props.channel);
    if (r.ok) {
      apply(r.surface);
      setNotice(done);
    } else {
      setState({ kind: 'failed', message: r.message });
    }
    setBusy(false);
  };

  const onChange = (key: string, next: string): void => {
    setDraft((prev) => ({ ...prev, [key]: next }));
    setNotice(null);
    setWriteError(null);
    setError(null);
  };

  const picker = pickerGone ? null : resolvePicker(props.getService);

  /** 唤起系统文件夹选择器那一条路（应用内浏览被拒时的兜底，也是命名空间只给 `pick` 时的唯一一条）。 */
  const openNative = async (key: string): Promise<void> => {
    const face = pickerGone ? null : resolvePicker(props.getService);
    if (face === null) return;
    // 系统对话框是模态的：等它回来的这段时间给一行字，免得看着像「点了没反应」。
    setPicking(true);
    setError(null);
    const outcome = await pickDirectory(face);
    setPicking(false);
    if (outcome.kind === 'picked') onChange(key, outcome.path);
    else if (outcome.kind === 'unavailable') {
      setError(outcome.message);
      setPickerGone(true);
    }
  };

  /** 目录行的入口动作：**先应用内浏览，宿主没给这条路再换系统对话框**（判断在共用件里）。 */
  const onOpenRow = async (key: string): Promise<void> => {
    setError(null);
    const opened = openRowBrowser({
      picker,
      initialPath: draft[key] ?? '',
      onChange: (next) => onChange(key, next),
      onRow: setBrowseRow,
      refusalCode: DIRECTORY_PICKER_REFUSED,
      rootsSource: createRootsSource({
        getCall: props.getCall,
        base: MANAGER_RPC.base,
        endpoint: MANAGER_RPC.endpoint,
        method: MANAGER_ACTIONS.roots,
      }),
    });
    if (opened === undefined || (await opened) === 'refused') await openNative(key);
  };

  /** 复制一行（定稿 v3 第三条）：写完就地变「已复制」（写不进去就地变「复制失败」），1.5 秒后复位，不弹提示。 */
  const onCopy = (key: string, text: string): void => {
    void writeClipboard(text).then((ok) => {
      setCopy({ key, ok });
      if (copyTimer.current !== null) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => {
        copyTimer.current = null;
        setCopy(null);
      }, COPY_FEEDBACK_MS);
    });
  };

  const onSave = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    setWriteError(null);
    setError(null);
    const r = await saveConfigSurface(props.getCall(), props.channel, fromDraft(props.items, draft));
    setBusy(false);
    if (r.ok) await writeThenReload('已保存，立即生效（不用重启宿主）');
    else setWriteError(r.message);
  };

  const onReset = async (): Promise<void> => {
    setBusy(true);
    setNotice(null);
    setWriteError(null);
    setError(null);
    const r = await resetConfigSurface(props.getCall(), props.channel);
    setBusy(false);
    if (r.ok) await writeThenReload('已重置为默认（原配置已另存一份 .bak）');
    else setWriteError(r.message);
  };

  const surface = state.kind === 'ready' ? state.surface : null;
  const baseline = surface !== null ? toDraft(props.items, surface.values, surface) : null;
  const dirtyKeys: readonly string[] = baseline === null ? [] : dirtyKeysOf(props.items, draft, baseline);
  const followKeys = (props.followKeysOf ?? noFollowKeys)(dirtyKeys);
  const mode = pickerModeOf(picker);
  const rowEntry: DirectoryRowEntry | null = mode === 'none' ? null : { mode, onOpen: onOpenRow };

  return React.createElement(PanelBody, {
    title: props.title,
    items: props.items,
    state,
    draft,
    busy,
    notice,
    writeError,
    error,
    picking,
    browseRow,
    rowEntry,
    dirtyKeys,
    followKeys,
    copy,
    onCopy,
    onChange,
    onSave: () => void onSave(),
    onReset: () => void onReset(),
    onRetry: () => void load(),
    extra: props.extra,
  });
}
