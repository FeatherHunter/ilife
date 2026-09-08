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
  BindCopyAction,
  BuildDataText,
  BuildLogText,
  BuildSharedHelpersJs,
  BuildStyleSheet,
  ChartItem,
  ChartOutput,
  ChartsApi,
  ChartsHelpersInput,
  ClipboardChannel,
  ControlAvailability,
  ControlName,
  CopyActionHostPort,
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
  CreateCopyRuntime,
  CreateToastController,
  CssVarName,
  DataProjectionSpec,
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
  SharedHelpersInput,
  SlotsPort,
  StatusBadgeInput,
  StatusKind,
  StyleSheetInput,
  StyleSheetOutput,
  StyleTokenName,
  TemplateAssets,
  TemplateErrorCode,
  TemplateErrorShape,
  TemplateKind,
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

type _T01 = Expect<Equal<keyof Mod['TEMPLATE_MARKERS'], 'injectData' | 'content' | 'sharedHelpers' | 'sharedCss' | 'chartsHelpers' | 'noShared'>>;
type _T02 = Expect<Equal<Mod['TEMPLATE_MARKERS'][TemplateMarkerKey], '<!--INJECT-DATA-->' | '<!--CONTENT-->' | '<!--SHARED-HELPERS-->' | '<!--SHARED-CSS-->' | '<!--CHARTS-HELPERS-->' | '<!--NO-SHARED-->'>>;
type _T03 = Expect<Equal<keyof Mod['MARKER_RULES'], TemplateMarkerKey>>;
type _T03b = Expect<Equal<Mod['MARKER_RULES'][TemplateMarkerKey]['rule'], MarkerRuleSpec['rule']>>;
type _T03c = Expect<Equal<Mod['MARKER_RULES'][TemplateMarkerKey]['literal'], '<!--INJECT-DATA-->' | '<!--CONTENT-->' | '<!--SHARED-HELPERS-->' | '<!--SHARED-CSS-->' | '<!--CHARTS-HELPERS-->' | '<!--NO-SHARED-->'>>;
type _T04 = Expect<Equal<Mod['INJECTION_ORDER'][number], 'sharedHelpers' | 'sharedCss' | 'chartsHelpers' | 'injectData'>>;
type _T05 = Expect<Equal<Mod['STRICT_ENVELOPE_SHAPES'][number], EnvelopeShape>>;
type _T06 = Expect<Equal<Mod['DEFAULT_DATA_SCRIPT_ID'], 'payload'>>;
type _T07 = Expect<Equal<Mod['DATA_SCRIPT_TYPE'], 'application/json'>>;
type _T08 = Expect<Equal<Mod['TEMPLATE_ERROR_CODES'][number], 'marker-missing' | 'marker-duplicate' | 'marker-conflict' | 'data-missing' | 'container-missing' | 'asset-missing' | 'strict-invalid' | 'content-missing'>>;
type _T09 = Expect<Equal<TemplateAssets, { readonly sharedHelpersJs: string; readonly sharedCssText: string; readonly chartsHelpersJs?: string }>>;
type _T10 = Expect<Equal<FillTemplateInput, { readonly template: string; readonly assets: TemplateAssets; readonly data?: unknown; readonly strict?: boolean; readonly dataScriptId?: string; readonly content?: string }>>;
type _T11 = Expect<Equal<FillTemplateReport, { readonly markers: readonly MarkerReport[]; readonly strict: boolean; readonly exempt: boolean; readonly bytes: number }>>;
type _T12 = Expect<Equal<FillTemplateOutput, { readonly html: string; readonly report: FillTemplateReport }>>;
type _T13 = Expect<Equal<FillTemplate, (input: FillTemplateInput) => FillTemplateOutput>>;
type _T14 = Expect<Equal<TemplateErrorShape, { readonly name: 'TemplateError'; readonly code: TemplateErrorCode; readonly marker?: TemplateMarkerKey; readonly message: string }>>;
type _T15 = Expect<Equal<Present<'fillTemplate'>, true>>;
type _T16 = Expect<Equal<Absent<'FillTemplateInput'>, true>>;

/* ── 2b. #118 契约补遗：CONTENT 槽位／载荷槽规则／包裹约定／模板分型（A1–A6） ── */

type _T17 = Expect<Equal<Mod['MARKER_RULES']['injectData'], {
  readonly literal: '<!--INJECT-DATA-->'; readonly rule: 'zero-or-one'; readonly required: false; readonly exemptable: false;
}>>;
type _T18 = Expect<Equal<Mod['MARKER_RULES']['content'], {
  readonly literal: '<!--CONTENT-->'; readonly rule: 'zero-or-one'; readonly required: false; readonly exemptable: false;
}>>;
type _T19 = Expect<Equal<Mod['PAYLOAD_SLOT_RULE'], {
  readonly members: readonly ['injectData', 'content'];
  readonly rule: 'exactly-one';
  readonly conflictCode: 'marker-conflict';
  readonly missingCode: 'marker-missing';
}>>;
type _T20 = Expect<Equal<Mod['PAYLOAD_SLOT_RULE']['members'][number], 'injectData' | 'content'>>;
type _T21 = Expect<Equal<Mod['TEMPLATE_KINDS'], readonly ['data-page', 'content-page', 'legacy']>>;
type _T22 = Expect<Equal<TemplateKind, 'data-page' | 'content-page' | 'legacy'>>;
type _T23 = Expect<Equal<Mod['TEMPLATE_KIND_RULE'], {
  readonly 'data-page': { readonly required: readonly ['injectData']; readonly forbidden: readonly ['content']; readonly noKindCode: 'marker-conflict' };
  readonly 'content-page': { readonly required: readonly ['content']; readonly forbidden: readonly ['injectData']; readonly noKindCode: 'marker-conflict' };
  readonly legacy: { readonly required: readonly []; readonly forbidden: readonly ['injectData', 'content']; readonly noKindCode: 'marker-conflict' };
}>>;
type _T24 = Expect<Equal<keyof Mod['TEMPLATE_KIND_RULE'], TemplateKind>>;
type _T25 = Expect<Equal<Mod['ASSET_WRAP_RULE'], {
  readonly assetsBare: true; readonly fillerWraps: true; readonly forbidPreWrappedMarker: true;
  readonly assetWrappedCode: 'asset-missing'; readonly markerPreWrappedCode: 'marker-conflict';
}>>;
type _T26 = Expect<Equal<Mod['ASSET_WRAPPERS'], {
  readonly sharedCssText: { readonly openTag: '<style>'; readonly closeTag: '</style>' };
  readonly sharedHelpersJs: { readonly openTag: '<script>'; readonly closeTag: '</script>' };
  readonly chartsHelpersJs: { readonly openTag: '<script>'; readonly closeTag: '</script>' };
}>>;
type _T27 = Expect<Equal<keyof Mod['ASSET_WRAPPERS'], keyof TemplateAssets>>;
type _T28 = Expect<Equal<Mod['ASSET_MARKER_KEYS'], {
  readonly sharedCssText: 'sharedCss';
  readonly sharedHelpersJs: 'sharedHelpers';
  readonly chartsHelpersJs: 'chartsHelpers';
}>>;
type _T29 = Expect<Equal<Mod['WRAP_PREDICATES'], {
  readonly assetsBare: {
    readonly scope: readonly ['sharedCssText', 'sharedHelpersJs', 'chartsHelpersJs'];
    readonly method: 'trim-prefix-or-suffix';
    readonly code: 'asset-missing';
  };
  readonly forbidPreWrappedMarker: {
    readonly scope: readonly ['sharedCss', 'sharedHelpers', 'chartsHelpers'];
    readonly excludes: readonly ['injectData'];
    readonly method: 'enclosing-open-tag';
    readonly code: 'marker-conflict';
  };
}>>;
type _T30 = Expect<Equal<Mod['CONTAINER_CHECK_RULE'], {
  readonly appliesWhenMarker: 'injectData';
  readonly openTag: '<script>';
  readonly closeTag: '</script>';
  readonly id: 'payload';
  readonly type: 'application/json';
  readonly code: 'container-missing';
}>>;
type _T31 = Expect<Equal<Mod['TEMPLATE_CHECK_ORDER'], readonly [
  'marker-duplicate', 'marker-missing', 'marker-conflict', 'container-missing',
  'asset-missing', 'data-missing', 'content-missing', 'strict-invalid',
]>>;

/* ── 3. 冻结面 · §3.2 样式资产（#75） ──────────────────── */

type _S01 = Expect<Equal<keyof Mod['CSS_VAR_TOKENS'], '--fg' | '--fg2' | '--fg3' | '--bg' | '--card' | '--line' | '--blue' | '--blue2' | '--soft' | '--ok' | '--shadow'>>;
type _S02 = Expect<Equal<CssVarName, keyof Mod['CSS_VAR_TOKENS']>>;
type _S03 = Expect<Equal<Mod['CSS_VAR_TOKENS']['--blue'], '#007aff'>>;
type _S04 = Expect<Equal<Mod['CONTROL_STYLE_SECTIONS'][number], 'toast' | 'actionBar' | 'copyButton' | 'statusBadge' | 'emptyState' | 'errorReceipt' | 'charts' | 'helpShell'>>;
type _S05 = Expect<Equal<Mod['STYLE_FORBIDDEN_TOKENS'][number], '--r-xl' | '--pink'>>;
type _S06 = Expect<Equal<StyleSheetInput, { readonly prefix?: string; readonly extraCss?: string }>>;
type _S07 = Expect<Equal<StyleSheetOutput, { readonly css: string; readonly tokens: readonly CssVarName[]; readonly prefix: string; readonly version: string }>>;
type _S08 = Expect<Equal<BuildStyleSheet, (input?: StyleSheetInput) => StyleSheetOutput>>;
/* #75 落地（契约 §3.2 施工面 2 条 pending）：运行时出口**必须存在**（原 `Absent<>` 按契约
 * 「实现后必须翻转清单」翻转为 `Present<>`），且出口类型与冻结签名逐字相等（签名值零改动）。 */
type _S09 = Expect<Equal<Present<'buildStyleSheet'>, true>>;
type _S09b = Expect<Equal<Mod['buildStyleSheet'], (input?: StyleSheetInput) => StyleSheetOutput>>;

/* ── 4. 冻结面 · §3.3 控件层（#76） ───────────────────── */

type _C01 = Expect<Equal<Mod['ESCAPE_HTML_CHARS'][number], '&' | '<' | '>' | '"' | "'">>;
type _C02 = Expect<Equal<Mod['ESCAPE_HTML_ENTITIES'], { readonly '&': '&amp;'; readonly '<': '&lt;'; readonly '>': '&gt;'; readonly '"': '&quot;'; readonly "'": '&#39;' }>>;
type _C03 = Expect<Equal<EscapeHtml, (s: string) => string>>;
type _C04 = Expect<Equal<Mod['COPY_CHANNELS'][number], CopyChannel>>;
type _C05 = Expect<Equal<CopyPorts, { readonly clipboard: ClipboardChannel | null; readonly fallback: (text: string) => boolean; readonly toast?: ToastHostPort }>>;
type _C06 = Expect<Equal<CopyTextOptions, { readonly silent?: boolean; readonly toast?: { readonly ok?: CopyToastText; readonly fail?: CopyToastText }; readonly onOk?: (channel: CopyChannel) => void; readonly onFail?: (reason: string) => void }>>;
type _C07 = Expect<Equal<CopyTextOutcome, { readonly ok: boolean; readonly channel: CopyChannel | null; readonly reason?: string }>>;
type _C08 = Expect<Equal<CopyText, (text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>>>;
type _C09 = Expect<Equal<CopyRuntime, { copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>; dispose(): void }>>;
type _C10 = Expect<Equal<ToastInput, { readonly msg: string; readonly detail?: string; readonly icon?: ToastIcon; readonly badge?: ToastBadge; readonly actions?: readonly ToastAction[]; readonly count?: string; readonly lines?: readonly string[]; readonly code?: string; readonly timeoutMs?: number; readonly maxStack?: number }>>;
type _C11 = Expect<Equal<ToastHostPort, { mount(html: string): { remove(): void } }>>;
type _C12 = Expect<Equal<ToastController, { show(input: ToastInput): void; flush(): void; dispose(): void }>>;
type _C13 = Expect<Equal<RenderToast, (input: ToastInput) => string>>;
type _C14 = Expect<Equal<ActionBarInput, { readonly buttons?: readonly import('../src/index.js').ActionBarButton[]; readonly copyData?: CopyButtonInput; readonly copyLog?: CopyButtonInput }>>;
type _C14b = Expect<Equal<CopyButtonInput, { readonly actionId: string; readonly label?: string; readonly text?: string; readonly format?: CopyFormat }>>;
type _C14c = Expect<Equal<Required<CopyButtonInput>['actionId'], string>>;
type _C15 = Expect<Equal<RenderActionBar, (input: ActionBarInput) => string>>;
type _C16 = Expect<Equal<StatusBadgeInput, { readonly status: StatusKind; readonly text?: string }>>;
type _C17 = Expect<Equal<RenderStatusBadge, (input: StatusBadgeInput) => string>>;
type _C18 = Expect<Equal<EmptyStateInput, { readonly icon?: string; readonly text: string; readonly hint?: string; readonly actionHtml?: string }>>;
type _C19 = Expect<Equal<RenderEmptyState, (input: EmptyStateInput) => string>>;
type _C20 = Expect<Equal<ErrorReceiptInput, { readonly message: string; readonly retryPrompt?: string; readonly dataText?: string; readonly logText?: string; readonly dataActionId?: string; readonly logActionId?: string }>>;
type _C21 = Expect<Equal<RenderErrorReceipt, (input: ErrorReceiptInput) => string>>;
type _C22 = Expect<Equal<Mod['STATUS_KINDS'][number], StatusKind>>;
type _C23 = Expect<Equal<Mod['CONTROL_NAMES'][number], ControlName>>;
type _C24 = Expect<Equal<keyof Mod['CONTROL_AVAILABILITY'], ControlName>>;
type _C24b = Expect<Equal<Mod['CONTROL_AVAILABILITY'][ControlName]['runtimePort'], ControlAvailability['runtimePort']>>;
type _C24c = Expect<Equal<Mod['CONTROL_AVAILABILITY'][ControlName]['needsRuntime'], boolean>>;
type _C25 = Expect<Equal<Mod['CONTROLS_HOST_REQUIREMENT'], 'none'>>;
/* #76 落地（契约 §3.3 施工面 13 条 pending）：运行时出口**必须存在**（原 `Absent<>` 按契约
 * 「实现后必须翻转清单」翻转为 `Present<>`），且出口类型与冻结签名逐字相等（签名值零改动）。 */
type _C26 = Expect<Equal<Present<'copyText'>, true>>;
type _C27 = Expect<Equal<Present<'renderToast'>, true>>;
type _C28 = Expect<Equal<Present<'createToastController'>, true>>;
type _C29 = Expect<Equal<Present<'createCopyRuntime'>, true>>;
type _C30 = Expect<Equal<Present<'renderActionBar'>, true>>;
type _C31 = Expect<Equal<Present<'renderStatusBadge'>, true>>;
type _C32 = Expect<Equal<Present<'renderEmptyState'>, true>>;
type _C33 = Expect<Equal<Present<'renderErrorReceipt'>, true>>;
type _C26b = Expect<Equal<Mod['copyText'], CopyText>>;
type _C27b = Expect<Equal<Mod['renderToast'], RenderToast>>;
type _C28b = Expect<Equal<Mod['createToastController'], CreateToastController>>;
type _C29b = Expect<Equal<Mod['createCopyRuntime'], CreateCopyRuntime>>;
type _C30b = Expect<Equal<Mod['renderActionBar'], RenderActionBar>>;
type _C31b = Expect<Equal<Mod['renderStatusBadge'], RenderStatusBadge>>;
type _C32b = Expect<Equal<Mod['renderEmptyState'], RenderEmptyState>>;
type _C33b = Expect<Equal<Mod['renderErrorReceipt'], RenderErrorReceipt>>;
type _C34 = Expect<Equal<CopyActionHostPort, { listActionIds(): readonly string[]; readDataText(actionId: string): string | undefined; onActivate(actionId: string, handler: () => void): () => void }>>;
type _C35 = Expect<Equal<BindCopyAction, (port: CopyActionHostPort, ports: CopyPorts, opts?: CopyTextOptions) => { dispose(): void }>>;
type _C36 = Expect<Equal<Present<'bindCopyAction'>, true>>;
type _C36b = Expect<Equal<Mod['bindCopyAction'], BindCopyAction>>;
type _C37 = Expect<Equal<SharedHelpersInput, { readonly prefix?: string; readonly dataAttr?: string }>>;
type _C37b = Expect<Equal<Mod['DEFAULT_DATA_ATTR'], 'data-t'>>;
type _C38 = Expect<Equal<BuildSharedHelpersJs, (input?: SharedHelpersInput) => string>>;
type _C39 = Expect<Equal<Present<'buildSharedHelpersJs'>, true>>;
type _C39b = Expect<Equal<Mod['buildSharedHelpersJs'], BuildSharedHelpersJs>>;
/* FX-17：复制按钮 actionId 来源（必填 id ＋ 冻结 id 表 ＋ 端口发现机制） */
type _C40 = Expect<Equal<Mod['ACTION_ID_ATTR'], 'data-action-id'>>;
type _C41 = Expect<Equal<Mod['COPY_ACTION_IDS'], {
  readonly actionBar: { readonly copyData: 'ilife-copy-data'; readonly copyLog: 'ilife-copy-log' };
  readonly errorReceipt: { readonly copyData: 'ilife-error-copy-data'; readonly copyLog: 'ilife-error-copy-log' };
}>>;
type _C42 = Expect<Equal<CopyActionHostPort['listActionIds'], () => readonly string[]>>;
/* FX-18：共享 JS 文本的产出内容契约 */
type _C43 = Expect<Equal<Mod['SHARED_HELPERS_JS_RULE'], {
  readonly selfContained: true;
  readonly idempotent: true;
  readonly domAllowed: true;
  readonly forbidGlobalAssignment: true;
  readonly forbidNodeBuiltins: true;
}>>;

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
/* #77 落地（契约 §3.4 施工面 4 条 pending）：运行时出口**必须存在**（原 `Absent<>` 按契约
 * 「实现后必须翻转清单」翻转为 `Present<>`），且出口类型与冻结签名逐字相等（签名值零改动）。
 * 类型出口 `BuildDataText`／`BuildLogText` 仍是 type-only（`Absent<>` 口径不适用于类型名）。 */
type _X10 = Expect<Equal<Present<'buildDataText'>, true>>;
type _X11 = Expect<Equal<Present<'buildLogText'>, true>>;
type _X10b = Expect<Equal<Mod['buildDataText'], BuildDataText>>;
type _X11b = Expect<Equal<Mod['buildLogText'], BuildLogText>>;
type _X10c = Expect<Equal<Absent<'BuildDataText'>, true>>;
type _X11c = Expect<Equal<Absent<'BuildLogText'>, true>>;
type _X10d = Expect<Equal<Absent<'TextError'>, true>>;
type _X11d = Expect<Equal<Absent<'TextErrorShape'>, true>>;
type _X12 = Expect<Equal<DataProjectionSpec, { readonly header: string; readonly body: string; readonly tail: string | null; readonly csvSections: readonly string[] }>>;
type _X13 = Expect<Equal<keyof Mod['DATA_TEXT_PROJECTIONS'], SerializableShape>>;
type _X13b = Expect<Equal<Mod['DATA_TEXT_PROJECTIONS']['stat']['body'], 'metrics'>>;
type _X13c = Expect<Equal<Mod['DATA_TEXT_PROJECTIONS']['list']['tail'], 'total'>>;
type _X13d = Expect<Equal<Mod['DATA_TEXT_PROJECTIONS']['analysis']['tail'], null>>;
type _X13e = Expect<Equal<Mod['DATA_TEXT_PROJECTIONS']['receipt']['csvSections'][number], 'status' | 'message'>>;
type _X14 = Expect<Equal<Mod['LOG_SECTION_SOURCES']['scene'], 'envelope'>>;
type _X14b = Expect<Equal<Mod['LOG_SECTION_SOURCES']['timestampVersion'], 'copyLog.timestamp'>>;
type _X14c = Expect<Equal<keyof Mod['LOG_SECTION_SOURCES'], 'scene' | 'thinking' | 'dataStructure' | 'callChain' | 'timestampVersion' | 'exception'>>;
/* FX-23：敏感行判定口径 ＋ 三 format 掩码文案 */
type _X15 = Expect<Equal<Mod['SENSITIVE_ROW_RULE'], {
  readonly textField: 'text';
  readonly flagField: 'sensitive';
  readonly flagValue: true;
  readonly mask: '****';
  readonly textNotice: '（敏感字段已脱敏）';
}>>;

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
/* #78 落地（契约 §3.5 施工面 5 条 pending）：3 条 runtime 出口**必须存在**（原 `Absent<>` 按契约
 * 「实现后必须翻转清单」翻转为 `Present<>`），且出口类型与冻结签名逐字相等（签名值零改动）；
 * 2 条 type 条目（`RenderHelpShell`／`BuildChartsHelpersJs`）类型别名本已存在，仅清单 status 翻转。 */
type _H13 = Expect<Equal<Present<'charts'>, true>>;
type _H13b = Expect<Equal<Mod['charts'], ChartsApi>>;
type _H14 = Expect<Equal<Present<'renderHelpShell'>, true>>;
type _H14b = Expect<Equal<Mod['renderHelpShell'], RenderHelpShell>>;
type _H15 = Expect<Equal<Mod['SCENE_DATA_SCHEMA']['$schema'], 'http://json-schema.org/draft-07/schema#'>>;
type _H16 = Expect<Equal<Mod['HELP_COPY_TARGETS'][number], 'prompt' | 'wakeWord' | 'params'>>;
type _H17 = Expect<Equal<keyof Mod['HELP_COPY_ACTIONS'], 'prompt' | 'wakeWord' | 'params'>>;
type _H17b = Expect<Equal<Mod['HELP_COPY_ACTIONS']['prompt']['label'], '复制指令'>>;
type _H17c = Expect<Equal<Mod['HELP_COPY_ACTIONS']['wakeWord']['actionId'], 'ilife-help-copy-wakeWord'>>;
/* FX-22：chartsHelpersJs 的唯一产出者（归 #78） */
type _H18 = Expect<Equal<ChartsHelpersInput, { readonly prefix?: string; readonly styleId?: string }>>;
type _H19 = Expect<Equal<import('../src/index.js').BuildChartsHelpersJs, (input?: ChartsHelpersInput) => string>>;
type _H20 = Expect<Equal<Present<'buildChartsHelpersJs'>, true>>;
type _H20b = Expect<Equal<Mod['buildChartsHelpersJs'], import('../src/index.js').BuildChartsHelpersJs>>;
/* #78 不导出的三类（与 `TemplateError`／`ControlsError` 同口径；内置壳模板只可经 `template` 覆盖）。 */
type _H21 = Expect<Equal<Absent<'ChartError'>, true>>;
type _H22 = Expect<Equal<Absent<'HelpSchemaError'>, true>>;
type _H23 = Expect<Equal<Absent<'buildShellTemplate'>, true>>;

/* ── 7. 冻结面逐值（FX-20）：27 条运行时条目的值锁（改 spec 值即编译红） ── */

type _V01 = Expect<Equal<Mod['STRICT_ENVELOPE_FIELDS'], readonly ['version', 'skill', 'shape', 'key', 'data']>>;
type _V02 = Expect<Equal<Mod['STYLE_SHEET_ID'], 'ilife-base'>>;
type _V03 = Expect<Equal<Mod['COPY_TEXT_DEFAULTS'], {
  readonly emptyTextShortCircuit: true; readonly failBadgeAlwaysOn: true;
  readonly okMessage: '已复制'; readonly okDetail: '粘贴给 AI';
  readonly failMessage: '复制失败'; readonly failDetail: '长按选择文本手动复制';
}>>;
type _V04 = Expect<Equal<Mod['TOAST_ICONS'], readonly ['copy', 'ok', 'warn', 'danger', 'info']>>;
type _V05 = Expect<Equal<Mod['TOAST_DEFAULTS'], {
  readonly timeoutMs: 4500; readonly maxStack: 5; readonly mobileMaxStack: 3; readonly mobileMaxPx: 820;
  readonly gapPx: 8; readonly role: 'status'; readonly ariaLive: 'polite'; readonly defaultIcon: 'copy';
}>>;
type _V06 = Expect<Equal<Mod['ACTION_BAR_KINDS'], readonly ['primary', 'red', 'ghost']>>;
type _V07 = Expect<Equal<Mod['ACTION_BAR_DEFAULTS'], {
  readonly copyDataLabel: '复制数据'; readonly copyLogLabel: '复制日志'; readonly ghostOwnRow: true;
  readonly evenRowPairs: 2; readonly minHeightPx: 40; readonly fontSizePx: 12; readonly fontWeight: 600;
  readonly ghostBorderAlpha: 0.38;
}>>;
type _V08 = Expect<Equal<Mod['STATUS_DEFAULT_TEXT'], { readonly ok: '成功'; readonly warn: '警告'; readonly danger: '失败'; readonly empty: '无数据' }>>;
type _V09 = Expect<Equal<Mod['CONTROLS_ERROR_CODES'], readonly ['bad-input', 'bad-format']>>;
type _V10 = Expect<Equal<Mod['LOG_SECTION_TITLES'], {
  readonly scene: '场景标识'; readonly thinking: 'AI 思考链'; readonly dataStructure: '数据结构';
  readonly callChain: '调用链'; readonly timestampVersion: '时间戳版本'; readonly exception: '异常';
}>>;
type _V11 = Expect<Equal<Mod['LOG_UNKNOWN_PLACEHOLDER'], '(未知)'>>;
type _V12 = Expect<Equal<Mod['TEXT_EMPTY_PLACEHOLDER'], '未填写'>>;
type _V13 = Expect<Equal<Mod['TEXT_SENSITIVE_MASK'], '****'>>;
type _V14 = Expect<Equal<Mod['TEXT_HEADER_TEMPLATE'], '【{skill} · {key}】'>>;
type _V15 = Expect<Equal<Mod['TEXT_JSON_INDENT'], 2>>;
type _V16 = Expect<Equal<Mod['TEXT_JSON_LT_RULE'], 'u003c'>>;
type _V17 = Expect<Equal<Mod['CSV_DIALECT'], {
  readonly delimiter: ','; readonly quote: '"'; readonly quoteEscape: '""'; readonly lineEnding: 'LF';
  readonly header: readonly ['section', 'row'];
}>>;
type _V18 = Expect<Equal<Mod['TEXT_ERROR_CODES'], readonly ['shape-unsupported', 'structure-invalid', 'format-unknown']>>;
type _V19 = Expect<Equal<Mod['CHARTS_STYLE_ID'], 'ilife-charts'>>;
type _V20 = Expect<Equal<Mod['CHART_STRUCTURE_RULE'], 'throw'>>;
type _V21 = Expect<Equal<Mod['CHART_EMPTY_RULE'], 'emptyState'>>;
type _V22 = Expect<Equal<Mod['CHART_COORD_RULE'], 'viewBox-only'>>;
type _V23 = Expect<Equal<Mod['CHART_BREAKPOINTS'], { readonly mobileMaxPx: 720; readonly dotSizeMobilePx: 8; readonly lineHeightMobilePx: 150; readonly stackedGapPx: 3 }>>;
type _V24 = Expect<Equal<Mod['CHART_PALETTE'], readonly ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be']>>;
type _V25 = Expect<Equal<Mod['CHART_ERROR_CODES'], readonly ['structure-invalid', 'pct-invalid', 'kind-unknown']>>;
type _V26 = Expect<Equal<Mod['HELP_SHELL_ID'], 'ilife-help-shell'>>;
type _V27 = Expect<Equal<Mod['HELP_SCHEMA_ERROR_CODES'], readonly ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-invalid']>>;

/* ── 8. 清单与版本 ─────────────────────────────────────── */

type _M01 = Expect<Equal<Mod['SPEC_FROZEN_SURFACE'][number], FrozenSurfaceEntry>>;
type _M02 = Expect<Equal<FrozenSurfaceEntry['kind'], 'runtime' | 'type'>>;
type _M03 = Expect<Equal<FrozenSurfaceEntry['status'], 'implemented' | 'pending'>>;
type _M04 = Expect<Equal<Mod['BASE_PAINT_CONTRACT_VERSION'], '0.1.0'>>;

export {};
