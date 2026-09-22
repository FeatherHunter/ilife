/** dsh-memo-ilife client 适配器（六边形：port=contract，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）。
 * 两处注册：**技能设置页** → 爱生活页签槽（总管声明的 children）；**技能功能页** → sidebar 槽（软依赖）。
 * 取数只经 connection.rpc.call 进 host 通道；缺席/错误纯条件渲染，不返空冒充。
 * 组件 React.createElement 手写，不引入 JSX。
 *
 * #909：设置页本体（样式表／行渲染／卡片骨架／状态机／取值与填值／配置面三通电话／
 * 目录选择入口）**收进共用件** `dsh-life-pack/config-panel`，本文件只留四处接线：
 *   ① 行表（住 `settings.ts`——那是本家自己的配置数据，不是 UI）；
 *   ② 通道路由名（`RPC_CHANNEL`，本家唯一那个真变量）；
 *   ③ 三个可选钩子（卡片标题／跟随映射／自家附加块＝版本行 ＋「飞书 CLI」状态行）；
 *   ④ 两格宿主取数接线（`getCall`／`getService`）。
 * 本家**不再有**设置页的样式表与行渲染函数：改一次共用面板，六家一起变。
 * 文件里剩下那张 `W` 样式表是**技能功能页**（sidebar 槽那张卡）自己的，与设置页无关；
 * 附加块的视觉走面板经插槽传进来的样式（`PanelParts.styles`），不另外抄一份。
 * 照 CONTEXT.md，「技能设置页」只配置、不干活：本页没有查数／记一条之类的入口。
 */
import * as React from 'react';
import { ConfigPanel } from 'dsh-life-pack/config-panel';
import { RPC_CHANNEL, RPC_ENDPOINT_READ, DEFAULT_READ_KEY, isRpcResult } from './contract.js';
import type { LarkState } from './contract.js';
import { SLOT_TITLE, PLUGIN_VERSION, SKILL_VERSION } from './slot.js';
import { CONFIG_ITEMS } from './settings.js';
import type { ClientCtx, RpcCallFace, RpcCallResult } from './dsh-ctx.js';

/** client 短名声明：只有这两个（#736 的目录选择走**可选查找**，不写进来——
 * 写进来＝硬依赖，提供方缺席时整包被停靠，设置页会跟着装不上；见 cookbook §13）。 */
export const inject = ['slots', 'connection'];

/** 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。 */
export type GetCall = () => unknown;

/** **技能功能页**（sidebar 槽那张卡）的视觉。设置页的样式表不在这里——它收进了共用件
 * `dsh-life-pack/config-panel`（#909）。这张表只服务本家自己的功能页，故不参与六家同形面。 */
const W = {
  card: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    lineHeight: 1.6,
  } as React.CSSProperties,
  title: { fontSize: '1.08em', fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  total: { fontSize: 22, fontWeight: 700, margin: '2px 0 4px' } as React.CSSProperties,
  muted: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em'} as React.CSSProperties,
  error: { marginTop: 8, color: 'var(--dsw-alias-label-error, #b3261e)', fontSize: '1em', whiteSpace: 'pre-wrap' } as React.CSSProperties,
  version: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.25))',
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontSize: '0.92em',
  } as React.CSSProperties,
};

/** 版本行：插件与技能双版本号（面板自报家门，排障时看这台装的是哪版）。
 * 只留两个号——包名在页签上已经写着，重复一遍只是噪音（#743）。 */
function VersionLine(): React.ReactElement {
  return React.createElement('div', { style: W.version }, `${PLUGIN_VERSION} · 技能 ${SKILL_VERSION}`);
}

type PanelState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'data'; readonly total: string }
  | { readonly kind: 'absent'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** 数据态取值：有 total 显示 total，有值无 total 显示原值 JSON，空值返回 null（由调用方进错误态）。 */
function extractTotal(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.length > 0 ? value : null;
  if (typeof value === 'object') {
    const total = (value as { total?: unknown }).total;
    if (total !== null && total !== undefined) return String(total);
    try {
      return JSON.stringify(value);
    } catch {
      return null;
    }
  }
  return String(value);
}

/** 请求超时毫秒：与 host 侧 SPAWN_TIMEOUT_MS 同级，UI 永不无限转圈。 */
const READ_TIMEOUT_MS = 20_000 as const;

/** 自家赛跑超时（有界：settle 即清 timer；不依赖传输是否搭理 AbortSignal——Desktop 自研传输会忽略 signal）。
 * 注释即 p10 有界重试门要的例外依据（文件内另有 clearTimeout/tries 上限/本注释三件套）。 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const limit = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      timer = undefined;
      const e = new Error(`取数超时（${Math.round(ms / 1000)}s）：宿主未回，先查宿主日志与 DB 环境`);
      e.name = 'TimeoutError';
      reject(e);
    }, ms);
  });
  return Promise.race([
    promise.finally(() => {
      if (timer !== undefined) clearTimeout(timer);
    }),
    limit,
  ]);
}

type ReadOutcome =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly absent: boolean; readonly message: string };

/** 单次读数（纯异步函数，无 hook；挂载期调用一次，无轮询）。 */
async function fetchRead(call: unknown, key: string, params: Record<string, unknown>): Promise<ReadOutcome> {
  // extractRpc 同式守卫：非函数即缺席态。
  if (typeof call !== 'function') return { ok: false, absent: true, message: '宿主连接缺席：connection.rpc.call 不可用' };
  let result: RpcCallResult;
  try {
    // 防御纵深 + 自家超时双保险（AbortSignal 帮正规传输提前收工；race 保传输忽略 signal 时仍落字）。
    const raw: unknown = await withTimeout(
      // #80：走 DSH 公开的 /api 载体（host 侧为 connection.fetch.register 注册的 /api/ilife-memo）。
      call('/api', RPC_CHANNEL.slice(1), { method: RPC_ENDPOINT_READ, payload: { key, params } }, AbortSignal.timeout(READ_TIMEOUT_MS)),
      READ_TIMEOUT_MS,
    );
    if (!isRpcResult(raw)) return { ok: false, absent: false, message: '回执信封异常（非 ok 信封）' };
    result = raw;
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return { ok: false, absent: false, message: '取数超时（20s）：宿主未回，先查宿主日志与 DB 环境' };
    return { ok: false, absent: false, message: `取数失败：${e instanceof Error ? e.message : String(e)}` };
  }
  if (!result.ok) {
    const code = result.error?.code ?? 'unknown';
    const message = result.error?.message ?? '';
    if (code === 'missing-cli') return { ok: false, absent: true, message: `技能出口缺席（missing-cli）：${message}` };
    return { ok: false, absent: false, message: `取数失败（${code}）：${message}` };
  }
  const text = extractTotal(result.value);
  if (text === null) return { ok: false, absent: false, message: '取数为空（不冒充正常）' };
  return { ok: true, text };
}

/** 技能功能页：sidebar槽里展开的干活区（查数调数，不管配置）。挂载期一次 RPC。 */
function MemoWork(props: { getCall: GetCall }): React.ReactElement {
  const [state, setState] = React.useState<PanelState>({ kind: 'loading' });
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetchRead(props.getCall(), DEFAULT_READ_KEY, {});
      if (!alive) return;
      if (r.ok) setState({ kind: 'data', total: r.text });
      else if (r.absent) setState({ kind: 'absent', message: r.message });
      else setState({ kind: 'error', message: r.message });
    })();
    return () => {
      alive = false;
    };
  }, [props.getCall]);
  if (state.kind === 'loading') {
    return React.createElement('div', { style: W.card }, React.createElement('div', { style: W.muted }, '备忘录加载中'));
  }
  if (state.kind === 'data') {
    return React.createElement(
      'div',
      { style: W.card },
      React.createElement('div', { style: W.title }, SLOT_TITLE),
      React.createElement('div', { style: W.total }, `total ${state.total}`),
      React.createElement(VersionLine, null),
    );
  }
  return React.createElement(
    'div',
    { style: W.card },
    React.createElement('div', { style: state.kind === 'absent' ? W.muted : W.error }, state.message),
    React.createElement(VersionLine, null),
  );
}

/** 复制安装指引的可注入通道（单测注假 clipboard；页面走全局 `navigator.clipboard`）。
 *
 * client 禁 DOM 直写（`document`／`window`／`process`）：这里只读 `globalThis.navigator`，
 * 不碰 DOM；失败（缺席／被拒）回 `false`，调用方落字「长按选择下方文本手动复制」，不抛。 */
export interface ClipboardPort {
  writeText(text: string): Promise<void>;
}

export function copyPrompt(text: string, port?: ClipboardPort | null): Promise<boolean> {
  const globalNavigator = (globalThis as { navigator?: { clipboard?: ClipboardPort } }).navigator;
  const channel: ClipboardPort | null = port !== undefined ? port : (globalNavigator?.clipboard ?? null);
  if (channel === null || typeof channel.writeText !== 'function') return Promise.resolve(false);
  try {
    return Promise.resolve(channel.writeText(text)).then(
      () => true,
      () => false,
    );
  } catch {
    return Promise.resolve(false);
  }
}

/** 附加块照面板的视觉写（不各写一套内联样式）：这里只声明本块真用到的那几格，
 *  样式表本身由共用面板经插槽传进来（`PanelParts.styles`）。面板改视觉，本块跟着变。 */
export interface PanelStyleSlots {
  readonly rows?: React.CSSProperties | undefined;
  readonly label?: React.CSSProperties | undefined;
  readonly muted?: React.CSSProperties | undefined;
  readonly okText?: React.CSSProperties | undefined;
  readonly error?: React.CSSProperties | undefined;
  readonly bar?: React.CSSProperties | undefined;
  readonly btn?: React.CSSProperties | undefined;
}

/** 「飞书 CLI」状态行（#760，定稿 #759；不是配置项）：三档读数 ＋ 复制安装指引按钮 ＋ 官网链接。
 *
 * 判据由技能侧出（回执 `lark` 格），面板只显示：
 *   · 没找到 CLI → 红「没找到飞书 CLI」＋ 复制安装指引按钮 ＋ 官网链接；
 *   · 找到了但没登录／缺 task 权限 → 黄「找到了〈路径〉，但还没登录或没拿到 task 域授权」＋ 同一个按钮 ＋ 官网链接；
 *   · 就绪 → 绿「已登录且 task 域可写：〈路径〉（〈版本〉）」＋ 同一个按钮 ＋ 官网链接。
 * 官网行三档逐字显示「飞书CLI官网为：https://www.feishu.cn/feishu-cli」，显示成文字＋点一下新窗口跳转。
 * 旧技能（回执无 `lark` 格）⇒ 只显示一行弱提示，不报错、不探测。 */
export function LarkStatus(props: {
  readonly lark: LarkState | undefined;
  readonly onCopy: (prompt: string) => void;
  /** 面板经插槽给的样式（不给＝不写内联样式，文案与交互照旧）。 */
  readonly styles?: PanelStyleSlots | undefined;
}): React.ReactElement {
  const S = props.styles ?? {};
  const lark = props.lark;
  if (lark === undefined) {
    return React.createElement(
      'div',
      { style: S.rows },
      React.createElement('div', { style: S.label }, '飞书 CLI'),
      React.createElement('div', { style: S.muted }, '状态未知（技能回执无此格，请升级技能包）。'),
    );
  }
  const status =
    lark.tier === 'missing'
      ? '没找到飞书 CLI'
      : lark.tier === 'partial'
        ? '找到了 ' + (lark.cliPath ?? '飞书 CLI') + '，但还没登录或没拿到 task 域授权'
        : '已登录且 task 域可写：' + (lark.cliPath ?? '') + (lark.version !== null ? '（' + lark.version + '）' : '');
  const statusStyle = lark.tier === 'full' ? S.okText : lark.tier === 'partial' ? S.muted : S.error;
  return React.createElement(
    'div',
    { style: S.rows },
    React.createElement('div', { style: S.label }, '飞书 CLI'),
    React.createElement('div', { style: statusStyle }, status),
    React.createElement(
      'div',
      { style: S.bar },
      React.createElement('button', { style: S.btn, type: 'button', onClick: () => props.onCopy(lark.prompt) }, '复制安装指引'),
      React.createElement('a', { href: lark.websiteUrl, target: '_blank', rel: 'noreferrer' }, lark.websiteLine),
    ),
  );
}

/** 跟随映射（#863）：触发键一脏，这些只读派生行就进“将跟随更新”态。纯函数，面板与单测共用。 */
const DB_FOLLOWERS: readonly string[] = ['db.name', 'html.dir'];

/** 脏键 → 跟随行（#863 纯函数，交给共用面板当钩子）。 */
export function followKeysOf(dirtyKeys: readonly string[]): readonly string[] {
  return dirtyKeys.includes('db.dir') ? [...DB_FOLLOWERS] : [];
}

/** 从整面回执里取本家多带的那一格「飞书 CLI」：共用面板不认识它，只把回执原样交出来，
 *  认形状这一步因此住在本家（拿不到就回 undefined ⇒ 状态行画弱提示，不报错）。 */
function larkOf(reply: unknown): LarkState | undefined {
  if (typeof reply !== 'object' || reply === null) return undefined;
  const lark = (reply as { lark?: unknown }).lark;
  return typeof lark === 'object' && lark !== null ? (lark as LarkState) : undefined;
}

/** 自家附加块（设置页那张卡的插槽）：版本行 ＋「飞书 CLI」状态行。
 *
 * 为什么单起一个组件：版本号是本家常量，飞书状态是本家回执多带的那一格（共用面板不认识它），
 * 复制回执也住在本家——组件自己持这点状态，面板只管把它画进插槽（面板主体之后、动作条之前）。 */
function MemoExtras(props: {
  /** 整面读到了没有：状态行照改版前的形状只在就绪态画，读取中／读取失败那两屏不占这一行。 */
  readonly hasReply: boolean;
  readonly lark: LarkState | undefined;
  readonly styles: PanelStyleSlots;
}): React.ReactElement {
  const [copied, setCopied] = React.useState<'idle' | 'done' | 'failed'>('idle');
  const onCopy = (prompt: string): void => {
    void copyPrompt(prompt).then((ok) => setCopied(ok ? 'done' : 'failed'));
  };
  return React.createElement(
    'div',
    null,
    React.createElement(VersionLine, null),
    props.hasReply ? React.createElement(LarkStatus, { lark: props.lark, onCopy, styles: props.styles }) : null,
    copied === 'done' ? React.createElement('div', { style: props.styles.okText }, '已复制，去粘贴给 AI') : null,
    copied === 'failed' ? React.createElement('div', { style: props.styles.error }, '复制失败，长按选择下方文本手动复制') : null,
  );
}

interface BetterSidebarService {
  registerTab(descriptor: {
    readonly id: string;
    readonly title: string | (() => string);
    readonly order?: number;
    readonly single?: boolean;
    readonly component: (props: unknown) => React.ReactElement | null;
  }): () => void;
}

export function apply(ctx: ClientCtx): void {
  // 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。
  const getCall: GetCall = () => ctx.connection?.rpc?.call ?? null;
  // #736 目录选择：**软依赖**。形状守卫与「拿不到就不出入口」都住在共用件里（判断只有一处），
  // 本处只把宿主服务查找原样交出去；提供方后到／中途卸载都不留痕（不声明、不停靠，见 cookbook §13）。
  const getService = (name: string): unknown => (typeof ctx.get === 'function' ? ctx.get(name) : undefined);

  // (a) 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: 'dsh-memo-ilife',
        order: 80,
        label: () => SLOT_TITLE,
        // #706：本包自己那条 RPC 通道交给总管（各家都写这一格），总管据此调配置体检——
        // 它因此不必在源码里写死任何一家的通道名（零单品依赖照旧成立）。
        channel: RPC_CHANNEL,
      },
      () => React.createElement(ConfigPanel, {
        channel: RPC_CHANNEL,
        items: CONFIG_ITEMS,
        title: SLOT_TITLE,
        followKeysOf,
        extra: (parts) => React.createElement(MemoExtras, {
          hasReply: parts.reply !== null,
          lark: larkOf(parts.reply),
          styles: parts.styles,
        }),
        getCall,
        getService,
      }),
    ),
  );

  // (b) 技能功能页 → sidebar槽（软依赖：betterSidebar 缺席即跳过）。
  const ensureWorkTab = (): boolean => {
    try {
      const get = ctx.get;
      const bs = (typeof get === 'function' ? get('betterSidebar') : undefined) as BetterSidebarService | undefined;
      if (!bs || typeof bs.registerTab !== 'function') return false;
      const dispose = bs.registerTab({
        id: 'ilife-memo-ilife:work',
        title: '备忘录',
        order: 60,
        single: true,
        component: () => React.createElement(MemoWork, { getCall }),
      });
      ctx.effect(() => () => {
        try {
          dispose();
        } catch {
          /* 卸载清理失败忽略 */
        }
      }, 'dsh-memo-ilife: sidebar work tab');
      return true;
    } catch {
      return false;
    }
  };
  if (!ensureWorkTab()) {
    let tries = 0;
    const timer = setInterval(() => {
      tries++;
      if (ensureWorkTab() || tries >= 10) clearInterval(timer);
    }, 1000);
    ctx.effect(() => () => {
      clearInterval(timer);
    }, 'dsh-memo-ilife: sidebar work tab retry');
  }
}
