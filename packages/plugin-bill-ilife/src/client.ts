/** dsh-bill-ilife client 适配器（六边形：port=contract，adapter=本文件）。
 *
 * 产物经 tsdown 打成 loader 工厂包（browser/CJS，见 tsdown.config.ts）。
 * 本文件传递闭包：禁 node、禁 DOM 直写（document/window/process）。
 * 注册一处：**技能设置页** → 爱生活页签槽（总管声明的 children，各技能自研自家配置页）。
 * 样式：React 内联 style + DSH 主题别名（var(--dsw-alias-*)，带回退），无外部样式表、
 * 无 <style> 注入、无类名冲突；只用 dsh-ctx 镜像内成员（slots.inject/register、
 * connection.rpc.call 经闭包现取）；取数只经 connection.rpc.call 进 host 通道；
 * 缺席/错误纯条件渲染，不返空冒充。组件 React.createElement 手写，不引入 JSX。
 *
 * #677：技能设置页从「只读设置行」换成**真配置页**——行表来自 settings.ts，
 * 取值与保存经宿主三个端点（`config.get`／`config.save`／`config.reset`），
 * 宿主再 spawn 技能 CLI 的 `bill.config.*` 三个 key。本文件仍禁 node：不读盘、不算默认值。
 * 照 CONTEXT.md，「技能设置页」只配置、不干活：本页没有查账、记一笔之类的入口。
 */
import * as React from 'react';
import { RPC_CHANNEL, RPC_ENDPOINT_CONFIG_GET, RPC_ENDPOINT_CONFIG_SAVE, RPC_ENDPOINT_CONFIG_RESET, isRpcResult } from './contract.js';
import type { ConfigSurfaceReply } from './contract.js';
import { PLUGIN, SLOT_ORDER, SLOT_TITLE } from './slot.js';
import { CONFIG_ITEMS, COMMON_ITEM_COUNT, ADVANCED_GROUP_TITLE, ADVANCED_GROUP_NOTE, readPath, writePath } from './settings.js';
import type { ConfigItem } from './settings.js';
import { REMOTE_DIRECTORY_PICKER } from './dsh-ctx.js';
import type { ClientCtx, RpcCallFace, RpcCallResult, DirectoryPickerAnswer, DirectoryPickerFace } from './dsh-ctx.js';

/** client 短名声明：只有这两个（#736 的目录选择走**可选查找**，不写进来——
 * 写进来＝硬依赖，提供方缺席时整包被停靠，设置页会跟着装不上；见 cookbook §13）。 */
export const inject: readonly string[] = ['slots', 'connection'];

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
  muted: { color: 'var(--dsw-alias-label-secondary, #9a9a9a)', fontSize: '0.92em'} as React.CSSProperties,
  error: { marginTop: 8, color: 'var(--dsw-alias-label-error, #b3261e)', fontSize: '1em', whiteSpace: 'pre-wrap' } as React.CSSProperties,
  okText: { marginTop: 8, color: 'var(--dsw-alias-state-success-primary, #12805c)', fontSize: '0.96em'} as React.CSSProperties,
  rows: { marginTop: 8, borderTop: '1px solid var(--dsw-alias-border, rgba(128,128,128,.25))', paddingTop: 8 } as React.CSSProperties,
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

/** 请求超时毫秒：与 host 侧 SPAWN_TIMEOUT_MS 同级，UI 永不无限转圈。 */
const READ_TIMEOUT_MS = 20_000 as const;

/** 有界等待：借平台 `AbortSignal.timeout` 的 abort 事件做**一次**超时拒绝。
 *
 * 为什么不自建定时器：本包的冻结边界是「无数据轮询」（`test/plugin-p10-boundaries.test.mjs`：
 * 单品 src 里出现计时器就要有清理 ＋ 次数上限 ＋ 例外依据三件套），而设置页等的是一次 RPC 回执，
 * 不是轮询；用平台自带的一次性超时既守住边界的本意，也照样把「不转圈」落到实处。
 * 同一个 signal 也交给 transport，双保险：它搭理 signal 就早收工，不理也有这一道兜底。
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const signal = AbortSignal.timeout(ms);
  const limit = new Promise<never>((_, reject) => {
    signal.addEventListener(
      'abort',
      () => {
        const e = new Error(`配置超时（${Math.round(ms / 1000)}s）：宿主未回，先查宿主日志`);
        e.name = 'TimeoutError';
        reject(e);
      },
      { once: true },
    );
  });
  return Promise.race([promise, limit]);
}

type ConfigState =
  | { readonly kind: 'loading' }
  | { readonly kind: 'ready'; readonly surface: ConfigSurfaceReply }
  | { readonly kind: 'failed'; readonly message: string };

/** 配置面报错 → 人话指引。
 *
 * 报文由技能侧给出（base-link-core 的 `ConfigError` 已带行号与文件名，技能 `cli/config.ts`
 * 原样交出，插件 bridge 原样带上），所以这里**不重写报文**，只按报错类补一句「接下来怎么办」。
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

/** 一次配置 RPC（永不抛，失败落字；UI 因此不转圈、不返空）。 */
async function configRpc(call: unknown, method: string, payload: Record<string, unknown>): Promise<ConfigOutcome> {
  if (typeof call !== 'function') return { ok: false, message: '宿主连接缺席：connection.rpc.call 不可用' };
  try {
    const raw: unknown = await withTimeout(
      (call as RpcCallFace)('/api', RPC_CHANNEL.slice(1), { method, payload }, AbortSignal.timeout(READ_TIMEOUT_MS)),
      READ_TIMEOUT_MS,
    );
    if (!isRpcResult(raw)) return { ok: false, message: '回执信封异常（非 ok 信封）' };
    const res = raw as RpcCallResult;
    if (!res.ok) return { ok: false, message: humanizeConfigFailure(res.error?.code ?? 'unknown', res.error?.message ?? '') };
    return { ok: true, surface: res.value as ConfigSurfaceReply };
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

/** 保存（回全表；技能侧做组内合并）。 */
export function saveConfigSurface(call: unknown, values: Record<string, unknown>): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_SAVE, { values });
}

/** 重置为默认（技能侧先落 .bak；写回执不是整面，由组件写完重读一份）。 */
export function resetConfigSurface(call: unknown): Promise<ConfigOutcome> {
  return configRpc(call, RPC_ENDPOINT_CONFIG_RESET, {});
}

/** 把配置取值铺成「行键 → 输入框文本」（页面表单态；值缺项即空串，不返空留白）。
 *
 * `prefill` 是**落点回执**（配置面那几格解析出来的绝对路径）：标了 `prefillFrom` 的行在取值空着时
 * 直接显示那条绝对路径——用户不必自己拼路径（#743），显示的就是技能真会用的那个目录（逐字相同）。 */
export function toDraft(
  values: Record<string, unknown>,
  prefill: { readonly dataDir?: string } = {},
): Record<string, string> {
  const draft: Record<string, string> = {};
  for (const item of CONFIG_ITEMS) {
    const v = readPath(values, item.key);
    const raw = v === undefined || v === null ? '' : String(v);
    const fallback = item.prefillFrom === undefined ? undefined : prefill[item.prefillFrom];
    draft[item.key] = raw === '' && typeof fallback === 'string' && fallback !== '' ? fallback : raw;
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

/** 平台回执 → 三种结果（**永不抛**）。回执是信封 `{ok, value|error}`（见 dsh-ctx.ts 的
 * `DirectoryPickerAnswer`）：成功回的是 `value` 不是路径本身，被拒回的是 `ok:false` 不是抛——
 * 照裸值解会把两种情况都误判成「用户取消」（#743 真机现象：点「选择文件夹」什么都没发生）。
 * 裸串照收（老形状兜底），认不出的形状当「供不了」报出来，不当取消吞掉。 */
export function readPickAnswer(raw: unknown): PickOutcome {
  if (typeof raw === 'string') return raw.trim() === '' ? { kind: 'cancelled' } : { kind: 'picked', path: raw };
  const answer = (typeof raw === 'object' && raw !== null ? raw : {}) as DirectoryPickerAnswer;
  if (answer.ok === true) {
    const value = answer.value;
    return typeof value === 'string' && value.trim() !== '' ? { kind: 'picked', path: value } : { kind: 'cancelled' };
  }
  const detail = answer.error?.message?.trim() ?? '';
  return { kind: 'unavailable', message: '打不开系统文件夹对话框' + (detail === '' ? '' : '（' + detail + '）') + '：请直接在框里填绝对路径。' };
}

/** 唤起一次系统文件夹选择器并归一结果（**永不抛**）。 */
export async function pickDirectory(picker: DirectoryPickerFace): Promise<PickOutcome> {
  try {
    return readPickAnswer(await picker.pick());
  } catch (e) {
    const reason = e instanceof Error ? e.message : String(e);
    return { kind: 'unavailable', message: '打不开系统文件夹对话框（' + reason + '）：请直接在框里填绝对路径。' };
  }
}

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
 * 或这条路已被拒）时不画按钮，文本框照旧——那是该缝自己的契约（供不了就收起入口，不是失败）。 */
export function Row(props: {
  readonly item: ConfigItem;
  readonly value: string;
  readonly disabled: boolean;
  readonly onChange: (key: string, next: string) => void;
  /** 目录行才有：唤起系统文件夹选择器。 */
  readonly onBrowse?: ((key: string) => void) | undefined;
}): React.ReactElement {
  const { item } = props;
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => props.onChange(item.key, e.target.value);
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
          onChange,
        });
  const browse =
    item.control === 'directory' && props.onBrowse !== undefined
      ? React.createElement(
          'button',
          {
            style: S.btnPick,
            type: 'button',
            disabled: props.disabled,
            // 回这枚 Promise 是有意的：React 不看 onClick 的返回值，而用例能直接 await 它，
            // 拿到「唤一次 pick → 回填这一行」的确定性读数（本地可判）。
            onClick: () => props.onBrowse?.(item.key),
          },
          '选择文件夹…',
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

/** 技能设置页：承载饼干记账自己的全部可配置项（只配置，不干活）。
 *
 * 三态：loading（一次 RPC 内）／ready（真表单）／failed（人话报错 ＋ 指引，不返空、不转圈）。 */
function BillConfig(props: { getCall: GetCall; getPicker: () => DirectoryPickerFace | null }): React.ReactElement {
  const [state, setState] = React.useState<ConfigState>({ kind: 'loading' });
  const [pickerGone, setPickerGone] = React.useState(false);
  const [picking, setPicking] = React.useState(false);
  const [draft, setDraft] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState(false);
  const [notice, setNotice] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const apply = React.useCallback((surface: ConfigSurfaceReply) => {
    setState({ kind: 'ready', surface });
    setDraft(toDraft(surface.values, surface));
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

  /** 目录选择：拿不到命名空间就没有入口；被拒一次即收起入口（不留死按钮）。 */
  const picker = pickerGone ? null : props.getPicker();
  const onBrowse = React.useMemo(() => {
    if (picker === null) return undefined;
    const browse = createBrowseHandler({
      picker,
      onChange,
      onUnavailable: (message: string) => {
        setError(message);
        setPickerGone(true);
      },
    });
    // 系统对话框是模态的：等它回来的这段时间给一行字，免得看着像「点了没反应」（#743）。
    return (key: string) => {
      setPicking(true);
      setError(null);
      void browse(key).finally(() => setPicking(false));
    };
  }, [picker, onChange]);

  const surface = state.kind === 'ready' ? state.surface : null;
  const dirty = surface !== null && CONFIG_ITEMS.some((i) => (draft[i.key] ?? '') !== (toDraft(surface.values, surface)[i.key] ?? ''));

  /** 写完（保存／重置）之后重新读一份整面：写回执是 `{path, values}`、重置回执是 `{path, backupPath}`，
   *  都不是整面——拿写回执当整面用，页头那行「数据目录」会显示成 undefined（#743 实测）。 */
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
    if (r.ok) {
      apply(r.surface);
      setNotice('已保存，立即生效（不用重启宿主）');
    } else setError(r.message);
  }, [apply, draft, props.getCall]);

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
          surface.created ? React.createElement('div', { style: S.muted }, '（配置文件刚按默认值生成）') : null,
        )
      : null,
  );

  if (state.kind === 'loading') {
    return React.createElement('div', { style: S.card }, head, React.createElement('div', { style: S.muted }, '配置读取中…'));
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
    );
  }

  const common = CONFIG_ITEMS.slice(0, COMMON_ITEM_COUNT);
  const advanced = CONFIG_ITEMS.slice(COMMON_ITEM_COUNT);
  const renderRow = (item: ConfigItem) =>
    React.createElement(Row, { key: item.key, item, value: draft[item.key] ?? '', disabled: busy, onChange, onBrowse });

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
    picking ? React.createElement('div', { style: S.muted }, '已唤起系统文件夹对话框：选中后自动填上，取消则不动。') : null,
    notice !== null ? React.createElement('div', { style: S.okText }, notice) : null,
    error !== null ? React.createElement('div', { style: S.error }, error) : null,
  );
}

export function apply(ctx: ClientCtx): void {
  // 调用口取用器透传给组件（每次取数现取；非函数由组件判缺席）。
  const getCall: GetCall = () => ctx.connection?.rpc?.call ?? null;
  // #736 目录选择：**软依赖**，每次渲染现取（提供方后到／中途卸载都不留痕）；
  // 拿不到就只是没有入口，设置页照常（不声明、不停靠，见 cookbook §13）。
  const getPicker = (): DirectoryPickerFace | null =>
    typeof ctx.get === 'function' ? resolveDirectoryPicker((name: string) => ctx.get?.(name)) : null;

  // 技能设置页 → 爱生活页签槽（总管声明；总管缺席时 inject 等待，不断链）。
  ctx.slots.inject('ilife.config-tab', () =>
    ctx.slots.register(
      {
        name: 'ilife.config-tab',
        id: PLUGIN,
        order: SLOT_ORDER,
        label: () => SLOT_TITLE,
        // #706：本包自己那条 RPC 通道交给总管（各家都写这一格），总管据此调配置体检——
        // 它因此不必在源码里写死任何一家的通道名（零单品依赖照旧成立）。
        channel: RPC_CHANNEL,
      },
      () => React.createElement(BillConfig, { getCall, getPicker }),
    ),
  );
}
