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
 * connection.rpc.call 经闭包现取、betterSidebar 与 #736 的目录选择命名空间经 ctx.get 运行时取）；
 * 取数只经 connection.rpc.call 进 host 通道；缺席/错误纯条件渲染，不返空冒充。
 * 组件 React.createElement 手写，不引入 JSX。
 *
 * #676：技能设置页从「只读设置行 + 状态读数」换成**真配置页**——行表来自 settings.ts，
 * 取值来自宿主侧配置件（`config.get`／`config.save`／`config.reset` 三个端点）。
 * 本文件仍禁 node：不读盘、不算默认值，默认值由宿主一并送来。
 * 照 CONTEXT.md，「技能设置页」只配置、不干活：本页没有任何取数／记一餐入口，
 * 状态读数也已移出（读数属技能功能页）。
 */
import * as React from 'react';
import { RPC_CHANNEL, RPC_ENDPOINT_READ, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, DEFAULT_READ_KEY, isRpcResult } from './contract.js';
import type { ConfigSurfaceReply } from './contract.js';
import { SLOT_TITLE, PLUGIN, SKILL_PACKAGE } from './slot.js';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, ADVANCED_GROUP_TITLE, ADVANCED_GROUP_NOTE, readPath, writePath } from './settings.js';
import type { ConfigItem, ResolvedField } from './settings.js';
import { DIRECTORY_PICKER_REFUSED, MANAGER_RPC_BASE, MANAGER_RPC_ENDPOINT, MANAGER_ROOTS_METHOD, REMOTE_DIRECTORY_PICKER } from './dsh-ctx.js';
import { pickerModeOf as sharedPickerModeOf, readPickAnswer as sharedReadPickAnswer, openRowBrowser, createRootsSource } from 'dsh-life-pack/directory-browser';
import { DirectoryBrowserFromRow } from 'dsh-life-pack/directory-browser-ui';
import type { PickerMode, DirectoryRowBrowser, DirectoryRowEntry, RootRow } from 'dsh-life-pack/directory-browser';
import type { ClientCtx, RpcCallFace, RpcCallResult, DirectoryPickerAnswer, DirectoryPickerFace } from './dsh-ctx.js';

/** client 短名声明：只有这两个（#736 的目录选择走**可选查找**，不写进来——
 * 写进来＝硬依赖，提供方缺席时整包被停靠，设置页会跟着装不上；见 cookbook §13）。 */
export const inject = ['slots', 'connection'];

/** 调用口取用器：每次取数时现取（connection 后到也不永久缺席）。 */
export type GetCall = () => unknown;

/** 面板视觉（内联 style；颜色走 DSH 主题别名，深浅主题自适应，写死值只做回退）。
 *
 * **六家逐项同形**（备忘·卡路里·记账·作息·居家·大厨）：同一项在这六份里逐字相同，
 * 改任一条要六家一起改，锁见 `test/panel-copy-743.test.mjs` 第 ⑤ 条。 */
const S = {
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
  rows: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))', paddingTop: 8 } as React.CSSProperties,
  version: {
    marginTop: 8,
    paddingTop: 8,
    borderTop: '1px dashed var(--dsw-alias-border, rgba(128,128,128,.25))',
    color: 'var(--dsw-alias-label-tertiary, #8a8a8a)',
    fontSize: '0.92em',
  } as React.CSSProperties,
  info: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em', overflowWrap: 'anywhere' } as React.CSSProperties,
  row: { marginBottom: 10 } as React.CSSProperties,
  label: { fontWeight: 600 } as React.CSSProperties,
  hint: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em', marginBottom: 4 } as React.CSSProperties,
  input: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '4px 8px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
  } as React.CSSProperties,
  pickRow: { display: 'flex', gap: 6, alignItems: 'center' } as React.CSSProperties,
  btnPick: {
    flex: '0 0 auto',
    padding: '4px 10px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
  } as React.CSSProperties,
  bar: { display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' } as React.CSSProperties,
  btn: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-border, rgba(128,128,128,.45))',
    background: 'var(--dsw-alias-bg-base, transparent)',
    color: 'var(--dsw-alias-label-primary, inherit)',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnPrimary: {
    padding: '4px 12px',
    borderRadius: 6,
    border: '1px solid var(--dsw-alias-brand-primary, #2f6fed)',
    background: 'var(--dsw-alias-brand-primary, #2f6fed)',
    color: '#fff',
    cursor: 'pointer',
  } as React.CSSProperties,
  advanced: { marginTop: 12 } as React.CSSProperties,
  summary: { cursor: 'pointer', fontWeight: 600 } as React.CSSProperties,
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
  return React.createElement('div', { style: S.version }, formatVersionLine(props.pluginVersion, props.skillVersion));
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
    return React.createElement('div', { style: S.card }, React.createElement('div', { style: S.muted }, '卡路里加载中'));
  }
  if (state.kind === 'data') {
    return React.createElement(
      'div',
      { style: S.card },
      React.createElement('div', { style: S.title }, `卡路里 · ${state.date}`),
      React.createElement('div', { style: S.total }, `total ${state.total}`),
      React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill }),
    );
  }
  return React.createElement(
    'div',
    { style: S.card },
    React.createElement('div', { style: state.kind === 'absent' ? S.muted : S.error }, state.message),
    React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill }),
  );
}

// ===== #676：技能设置页（只配置，不干活）=====

type ConfigState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly surface: ConfigSurfaceReply }
  | { readonly kind: 'failed'; readonly message: string };

/** 配置面报错 → 人话指引。
 *
 * 报文由技能侧给出：base-link-core 的 `ConfigError` 已经带行号与文件名，技能
 * `cli/config.ts` 原样交出来，插件 bridge 原样带上（`fetch-failed：出口非 0（1）：<那一句>`）。
 * 所以这里**不重写报文**，只按报错类补一句「接下来怎么办」——免得两处各写一套人话。
 */
export function humanizeConfigFailure(code: string, message: string): string {
  const text = message.trim().length > 0 ? message.trim() : `（${code}，宿主未给报文）`;
  if (/解析|YAML|parse/i.test(text)) return `${text}\n改回「键: 值」的写法，或点「重置为默认」。`;
  if (/不认识|未知键|UNKNOWN_KEY/i.test(text)) return `${text}\n删掉页面上没有的行，或点「重置为默认」。`;
  if (/类型|TYPE_MISMATCH/i.test(text)) return `${text}\n按本页的控件形状填，或点「重置为默认」。`;
  if (/缺席|missing-cli/.test(text)) return `${text}\n技能出口没找到：先确认技能包已装好，再点「重新读取」。`;
  return `${text}\n改不动就点「重置为默认」，或照上面那条路径手工改配置文件。`;
}

type ConfigOutcome =
  | { readonly ok: true; readonly surface: ConfigSurfaceReply }
  | { readonly ok: false; readonly message: string };

/** 一次配置 RPC（与 fetchRead 同通道、同超时纪律；永不抛，失败落字）。 */
async function configRpc(call: unknown, method: string, payload: Record<string, unknown>): Promise<ConfigOutcome> {
  if (typeof call !== 'function') return { ok: false, message: '宿主连接缺席：connection.rpc.call 不可用' };
  try {
    const raw: unknown = await withTimeout(
      (call as RpcCallFace)('/api', RPC_CHANNEL.slice(1), { method, payload }, AbortSignal.timeout(READ_TIMEOUT_MS)),
      READ_TIMEOUT_MS,
    );
    if (!isRpcResult(raw)) return { ok: false, message: '回执信封异常（非 ok 信封）' };
    if (!raw.ok) return { ok: false, message: humanizeConfigFailure(raw.error?.code ?? 'unknown', raw.error?.message ?? '') };
    return { ok: true, surface: raw.value as ConfigSurfaceReply };
  } catch (e) {
    if (e instanceof Error && e.name === 'AbortError') return { ok: false, message: `配置读取超时（${Math.round(READ_TIMEOUT_MS / 1000)}s）：宿主未回` };
    if (e instanceof Error && e.name === 'TimeoutError') return { ok: false, message: e.message };
    return { ok: false, message: `配置失败：${e instanceof Error ? e.message : String(e)}` };
  }
}

/** 读设置页整面。 */
export function fetchConfigSurface(call: unknown): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_GET, {});
}

/** 保存（回全表）。 */
export function saveConfigSurface(call: unknown, values: Record<string, unknown>): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_SAVE, { values });
}

/** 重置为默认（配置件先落 .bak）。 */
export function resetConfigSurface(call: unknown): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_RESET, {});
}

/** 把配置取值铺成「行键 → 输入框文本」（页面表单态；值缺项即空串，不返空留白）。
 *
 * `prefill` 是**落点回执**（配置面那几格解析出来的绝对路径）：
 *   · 标了 `prefillFrom` 的行在取值空着时直接显示那条绝对路径——用户不必自己拼路径（#743），
 *     显示的就是技能真会用的那个目录（逐字相同）；
 *   · 标了 `prefillResolved` 的可改行在取值空着时显示 `resolved` 组那一格（照片目录的生效值）；
 *   · **只读行**（#757）一律显示 `resolveFrom` 指的那一格（技能算好的绝对路径／生效数字）——
 *     面板一个字都不算：回执缺那一格（旧技能）就显示空串，绝不编一条路径出来。 */
export interface SurfacePrefill {
  readonly dataDir?: string;
  readonly resolved?: Partial<Record<ResolvedField, string | undefined>>;
}

/** 只读行显示什么：标了 `resolveFrom` ⇒ 回执 `resolved` 组那一格；没标 ⇒ 配置文件里那个值本身
 *  （数字类只读项走这一档：显示的是生效数字，见 #749 补注二的甲档）。 */
function readonlyTextOf(item: ConfigItem, raw: string, prefill: SurfacePrefill): string {
  if (item.resolveFrom === undefined) return raw;
  const shown = prefill.resolved?.[item.resolveFrom];
  return typeof shown === 'string' ? shown : '';
}

export function toDraft(
  values: Record<string, unknown>,
  prefill: SurfacePrefill = {},
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const item of CONFIG_ITEMS) {
    const v = readPath(values, item.key);
    const raw = v === undefined || v === null ? '' : String(v);
    if (item.readonly === true) {
      draft[item.key] = readonlyTextOf(item, raw, prefill);
      continue;
    }
    if (raw !== '') {
      draft[item.key] = raw;
      continue;
    }
    const top = item.prefillFrom === undefined ? undefined : prefill[item.prefillFrom];
    if (typeof top === 'string' && top !== '') {
      draft[item.key] = top;
      continue;
    }
    const resolved = item.prefillResolved === undefined ? undefined : prefill.resolved?.[item.prefillResolved];
    draft[item.key] = typeof resolved === 'string' ? resolved : raw;
  }
  return draft;
}

/** 表单态 → 配置取值（按控件种类还原类型；空串对文本项照收，语义由「未配」承担）。
 *
 *  **只读行不收**（#757）：它们显示的是技能算好的绝对路径，写回配置就是把「显示的路径」当成「配置值」——
 *  保存只提交真能改的那些行（本家＝数据目录／照片目录／训记 KEY 三行），其余键由技能侧做组内合并保留现值。 */
export function fromDraft(draft: Record<string, string>): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const item of CONFIG_ITEMS) {
    if (item.readonly === true) continue;
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

/** 目录选择的三种结果（注入 picker 的纯归一：选中／取消／这条路供不了）。 */
export type PickOutcome =
  | { readonly kind: 'picked'; readonly path: string }
  | { readonly kind: 'cancelled' }
  | { readonly kind: 'unavailable'; readonly message: string };

/** 形状守卫：拿到的那个东西像不像目录选择命名空间（本包只认 `pick` 是函数）。 */
export function isDirectoryPicker(raw: unknown): raw is DirectoryPickerFace {
  if (typeof raw !== 'object' || raw === null) return false;
  return typeof (raw as { pick?: unknown }).pick === 'function';
}

/** 现取目录选择命名空间：**软依赖**，拿不到回 null（页面据此不出入口）。
 *
 * 为什么不用 `inject` 声明：见 cookbook §13——写进声明＝硬依赖，提供方缺席时整包被停靠，
 * 设置页会跟着装不上。这里按平台给的「可选查找」办：缺席只是没有入口。
 * 守卫拒绝或提供方中途卸载会抛，一律当「没有」，绝不把设置页带下来。 */
export function resolveDirectoryPicker(getService: unknown): DirectoryPickerFace | null {
  if (typeof getService !== 'function') return null;
  try {
    const raw = (getService as (name: string) => unknown)(REMOTE_DIRECTORY_PICKER);
    return isDirectoryPicker(raw) ? raw : null;
  } catch {
    return null;
  }
}

/** 平台回执／入口三态：**已经收进共用件**（票 #744），这里只同名转出。 */
export const readPickAnswer = sharedReadPickAnswer;
export const pickerModeOf = sharedPickerModeOf;

/** 唤起一次系统文件夹选择器并归一结果（**永不抛**）。 */
export async function pickDirectory(picker: DirectoryPickerFace): Promise<PickOutcome> {
  try {
    return readPickAnswer(await picker.pick());
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return { kind: 'unavailable', message: '打不开系统文件夹对话框（' + reason + '）：请直接在框里填绝对路径。' };
  }
}


/** 入口三态：有系统对话框（`pick`）／只有应用内浏览（`list` ＋ `createDirectory`）／都没有。
 *
 * 判定取自共用件（一处定义）。本函数只读那个命名空间，不做 IO。 */
export function directoryEntryMode(picker: DirectoryPickerFace | null): PickerMode {
  return picker === null ? 'none' : pickerModeOf(picker);
}

/** 开一行的应用内浏览器：**策略在共用件里**（`openRowBrowser`，一处定义），本处只透出。
 *
 * 为什么不留本地实现：先浏览还是先系统对话框、被拒之后换哪条路，是六家必须一致的一条判断；
 * 各写一份就会各错各的（#744 实测：先认 `pick` 的写法在 Desktop 上每次都吃一次拒绝）。 */
export { openRowBrowser };


/** 「选择文件夹」按钮的真装配函数（目录行渲染出来的按钮，onClick 就是它）。
 *
 * 回 Promise 是为了本地可判（用例直接 await）；接进 React 时调用方 `void` 掉。 */
export function createBrowseHandler(deps: {
  readonly picker: DirectoryPickerFace;
  readonly onChange: (key: string, next: string) => void;
  readonly onUnavailable: (message: string) => void;
}): (key: string) => Promise<void> {
  return async (key: string) => {
    const outcome = await pickDirectory(deps.picker);
    if (outcome.kind === 'picked') deps.onChange(key, outcome.path);
    else if (outcome.kind === 'unavailable') deps.onUnavailable(outcome.message);
  };
}

/** 一行输入（四种控件对齐受限 YAML 子集：文本／数字／布尔／目录）。
 *
 * 目录档＝文本框 ＋ 一枚唤起系统文件夹选择器的按钮；`onBrowse` 缺席（命名空间拿不到、
 * 或这条路已被拒）时不画按钮，文本框照旧——那是该缝自己的契约（供不了就收起入口，不是失败）。
 *
 * **只读行（#757）**：`item.readonly` 为真时控件一律 `disabled`（值只经技能侧解析后显示、不给改），
 * 目录行的浏览按钮**保留但不可点击**（#748 定稿：入口不作废，只是不能改）。控件文案**不出现省略号**
 * （#746 处置 9）——按钮就写「选择文件夹」／「浏览」两个字面。 */
export function Row(props: {
  readonly item: ConfigItem;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (key: string, next: string) => void;
  /** 目录行才有：入口三态（`native`／`browse`／`none`）。 */
  readonly browser?: DirectoryRowEntry | null | undefined;
}): React.ReactElement {
  const { item } = props;
  const readonly = item.readonly === true;
  const disabled = props.disabled || readonly;
  // 只读行不接 onChange：不给「改得动」留假象（用例也据此认「哪几行可改」）。
  const onChange = readonly ? undefined : (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.value);
  const control =
    item.control === 'switch'
      ? React.createElement('input', {
          type: 'checkbox',
          checked: props.value === 'true',
          disabled,
          onChange: readonly ? undefined : (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.checked ? 'true' : 'false'),
        })
      : React.createElement('input', {
          style: S.input,
          type: item.control === 'number' ? 'number' : 'text',
          value: props.value,
          disabled,
          spellCheck: false,
          onChange,
        });
  /** 三态入口：供不了（`none`／缺席）就不画，不摆一个点了没反应的死按钮。
   *  只读行照画（按钮保留），但 `disabled` ⇒ 点不动。 */
  const entry = props.browser ?? null;
  const browse =
    item.control === 'directory' && entry !== null && entry.mode !== 'none'
      ? React.createElement(
          'button',
          {
            style: S.btnPick,
            type: 'button',
            disabled,
            // 回这枚 Promise 是有意的：React 不看 onClick 的返回值，而用例能直接 await 它。
            onClick: () => entry.onOpen(item.key),
          },
          entry.mode === 'native' ? '选择文件夹' : '浏览',
        )
      : null;
  return React.createElement(
    'div',
    { style: S.row },
    React.createElement('div', { style: S.label }, item.title),
    React.createElement('div', { style: S.hint }, item.hint),
    browse === null ? control : React.createElement('div', { style: S.pickRow }, control, browse),
  );
}

/** 技能设置页：承载卡路里自己的全部可配置项（只配置，不干活）。
 *
 * 三态：loading（一次 RPC 内）／ready（真表单）／failed（人话报错 + 指引，不返空、不转圈）。
 * 没有任何干活入口——查数、记一餐在技能功能页（sidebar槽）。 */
function CalorieConfig(props: { getCall: GetCall; pickerSource: () => DirectoryPickerFace | null; rootsSource: () => Promise<readonly RootRow[]> }): React.ReactElement {
  const [state, setState] = React.useState<ConfigState>({ kind: 'loading' });
  const [pickerGone, setPickerGone] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [versions, setVersions] = React.useState<{ readonly plugin: string; readonly skill: string }>({
    plugin: VERSION_UNKNOWN,
    skill: VERSION_UNKNOWN,
  });

  const load = React.useCallback(async () => {
    setNotice(null);
    setError(null);
    const r = await fetchConfigSurface(props.getCall());
    if (r.ok) {
      setState({ kind: 'ready', surface: r.surface });
      setDraft(toDraft(r.surface.values, r.surface));
    } else {
      setState({ kind: 'failed', message: r.message });
    }
  }, [props.getCall]);

  React.useEffect(() => {
    let alive = true;
    void (async () => {
      const r = await fetchConfigSurface(props.getCall());
      if (!alive) return;
      if (r.ok) {
        setState({ kind: 'ready', surface: r.surface });
        setDraft(toDraft(r.surface.values, r.surface));
      } else {
        setState({ kind: 'failed', message: r.message });
      }
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

  const onChange = React.useCallback((key: string, next: string) => {
    setDraft((prev) => ({ ...prev, [key]: next }));
    setNotice(null);
    setError(null);
  }, []);

  /** 目录行入口：三态（系统对话框／应用内浏览／都没有）。
   *
   * **软依赖**：拿不到命名空间就没有入口（留文本框），被拒一次即收起入口，不留死按钮。
   * 状态全部住在组件自己（hook 顺序与旧版同形）：浏览器那一份只存「当前开着的那条」。 */
  const picker = pickerGone ? null : props.pickerSource();
  const [browseRow, setBrowseRow] = React.useState<DirectoryRowBrowser | null>(null);

  /** 唤起系统文件夹选择器那一条路（应用内浏览被拒时的兜底，也是命名空间只给 `pick` 时的唯一一条）。 */
  const openNative = React.useCallback(
    async (key: string): Promise<void> => {
      const face = pickerGone ? null : props.pickerSource();
      if (face === null) return;
      // 系统对话框是模态的：等它回来的这段时间给一行字，免得看着像「点了没反应」（#743）。
      setPicking(true);
      setError(null);
      const outcome = await pickDirectory(face);
      setPicking(false);
      if (outcome.kind === 'picked') onChange(key, outcome.path);
      else if (outcome.kind === 'unavailable') {
        setError(outcome.message);
        setPickerGone(true);
      }
    },
    [pickerGone, onChange, props.pickerSource],
  );

  /** 目录行的入口动作：**先应用内浏览，宿主没给这条路再换系统对话框**（判断在共用件里）。
   *
   * 两条都供不了就不给入口（`undefined` 时 `rowEntry` 为 null ⇒ Row 不画按钮）。 */
  const onOpenRow = React.useCallback(
    async (key: string): Promise<void> => {
      setError(null);
      const opened = openRowBrowser({
        picker,
        initialPath: draft[key] ?? '',
        onChange: (next) => onChange(key, next),
        onRow: setBrowseRow,
        refusalCode: DIRECTORY_PICKER_REFUSED,
        rootsSource: props.rootsSource,
      });
      if (opened === undefined || (await opened) === 'refused') await openNative(key);
    },
    [picker, onChange, draft, openNative, props.rootsSource],
  );

  /** 给 Row 的三态入口：`none` 时给 null（不画按钮，文本框照旧）。 */
  const rowEntry: DirectoryRowEntry | null =
    pickerModeOf(picker) === 'none' ? null : { mode: pickerModeOf(picker), onOpen: onOpenRow };

  const surface = state.kind === 'ready' ? state.surface : null;
  /** 脏值只看**可改行**（#757）：只读行显示的是技能算好的绝对路径，拿它当「改动」会让打开面板就变「未保存」。 */
  const editableItems = CONFIG_ITEMS.filter((i) => i.readonly !== true);
  const dirty = surface !== null && editableItems.some((i) => (draft[i.key] ?? '') !== (toDraft(surface.values, surface)[i.key] ?? ''));

  /** 写完（保存／重置）之后重新读一份整面：写回执是 `{path, values}`、重置回执是 `{path, backupPath}`，
   *  都不是整面——拿写回执当整面用，页头那行「数据目录」会显示成 undefined（#743 实测）。 */
  const writeThenReload = React.useCallback(async (done: string) => {
    setBusy(true);
    setNotice(null);
    setError(null);
    const r = await fetchConfigSurface(props.getCall());
    if (r.ok) {
      setState({ kind: 'ready', surface: r.surface });
      setDraft(toDraft(r.surface.values, r.surface));
      setNotice(done);
    } else {
      setState({ kind: 'failed', message: r.message });
    }
    setBusy(false);
  }, [props.getCall]);

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

  /** 头部两行：配置文件路径与**生效**数据目录（#757：回执 `resolved.dbDir` 是技能按配置文件算出来的那一个，
   *  装了旧技能没有那一组时回落到 `dataDir`——两个值在「数据目录留空」时逐字相同）。 */
  const headDataDir = surface?.resolved?.dbDir ?? surface?.dataDir ?? '';
  const head = React.createElement(
    'div',
    null,
    React.createElement('div', { style: S.title }, `${SLOT_TITLE} · 配置`),
    surface !== null
      ? React.createElement(
          'div',
          null,
          React.createElement('div', { style: S.info }, `配置文件 ${surface.path}`),
          React.createElement('div', { style: S.info }, `数据目录 ${headDataDir}`),
          surface.created ? React.createElement('div', { style: S.muted }, '（配置文件刚按默认值生成）') : null,
        )
      : null,
  );

  if (state.kind === 'loading') {
    return React.createElement('div', { style: S.card }, head, React.createElement('div', { style: S.muted }, '配置读取中'));
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
      React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill }),
    );
  }

  const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT);
  const advanced = CONFIG_ITEMS.slice(COMMON_ITEM_COUNT);
  const renderRow = (item: ConfigItem) =>
    React.createElement(Row, {
      key: item.key,
      item,
      value: draft[item.key] ?? '',
      disabled: busy,
      onChange,
      browser: rowEntry,
    });

  return React.createElement(
    'div',
    { style: S.card },
    head,
    React.createElement('div', { style: S.rows }, common.map(renderRow)),
    React.createElement(
      'details',
      { style: S.advanced },
      React.createElement('summary', { style: S.summary }, ADVANCED_GROUP_TITLE),
      React.createElement('div', { style: S.muted }, ADVANCED_GROUP_NOTE),
      advanced.map(renderRow),
    ),
    React.createElement(
      'div',
      { style: S.bar },
      React.createElement(
        'button',
        { style: dirty ? S.btnPrimary : S.btn, type: 'button', disabled: busy || !dirty, onClick: () => void onSave() },
        busy ? '处理中' : '保存',
      ),
      React.createElement('button', { style: S.btn, type: 'button', disabled: busy, onClick: () => void onReset() }, '重置为默认'),
      React.createElement('button', { style: S.btn, type: 'button', disabled: busy, onClick: () => void load() }, '重新读取'),
    ),
    picking ? React.createElement('div', { style: S.muted }, '已唤起系统文件夹对话框：选中后自动填上，取消则不动。') : null,
    browseRow !== null ? React.createElement(DirectoryBrowserFromRow, {
      open: true,
      row: browseRow,
      labels: {
        title: '选择文件夹',
        close: '关闭',
        up: '上一级',
        pathPlaceholder: '直接填绝对路径，回车即进入',
        go: '转到',
        showHidden: (n: number) => '显示隐藏目录（' + n + '）',
        empty: '这个目录里没有子目录。',
        loading: '正在读取',
        newFolder: '新建文件夹',
        createConfirm: '创建',
        createCancel: '取消',
        select: '选',
        selected: '已选',
        open: '选定这个目录',
        cancel: '取消',
        willPick: '将选定：',
      },
    }) : null,
    notice !== null ? React.createElement('div', { style: S.okText }, notice) : null,
    error !== null ? React.createElement('div', { style: S.error }, error) : null,
    React.createElement(VersionLine, { pluginVersion: versions.plugin, skillVersion: versions.skill }),
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
  // #736 目录选择：**软依赖**，每次渲染现取（提供方后到／中途卸载都不留痕）；
  // 拿不到就只是没有入口，设置页照常（不声明、不停靠，见 cookbook §13）。
  const getPicker = (): DirectoryPickerFace | null =>
    typeof ctx.get === 'function' ? resolveDirectoryPicker((name: string) => ctx.get?.(name)) : null;

  // (a) 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: 'dsh-calorie',
        order: 75,
        label: () => SLOT_TITLE,
        // #706：本包自己那条 RPC 通道交给总管（各家都写这一格），总管据此调配置体检——
        // 它因此不必在源码里写死任何一家的通道名（零单品依赖照旧成立）。
        channel: RPC_CHANNEL,
      },
      () => React.createElement(CalorieConfig, { getCall, pickerSource: getPicker, rootsSource: createRootsSource({
        getCall,
        base: MANAGER_RPC_BASE,
        endpoint: MANAGER_RPC_ENDPOINT,
        method: MANAGER_ROOTS_METHOD,
      }) }),
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
