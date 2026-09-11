/** dsh-calorie client 适配器（六边形：port=contract+dsh-ctx 镜像，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）。
 * 注册两处（grill 定案，新术语见 CONTEXT.md）：
 * (a) 技能设置页 → 爱生活页签槽（总管声明的 children，各技能自研自家配置页）；
 * (b) 技能功能页 → sidebar槽（better-sidebar 服务，非 DSH slot；软依赖，
 *     缺席即跳过，不断链。DSH右侧槽 + sidebar.footer.action 彻底出局，已删）。
 * 有界重试例外依据（唯一允许的定时器）：注册重试非数据轮询，照抄
 * dsh-mattpocock-skills-deck/src/client/panelAssembly.js:100-108
 * （betterSidebar 服务可能晚于本模块到达，最多 10 次、间隔 1000ms；卸载清理）。
 * 样式：React 内联 style + DSH 主题别名（var(--dsw-alias-*)，带回退），无外部样式表、
 * 无 <style> 注入、无类名冲突；只用 dsh-ctx 镜像内成员（slots.inject/register、
 * connection.rpc.call 经闭包现取、betterSidebar 经 ctx.get 运行时取）；
 * 取数只经 connection.rpc.call 进 host 通道；缺席/错误纯条件渲染，不返空冒充。
 * 组件 React.createElement 手写，不引入 JSX。
 */
import * as React from 'react';
import { RPC_CHANNEL, RPC_ENDPOINT_READ, DEFAULT_READ_KEY, isRpcResult } from './contract.js';
import { SLOT_TITLE, PLUGIN, SKILL_PACKAGE, PLUGIN_VERSION, SKILL_VERSION } from './slot.js';
import { SETTING_ROWS } from './settings.js';
import type { ClientCtx, RpcCallResult } from './dsh-ctx.js';

export const inject = ['slots', 'connection'];

/** 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。 */
export type GetCall = () => unknown;

/** 面板视觉（内联 style；颜色走 DSH 主题别名，深浅主题自适应，写死值只做回退）。 */
const S = {
  card: {
    padding: '12px 14px',
    borderRadius: 10,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.35))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 13,
    lineHeight: 1.6,
  } as React.CSSProperties,
  title: { fontSize: 14, fontWeight: 700, marginBottom: 8 } as React.CSSProperties,
  total: { fontSize: 22, fontWeight: 700, margin: '2px 0 4px' } as React.CSSProperties,
  muted: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: 12 } as React.CSSProperties,
  error: { color: 'var(--dsw-alias-state-error-primary, #ff6b6b)', fontSize: 13 } as React.CSSProperties,
  rows: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))', paddingTop: 8 } as React.CSSProperties,
  version: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.25))',
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontSize: 12,
  } as React.CSSProperties,
};

/** 版本行：插件与技能双版本号（用户要求：每技能设置页自报家门）。 */
function VersionLine(): React.ReactElement {
  return React.createElement('div', { style: S.version }, `${PLUGIN} ${PLUGIN_VERSION} · ${SKILL_PACKAGE} ${SKILL_VERSION}`);
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
  if (state.kind === 'loading') {
    return React.createElement('div', { style: S.card }, React.createElement('div', { style: S.muted }, '卡路里加载中…'));
  }
  if (state.kind === 'data') {
    return React.createElement(
      'div',
      { style: S.card },
      React.createElement('div', { style: S.title }, `卡路里 · ${state.date}`),
      React.createElement('div', { style: S.total }, `total ${state.total}`),
      React.createElement(VersionLine, null),
    );
  }
  return React.createElement(
    'div',
    { style: S.card },
    React.createElement('div', { style: state.kind === 'absent' ? S.muted : S.error }, state.message),
    React.createElement(VersionLine, null),
  );
}

function controlLabel(control: string): string {
  if (control === 'switch') return '开关（缺省启用，只读）';
  if (control === 'text') return '文本（只读）';
  if (control === 'number') return '数字（只读）';
  return `${control}（只读）`;
}

/** 技能设置页：爱生活页签条下的一页（只读设置行 + 状态读数 + 版本行，禁做假开关）。 */
function CalorieConfig(props: { getCall: GetCall }): React.ReactElement {
  const [state, setState] = React.useState<PanelState>({ kind: 'loading' });
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
  const status =
    state.kind === 'loading'
      ? React.createElement('div', { style: S.muted }, '状态读取中…')
      : state.kind === 'data'
        ? React.createElement(
            'div',
            null,
            React.createElement('div', { style: S.title }, SLOT_TITLE),
            React.createElement('div', { style: S.total }, `total ${state.total}`),
            React.createElement('div', { style: S.muted }, `今日 ${state.date}`),
          )
        : React.createElement('div', { style: state.kind === 'absent' ? S.muted : S.error }, state.message);
  return React.createElement(
    'div',
    { style: S.card },
    status,
    React.createElement(
      'div',
      { style: S.rows },
      SETTING_ROWS.map((row) =>
        React.createElement('div', { key: row.key }, `${row.title} · ${controlLabel(row.control)}`),
      ),
    ),
    React.createElement(VersionLine, null),
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
  // 调用口取用器透传给组件（每次取数现取；非函数由组件判缺席）。
  const getCall: GetCall = () => ctx.connection?.rpc?.call ?? null;

  // (a) 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: 'dsh-calorie',
        order: 75,
        label: () => SLOT_TITLE,
      },
      () => React.createElement(CalorieConfig, { getCall }),
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
