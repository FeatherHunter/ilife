/** dsh-calorie client 适配器（六边形：port=contract，adapter=本文件）。
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
 *   ③ 三个可选钩子（卡片标题／跟随映射／自家附加块＝版本行）；
 *   ④ 两格宿主取数接线（`getCall`／`getService`）。
 * 本家**不再有**设置页的样式表与行渲染函数：改一次共用面板，六家一起变。
 * 文件里剩下那张 `W` 样式表是**技能功能页**（sidebar 槽那张卡）自己的，与设置页无关。
 * 照 CONTEXT.md，「技能设置页」只配置、不干活：本页没有任何取数／记一餐入口，
 * 状态读数也已移出（读数属技能功能页）。
 */
import * as React from 'react';
import { ConfigPanel } from 'dsh-life-pack/config-panel';
import { RPC_CHANNEL, RPC_ENDPOINT_READ, DEFAULT_READ_KEY, isRpcResult } from './contract.js';
import { SLOT_TITLE, PLUGIN } from './slot.js';
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
  okText: { marginTop: 8, color: 'var(--dsw-alias-state-success-primary, #12805c)', fontSize: '0.96em'} as React.CSSProperties,
  version: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.25))',
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontSize: '0.92em',
  } as React.CSSProperties,
};

/** #130 版本通道（host 侧动态读取已安装版本，client 纯渲染＋unknown 降级）。
 *
 * 唯一真相源=磁盘 package.json（host 侧 bridge.readInstalledVersions 读取双 package.json，
 * 经现有 connection.rpc.call 模式〈同 READ 端点、VERSION_READ_KEY 魔键〉传值，读失败 host 写 warn）。
 * 本文件禁 node／禁 DOM 直写（document/window/process），故不得直读文件；
 * 只经 connection.rpc.call 取版本，取不到侧显示 unknown，骨架不变，余部照常，永不抛、永不重试风暴。
 * VERSION_READ_KEY 与 bridge.VERSION_READ_KEY 同值（client 禁直引 bridge〈会带入 node〉，故镜像定义，权威出处见 bridge.ts）。
 * 不引入新运行时依赖；不改唤醒词/triggers/HELP/设置行。
 */
const VERSION_READ_KEY = 'dsh-calorie.version' as const;
const VERSION_UNKNOWN = 'unknown' as const;

// 导出供单测复用（面板逻辑不变；权威出处仍见 bridge.ts）。
export { VERSION_READ_KEY, VERSION_UNKNOWN };

/** 版本归一：非空字符串原样（去首尾空格），余者一律 unknown（降级骨架不断、永不抛）。 */
export function normalizeVersion(v: unknown): string {
  return typeof v === 'string' && v.trim().length > 0 ? v.trim() : VERSION_UNKNOWN;
}

/** 版本行文本（纯函数，供 VersionLine 与单测复用；骨架恒为 `dsh-calorie X · skill-calorie Y`）。 */
export function formatVersionLine(pluginVersion: unknown, skillVersion: unknown): string {
  return `${normalizeVersion(pluginVersion)} · 技能 ${normalizeVersion(skillVersion)}`;
}

/** 版本行：纯渲染 host 传来的值＋unknown 降级（用户要求：每技能设置页自报家门）。 */
export function VersionLine(props: { readonly pluginVersion?: unknown; readonly skillVersion?: unknown }): React.ReactElement {
  return React.createElement('div', { style: W.version }, formatVersionLine(props.pluginVersion, props.skillVersion));
}

/** 版本取值（与 fetchRead 同 connection.rpc.call 模式；单次、无轮询；任何失败→双 unknown，永不抛）。 */
export async function fetchVersions(call: unknown): Promise<{ readonly plugin: string; readonly skill: string }> {
  const fallback = { plugin: VERSION_UNKNOWN, skill: VERSION_UNKNOWN };
  if (typeof call !== 'function') return { ...fallback };
  try {
    const raw: unknown = await withTimeout(
      (call as RpcCallFace)('/api', RPC_CHANNEL.slice(1), { method: RPC_ENDPOINT_READ, payload: { key: VERSION_READ_KEY, params: {} } }, AbortSignal.timeout(READ_TIMEOUT_MS)),
      READ_TIMEOUT_MS,
    );
    if (!isRpcResult(raw) || !raw.ok) return { ...fallback };
    const v = (raw as { value?: unknown }).value;
    if (typeof v !== 'object' || v === null) return { ...fallback };
    const rec = v as { plugin?: unknown; skill?: unknown };
    return { plugin: normalizeVersion(rec.plugin), skill: normalizeVersion(rec.skill) };
  } catch {
    return { ...fallback };
  }
}

type PanelState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'data'; readonly date: string; readonly total: string }
  | { readonly kind: 'absent'; readonly message: string }
  | { readonly kind: 'error'; readonly message: string };

/** 本地今日 YYYY-MM-DD（与面板默认读键的 date 参数同形）。 */
function todayString(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

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

type ReadOutcome =
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly absent: boolean; readonly message: string };

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

/** 单次读数（纯异步函数，无 hook；挂载期调用一次，无轮询）。 */
async function fetchRead(call: unknown, key: string, params: Record<string, unknown>): Promise<ReadOutcome> {
  // extractRpc 同式守卫：非函数即缺席态。
  if (typeof call !== 'function') return { ok: false, absent: true, message: '宿主连接缺席：connection.rpc.call 不可用' };
  let result: RpcCallResult;
  try {
    // 防御纵深 + 自家超时双保险（AbortSignal 帮正规传输提前收工；race 保传输忽略 signal 时仍落字）。
    const raw: unknown = await withTimeout(
      // #80：走 DSH 公开的 /api 载体（host 侧为 connection.fetch.register 注册的 /api/ilife-calorie）。
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
function CalorieWork(props: { getCall: GetCall }): React.ReactElement {
  const [state, setState] = React.useState<PanelState>({ kind: 'loading' });
  // #130 版本态（初值 unknown 骨架；独立单次 RPC，不阻塞数据、不轮询、不抛）。
  const [versions, setVersions] = React.useState<{ readonly plugin: string; readonly skill: string }>({
    plugin: VERSION_UNKNOWN,
    skill: VERSION_UNKNOWN,
  });
  React.useEffect(() => {
    let alive = true;
    const date = todayString();
    void (async () => {
      let r: ReadOutcome;
      try {
        r = await fetchRead(props.getCall(), DEFAULT_READ_KEY, { date });
      } catch (e) {
        // 调用口同步抛错兜底：fetchRead 之外的错不成不可见 rejection，直接落字。
        if (!alive) return;
        setState({ kind: 'error', message: `取数失败：${e instanceof Error ? e.message : String(e)}` });
        return;
      }
      if (!alive) return;
      if (r.ok) setState({ kind: 'data', date, total: r.text });
      else if (r.absent) setState({ kind: 'absent', message: r.message });
      else setState({ kind: 'error', message: r.message });
    })();
    return () => {
      alive = false;
    };
  }, [props.getCall]);
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const v = await fetchVersions(props.getCall());
        if (!alive) return;
        setVersions(v);
      } catch {
        /* fetchVersions 永不抛，此处兜底不炸面板 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [props.getCall]);
  if (state.kind === 'loading') {
    return React.createElement('div', { style: W.card }, React.createElement('div', { style: W.muted }, '卡路里加载中'));
  }
  if (state.kind === 'data') {
    return React.createElement(
      'div',
      { style: W.card },
      React.createElement('div', { style: W.title }, `卡路里 · ${state.date}`),
      React.createElement('div', { style: W.total }, `total ${state.total}`),
      React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill }),
    );
  }
  return React.createElement(
    'div',
    { style: W.card },
    React.createElement('div', { style: state.kind === 'absent' ? W.muted : W.error }, state.message),
    React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill }),
  );
}

/** 跟随映射（#863）：触发键一脏，这些只读派生行就进“将跟随更新”态。纯函数，面板与单测共用。 */
const DB_FOLLOWERS: readonly string[] = ['db.name', 'html.dir', 'xunji.stateDir', 'photos.gifs'];
const PHOTOS_FOLLOWERS: readonly string[] = ['photos.gifs'];

/** 脏键 → 跟随行（#863 纯函数，交给共用面板当钩子）。 */
export function followKeysOf(dirtyKeys: readonly string[]): readonly string[] {
  const keys: string[] = [];
  if (dirtyKeys.includes('db.dir')) keys.push(...DB_FOLLOWERS);
  if (dirtyKeys.includes('photos.dir')) keys.push(...PHOTOS_FOLLOWERS);
  return [...new Set(keys)];
}

/** 自家附加块（设置页那张卡的版本行）：共用面板留的插槽，画在面板主体之后、动作条之前。
 *
 * 为什么单起一个组件：版本是**本家自己的一通电话**（`dsh-calorie.version`），共用面板不认识它；
 * 组件自己持状态，面板只管把它画进插槽。 */
function CalorieVersionLine(props: { readonly getCall: GetCall }): React.ReactElement {
  const [versions, setVersions] = React.useState<{ readonly plugin: string; readonly skill: string }>({
    plugin: VERSION_UNKNOWN,
    skill: VERSION_UNKNOWN,
  });
  React.useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const v = await fetchVersions(props.getCall());
        if (!alive) return;
        setVersions(v);
      } catch {
        /* fetchVersions 永不抛，此处兜底不炸面板 */
      }
    })();
    return () => {
      alive = false;
    };
  }, [props.getCall]);
  return React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill });
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
        id: PLUGIN,
        order: 75,
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
        extra: () => React.createElement(CalorieVersionLine, { getCall }),
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
        id: 'ilife-calorie:work',
        title: '卡路里',
        order: 61,
        single: true,
        component: () => React.createElement(CalorieWork, { getCall }),
      });
      ctx.effect(() => () => {
        try {
          dispose();
        } catch {
          /* 卸载清理失败忽略 */
        }
      }, 'dsh-calorie: sidebar work tab');
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
    }, 'dsh-calorie: sidebar work tab retry');
  }
}
