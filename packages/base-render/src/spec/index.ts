/** base-paint/spec：冻结的共享层契约类型汇总（#92 / 79a）。
 *
 * 本目录 = **冻结的共享层契约类型**；`src/contract.ts` = **既有渲染契约**
 *（envelope→HTML）。两者不同物：前者是 #74–#78 的施工图，后者是既有运行时。
 *
 * 纪律：spec/ 内只许类型与纯数据常量，禁函数体实现、禁副作用、
 * 禁第三方 import、禁 `node:`、禁运行时 import base-link-core（只许 `import type`）。
 *
 * `SPEC_FROZEN_SURFACE` 是**冻结面清单**（机器可读唯一真相源）：
 * 文档 §3 的签名表是它的投影，`test-d/contract-signatures.ts` 与
 * `test/contract-signatures.test.mjs` 把清单／文档／类型三者绑死。
 */

export * from './template.js';
export * from './style.js';
export * from './controls.js';
export * from './text.js';
export * from './charts.js';
export * from './help.js';

/** 契约版本（与 RENDER_CONTRACT_VERSION／ENVELOPE_VERSION 同值，漂移由签名测试钉死）。 */
export const BASE_PAINT_CONTRACT_VERSION = '0.1.0' as const;

export type FrozenSurfaceKind = 'runtime' | 'type';
export type FrozenSurfaceStatus = 'implemented' | 'pending';
export type FrozenSurfaceSection = '3.1' | '3.2' | '3.3' | '3.4' | '3.5' | '5' | '7';
export type FrozenSurfaceTicket = '#74' | '#75' | '#76' | '#77' | '#78' | '#92';

export interface FrozenSurfaceEntry {
  readonly name: string;
  readonly kind: FrozenSurfaceKind;
  readonly ticket: FrozenSurfaceTicket;
  /** implemented = #92 已落地（纯数据／类型）；pending = 留给执行票实现。 */
  readonly status: FrozenSurfaceStatus;
  readonly section: FrozenSurfaceSection;
  /** 逐字签名（与文档 §3 签名表逐字一致，由签名测试比对）。 */
  readonly signature: string;
}

export const SPEC_FROZEN_SURFACE: readonly FrozenSurfaceEntry[] = Object.freeze([
  // ── §3.1 占位符契约与统一填充器（#74） ──
  { name: 'TEMPLATE_MARKERS', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "{ injectData: '<!--INJECT-DATA-->'; sharedHelpers: '<!--SHARED-HELPERS-->'; sharedCss: '<!--SHARED-CSS-->'; chartsHelpers: '<!--CHARTS-HELPERS-->'; noShared: '<!--NO-SHARED-->' }" },
  { name: 'MARKER_RULES', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: 'Record<TemplateMarkerKey, MarkerRuleSpec>' },
  { name: 'INJECTION_ORDER', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "readonly ['sharedHelpers', 'sharedCss', 'chartsHelpers', 'injectData']" },
  { name: 'DEFAULT_DATA_SCRIPT_ID', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "'payload'" },
  { name: 'DATA_SCRIPT_TYPE', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "'application/json'" },
  { name: 'STRICT_ENVELOPE_FIELDS', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "readonly ['version', 'skill', 'shape', 'key', 'data']" },
  { name: 'STRICT_ENVELOPE_SHAPES', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "readonly ['list', 'detail', 'stat', 'receipt', 'analysis', 'fallback']" },
  { name: 'TEMPLATE_ERROR_CODES', kind: 'runtime', ticket: '#74', status: 'implemented', section: '3.1', signature: "readonly ['marker-missing', 'marker-duplicate', 'marker-conflict', 'data-missing', 'asset-missing', 'strict-invalid']" },
  { name: 'TemplateAssets', kind: 'type', ticket: '#74', status: 'implemented', section: '3.1', signature: '{ sharedHelpersJs: string; sharedCssText: string; chartsHelpersJs?: string }' },
  { name: 'FillTemplateInput', kind: 'type', ticket: '#74', status: 'implemented', section: '3.1', signature: '{ template: string; assets: TemplateAssets; data: unknown; strict?: boolean; dataScriptId?: string }' },
  { name: 'FillTemplateReport', kind: 'type', ticket: '#74', status: 'implemented', section: '3.1', signature: '{ markers: readonly MarkerReport[]; strict: boolean; exempt: boolean; bytes: number }' },
  { name: 'FillTemplateOutput', kind: 'type', ticket: '#74', status: 'implemented', section: '3.1', signature: '{ html: string; report: FillTemplateReport }' },
  { name: 'FillTemplate', kind: 'type', ticket: '#74', status: 'pending', section: '3.1', signature: '(input: FillTemplateInput) => FillTemplateOutput' },
  { name: 'fillTemplate', kind: 'runtime', ticket: '#74', status: 'pending', section: '3.1', signature: '(input: FillTemplateInput): FillTemplateOutput' },
  { name: 'TemplateErrorShape', kind: 'type', ticket: '#74', status: 'implemented', section: '3.1', signature: "{ name: 'TemplateError'; code: TemplateErrorCode; marker?: TemplateMarkerKey; message: string }" },

  // ── §3.2 共享样式资产（#75） ──
  { name: 'CSS_VAR_TOKENS', kind: 'runtime', ticket: '#75', status: 'implemented', section: '3.2', signature: "{ '--fg': '#1d1d1f'; '--fg2': '#6e6e73'; '--fg3': '#86868b'; '--bg': '#f5f5f7'; '--card': '#ffffff'; '--line': '#d2d2d7'; '--blue': '#007aff'; '--blue2': '#0a63ce'; '--soft': '#f5f8ff'; '--ok': '#34c759'; '--shadow': '0 1px 2px rgba(0,0,0,.04), 0 12px 36px rgba(0,0,0,.06)' }" },
  { name: 'STYLE_SHEET_ID', kind: 'runtime', ticket: '#75', status: 'implemented', section: '3.2', signature: "'ilife-base'" },
  { name: 'CONTROL_STYLE_SECTIONS', kind: 'runtime', ticket: '#75', status: 'implemented', section: '3.2', signature: "readonly ['toast', 'actionBar', 'copyButton', 'statusBadge', 'emptyState', 'errorReceipt', 'charts', 'helpShell']" },
  { name: 'STYLE_FORBIDDEN_TOKENS', kind: 'runtime', ticket: '#75', status: 'implemented', section: '3.2', signature: "readonly ['--r-xl', '--pink']" },
  { name: 'StyleSheetInput', kind: 'type', ticket: '#75', status: 'implemented', section: '3.2', signature: '{ prefix?: string; extraCss?: string }' },
  { name: 'StyleSheetOutput', kind: 'type', ticket: '#75', status: 'implemented', section: '3.2', signature: '{ css: string; tokens: readonly CssVarName[]; prefix: string; version: string }' },
  { name: 'BuildStyleSheet', kind: 'type', ticket: '#75', status: 'pending', section: '3.2', signature: '(input?: StyleSheetInput) => StyleSheetOutput' },
  { name: 'buildStyleSheet', kind: 'runtime', ticket: '#75', status: 'pending', section: '3.2', signature: '(input?: StyleSheetInput): StyleSheetOutput' },

  // ── §3.3 控件层（#76） ──
  { name: 'ESCAPE_HTML_CHARS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['&', '<', '>', '\"', \"'\"]" },
  { name: 'ESCAPE_HTML_ENTITIES', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "{ '&': '&amp;'; '<': '&lt;'; '>': '&gt;'; '\"': '&quot;'; \"'\": '&#39;' }" },
  { name: 'COPY_CHANNELS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['clipboard', 'fallback']" },
  { name: 'COPY_TEXT_DEFAULTS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "{ emptyTextShortCircuit: true; failBadgeAlwaysOn: true; okMessage: '已复制'; okDetail: '粘贴给 AI'; failMessage: '复制失败'; failDetail: '长按选择文本手动复制' }" },
  { name: 'TOAST_ICONS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['copy', 'ok', 'warn', 'danger', 'info']" },
  { name: 'TOAST_DEFAULTS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "{ timeoutMs: 4500; maxStack: 5; mobileMaxStack: 3; mobileMaxPx: 820; gapPx: 8; role: 'status'; ariaLive: 'polite'; defaultIcon: 'copy' }" },
  { name: 'ACTION_BAR_KINDS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['primary', 'red', 'ghost']" },
  { name: 'ACTION_BAR_DEFAULTS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "{ copyDataLabel: '复制数据'; copyLogLabel: '复制日志'; ghostOwnRow: true; evenRowPairs: 2; minHeightPx: 40; fontSizePx: 12; fontWeight: 600; ghostBorderAlpha: 0.38 }" },
  { name: 'STATUS_KINDS', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['ok', 'warn', 'danger', 'empty']" },
  { name: 'STATUS_DEFAULT_TEXT', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "{ ok: '成功'; warn: '警告'; danger: '失败'; empty: '无数据' }" },
  { name: 'CONTROLS_ERROR_CODES', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['bad-input', 'bad-format']" },
  { name: 'CONTROL_NAMES', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "readonly ['toast', 'copyText', 'actionBar', 'statusBadge', 'emptyState', 'errorReceipt']" },
  { name: 'CONTROLS_HOST_REQUIREMENT', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: "'none'" },
  { name: 'CONTROL_AVAILABILITY', kind: 'runtime', ticket: '#76', status: 'implemented', section: '3.3', signature: 'Record<ControlName, ControlAvailability>' },
  { name: 'CopyPorts', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ clipboard: ClipboardChannel | null; fallback: (text: string) => boolean }' },
  { name: 'CopyTextOptions', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ silent?: boolean; toast?: { ok?: CopyToastText; fail?: CopyToastText }; onOk?: (channel: CopyChannel) => void; onFail?: (reason: string) => void }' },
  { name: 'CopyTextOutcome', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ ok: boolean; channel: CopyChannel | null; reason?: string }' },
  { name: 'CopyText', kind: 'type', ticket: '#76', status: 'pending', section: '3.3', signature: '(text: string, ports: CopyPorts, opts?: CopyTextOptions) => Promise<CopyTextOutcome>' },
  { name: 'copyText', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(text: string, ports: CopyPorts, opts?: CopyTextOptions): Promise<CopyTextOutcome>' },
  { name: 'CopyRuntime', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ copyText(text: string, opts?: CopyTextOptions): Promise<CopyTextOutcome>; dispose(): void }' },
  { name: 'createCopyRuntime', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(ports: CopyPorts): CopyRuntime' },
  { name: 'ToastInput', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ msg: string; detail?: string; icon?: ToastIcon; badge?: ToastBadge; actions?: readonly ToastAction[]; count?: string; lines?: readonly string[]; code?: string; timeoutMs?: number; maxStack?: number }' },
  { name: 'ToastHostPort', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ mount(html: string): { remove(): void } }' },
  { name: 'ToastController', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ show(input: ToastInput): void; flush(): void; dispose(): void }' },
  { name: 'renderToast', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(input: ToastInput): string' },
  { name: 'createToastController', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(port: ToastHostPort): ToastController' },
  { name: 'ActionBarInput', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ buttons?: readonly ActionBarButton[]; copyData?: CopyButtonInput; copyLog?: CopyButtonInput }' },
  { name: 'renderActionBar', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(input: ActionBarInput): string' },
  { name: 'StatusBadgeInput', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ status: StatusKind; text?: string }' },
  { name: 'renderStatusBadge', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(input: StatusBadgeInput): string' },
  { name: 'EmptyStateInput', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ icon?: string; text: string; hint?: string; actionHtml?: string }' },
  { name: 'renderEmptyState', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(input: EmptyStateInput): string' },
  { name: 'ErrorReceiptInput', kind: 'type', ticket: '#76', status: 'implemented', section: '3.3', signature: '{ message: string; retryPrompt?: string; dataText?: string; logText?: string }' },
  { name: 'renderErrorReceipt', kind: 'runtime', ticket: '#76', status: 'pending', section: '3.3', signature: '(input: ErrorReceiptInput): string' },

  // ── §3.4 复制文本序列化（#77） ──
  { name: 'COPY_FORMATS', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "readonly ['text', 'json', 'csv']" },
  { name: 'SERIALIZABLE_SHAPES', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "readonly ['stat', 'list', 'detail', 'analysis', 'receipt']" },
  { name: 'LOG_SECTIONS', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "readonly ['scene', 'thinking', 'dataStructure', 'callChain', 'timestampVersion', 'exception']" },
  { name: 'LOG_SECTION_TITLES', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "{ scene: '场景标识'; thinking: 'AI 思考链'; dataStructure: '数据结构'; callChain: '调用链'; timestampVersion: '时间戳版本'; exception: '异常' }" },
  { name: 'LOG_UNKNOWN_PLACEHOLDER', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "'(未知)'" },
  { name: 'TEXT_EMPTY_PLACEHOLDER', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "'未填写'" },
  { name: 'TEXT_SENSITIVE_MASK', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "'****'" },
  { name: 'TEXT_HEADER_TEMPLATE', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "'【{skill} · {key}】'" },
  { name: 'TEXT_JSON_INDENT', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: '2' },
  { name: 'TEXT_JSON_LT_RULE', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "'u003c'" },
  { name: 'CSV_DIALECT', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "{ delimiter: ','; quote: '\"'; quoteEscape: '\"\"'; lineEnding: 'LF'; header: readonly ['section', 'row'] }" },
  { name: 'TEXT_ERROR_CODES', kind: 'runtime', ticket: '#77', status: 'implemented', section: '3.4', signature: "readonly ['shape-unsupported', 'structure-invalid', 'format-unknown']" },
  { name: 'SerializableEnvelope', kind: 'type', ticket: '#77', status: 'implemented', section: '3.4', signature: 'Envelope<SerializableShape>' },
  { name: 'DataTextInput', kind: 'type', ticket: '#77', status: 'implemented', section: '3.4', signature: '{ envelope: SerializableEnvelope; format?: CopyFormat; title?: string; occurredAt?: string }' },
  { name: 'LogTextInput', kind: 'type', ticket: '#77', status: 'implemented', section: '3.4', signature: '{ envelope: SerializableEnvelope; format?: CopyFormat; copyLog?: CopyLogFields }' },
  { name: 'CopyLogFields', kind: 'type', ticket: '#77', status: 'implemented', section: '3.4', signature: '{ thinking?: string; dataStructure?: string; callChain?: string; timestamp?: string; exception?: string }' },
  { name: 'BuildDataText', kind: 'type', ticket: '#77', status: 'pending', section: '3.4', signature: '(input: DataTextInput) => string' },
  { name: 'buildDataText', kind: 'runtime', ticket: '#77', status: 'pending', section: '3.4', signature: '(input: DataTextInput): string' },
  { name: 'BuildLogText', kind: 'type', ticket: '#77', status: 'pending', section: '3.4', signature: '(input: LogTextInput) => string' },
  { name: 'buildLogText', kind: 'runtime', ticket: '#77', status: 'pending', section: '3.4', signature: '(input: LogTextInput): string' },

  // ── §3.5 图表层与 HELP 壳（#78） ──
  { name: 'CHART_KINDS', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "readonly ['bar', 'line', 'donut', 'progress', 'combo', 'sparkline', 'gauge', 'scatter']" },
  { name: 'CHARTS_STYLE_ID', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "'ilife-charts'" },
  { name: 'CHART_STRUCTURE_RULE', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "'throw'" },
  { name: 'CHART_EMPTY_RULE', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "'emptyState'" },
  { name: 'CHART_COORD_RULE', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "'viewBox-only'" },
  { name: 'CHART_BREAKPOINTS', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: '{ mobileMaxPx: 720; dotSizeMobilePx: 8; lineHeightMobilePx: 150; stackedGapPx: 3 }' },
  { name: 'CHART_PALETTE', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "readonly ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de', '#5ac8fa', '#ffcc00', '#8e8e93', '#ff2d55', '#00c7be']" },
  { name: 'CHART_ERROR_CODES', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "readonly ['structure-invalid', 'pct-invalid', 'kind-unknown']" },
  { name: 'SCENE_STATUS', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "readonly ['', '【待开发】']" },
  { name: 'SCENE_TYPE_FIELD', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "'types'" },
  { name: 'SCENE_DATA_SCHEMA', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "object（draft-07；$id: 'ilife://base-paint/scene-data.schema.json'）" },
  { name: 'HELP_SHELL_ID', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "'ilife-help-shell'" },
  { name: 'HELP_COPY_TARGETS', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "readonly ['prompt', 'wakeWord', 'params']" },
  { name: 'HELP_SCHEMA_ERROR_CODES', kind: 'runtime', ticket: '#78', status: 'implemented', section: '3.5', signature: "readonly ['schema-invalid', 'duplicate-id', 'status-invalid', 'types-invalid']" },
  { name: 'ChartItem', kind: 'type', ticket: '#78', status: 'implemented', section: '3.5', signature: '{ label: string; value: number | null; color?: string; values?: readonly number[]; anomaly?: boolean }' },
  { name: 'ChartOutput', kind: 'type', ticket: '#78', status: 'implemented', section: '3.5', signature: '{ kind: ChartKind; html: string; empty: boolean; points: number }' },
  { name: 'ChartsApi', kind: 'type', ticket: '#78', status: 'implemented', section: '3.5', signature: '{ bar(input: BarChartInput): ChartOutput; line(input: LineChartInput): ChartOutput; donut(input: DonutChartInput): ChartOutput; progress(input: ProgressChartInput): ChartOutput; combo(input: ComboChartInput): ChartOutput; sparkline(input: SparklineChartInput): ChartOutput; gauge(input: GaugeChartInput): ChartOutput; scatter(input: ScatterChartInput): ChartOutput }' },
  { name: 'charts', kind: 'runtime', ticket: '#78', status: 'pending', section: '3.5', signature: 'ChartsApi' },
  { name: 'SceneData', kind: 'type', ticket: '#78', status: 'implemented', section: '3.5', signature: '{ skill_name: string; title: string; subtitle?: string; meta_blocks?: readonly SceneMetaBlock[]; groups: readonly SceneGroup[]; init_banner?: SceneInitBanner; contact?: SceneContact; version?: string; recommendations?: readonly SceneRecommendation[] }' },
  { name: 'Scene', kind: 'type', ticket: '#78', status: 'implemented', section: '3.5', signature: "{ id: string; title: string; wake_word: string; types?: readonly (string | SceneTypeBadge)[]; status: SceneStatus; prompt_template: string; editable_fields?: readonly SceneEditableField[] }" },
  { name: 'HelpShellInput', kind: 'type', ticket: '#78', status: 'implemented', section: '3.5', signature: '{ sceneData: SceneData; assets: TemplateAssets; strict?: boolean; template?: string }' },
  { name: 'RenderHelpShell', kind: 'type', ticket: '#78', status: 'pending', section: '3.5', signature: '(input: HelpShellInput) => FillTemplateOutput' },
  { name: 'renderHelpShell', kind: 'runtime', ticket: '#78', status: 'pending', section: '3.5', signature: '(input: HelpShellInput): FillTemplateOutput' },

  // ── §5 版本机制 ──
  { name: 'BASE_PAINT_CONTRACT_VERSION', kind: 'runtime', ticket: '#92', status: 'implemented', section: '5', signature: "'0.1.0'" },

  // ── §7 签名测试 ──
  { name: 'SPEC_FROZEN_SURFACE', kind: 'runtime', ticket: '#92', status: 'implemented', section: '7', signature: 'readonly FrozenSurfaceEntry[]' },
]);
