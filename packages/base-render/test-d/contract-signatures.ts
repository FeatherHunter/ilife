/** #92 契约签名 · 编译期断言（只在类型层运行，无运行时输出）。
 *
 * 作用：任何签名漂移（参数名／类型／可选性／只读性／联合成员）都会让 `pnpm build` 失败。
 * 接法：root `tsconfig.json` 的 `include` 收本目录 → `tsc -b` 随 `pnpm build` 一起编译。
 *
 * 两类断言：
 * 1. **既有面**：现有 18 个运行时出口 + 12 个类型出口逐条锁形（D4 只追加、不改既有）。
 * 2. **冻结面**：`SPEC_FROZEN_SURFACE` 的每条签名与类型层逐字一致；
 *    `pending` 条目断言「尚未导出」，执行票实现后本文件编译失败 → 强制翻转清单。
 */

import type { Envelope, EnvelopeShape } from 'base-link-core';
import type {
  ActionBarInput,
  BuildDataText,
  BuildLogText,
  BuildStyleSheet,
  ChartItem,
  ChartOutput,
  ChartsApi,
  ClipboardChannel,
  ControlAvailability,
  ControlName,
  CopyButtonInput,
  CopyChannel,
  CopyFormat,
  CopyLogFields,
  CopyPorts,
  CopyRuntime,
  CopyText,
  CopyTextOptions,
  CopyTextOutcome,
  CopyToastText,
  CssVarName,
  DataTextInput,
  EmptyStateInput,
  ErrorReceiptInput,
  EscapeHtml,
  FillTemplate,
  FillTemplateInput,
  FillTemplateOutput,
  FillTemplateReport,
  FrozenSurfaceEntry,
  HelpShellInput,
  LogTextInput,
  MarkerReport,
  MarkerRuleSpec,
  MountHandle,
  MountOptions,
  PageDescriptor,
  PageRegistry,
  ProgressChartInput,
  RenderActionBar,
  RenderEmptyState,
  RenderErrorReceipt,
  RenderHelpShell,
  RenderOutput,
  RenderStatusBadge,
  RenderToast,
  Scene,
  SceneData,
  SceneTypeBadge,
  SerializableEnvelope,
  SerializableShape,
  SlotsPort,
  StatusBadgeInput,
  StatusKind,
  StyleSheetInput,
  StyleSheetOutput,
  StyleTokenName,
  TemplateAssets,
  TemplateErrorCode,
  TemplateErrorShape,
  TemplateMarkerKey,
  ToastAction,
  ToastBadge,
  ToastController,
  ToastHostPort,
  ToastIcon,
  ToastInput,
} from '../src/index.js';

type Mod = typeof import('../src/index.js');

/** 严格类型相等（含只读／可选修饰）。 */
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;
/** 值出口存在性（类型名不算值出口）。 */
type Present<K extends string> = K extends keyof Mod ? true : false;
type Absent<K extends string> = K extends keyof Mod ? false : true;

/* ── 1. 既有面：D4「只追加」的编译期锁 ───────────────────── */

type _B01 = Expect<Equal<Mod['escapeHtml'], (s: string) => string>>;
type _B02 = Expect<Equal<Mod['cx'], (...names: Array<string | false | null | undefined>) => string>>;
type _B03 = Expect<Equal<Mod['token'], (name: StyleTokenName) => string>>;
type _B04 = Expect<Equal<Mod['STYLE_PREFIX'], 'ilife-'>>;
type _B05 = Expect<Equal<keyof Mod['STYLE_TOKENS'], 'radius' | 'gap' | 'fontSize' | 'fg' | 'muted' | 'accent' | 'danger' | 'border' | 'bg'>>;
type _B06 = Expect<Equal<Mod['createPageRegistry'], () => PageRegistry>>;
type _B07 = Expect<Equal<Mod['recoDescriptor'], (skill: string, slotId: string, order: number, title: string) => PageDescriptor>>;
type _B08 = Expect<Equal<Mod['pageOrReco'], (reg: PageRegistry, reco: PageDescriptor) => PageDescriptor>>;
type _B09 = Expect<Equal<Mod['renderPage'], (page: PageDescriptor, env: Envelope) => RenderOutput>>;
type _B10 = Expect<Equal<Mod['renderReco'], (page: PageDescriptor) => RenderOutput>>;
type _B11 = Expect<Equal<Mod['mountInjector'], (port: SlotsPort, pages: readonly PageDescriptor[], opts?: MountOptions) => MountHandle>>;
type _B12 = Expect<Equal<Mod['openPage'], (port: SlotsPort, page: PageDescriptor, sessionId?: string) => void>>;
type _B13 = Expect<Equal<Mod['INJECTOR_DEFAULT_MAX_RETRIES'], 10>>;
type _B14 = Expect<Equal<Mod['INJECTOR_DEFAULT_RETRY_MS'], 1000>>;
type _B15 = Expect<Equal<Mod['RENDER_CONTRACT_VERSION'], '0.1.0'>>;
type _B16 = Expect<Equal<Mod['RENDER_ENVELOPE_VERSION'], '0.1.0'>>;
type _B17 = Expect<Equal<Mod['STYLE_VERSION'], '0.1.0'>>;
type _B18 = Expect<Equal<Mod['RenderError'] extends new (code: 'missing-data' | 'bad-envelope' | 'reco-only', message: string) => Error ? true : false, true>>;
type _B19 = Expect<Equal<Present<'RenderError'>, true>>;
type _B20 = Expect<Equal<Present<'renderPage'>, true>>;

/* ── 2. 冻结面 · §3.1 占位符与填充器（#74） ─────────────── */

type _T01 = Expect<Equal<keyof Mod['TEMPLATE_MARKERS'], 'injectData' | 'sharedHelpers' | 'sharedCss' | 'chartsHelpers' | 'noShared'>>;
type _T02 = Expect<Equal<Mod['TEMPLATE_MARKERS'][TemplateMarkerKey], '<!--INJECT-DATA-->' | '<!--SHARED-HELPERS-->' | '<!--SHARED-CSS-->' | '<!--CHARTS-HELPERS-->' | '<!--NO-SHARED-->'>>;
type _T03 = Expect<Equal<keyof Mod['MARKER_RULES'], TemplateMarkerKey>>;
type _T03b = Expect<Equal<Mod['MARKER_RULES'][TemplateMarkerKey]['rule'], MarkerRuleSpec['rule']>>;
type _T03c = Expect<Equal<Mod['MARKER_RULES'][TemplateMarkerKey]['literal'], '<!--INJECT-DATA-->' | '<!--SHARED-HELPERS-->' | '<!--SHARED-CSS-->' | '<!--CHARTS-HELPERS-->' | '<!--NO-SHARED-->'>>;
type _T04 = Expect<Equal<Mod['INJECTION_ORDER'][number], 'sharedHelpers' | 'sharedCss' | 'chartsHelpers' | 'injectData'>>;
type _T05 = Expect<Equal<Mod['STRICT_ENVELOPE_SHAPES'][number], EnvelopeShape>>;
type _T06 = Expect<Equal<Mod['DEFAULT_DATA_SCRIPT_ID'], 'payload'>>;
type _T07 = Expect<Equal<Mod['DATA_SCRIPT_TYPE'], 'application/json'>>;
type _T08 = Expect<Equal<Mod['TEMPLATE_ERROR_CODES'][number], 'marker-missing' | 'marker-duplicate' | 'marker-conflict' | 'data-missing' | 'asset-missing' | 'strict-invalid'>>;
type _T09 = Expect<Equal<TemplateAssets, { readonly sharedHelpersJs: string; readonly sharedCssText: string; readonly chartsHelpersJs?: string }>>;
type _T10 = Expect<Equal<FillTemplateInput, { readonly template: string; readonly assets: TemplateAssets; readonly data: unknown; readonly strict?: boolean; readonly dataScriptId?: string }>>;
type _T11 = Expect<Equal<FillTemplateReport, { readonly markers: readonly MarkerReport[]; readonly strict: boolean; readonly exempt: boolean; readonly bytes: number }>>;
type _T12 = Expect<Equal<FillTemplateOutput, { readonly html: string; readonly report: FillTemplateReport }>>;
type _T13 = Expect<Equal<FillTemplate, (input: FillTemplateInput) => FillTemplateOutput>>;
type _T14 = Expect<Equal<TemplateErrorShape, { readonly name: 'TemplateError'; readonly code: TemplateErrorCode; readonly marker?: TemplateMarkerKey; readonly message: string }>>;
type _T15 = Expect<Equal<Absent<'fillTemplate'>, true>>;
type _T16 = Expect<Equal<Absent<'FillTemplateInput'>, true>>;

/* ── 3. 冻结面 · §3.2 样式资产（#75） ──────────────────── */

type _S01 = Expect<Equal<keyof Mod['CSS_VAR_TOKENS'], '--fg' | '--fg2' | '--fg3' | '--bg' | '--card' | '--line' | '--blue' | '--blue2' | '--soft' | '--ok' | '--shadow'>>;
type _S02 = Expect<Equal<CssVarName, keyof Mod['CSS_VAR_TOKENS']>>;
type _S03 = Expect<Equal<Mod['CSS_VAR_TOKENS']['--blue'], '#007aff'>>;
type _S04 = Expect<Equal<Mod['CONTROL_STYLE_SECTIONS'][number], 'toast' | 'actionBar' | 'copyButton' | 'statusBadge' | 'emptyState' | 'errorReceipt' | 'charts' | 'helpShell'>>;
type _S05 = Expect<Equal<Mod['STYLE_FORBIDDEN_TOKENS'][number], '--r-xl' | '--pink'>>;
type _S06 = Expect<Equal<StyleSheetInput, { readonly prefix?: string; readonly extraCss?: string }>>;
type _S07 = Expect<Equal<StyleSheetOutput, { readonly css: string; readonly tokens: readonly CssVarName[]; readonly prefix: string; readonly version: string }>>;
type _S08 = Expect<Equal<BuildStyleSheet, (input?: StyleSheetInput) => StyleSheetOutput>>;
type _S09 = Expect<Equal<Absent<'buildStyleSheet'>, true>>;

/* ── 4. 冻结面 · §3.3 控件层（#76） ───────────────────── */

type _C01 = Expect<Equal<Mod['ESCAPE_HTML_CHARS'][number], '&' | '<' | '>' | '"' | "'">>;
type _C02 = Expect<Equal<Mod['ESCAPE_HTML_ENTITIES'], { readonly '&': '&amp;'; readonly '<': '&lt;'; readonly '>': '&gt;'; readonly '"': '&quot;'; readonly "'": '&#39;' }>>;
type _C03 = Expect<Equal<EscapeHtml, (s: string) => string>>;
type _C04 = Expect<Equal<Mod['COPY_CHANNELS'][number], CopyChannel>>;
type _C05 = Expect<Equal<CopyPorts, { readonly clipboard: ClipboardChannel | null; readonly fallback: (text: string) => boolean }>>;
type _C06 = Expect<Equal<CopyTextOptions, { readonly silent?: boolean; readonly toast?: { readonly ok?: CopyToastText; readonly fail?: CopyToastText }; readonly onOk?: (channel: CopyChannel) => void; readonly onFail?: (reason: string) => void }>>;
type _C07 = Expect<Equal<CopyTextOutcome, { readonly ok: boolean; readonly channel: CopyChannel | null; readonly reason?: string }>>;
type _C08 = Expect<Equal<CopyText, (text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>>>;
type _C09 = Expect<Equal<CopyRuntime, { copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>; dispose(): void }>>;
type _C10 = Expect<Equal<ToastInput, { readonly msg: string; readonly detail?: string; readonly icon?: ToastIcon; readonly badge?: ToastBadge; readonly actions?: readonly ToastAction[]; readonly count?: string; readonly lines?: readonly string[]; readonly code?: string; readonly timeoutMs?: number; readonly maxStack?: number }>>;
type _C11 = Expect<Equal<ToastHostPort, { mount(html: string): { remove(): void } }>>;
type _C12 = Expect<Equal<ToastController, { show(input: ToastInput): void; flush(): void; dispose(): void }>>;
type _C13 = Expect<Equal<RenderToast, (input: ToastInput) => string>>;
type _C14 = Expect<Equal<ActionBarInput, { readonly buttons?: readonly import('../src/index.js').ActionBarButton[]; readonly copyData?: CopyButtonInput; readonly copyLog?: CopyButtonInput }>>;
type _C15 = Expect<Equal<RenderActionBar, (input: ActionBarInput) => string>>;
type _C16 = Expect<Equal<StatusBadgeInput, { readonly status: StatusKind; readonly text?: string }>>;
type _C17 = Expect<Equal<RenderStatusBadge, (input: StatusBadgeInput) => string>>;
type _C18 = Expect<Equal<EmptyStateInput, { readonly icon?: string; readonly text: string; readonly hint?: string; readonly actionHtml?: string }>>;
type _C19 = Expect<Equal<RenderEmptyState, (input: EmptyStateInput) => string>>;
type _C20 = Expect<Equal<ErrorReceiptInput, { readonly message: string; readonly retryPrompt?: string; readonly dataText?: string; readonly logText?: string }>>;
type _C21 = Expect<Equal<RenderErrorReceipt, (input: ErrorReceiptInput) => string>>;
type _C22 = Expect<Equal<Mod['STATUS_KINDS'][number], StatusKind>>;
type _C23 = Expect<Equal<Mod['CONTROL_NAMES'][number], ControlName>>;
type _C24 = Expect<Equal<keyof Mod['CONTROL_AVAILABILITY'], ControlName>>;
type _C24b = Expect<Equal<Mod['CONTROL_AVAILABILITY'][ControlName]['runtimePort'], ControlAvailability['runtimePort']>>;
type _C24c = Expect<Equal<Mod['CONTROL_AVAILABILITY'][ControlName]['needsRuntime'], boolean>>;
type _C25 = Expect<Equal<Mod['CONTROLS_HOST_REQUIREMENT'], 'none'>>;
type _C26 = Expect<Equal<Absent<'copyText'>, true>>;
type _C27 = Expect<Equal<Absent<'renderToast'>, true>>;
type _C28 = Expect<Equal<Absent<'createToastController'>, true>>;
type _C29 = Expect<Equal<Absent<'createCopyRuntime'>, true>>;
type _C30 = Expect<Equal<Absent<'renderActionBar'>, true>>;
type _C31 = Expect<Equal<Absent<'renderStatusBadge'>, true>>;
type _C32 = Expect<Equal<Absent<'renderEmptyState'>, true>>;
type _C33 = Expect<Equal<Absent<'renderErrorReceipt'>, true>>;

/* ── 5. 冻结面 · §3.4 复制序列化（#77） ────────────────── */

type _X01 = Expect<Equal<Mod['COPY_FORMATS'][number], CopyFormat>>;
type _X02 = Expect<Equal<Mod['SERIALIZABLE_SHAPES'][number], SerializableShape>>;
type _X03 = Expect<Equal<SerializableEnvelope, Envelope<SerializableShape>>>;
type _X04 = Expect<Equal<Mod['LOG_SECTIONS'][number], 'scene' | 'thinking' | 'dataStructure' | 'callChain' | 'timestampVersion' | 'exception'>>;
type _X05 = Expect<Equal<DataTextInput, { readonly envelope: SerializableEnvelope; readonly format?: CopyFormat; readonly title?: string; readonly occurredAt?: string }>>;
type _X06 = Expect<Equal<LogTextInput, { readonly envelope: SerializableEnvelope; readonly format?: CopyFormat; readonly copyLog?: CopyLogFields }>>;
type _X07 = Expect<Equal<CopyLogFields, { readonly thinking?: string; readonly dataStructure?: string; readonly callChain?: string; readonly timestamp?: string; readonly exception?: string }>>;
type _X08 = Expect<Equal<BuildDataText, (input: DataTextInput) => string>>;
type _X09 = Expect<Equal<BuildLogText, (input: LogTextInput) => string>>;
type _X10 = Expect<Equal<Absent<'buildDataText'>, true>>;
type _X11 = Expect<Equal<Absent<'buildLogText'>, true>>;

/* ── 6. 冻结面 · §3.5 图表与 HELP 壳（#78） ────────────── */

type _H01 = Expect<Equal<Mod['CHART_KINDS'][number], 'bar' | 'line' | 'donut' | 'progress' | 'combo' | 'sparkline' | 'gauge' | 'scatter'>>;
type _H02 = Expect<Equal<keyof ChartsApi, 'bar' | 'line' | 'donut' | 'progress' | 'combo' | 'sparkline' | 'gauge' | 'scatter'>>;
type _H03 = Expect<Equal<ChartItem, { readonly label: string; readonly value: number | null; readonly color?: string; readonly values?: readonly number[]; readonly anomaly?: boolean }>>;
type _H04 = Expect<Equal<ChartOutput, { readonly kind: import('../src/index.js').ChartKind; readonly html: string; readonly empty: boolean; readonly points: number }>>;
type _H05 = Expect<Equal<ChartsApi['progress'], (input: ProgressChartInput) => ChartOutput>>;
type _H06 = Expect<Equal<Mod['SCENE_STATUS'][number], '' | '【待开发】'>>;
type _H07 = Expect<Equal<Mod['SCENE_TYPE_FIELD'], 'types'>>;
type _H08 = Expect<Equal<Scene['types'], readonly (string | SceneTypeBadge)[] | undefined>>;
type _H09 = Expect<Equal<'type' extends keyof Scene ? true : false, false>>;
type _H10 = Expect<Equal<keyof SceneData, 'skill_name' | 'title' | 'subtitle' | 'meta_blocks' | 'groups' | 'init_banner' | 'contact' | 'version' | 'recommendations'>>;
type _H11 = Expect<Equal<HelpShellInput, { readonly sceneData: SceneData; readonly assets: TemplateAssets; readonly strict?: boolean; readonly template?: string }>>;
type _H12 = Expect<Equal<RenderHelpShell, (input: HelpShellInput) => FillTemplateOutput>>;
type _H13 = Expect<Equal<Absent<'charts'>, true>>;
type _H14 = Expect<Equal<Absent<'renderHelpShell'>, true>>;
type _H15 = Expect<Equal<Mod['SCENE_DATA_SCHEMA']['$schema'], 'http://json-schema.org/draft-07/schema#'>>;
type _H16 = Expect<Equal<Mod['HELP_COPY_TARGETS'][number], 'prompt' | 'wakeWord' | 'params'>>;

/* ── 7. 清单与版本 ─────────────────────────────────────── */

type _M01 = Expect<Equal<Mod['SPEC_FROZEN_SURFACE'][number], FrozenSurfaceEntry>>;
type _M02 = Expect<Equal<FrozenSurfaceEntry['kind'], 'runtime' | 'type'>>;
type _M03 = Expect<Equal<FrozenSurfaceEntry['status'], 'implemented' | 'pending'>>;
type _M04 = Expect<Equal<Mod['BASE_PAINT_CONTRACT_VERSION'], '0.1.0'>>;

export {};
