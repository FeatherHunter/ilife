/** dsh-memo-ilife client 适配器（六边形：port=contract+dsh-ctx 镜像，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）。
 * 注册两处（grill 定案，新术语见 CONTEXT.md）：
 * (a) 技能设置页 → 爱生活页签槽（总管声明的 children，各技能自研自家配置页）；
 *     #696 起这一页从「只读设置行」换成**真配置页**：行表来自 settings.ts，取值与保存经宿主三个端点
 *     （`config.get`／`config.save`／`config.reset`），宿主再 spawn 技能 CLI 的 `memo.config.*` 三个 key。
 *     本页只配置、不干活：没有查数、记一条之类的入口（那些在 (b) 的功能页）。
 * (b) 技能功能页 → sidebar槽（better-sidebar 服务，非 DSH slot；软依赖，
 *     缺席即跳过，不断链。DSH右侧槽 + sidebar.footer.action 彻底出局，已删）。
 * 有界重试例外依据（唯一允许的定时器）：注册重试非数据轮询，照抄
 * dsh-mattpocock-skills-deck/src/client/panelAssembly.js:100-108
 * （betterSidebar 服务可能晚于本模块到达，最多 10 次、间隔 1000ms；卸载清理）。
 * 只用 dsh-ctx 镜像内成员（slots.inject/register、connection.rpc.call 经闭包现取、
 * betterSidebar 经 ctx.get 运行时取）；取数只经 connection.rpc.call 进 host 通道；
 * 缺席/错误纯条件渲染，不返空冒充。组件 React.createElement 手写，不引入 JSX。
 */
import * as React from 'react';
import { RPC_CHANNEL, RPC_ENDPOINT_READ, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, DEFAULT_READ_KEY, isRpcResult } from './contract.js';
import type { ConfigSurfaceReply } from './contract.js';
import { SLOT_TITLE, PLUGIN, SKILL_PACKAGE, PLUGIN_VERSION, SKILL_VERSION } from './slot.js';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, ADVANCED_GROUP_TITLE, ADVANCED_GROUP_NOTE, readPath, writePath } from './settings.js';
import type { ConfigItem } from './settings.js';
import type { ClientCtx, RpcCallFace, RpcCallResult } from './dsh-ctx.js';

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
  error: { color: 'var(--dsw-alias-state-error-primary, #ff6b6b)', fontSize: 13, whiteSpace: 'pre-wrap' } as React.CSSProperties,
  okText: { color: 'var(--dsw-alias-state-success-primary, #12805c)', fontSize: 12.5 } as React.CSSProperties,
  rows: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))', paddingTop: 8 } as React.CSSProperties,
  row: { marginTop: 10 } as React.CSSProperties,
  label: { fontSize: 12.5, fontWeight: 600 } as React.CSSProperties,
  hint: { color: 'var(--dsw-alias-label-tertiary, #8a8a8a)', fontSize: 11.5, margin: '1px 0 4px' } as React.CSSProperties,
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    font: '12.5px/1.5 ui-monospace,Consolas,monospace',
  } as React.CSSProperties,
  info: {
    margin: '6px 0 0',
    font: '12px/1.5 ui-monospace,Consolas,monospace',
    color: 'var(--dsw-alias-label-secondary, #9a9a9a)',
    wordBreak: 'break-all',
  } as React.CSSProperties,
  bar: { marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' } as React.CSSProperties,
  btn: {
    padding: '5px 14px',
    borderRadius: 7,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    fontSize: 12.5,
    cursor: 'pointer',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '5px 14px',
    borderRadius: 7,
    border: '1px solid var(--dsw-alias-brand-primary, #2f6fed)',
    background: 'var(--dsw-alias-brand-primary, #2f6fed)',
    color: '#fff',
    fontSize: 12.5,
    cursor: 'pointer',
  } as React.CSSProperties,
  adv: {
    marginTop: 12,
    paddingTop: 8,
    borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))',
  } as React.CSSProperties,
  advSummary: { cursor: 'pointer', fontSize: 12.5, fontWeight: 600 } as React.CSSProperties,
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
    return React.createElement('div', { style: S.card }, React.createElement('div', { style: S.muted }, '备忘录加载中…'));
  }
  if (state.kind === 'data') {
    return React.createElement(
      'div',
      { style: S.card },
      React.createElement('div', { style: S.title }, SLOT_TITLE),
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

/** 配置页三态：读取中（一次 RPC 内）／ready（真表单）／failed（人话报错 ＋ 指引）。 */
type ConfigState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly surface: ConfigSurfaceReply }
  | { readonly kind: 'failed'; readonly message: string };

type ConfigOutcome =
  | { readonly ok: true; readonly surface: ConfigSurfaceReply }
  | { readonly ok: false; readonly message: string };

/** 配置面报错 → 人话指引。
 *
 * 报文由技能侧给出：base-link-core 的 `ConfigError` 已带行号与文件名，技能 `cli/config.ts` 原样交出来，
 * 插件 bridge 原样带上（`fetch-failed：出口非 0（1）：<那一句>`）。所以这里**不重写报文**，
 * 只按报错类补一句「接下来怎么办」——免得两处各写一套人话。
 */
export function humanizeConfigFailure(code: string, message: string): string {
  const text = message.trim().length > 0 ? message.trim() : `（${code}，宿主未给报文）`;
  if (/解析|YAML|parse/i.test(text)) return `${text}\n改回「键: 值」的写法，或点「重置为默认」重来一份（重置会先留一份 .bak）。`;
  if (/不认识|未知键|UNKNOWN_KEY/i.test(text)) return `${text}\n本页只认表里这些项；多余的行删掉，或点「重置为默认」。`;
  if (/类型|TYPE_MISMATCH/i.test(text)) return `${text}\n按本页给的形状填（文本填文本），或点「重置为默认」。`;
  if (/缺席|missing-cli/i.test(text)) return `${text}\n技能出口没找着：先确认技能包已构建（packages/skill-memo-ilife/dist/cli/cmd_read.js）。`;
  return `${text}\n改不动就点「重置为默认」（会先留一份 .bak），或照报文里的路径手工改配置文件。`;
}

/** 一次配置 RPC（同通道过三个端点；永不抛，失败落字）。 */
async function configRpc(call: unknown, method: string, payload: Record<string, unknown>): Promise<ConfigOutcome> {
  if (typeof call !== 'function') return { ok: false, message: '宿主连接缺席：connection.rpc.call 不可用' };
  let raw: unknown;
  try {
    // 防御纵深 + 自家超时双保险（AbortSignal 帮正规传输提前收工；race 保传输忽略 signal 时仍落字）。
    raw = await withTimeout(
      // #80：走 DSH 公开的 /api 载体（host 侧为 connection.fetch.register 注册的 /api/ilife-memo）。
      (call as RpcCallFace)('/api', RPC_CHANNEL.slice(1), { method, payload }, AbortSignal.timeout(READ_TIMEOUT_MS)),
      READ_TIMEOUT_MS,
    );
  } catch (e) {
    if (e instanceof Error && (e.name === 'AbortError' || e.name === 'TimeoutError')) {
      return { ok: false, message: `配置请求超时（${Math.round(READ_TIMEOUT_MS / 1000)}s）：宿主未回` };
    }
    return { ok: false, message: `配置失败：${e instanceof Error ? e.message : String(e)}` };
  }
  if (!isRpcResult(raw)) return { ok: false, message: '回执信封异常（非 ok 信封）' };
  const res = raw as RpcCallResult;
  if (!res.ok) return { ok: false, message: humanizeConfigFailure(res.error?.code ?? 'unknown', res.error?.message ?? '') };
  return { ok: true, surface: res.value as ConfigSurfaceReply };
}

/** 读设置页整面。 */
export function fetchConfigSurface(call: unknown): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_GET, {});
}

/** 保存一份取值（写回执只有 {path, values}，头部那两行要的是读整面，故由组件写后重读）。 */
export function saveConfigSurface(call: unknown, values: Record<string, unknown>): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_SAVE, { values });
}

/** 重置为默认（技能侧先落 .bak；同样由组件重读一份整面）。 */
export function resetConfigSurface(call: unknown): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_RESET, {});
}

/** 把配置取值铺成「行键 → 输入框文本」（页面表单态；值缺项即空串，不返空留白）。 */
export function toDraft(values: Record<string, unknown>): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const item of CONFIG_ITEMS) {
    const v = readPath(values, item.key);
    draft[item.key] = v === undefined || v === null ? '' : String(v);
  }
  return draft;
}

/** 表单态 → 配置取值（按控件种类还原类型；空串对文本项照收，语义由「按默认落点」承担）。 */
export function fromDraft(draft: Record<string, string>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const item of CONFIG_ITEMS) {
    const raw = draft[item.key] ?? '';
    if (item.control === 'number') {
      const n = Number(raw);
      writePath(values, item.key, Number.isFinite(n) ? n : 0);
    } else if (item.control === 'switch') {
      writePath(values, item.key, raw === 'true');
    } else {
      writePath(values, item.key, raw);
    }
  }
  return values;
}

/** 一行输入（三种控件对齐受限 YAML 子集：文本／数字／布尔；本包 8 行都是文本）。 */
function Row(props: {
  readonly item: ConfigItem;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (key: string, next: string) => void;
}): React.ReactElement {
  const { item } = props;
  const control =
    item.control === 'switch'
      ? React.createElement('input', {
          type: 'checkbox',
          checked: props.value === 'true',
          disabled: props.disabled,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.checked ? 'true' : 'false'),
        })
      : React.createElement('input', {
          style: S.input,
          type: item.control === 'number' ? 'number' : 'text',
          value: props.value,
          disabled: props.disabled,
          spellCheck: false,
          onChange: (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.value),
        });
  return React.createElement(
    'div',
    { style: S.row },
    React.createElement('div', { style: S.label }, item.title),
    React.createElement('div', { style: S.hint }, item.hint),
    control,
  );
}

/** 技能设置页：承载备忘录自己的全部可配置项（只配置，不干活）。
 *
 * 三态：loading（一次 RPC 内）／ready（真表单）／failed（人话报错 ＋ 指引，不返空、不转圈）。
 * 保存与重置之后都**重新读一份整面**再提示（写回执不带 dataDir／created，头部那两行要的是读整面）。 */
function MemoConfig(props: { getCall: GetCall }): React.ReactElement {
  const [state, setState] = React.useState<ConfigState>({ kind: 'loading' });
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const apply = React.useCallback((surface: ConfigSurfaceReply) => {
    setState({ kind: 'ready', surface });
    setDraft(toDraft(surface.values));
  }, []);

  const load = React.useCallback(async () => {
    setNotice(null);
    setError(null);
    const r = await fetchConfigSurface(props.getCall());
    if (r.ok) apply(r.surface);
    else setState({ kind: 'failed', message: r.message });
  }, [apply, props.getCall]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetchConfigSurface(props.getCall());
      if (!alive) return;
      if (r.ok) apply(r.surface);
      else setState({ kind: 'failed', message: r.message });
    })();
    return () => {
      alive = false;
    };
  }, [apply, props.getCall]);

  const onChange = React.useCallback((key: string, next: string) => {
    setDraft((prev) => ({ ...prev, [key]: next }));
    setNotice(null);
    setError(null);
  }, []);

  const surface = state.kind === 'ready' ? state.surface : null;
  const dirty = surface !== null && CONFIG_ITEMS.some((i) => (draft[i.key] ?? '') !== (toDraft(surface.values)[i.key] ?? ''));

  /** 写完（保存／重置）之后重新读一份整面，读到了才敢提示「已完成」。 */
  const writeThenReload = React.useCallback(async (done: string) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    const r = await fetchConfigSurface(props.getCall());
    if (r.ok) {
      apply(r.surface);
      setNotice(done);
    } else {
      setState({ kind: 'failed', message: r.message });
    }
    setBusy(false);
  }, [apply, props.getCall]);

  const onSave = React.useCallback(async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    const r = await saveConfigSurface(props.getCall(), fromDraft(draft));
    setBusy(false);
    if (r.ok) await writeThenReload('已保存，立即生效（不用重启宿主）');
    else setError(r.message);
  }, [draft, props.getCall, writeThenReload]);

  const onReset = React.useCallback(async () => {
    setBusy(true);
    setNotice(null);
    setError(null);
    const r = await resetConfigSurface(props.getCall());
    setBusy(false);
    if (r.ok) await writeThenReload('已重置为默认（原配置已另存一份 .bak）');
    else setError(r.message);
  }, [props.getCall, writeThenReload]);

  const head = React.createElement(
    'div',
    null,
    React.createElement('div', { style: S.title }, `${SLOT_TITLE} · 配置`),
    surface !== null
      ? React.createElement(
          'div',
          null,
          React.createElement('div', { style: S.info }, `配置文件 ${surface.path}`),
          React.createElement('div', { style: S.info }, `数据目录 ${surface.dataDir}`),
          surface.created ? React.createElement('div', { style: S.muted }, '（这份配置是刚按默认值建出来的）') : null,
        )
      : null,
  );

  if (state.kind === 'loading') {
    return React.createElement(
      'div',
      { style: S.card },
      head,
      React.createElement('div', { style: S.muted }, '配置读取中…'),
      React.createElement(VersionLine, null),
    );
  }

  if (state.kind === 'failed') {
    return React.createElement(
      'div',
      { style: S.card },
      React.createElement('div', { style: S.title }, `${SLOT_TITLE} · 配置`),
      React.createElement('div', { style: S.error }, state.message),
      React.createElement(
        'div',
        { style: S.bar },
        React.createElement('button', { style: S.btn, type: 'button', onClick: () => void load() }, '重试'),
        React.createElement('button', { style: S.btn, type: 'button', onClick: () => void onReset() }, '重置为默认'),
      ),
      React.createElement(VersionLine, null),
    );
  }

  const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT);
  const advanced = CONFIG_ITEMS.slice(COMMON_ITEM_COUNT);
  const renderRow = (item: ConfigItem) =>
    React.createElement(Row, { key: item.key, item, value: draft[item.key] ?? '', disabled: busy, onChange });

  return React.createElement(
    'div',
    { style: S.card },
    head,
    React.createElement('div', { style: S.rows }, common.map(renderRow)),
    React.createElement(
      'details',
      { style: S.adv },
      React.createElement('summary', { style: S.advSummary }, ADVANCED_GROUP_TITLE),
      React.createElement('div', { style: S.muted }, ADVANCED_GROUP_NOTE),
      advanced.map(renderRow),
    ),
    React.createElement(
      'div',
      { style: S.bar },
      React.createElement(
        'button',
        { style: dirty ? S.btnPrimary : S.btn, type: 'button', disabled: busy || !dirty, onClick: () => void onSave() },
        busy ? '处理中…' : '保存',
      ),
      React.createElement('button', { style: S.btn, type: 'button', disabled: busy, onClick: () => void onReset() }, '重置为默认'),
      React.createElement('button', { style: S.btn, type: 'button', disabled: busy, onClick: () => void load() }, '重新读取'),
    ),
    notice !== null ? React.createElement('div', { style: S.okText }, notice) : null,
    error !== null ? React.createElement('div', { style: S.error }, error) : null,
    React.createElement('div', { style: S.muted }, `${PLUGIN} 设置页住单品包；本页只配置，不干活。`),
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
        id: 'dsh-memo-ilife',
        order: 70,
        label: () => SLOT_TITLE,
        // #706：本包自己那条 RPC 通道交给总管（各家都写这一格），总管据此调配置体检——
        // 它因此不必在源码里写死任何一家的通道名（零单品依赖照旧成立）。
        channel: RPC_CHANNEL,
      },
      () => React.createElement(MemoConfig, { getCall }),
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
