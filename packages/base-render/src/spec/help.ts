/** base-paint/spec/help：HELP模板与 scene-data 契约（#78 冻结面）。
 *
 * B6：HELP 形态 = HTML 速查台；Q11：取 F3 并回补 F1／F2 的逐场景 CLI 展示与变体示例。
 * AC-3：场景类型徽章字段取 **`types`（复数）**，不提供 `type` 别名（旧侧
 *   `docs/scene-data-contract.md:78` 与 `docs/scene_data.schema.json:70` 用 `types`，
 *   旧侧 `docs/help-template-contract.md:51` 用 `type` —— 本契约是对该分歧的裁定）。
 *   引证更正（#78 施工期取证 R2）：旧稿把笔误出处写成 `assets/help_template.html:52`，
 *   该行实为 CSS；模板资产本身用 `s.types`（`help_template.html:224`）。裁定结论不变。
 * AC-4：`SCENE_DATA_SCHEMA` 是**唯一机读权威**，文档 §3.5 只是它的可读投影。
 *
 * 依赖红线：只许 `import type`（AC-13）；help模板复用面见 `HelpShellInput`（#88 直接消费）。
 */

import type { FillTemplateOutput, TemplateAssets } from './template.js';

/** 场景状态只允许两值（旧 `injector.py:168-169`）。 */
export const SCENE_STATUS = ['', '【待开发】'] as const;

export type SceneStatus = (typeof SCENE_STATUS)[number];

/** 唯一权威字段名（AC-3）：复数，无单数别名。 */
export const SCENE_TYPE_FIELD = 'types' as const;

export interface SceneTypeBadge {
  readonly text: string;
  readonly bg?: string;
  readonly fg?: string;
}

/** 场景可编辑字段输入类型闭集（#966 定案；#969 落契约；#978 T2 扩 month／year；#975 扩 time；
 *  #1275 扩 period：时间槽位＝粒度分段（不限／某天／周／月／年／区间）＋对应原生控件，
 *  取值是**人话表达式**（周／月另带起止日期）——命令侧不必懂 ISO 周号）。
 *  缺 `kind` 视为 `text`。`time` 值形态 `HH:MM`（00:00–23:59；24:00 由调用方先归一到 23:59，本层不收）。 */
export type SceneFieldKind = 'text' | 'number' | 'select' | 'date' | 'week' | 'month' | 'year' | 'time' | 'period';

/** 候选／现值来源闭集（#1270、#1276 定案；#1270 第二刀扩分类／账户／账本）。
 *  语义：声明只写**来源名**，值由**生成期**填进载荷——清单类（`tags`／`categories`／`accounts`／`ledgers`）
 *  填 `options`，单值类（`config`）填 `value`；生成期读不到就退回自由文本（`kind` 保持 `text`，
 *  `config` 的 `value` 保持声明里的空串）。
 *  这一格回答「这份值的来源」，与 `options`（写死的候选）互斥：两者同时在场时以写死的 `options` 为准。
 *  名字是**来源种类**（标签／分类／账户／账本／账户类型／配置），不是某个技能的概念：具体从哪儿读由各技能的生成期定。
 *  `accountTypes`（#1269 条目 19）：值域＝「已有值里出现过的种类」这一种来源，读法由各技能生成期定
 *  （饼干记账读 `goals.json` 账户表的 `type` 列）。 */
export type SceneFieldSource = 'tags' | 'categories' | 'accounts' | 'ledgers' | 'accountTypes' | 'config';

export interface SceneEditableField {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly kind?: SceneFieldKind;
  readonly source?: SceneFieldSource;
  readonly options?: readonly (string | { readonly value: string; readonly label: string })[];
  /** `select` 空项（没选任何候选那一档）的文案（用户 2026-10-13 定稿）。
   *  缺省按 `required` 二分：必填＝`请选择`、选填＝`不限`——选填那档回答的是「留空＝什么」，
   *  而多数选填下拉就是筛选维度，留空即不筛这一维。留空不等于「不限」的格（如分类留空＝总预算、
   *  收支留空＝支出）在这一格写清自己的那一个词，别让模板去猜。 */
  readonly empty_label?: string;
  readonly min?: string | number;
  readonly max?: string | number;
  readonly step?: string | number;
  readonly placeholder?: string;
}

export interface Scene {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  readonly types?: readonly (string | SceneTypeBadge)[];
  readonly status: SceneStatus;
  readonly prompt_template: string;
  readonly editable_fields?: readonly SceneEditableField[];
}

export interface SceneSubgroup {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly Scene[];
}

export interface SceneGroup {
  readonly id: string;
  readonly icon?: string;
  readonly label: string;
  readonly subgroups: readonly SceneSubgroup[];
}

export interface SceneMetaBlock {
  readonly id: string;
  readonly title: string;
  /** 技能方提供的 HTML 原文，Base 原样透传（转义由技能方自理）。 */
  readonly html: string;
}

export interface SceneInitBannerStep {
  readonly title: string;
  readonly desc?: string;
}

export interface SceneInitBanner {
  readonly title: string;
  readonly subtitle?: string;
  readonly button_text?: string;
  readonly prompt?: string;
  /** 字符串步与对象步皆可（#242：模板读 `st.title`／`st.desc`，老生产路传对象数组）。 */
  readonly steps?: readonly (string | SceneInitBannerStep)[];
}

export interface SceneContactItem {
  readonly label: string;
  readonly value: string;
  /** 可点标记（#242：模板以 `it.url` 真值＋值以 `http` 开头判 `<a>`；生产四家用 `true` 旗标）。 */
  readonly url?: boolean | string;
}

export interface SceneContact {
  readonly items: readonly SceneContactItem[];
  readonly copy_all?: string;
}

export interface SceneRecommendation {
  readonly name: string;
  readonly reason?: string;
  readonly wake_word?: string;
}

/** HELP 页对外参数（scene_data）顶层契约。 */
export interface SceneData {
  readonly skill_name: string;
  readonly title: string;
  readonly subtitle?: string;
  readonly meta_blocks?: readonly SceneMetaBlock[];
  readonly groups: readonly SceneGroup[];
  readonly init_banner?: SceneInitBanner;
  readonly contact?: SceneContact;
  readonly version?: string;
  readonly recommendations?: readonly SceneRecommendation[];
}

/** 唯一机读 schema（draft-07 子集；文档 §3.5 逐字段投影它）。 */
export const SCENE_DATA_SCHEMA = Object.freeze({
  $schema: 'http://json-schema.org/draft-07/schema#',
  $id: 'ilife://base-paint/scene-data.schema.json',
  title: 'scene_data',
  type: 'object',
  additionalProperties: false,
  required: ['skill_name', 'title', 'groups'],
  properties: {
    skill_name: { type: 'string', minLength: 1 },
    title: { type: 'string', minLength: 1 },
    subtitle: { type: 'string' },
    meta_blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'title', 'html'],
        properties: { id: { type: 'string' }, title: { type: 'string' }, html: { type: 'string' } },
      },
    },
    groups: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['id', 'label', 'subgroups'],
        properties: {
          id: { type: 'string' },
          icon: { type: 'string' },
          label: { type: 'string' },
          subgroups: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['id', 'label', 'scenes'],
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                scenes: {
                  type: 'array',
                  /** 文档 §3.5.2 明写「`scenes[]`（必填，**非空**）」；机读权威此前缺该约束
                   *  （#78 施工期取证 R1 缺陷 1，AC-4 下即缺陷态）→ 补齐 `minItems: 1`。 */
                  minItems: 1,
                  items: {
                    type: 'object',
                    additionalProperties: false,
                    required: ['id', 'title', 'wake_word', 'status', 'prompt_template'],
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                      wake_word: { type: 'string' },
                      types: {
                        type: 'array',
                        items: {
                          oneOf: [
                            { type: 'string' },
                            {
                              type: 'object',
                              additionalProperties: false,
                              required: ['text'],
                              properties: { text: { type: 'string' }, bg: { type: 'string' }, fg: { type: 'string' } },
                            },
                          ],
                        },
                      },
                      status: { enum: ['', '【待开发】'] },
                      prompt_template: { type: 'string', minLength: 1 },
                      editable_fields: {
                        type: 'array',
                        items: {
                          type: 'object',
                          additionalProperties: false,
                          required: ['name', 'label', 'value'],
                          properties: {
                            name: { type: 'string' },
                            label: { type: 'string' },
                            value: { type: 'string' },
                            hint: { type: 'string' },
                            required: { type: 'boolean' },
                            kind: { enum: ['text', 'number', 'select', 'date', 'week', 'month', 'year', 'time', 'period'] },
                            source: { enum: ['tags', 'categories', 'accounts', 'ledgers', 'config'] },
                            empty_label: { type: 'string', minLength: 1 },
                            options: {
                              type: 'array',
                              items: {
                                oneOf: [
                                  { type: 'string' },
                                  {
                                    type: 'object',
                                    additionalProperties: false,
                                    required: ['value'],
                                    properties: { value: { type: 'string' }, label: { type: 'string' } },
                                  },
                                ],
                              },
                            },
                            min: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                            max: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                            step: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                            placeholder: { type: 'string' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    init_banner: {
      type: 'object',
      additionalProperties: false,
      required: ['title'],
      properties: {
        title: { type: 'string' },
        subtitle: { type: 'string' },
        button_text: { type: 'string' },
        prompt: { type: 'string' },
        steps: {
          type: 'array',
          items: {
            oneOf: [
              { type: 'string' },
              {
                type: 'object',
                additionalProperties: false,
                required: ['title'],
                properties: { title: { type: 'string' }, desc: { type: 'string' } },
              },
            ],
          },
        },
      },
    },
    contact: {
      type: 'object',
      additionalProperties: false,
      required: ['items'],
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'value'],
            properties: {
              label: { type: 'string' },
              value: { type: 'string' },
              url: { oneOf: [{ type: 'boolean' }, { type: 'string' }] },
            },
          },
        },
        copy_all: { type: 'string' },
      },
    },
    version: { type: 'string' },
    recommendations: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name'],
        properties: { name: { type: 'string' }, reason: { type: 'string' }, wake_word: { type: 'string' } },
      },
    },
  },
} as const);

export const HELP_SHELL_ID = 'ilife-help-shell';

/** 一键复制目标（Q11／#88 复用面）。 */
export const HELP_COPY_TARGETS = ['prompt', 'wakeWord', 'params'] as const;

export type HelpCopyTarget = (typeof HELP_COPY_TARGETS)[number];

/** id → actionId → 对外文案（FX-7）：文案统一「复制…」，`prompt` 一律写「**复制指令**」
 *  （不写「复制 prompt」）；actionId 供 `bindCopyAction` 分发（§3.3）。 */
export const HELP_COPY_ACTIONS = Object.freeze({
  prompt: { actionId: 'ilife-help-copy-prompt', label: '复制指令' },
  wakeWord: { actionId: 'ilife-help-copy-wakeWord', label: '复制唤醒词' },
  params: { actionId: 'ilife-help-copy-params', label: '复制参数' },
} as const satisfies Record<HelpCopyTarget, { readonly actionId: string; readonly label: string }>);

export interface HelpShellInput {
  readonly sceneData: SceneData;
  /** 共享资产走同一填充器（B3）：HELP模板不得自填。 */
  readonly assets: TemplateAssets;
  readonly strict?: boolean;
  /** 文本语言（BCP 47；空串／缺席＝中文，产物与改前逐字节相同；`en` 时文档 `lang` 为 `en`，模板静态文案的词条化归各迁移票）。 */
  readonly language?: string;
  /** 覆盖内置help模板；缺省用 base-paint 自带模板。 */
  readonly template?: string;
}

/** 冻结签名：`renderHelpShell(input: HelpShellInput): FillTemplateOutput`。 */
export type RenderHelpShell = (input: HelpShellInput) => FillTemplateOutput;

export const HELP_SCHEMA_ERROR_CODES = [
  'schema-invalid',
  'duplicate-id',
  'status-invalid',
  'types-invalid',
] as const;

export type HelpSchemaErrorCode = (typeof HELP_SCHEMA_ERROR_CODES)[number];

export interface HelpSchemaErrorShape {
  readonly name: 'HelpSchemaError';
  readonly code: HelpSchemaErrorCode;
  readonly path: string;
  readonly message: string;
}
