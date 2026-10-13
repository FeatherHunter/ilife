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
  /** 值级放开（用户 2026-10-13 定稿）：这个字段的候选之外还允许**用户自己敲一个新值**——
   *  控件换成「可输入 ＋ 候选 ＋ 新建」的形态，不是把候选列完了事。新值随记录落库，
   *  下一轮生成候选时回流（闭环有延迟：候选由 HELP 页生成期注入，24h 复用窗口内不重生成）。
   *  只对带 `source` 或 `options` 的字段有意义；重名的权威裁决在写入侧，控件只做提示。
   *  与「去别的场景创建」相对：那类实体（如账户）不给放开，走 `create_scene`。 */
  readonly allow_new?: boolean;
  /** 新值的前缀清单（用户 2026-10-13 定稿）：放开新建、但这个字段的值有**层级**、顶层是闭集时，
   *  由技能侧生成期给出允许的顶层清单；控件在「输入新名称」上方出一排前缀按钮，
   *  点一下＝把「前缀/」插进输入框（剩下的名字用户自己敲）。公共层只认「有清单就先给前缀」这条
   *  通用规则，不推导、不认识「分类」这种领域词。 */
  readonly new_prefixes?: readonly string[];
  /** 去别的场景创建（用户 2026-10-13 定稿）：这个字段的值有独立登记表、不让在本格放开时，
   *  给一个出口＝打开目标场景，并把本格已填的值带进目标场景的第一个字段。
   *  值写目标场景的 id（如 `account_add`）。 */
  readonly create_scene?: string;
  /** 快捷取值（#1269 条目 3）：控件旁给一排可点的建议值（这个字段值域里最常用的几档）。
   *  点一下＝把该字面量填进同一个字段（不引入第二份值、不改字段名）；值只写字面量本身，
   *  相对量（今天／本周）不在这里表达——那是字段值域的另一种东西，要就单开一格。 */
  readonly presets?: readonly (string | number)[];
  /** 互斥组（#1269 条目 3）：**同组最多填一个**——填了任一个，同组其余字段清空并置灰；
   *  清空后其余字段恢复可用。组名在同一场景内唯一（跨字段指同一个组）。用在「给了 A 就不该给 B」
   *  的槽位对上（如 条数 ↔ 近几天）；不在任何组里的字段不受影响。 */
  readonly exclusive_group?: string;
  /** 候选项附注（#1280 初版 · 用户 2026-10-13）：**值 → 行右侧那行小字**（如分类那格印「3 笔」）。
   *  旁路键：`options` 仍是 `string[]`，一个字不动——技能侧生成期按值补一份映射（值＝候选字面量，
   *  小字＝该值的事实，公共层不认识它的含义）；控件渲染时印在行右侧，这份映射里没有的值就不印。
   *  只在候选弹层里印得出来（原生 `<select>` 的一行装不下两段字）⇒ 声明了 `notes` 的格走弹层形态，
   *  与 `allow_new` 无关：`allow_new` 为假时弹层是 pick-only 形态（不出新建／前缀）。 */
  readonly notes?: Readonly<Record<string, string>>;
  /** 候选分组口径（#1280 初版 · 可选，缺省行为不变）：缺省＝值里首个 `/` 前那一段
   *  （没有 `/`、或起手就是 `/` 的归「其他」）；`'none'`＝不分组，前景列表只出一层、不出分组小标题。
   *  公共层只认这两种口径，不推导、不认识领域词。 */
  readonly group_by?: 'slash' | 'none';
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
                            source: { enum: ['tags', 'categories', 'accounts', 'ledgers', 'accountTypes', 'config'] },
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
                            allow_new: { type: 'boolean' },
                            new_prefixes: { type: 'array', items: { type: 'string', minLength: 1 } },
                            create_scene: { type: 'string', minLength: 1 },
                            presets: {
                              type: 'array',
                              items: { oneOf: [{ type: 'string' }, { type: 'number' }] },
                            },
                            exclusive_group: { type: 'string', minLength: 1 },
                            /* 候选项附注（#1280）：**值 → 右侧小字**的映射。子集校验器只认
                               `additionalProperties:false`（不认 schema 形式的 additionalProperties），
                               故这一格只判「是对象」；值是字符串这一条由控件挂载时严格校验（不合即抛）。 */
                            notes: { type: 'object' },
                            group_by: { enum: ['slash', 'none'] },
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
