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

/** 场景可编辑字段输入类型闭集（#966 定案；#969 落契约）。缺 `kind` 视为 `text`。 */
export type SceneFieldKind = 'text' | 'number' | 'select' | 'date' | 'week';

export interface SceneEditableField {
  readonly name: string;
  readonly label: string;
  readonly value: string;
  readonly hint?: string;
  readonly required?: boolean;
  readonly kind?: SceneFieldKind;
  readonly options?: readonly (string | { readonly value: string; readonly label: string })[];
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
                            kind: { enum: ['text', 'number', 'select', 'date', 'week'] },
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
