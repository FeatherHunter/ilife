/** #201 · 作息管家 HELP 内容资产（机器生成，禁手改词）。
 *
 * 唯一内容源：`.scratch/t198/old-scenarios.json`——旧作息管家 HELP 实物里原样取出的场景数据
 * （世代判定与内容骨架见 `docs/skills/skill-schedule/t198-old-help-truth.md`）。
 * 本文件由 `scripts/gen-help-assets.mjs` 生成：5 个一级分组／34 条唤醒词／85 条场景，
 * 分组、唤醒词、场景的先后次序与源数据一致。
 *
 * 载荷契约：`packages/base-render/src/spec/help.ts` 的 `SCENE_DATA_SCHEMA`——`HELP_GROUPS` 就是
 * 共享 help 模板要的 `groups` 参数，分三层：一级分组 → 子功能（＝旧唤醒词）→ 场景卡片。
 * 该 schema 各层都是 `additionalProperties:false`，多一个键即校验失败，故本文件里的对象字段是闭集。
 *
 * 三处形状转换（生成器里写死、可复核）：
 *  1. 源 `dimensions`（参数名 → 说明的自由对象）→ 契约 `editable_fields`：`name`／`label` 取维度键
 *     原名；`hint` 取维度说明原文（逐字；布尔与数字按其 JSON 字面量文本）；`value` 一律空串、
 *     `required` 一律 false——理由见生成器的 `toField`。
 *  2. 源 `status` 为空、但唤醒词属「今天没有命令可执行」的 5 条者，标 `【待开发】`：
 *     源自标待开发 1 条，加上这几条下辖的场景，本文件标 `【待开发】` 的共 11 条。
 *  3. 三层对齐：源「分组 → 唤醒词 → 场景」直接对到契约「groups → subgroups → scenes」，
 *     不合并、不新造分组（用户在 HELP 页里看到的分组与旧技能所见一致）。
 *
 * 票面点名的逐场景「类型」字段（`type`）在本文件里不存在——这是有据的偏离，不是漏了：契约里那个位
 * 叫 `types`（复数、无单数别名，`packages/base-render/src/spec/help.ts` 的 `SCENE_TYPE_FIELD`／
 * `Scene.types`），而源数据的场景字段是闭集（生成器 `SOURCE_SCENE_KEYS`＝wake_word／scenario_id／scenario_title／dimensions／prompt／status／result）、
 * 里面没有类型位，旧实物 HELP 也没有类型徽章——凭空补一个空 `types` 等于自造内容，故不落该字段；
 * 将来源数据真出现类型位，生成器会因字段闭集断言失败而报错（不会静默丢掉）。要变体徽章另开票。
 *
 * 未决的下游风险（留给渲染票 #202 收口；下面是「未决」，不是「已落地」）：契约没有对应位、故不进
 * `HELP_GROUPS` 的两处源信息，今天只有本文件里的伴随表形态——全仓没有消费者，两个渲染出口与
 * `#help-data` 载荷里都取不到 `result`／`desc`：即旧 HELP 页面上用户看得见的「预期 ·」与一级
 * 分组说明，在新产物里今天是不显示的。源场景的 `result` → `HELP_SCENE_RESULTS`；
 * 源一级分组的 `desc` → `HELP_GROUP_NOTES`。#202 要么把它们折进契约既有可见位（例如
 * `meta_blocks[].html`，该位原样透传）渲染出来，要么由用户裁定不显示后把这两张表一并删除；
 * 在那之前不得当作已交付的可见内容。
 * 为什么不塞进载荷：校验器按 `additionalProperties:false` 直接拒收多余键
 * （`packages/base-render/src/help.ts` 的字段闭集判定）；并进 `editable_fields[].hint` 会让
 * 「可编辑参数」这个位变浑浊，且没有维度的场景（`first_use`）无处可放。
 *
 * 计数全部由数据算出（见 `HELP_TOTALS`），本文件不写第二个数；改资产即跟变。
 * 改词走生成器：`node packages/skill-schedule/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 */

/** 参数化表单字段（契约 `editable_fields` 的一条）。 */
export interface HelpSceneField {
  /** 参数名（＝源 `dimensions` 的维度键原名）。 */
  readonly name: string;
  /** 显示标签（源里没有更友好的显示名，同 `name`）。 */
  readonly label: string;
  /** 推荐值（源里没有独立的推荐值字段，一律空串）。 */
  readonly value: string;
  /** 源维度说明原文（逐字）。 */
  readonly hint: string;
  /** 必填（源里没有针对该维度自身的必填标记，一律 false）。 */
  readonly required: boolean;
}

/** 两态状态（契约 `SCENE_STATUS`：空串＝可用，【待开发】＝禁用）。写成联合型，
 *  好让 `HELP_GROUPS` 直接就是共享 help 模板 `SceneData['groups']` 的形状，接线上不做二次转换。 */
export type HelpSceneStatus = '' | '【待开发】';

/** 场景卡片（契约 `scenes[]` 的一条）。 */
export interface HelpSceneAsset {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  readonly status: HelpSceneStatus;
  /** 「复制指令」按钮按出来的正文，逐字照搬源 `prompt`。 */
  readonly prompt_template: string;
  readonly editable_fields: readonly HelpSceneField[];
}

/** 子功能折叠组（契约 `subgroups[]` 的一条；＝旧的一条唤醒词）。 */
export interface HelpSubgroupAsset {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly HelpSceneAsset[];
}

/** 一级分组（契约 `groups[]` 的一条）。 */
export interface HelpGroupAsset {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly subgroups: readonly HelpSubgroupAsset[];
}

/** 5 个一级分组／34 条唤醒词／85 条场景（＝共享 help 模板要的 `groups` 参数）。 */
export const HELP_GROUPS: readonly HelpGroupAsset[] = [
  {
    "id": "write",
    "icon": "📝",
    "label": "写入与同步",
    "subgroups": [
      {
        "id": "write_1",
        "label": "#0 记作息",
        "scenes": [
          {
            "id": "record_add_single",
            "title": "添加单条作息记录",
            "wake_word": "#0 记作息",
            "status": "",
            "prompt_template": "请帮我记一条作息:今天 14:00-15:00 写了 AI 调优代码",
            "editable_fields": [
              {
                "name": "activity",
                "label": "activity",
                "value": "",
                "hint": "任意活动",
                "required": false
              },
              {
                "name": "duration_minutes",
                "label": "duration_minutes",
                "value": "",
                "hint": "1-1440",
                "required": false
              },
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "白名单二级",
                "required": false
              }
            ]
          },
          {
            "id": "record_add_json",
            "title": "通过 JSON 文件批量添加",
            "wake_word": "#0 记作息",
            "status": "",
            "prompt_template": "请帮我批量导入这些作息数据(从 JSON 文件)",
            "editable_fields": [
              {
                "name": "input",
                "label": "input",
                "value": "",
                "hint": "JSON 文件路径",
                "required": false
              }
            ]
          },
          {
            "id": "record_add_illegal_category",
            "title": "category 不在白名单",
            "wake_word": "#0 记作息",
            "status": "【待开发】",
            "prompt_template": "记一笔:14:00 写了代码",
            "editable_fields": [
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "未在白名单的二级",
                "required": false
              }
            ]
          },
          {
            "id": "record_add_l1_only",
            "title": "只传一级 category",
            "wake_word": "#0 记作息",
            "status": "",
            "prompt_template": "请帮我记一条创作类作息",
            "editable_fields": [
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "仅一级(如'创作')",
                "required": false
              }
            ]
          },
          {
            "id": "record_add_missing_field",
            "title": "必填字段缺失",
            "wake_word": "#0 记作息",
            "status": "",
            "prompt_template": "请帮我记一条作息(用户漏说活动名)",
            "editable_fields": [
              {
                "name": "missing",
                "label": "missing",
                "value": "",
                "hint": "任一必填",
                "required": false
              }
            ]
          },
          {
            "id": "batch_add",
            "title": "批量导入作息（JSON 批量写入）",
            "wake_word": "#0 记作息",
            "status": "",
            "prompt_template": "请帮我批量导入这些作息数据（从 JSON 文件）",
            "editable_fields": [
              {
                "name": "input",
                "label": "input",
                "value": "",
                "hint": "JSON 文件路径",
                "required": false
              },
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "目标日期（缺省取当日）",
                "required": false
              },
              {
                "name": "mode",
                "label": "mode",
                "value": "",
                "hint": "一次性批量写入（无唯一键，不幂等）",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "write_2",
        "label": "#1 准备消息",
        "scenes": [
          {
            "id": "prep_default",
            "title": "默认游标到当前时间拉取",
            "wake_word": "#1 准备消息",
            "status": "【待开发】",
            "prompt_template": "请帮我准备今天的消息",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "默认(游标到当前)",
                "required": false
              }
            ]
          },
          {
            "id": "prep_with_range",
            "title": "指定时间区间拉取",
            "wake_word": "#1 准备消息",
            "status": "【待开发】",
            "prompt_template": "请帮我拉 2026-07-20 00:00 到 2026-07-24 23:59 的消息",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "YYYY-MM-DD HH:MM ~ YYYY-MM-DD HH:MM",
                "required": false
              }
            ]
          },
          {
            "id": "prep_pagination",
            "title": "翻页获取下一页",
            "wake_word": "#1 准备消息",
            "status": "【待开发】",
            "prompt_template": "请帮我翻第 3 页",
            "editable_fields": [
              {
                "name": "page",
                "label": "page",
                "value": "",
                "hint": "N",
                "required": false
              }
            ]
          },
          {
            "id": "prep_no_messages",
            "title": "区间内无消息",
            "wake_word": "#1 准备消息",
            "status": "【待开发】",
            "prompt_template": "请帮我准备 2026-07-23 的消息",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "无消息区间",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "write_3",
        "label": "#2 同步作息",
        "scenes": [
          {
            "id": "sync_full",
            "title": "完整同步流程(准备+分析+写入)",
            "wake_word": "#2 同步作息",
            "status": "【待开发】",
            "prompt_template": "请帮我同步今天的消息成作息记录",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "默认",
                "required": false
              }
            ]
          },
          {
            "id": "sync_partial_day",
            "title": "同步指定日期",
            "wake_word": "#2 同步作息",
            "status": "【待开发】",
            "prompt_template": "请帮我同步 2026-07-22 的消息",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "write_4",
        "label": "#3 增量同步",
        "scenes": [
          {
            "id": "sync_incremental",
            "title": "从游标继续",
            "wake_word": "#3 增量同步",
            "status": "【待开发】",
            "prompt_template": "请帮我增量同步(接着上次)",
            "editable_fields": [
              {
                "name": "cursor",
                "label": "cursor",
                "value": "",
                "hint": "上次结束位置",
                "required": false
              }
            ]
          },
          {
            "id": "sync_no_cursor",
            "title": "首次同步无游标",
            "wake_word": "#3 增量同步",
            "status": "【待开发】",
            "prompt_template": "请帮我同步(从未同步过)",
            "editable_fields": [
              {
                "name": "first_time",
                "label": "first_time",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "query",
    "icon": "🔍",
    "label": "查询与浏览",
    "subgroups": [
      {
        "id": "query_1",
        "label": "#4 今天总结",
        "scenes": [
          {
            "id": "summary_full_24h",
            "title": "当日满 24h 出综合报告",
            "wake_word": "#4 今天总结",
            "status": "",
            "prompt_template": "请给我今天总结",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "complete",
                "label": "complete",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          },
          {
            "id": "summary_partial",
            "title": "当日未满 24h 出摘要",
            "wake_word": "#4 今天总结",
            "status": "",
            "prompt_template": "请给我今天总结(还没记完)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "complete",
                "label": "complete",
                "value": "",
                "hint": "false",
                "required": false
              }
            ]
          },
          {
            "id": "summary_specific_date",
            "title": "指定日期总结",
            "wake_word": "#4 今天总结",
            "status": "",
            "prompt_template": "请给我 2026-07-22 的总结",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "summary_no_records",
            "title": "指定日期无记录",
            "wake_word": "#4 今天总结",
            "status": "",
            "prompt_template": "请给我 2026-01-01 的总结",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "records",
                "label": "records",
                "value": "",
                "hint": "0",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_2",
        "label": "#5 汇总作息",
        "scenes": [
          {
            "id": "summary_range_default",
            "title": "日期范围汇总",
            "wake_word": "#5 汇总作息",
            "status": "",
            "prompt_template": "请给我 7/13~7/19 这一周的汇总",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "YYYY-MM-DD ~ YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "summary_range_full",
            "title": "日期范围文本汇总",
            "wake_word": "#5 汇总作息",
            "status": "",
            "prompt_template": "请给我 7/13~7/19 的文本汇总",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "任意范围",
                "required": false
              },
              {
                "name": "format",
                "label": "format",
                "value": "",
                "hint": "text",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_3",
        "label": "#6 查作息",
        "scenes": [
          {
            "id": "record_list_today",
            "title": "今日作息列表",
            "wake_word": "#6 查作息",
            "status": "",
            "prompt_template": "请帮我看看今天我做了什么",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              }
            ]
          },
          {
            "id": "record_list_yesterday",
            "title": "昨日作息",
            "wake_word": "#6 查作息",
            "status": "",
            "prompt_template": "昨天我做了什么",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "昨天",
                "required": false
              }
            ]
          },
          {
            "id": "record_list_specific",
            "title": "指定日期作息",
            "wake_word": "#6 查作息",
            "status": "",
            "prompt_template": "请帮我看看 2026-07-15 我做了什么",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "record_list_empty",
            "title": "指定日期无记录",
            "wake_word": "#6 查作息",
            "status": "",
            "prompt_template": "请帮我看看 2026-07-01 我做了什么",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "records",
                "label": "records",
                "value": "",
                "hint": "0",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_4",
        "label": "#7 查作息详情",
        "scenes": [
          {
            "id": "detail_day",
            "title": "查看某日所有详情",
            "wake_word": "#7 查作息详情",
            "status": "",
            "prompt_template": "请帮我看 7/15 作息详情(含 AI 推理链)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "detail_record",
            "title": "查看单条详情",
            "wake_word": "#7 查作息详情",
            "status": "",
            "prompt_template": "请帮我看 id=123 这条记录详情",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "record_id",
                "value": "",
                "hint": "N",
                "required": false
              }
            ]
          },
          {
            "id": "detail_with_reasoning",
            "title": "查看 AI 推理链",
            "wake_word": "#7 查作息详情",
            "status": "",
            "prompt_template": "请帮我看 7/15 的 AI 是怎么分类的",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "include_reasoning",
                "label": "include_reasoning",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_5",
        "label": "#8 查作息时间轴",
        "scenes": [
          {
            "id": "timeline_today",
            "title": "今日时间轴",
            "wake_word": "#8 查作息时间轴",
            "status": "",
            "prompt_template": "今天时间轴看一下",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              }
            ]
          },
          {
            "id": "timeline_specific",
            "title": "指定日期时间轴",
            "wake_word": "#8 查作息时间轴",
            "status": "",
            "prompt_template": "请帮我看 7/15 的 24h 时间轴",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_6",
        "label": "#9 查作息范围",
        "scenes": [
          {
            "id": "range_default",
            "title": "日期范围统计",
            "wake_word": "#9 查作息范围",
            "status": "",
            "prompt_template": "请帮我看 7/13~7/19 这一周",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "YYYY-MM-DD ~ YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "range_this_week",
            "title": "本周范围",
            "wake_word": "#9 查作息范围",
            "status": "",
            "prompt_template": "请帮我看本周",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "本周(自动计算)",
                "required": false
              }
            ]
          },
          {
            "id": "range_text",
            "title": "范围文本降级",
            "wake_word": "#9 查作息范围",
            "status": "",
            "prompt_template": "请帮我看本周(直接给文本)",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "任意",
                "required": false
              },
              {
                "name": "format",
                "label": "format",
                "value": "",
                "hint": "text",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_7",
        "label": "#11 查作息状态",
        "scenes": [
          {
            "id": "status_default",
            "title": "查整体状态",
            "wake_word": "#11 查作息状态",
            "status": "",
            "prompt_template": "作息状态怎么样",
            "editable_fields": [
              {
                "name": "scope",
                "label": "scope",
                "value": "",
                "hint": "all",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_8",
        "label": "#12 查日程",
        "scenes": [
          {
            "id": "list_events_today",
            "title": "今日日程",
            "wake_word": "#12 查日程",
            "status": "",
            "prompt_template": "请帮我看今天的日程",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              }
            ]
          },
          {
            "id": "list_events_specific",
            "title": "指定日期日程",
            "wake_word": "#12 查日程",
            "status": "",
            "prompt_template": "请帮我看 7/15 的日程",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "search_event_title",
            "title": "按标题搜索日程",
            "wake_word": "#12 查日程",
            "status": "",
            "prompt_template": "今天有健身吗",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "title",
                "label": "title",
                "value": "",
                "hint": "健身",
                "required": false
              }
            ]
          },
          {
            "id": "search_event_triplet",
            "title": "按时间三元组查重",
            "wake_word": "#12 查日程",
            "status": "",
            "prompt_template": "今天 17:00-18:00 有什么安排",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "time_start",
                "label": "time_start",
                "value": "",
                "hint": "HH:MM",
                "required": false
              },
              {
                "name": "time_end",
                "label": "time_end",
                "value": "",
                "hint": "HH:MM",
                "required": false
              }
            ]
          },
          {
            "id": "list_events_inactive",
            "title": "查已软删事件",
            "wake_word": "#12 查日程",
            "status": "",
            "prompt_template": "今天被删的日程有哪些",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "include_inactive",
                "label": "include_inactive",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_9",
        "label": "#15 24h 概览",
        "scenes": [
          {
            "id": "query_plans_today",
            "title": "今日 24h 概览",
            "wake_word": "#15 24h 概览",
            "status": "",
            "prompt_template": "今天 24h 安排概览",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_10",
        "label": "#16 查多日计划",
        "scenes": [
          {
            "id": "query_plans_multi",
            "title": "多日简版",
            "wake_word": "#16 查多日计划",
            "status": "",
            "prompt_template": "请帮我看 7/13、7/14、7/15 三天计划",
            "editable_fields": [
              {
                "name": "dates",
                "label": "dates",
                "value": "",
                "hint": "YYYY-MM-DD,YYYY-MM-DD,...",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_11",
        "label": "#23 按 ID 查记录",
        "scenes": [
          {
            "id": "get_record_basic",
            "title": "按 ID 查单条",
            "wake_word": "#23 按 ID 查记录",
            "status": "",
            "prompt_template": "帮我查 id=123 这条记录",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "record_id",
                "value": "",
                "hint": "N",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "query_12",
        "label": "周视图",
        "scenes": [
          {
            "id": "week_view",
            "title": "周视图(7×24 全分类总览)",
            "wake_word": "周视图",
            "status": "【待开发】",
            "prompt_template": "请帮我看看这一周的作息总览(唤醒词:周视图)",
            "editable_fields": [
              {
                "name": "week",
                "label": "week",
                "value": "",
                "hint": "目标周(默认本周;锚点日期 YYYY-MM-DD)",
                "required": false
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "plan",
    "icon": "📅",
    "label": "日程与计划",
    "subgroups": [
      {
        "id": "plan_1",
        "label": "#13 补计划",
        "scenes": [
          {
            "id": "ensure_event_basic",
            "title": "补一条计划(基础)",
            "wake_word": "#13 补计划",
            "status": "",
            "prompt_template": "帮我补一条计划到后天 17:00-18:00 健身",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "后天",
                "required": false
              },
              {
                "name": "time_start",
                "label": "time_start",
                "value": "",
                "hint": "HH:MM",
                "required": false
              },
              {
                "name": "time_end",
                "label": "time_end",
                "value": "",
                "hint": "HH:MM",
                "required": false
              },
              {
                "name": "title",
                "label": "title",
                "value": "",
                "hint": "X",
                "required": false
              }
            ]
          },
          {
            "id": "ensure_event_idempotent",
            "title": "同时间重复(幂等)",
            "wake_word": "#13 补计划",
            "status": "",
            "prompt_template": "再补一条 17:00-18:00 的健身(已有)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "time_start",
                "label": "time_start",
                "value": "",
                "hint": "HH:MM",
                "required": false
              },
              {
                "name": "time_end",
                "label": "time_end",
                "value": "",
                "hint": "HH:MM",
                "required": false
              }
            ]
          },
          {
            "id": "ensure_event_with_notes",
            "title": "补计划含备注",
            "wake_word": "#13 补计划",
            "status": "",
            "prompt_template": "帮我补明天 17:00-18:00 健身(练背+有氧)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "notes",
                "label": "notes",
                "value": "",
                "hint": "细节",
                "required": false
              },
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "健康.健身",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_2",
        "label": "#14 复盘",
        "scenes": [
          {
            "id": "review_today_normal",
            "title": "今日复盘(标准流程)",
            "wake_word": "#14 复盘",
            "status": "",
            "prompt_template": "请帮我复盘今天",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              }
            ]
          },
          {
            "id": "review_today_all_done",
            "title": "今日已全部复盘",
            "wake_word": "#14 复盘",
            "status": "",
            "prompt_template": "再帮我复盘一下今天",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "completion_all",
                "label": "completion_all",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          },
          {
            "id": "review_no_events",
            "title": "该日无活跃事件",
            "wake_word": "#14 复盘",
            "status": "",
            "prompt_template": "请帮我复盘 2026-07-01",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "events_count",
                "label": "events_count",
                "value": "",
                "hint": "0",
                "required": false
              }
            ]
          },
          {
            "id": "review_with_memo_sync",
            "title": "复盘前先同步备忘录",
            "wake_word": "#14 复盘",
            "status": "",
            "prompt_template": "复盘前先对一下今天的打卡数据",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "今天",
                "required": false
              },
              {
                "name": "memo_cli",
                "label": "memo_cli",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_3",
        "label": "#17 商量计划",
        "scenes": [
          {
            "id": "plan_discuss_tomorrow",
            "title": "商量明天计划",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "商量一下明天的计划",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              }
            ]
          },
          {
            "id": "plan_with_locked",
            "title": "商量时已有部分事件",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "帮我重新商量明天的计划(已有 4 条)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "existing_events",
                "label": "existing_events",
                "value": "",
                "hint": "4",
                "required": false
              }
            ]
          },
          {
            "id": "plan_with_wish",
            "title": "商量时拉心愿清单",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "商量明天(把心愿 X 安排进去)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "memo_cli",
                "label": "memo_cli",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          },
          {
            "id": "plan_24h_coverage_fail",
            "title": "覆盖校验失败",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "商量明天计划(生成的事件有空隙)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "gap_or_overlap",
                "label": "gap_or_overlap",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          },
          {
            "id": "plan_feishu_sync",
            "title": "商量后飞书同步",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "商量后顺便同步到飞书",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "feishu",
                "label": "feishu",
                "value": "",
                "hint": "full",
                "required": false
              }
            ]
          },
          {
            "id": "plan_result_tomorrow",
            "title": "制定次日计划(结果强化)",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "帮我制定明天的计划,生成计划结果 HTML",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "history_days",
                "label": "history_days",
                "value": "",
                "hint": "7",
                "required": false
              },
              {
                "name": "candidates",
                "label": "candidates",
                "value": "",
                "hint": "6-10 段",
                "required": false
              }
            ]
          },
          {
            "id": "plan_result_adjust",
            "title": "制定计划后调整再生成",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "把第 2 段改成 19:00 开始,再生成一次",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "round",
                "label": "round",
                "value": "",
                "hint": "2-N",
                "required": false
              }
            ]
          },
          {
            "id": "plan_result_history_none",
            "title": "无历史作息参考",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "帮我制定明天的计划(新环境,没有历史记录)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "history_days",
                "label": "history_days",
                "value": "",
                "hint": "7",
                "required": false
              },
              {
                "name": "no_history",
                "label": "no_history",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          },
          {
            "id": "plan_result_conflict",
            "title": "候选与已锁定事件冲突",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "商量明天的计划(已有 2 条已锁定)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "locked_events",
                "label": "locked_events",
                "value": "",
                "hint": "2",
                "required": false
              },
              {
                "name": "conflict",
                "label": "conflict",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          },
          {
            "id": "plan_result_drift",
            "title": "与历史习惯偏离",
            "wake_word": "#17 商量计划",
            "status": "",
            "prompt_template": "明天把下午改成运动(历史下午都是工作)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "明天",
                "required": false
              },
              {
                "name": "drift",
                "label": "drift",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_4",
        "label": "#18 改计划",
        "scenes": [
          {
            "id": "update_event_basic",
            "title": "改单个事件字段",
            "wake_word": "#18 改计划",
            "status": "",
            "prompt_template": "改 id=544 这条的 title 为健身(上午)",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "event_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "fields",
                "label": "fields",
                "value": "",
                "hint": "[\"title\",\"notes\"]",
                "required": false
              }
            ]
          },
          {
            "id": "update_event_time",
            "title": "改时段(飞书删旧建新)",
            "wake_word": "#18 改计划",
            "status": "",
            "prompt_template": "把 id=544 改成 17:30-18:30",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "event_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "time_start",
                "label": "time_start",
                "value": "",
                "hint": "HH:MM",
                "required": false
              },
              {
                "name": "time_end",
                "label": "time_end",
                "value": "",
                "hint": "HH:MM",
                "required": false
              }
            ]
          },
          {
            "id": "update_event_completion",
            "title": "改 completion",
            "wake_word": "#18 改计划",
            "status": "",
            "prompt_template": "把 id=544 标已完成",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "event_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "completion",
                "label": "completion",
                "value": "",
                "hint": "已完成",
                "required": false
              }
            ]
          },
          {
            "id": "update_event_feishu_ask",
            "title": "改后飞书询问",
            "wake_word": "#18 改计划",
            "status": "",
            "prompt_template": "改 id=544 的 title(已同步飞书)",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "event_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "feishu_synced",
                "label": "feishu_synced",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_5",
        "label": "#19 删计划",
        "scenes": [
          {
            "id": "deactivate_event",
            "title": "软删事件",
            "wake_word": "#19 删计划",
            "status": "",
            "prompt_template": "删 id=544 这条计划",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "event_id",
                "value": "",
                "hint": "N",
                "required": false
              }
            ]
          },
          {
            "id": "deactivate_with_feishu",
            "title": "软删 + 飞书删",
            "wake_word": "#19 删计划",
            "status": "",
            "prompt_template": "删 id=544(已同步飞书)",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "event_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "feishu_synced",
                "label": "feishu_synced",
                "value": "",
                "hint": "true",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_6",
        "label": "#20 日程管家同步",
        "scenes": [
          {
            "id": "feishu_resync_basic",
            "title": "反向对账+diff 询问",
            "wake_word": "#20 日程管家同步",
            "status": "",
            "prompt_template": "请帮我同步今天的日程到飞书",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_7",
        "label": "复盘今日",
        "scenes": [
          {
            "id": "replay_day",
            "title": "复盘今日(计划 vs 实际对照 + 叙事 + 单日健康分)",
            "wake_word": "复盘今日",
            "status": "",
            "prompt_template": "请帮我复盘今天(唤醒词:复盘今日)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "单日 YYYY-MM-DD(默认今天)",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_8",
        "label": "复盘本周",
        "scenes": [
          {
            "id": "replay_week",
            "title": "复盘本周(7 维趋势 + 热力图 + 健康分均值)",
            "wake_word": "复盘本周",
            "status": "",
            "prompt_template": "请帮我复盘本周(唤醒词:复盘本周)",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "本周一~周日(自动换算)",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_9",
        "label": "复盘本月",
        "scenes": [
          {
            "id": "replay_month",
            "title": "复盘本月(月度聚合 + 环比对比 + 目标达成)",
            "wake_word": "复盘本月",
            "status": "",
            "prompt_template": "请帮我复盘本月(唤醒词:复盘本月)",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "本月 1 日~月末(自动换算)",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "plan_10",
        "label": "复盘区间",
        "scenes": [
          {
            "id": "replay_range",
            "title": "复盘区间(任意区间跨域复盘 · 原 start-end)",
            "wake_word": "复盘区间",
            "status": "",
            "prompt_template": "请帮我复盘 2026-07-13~2026-07-19(唤醒词:复盘区间)",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "任意 start-end(预置 上周/上月/今年/上年 + 自由区间语法)",
                "required": false
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "analyze",
    "icon": "🔬",
    "label": "分析与洞察",
    "subgroups": [
      {
        "id": "analyze_1",
        "label": "#24 写作息摘要",
        "scenes": [
          {
            "id": "add_summary_basic",
            "title": "写摘要",
            "wake_word": "#24 写作息摘要",
            "status": "",
            "prompt_template": "帮我写摘要:2026-07-22 工作.AI调优 60 分钟",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "X",
                "required": false
              },
              {
                "name": "total_minutes",
                "label": "total_minutes",
                "value": "",
                "hint": "N",
                "required": false
              }
            ]
          },
          {
            "id": "add_summary_idempotent",
            "title": "同 date+category upsert",
            "wake_word": "#24 写作息摘要",
            "status": "",
            "prompt_template": "再写一次(已有)",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "X",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_2",
        "label": "#25 对比两个月",
        "scenes": [
          {
            "id": "compare_months",
            "title": "整月对比",
            "wake_word": "#25 对比两个月",
            "status": "",
            "prompt_template": "6 月和 7 月对比",
            "editable_fields": [
              {
                "name": "month_a",
                "label": "month_a",
                "value": "",
                "hint": "YYYY-MM",
                "required": false
              },
              {
                "name": "month_b",
                "label": "month_b",
                "value": "",
                "hint": "YYYY-MM",
                "required": false
              }
            ]
          },
          {
            "id": "compare_range",
            "title": "任意范围对比",
            "wake_word": "#25 对比两个月",
            "status": "",
            "prompt_template": "上周和这周对比",
            "editable_fields": [
              {
                "name": "label_a",
                "label": "label_a",
                "value": "",
                "hint": "X",
                "required": false
              },
              {
                "name": "range_a",
                "label": "range_a",
                "value": "",
                "hint": "YYYY-MM-DD ~ YYYY-MM-DD",
                "required": false
              },
              {
                "name": "label_b",
                "label": "label_b",
                "value": "",
                "hint": "Y",
                "required": false
              },
              {
                "name": "range_b",
                "label": "range_b",
                "value": "",
                "hint": "YYYY-MM-DD ~ YYYY-MM-DD",
                "required": false
              }
            ]
          },
          {
            "id": "compare_week_vs_week",
            "title": "周对比",
            "wake_word": "#25 对比两个月",
            "status": "",
            "prompt_template": "上周和这周差多少",
            "editable_fields": [
              {
                "name": "label_a",
                "label": "label_a",
                "value": "",
                "hint": "上周",
                "required": false
              },
              {
                "name": "range_a",
                "label": "range_a",
                "value": "",
                "hint": "周一~周日",
                "required": false
              },
              {
                "name": "label_b",
                "label": "label_b",
                "value": "",
                "hint": "本周",
                "required": false
              },
              {
                "name": "range_b",
                "label": "range_b",
                "value": "",
                "hint": "周一~周日",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_3",
        "label": "#26 修正作息",
        "scenes": [
          {
            "id": "amend_basic",
            "title": "改 1 条记录多字段",
            "wake_word": "#26 修正作息",
            "status": "",
            "prompt_template": "这条记错了,改成工作.AI调优,活动是写代码",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "record_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "fields",
                "label": "fields",
                "value": "",
                "hint": "[\"category\",\"activity\"]",
                "required": false
              }
            ]
          },
          {
            "id": "amend_json_inline",
            "title": "JSON 内联修改",
            "wake_word": "#26 修正作息",
            "status": "",
            "prompt_template": "用 JSON 改 id=123 的多字段",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "record_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "json",
                "label": "json",
                "value": "",
                "hint": "...",
                "required": false
              }
            ]
          },
          {
            "id": "amend_24h_warn",
            "title": "超过 24h 修改警告",
            "wake_word": "#26 修正作息",
            "status": "",
            "prompt_template": "改 3 天前那条记录(超 24h)",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "record_id",
                "value": "",
                "hint": "N",
                "required": false
              },
              {
                "name": "record_date",
                "label": "record_date",
                "value": "",
                "hint": "24h 前",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_4",
        "label": "T4 类别深挖",
        "scenes": [
          {
            "id": "category_range",
            "title": "区间内某分类深挖",
            "wake_word": "T4 类别深挖",
            "status": "",
            "prompt_template": "这周健身什么时候做的",
            "editable_fields": [
              {
                "name": "range",
                "label": "range",
                "value": "",
                "hint": "YYYY-MM-DD ~ YYYY-MM-DD",
                "required": false
              },
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "X",
                "required": false
              }
            ]
          },
          {
            "id": "category_day",
            "title": "单日某分类",
            "wake_word": "T4 类别深挖",
            "status": "",
            "prompt_template": "7/15 健身什么时候做的",
            "editable_fields": [
              {
                "name": "date",
                "label": "date",
                "value": "",
                "hint": "YYYY-MM-DD",
                "required": false
              },
              {
                "name": "category",
                "label": "category",
                "value": "",
                "hint": "X",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_5",
        "label": "T5 异常检测",
        "scenes": [
          {
            "id": "anomaly_default",
            "title": "默认 7 天窗口检测",
            "wake_word": "T5 异常检测",
            "status": "",
            "prompt_template": "最近状态怎么样/有没有异常",
            "editable_fields": [
              {
                "name": "window",
                "label": "window",
                "value": "",
                "hint": "7",
                "required": false
              }
            ]
          },
          {
            "id": "anomaly_window_30",
            "title": "30 天窗口",
            "wake_word": "T5 异常检测",
            "status": "",
            "prompt_template": "最近 30 天有没有异常",
            "editable_fields": [
              {
                "name": "window",
                "label": "window",
                "value": "",
                "hint": "30",
                "required": false
              }
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "admin",
    "icon": "⚙️",
    "label": "辅助与管理",
    "subgroups": [
      {
        "id": "admin_1",
        "label": "#21 飞书探测",
        "scenes": [
          {
            "id": "feishu_probe",
            "title": "三档探测",
            "wake_word": "#21 飞书探测",
            "status": "",
            "prompt_template": "飞书能力怎么样",
            "editable_fields": [
              {
                "name": "scope",
                "label": "scope",
                "value": "",
                "hint": "cli/auth/calendar",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "admin_2",
        "label": "#22 初始化数据库",
        "scenes": [
          {
            "id": "init_default",
            "title": "建三表",
            "wake_word": "#22 初始化数据库",
            "status": "",
            "prompt_template": "帮我初始化数据库",
            "editable_fields": [
              {
                "name": "scope",
                "label": "scope",
                "value": "",
                "hint": "all",
                "required": false
              }
            ]
          }
        ]
      },
      {
        "id": "admin_3",
        "label": "首次使用",
        "scenes": [
          {
            "id": "first_use",
            "title": "首次使用(初始化工作流)",
            "wake_word": "首次使用",
            "status": "【待开发】",
            "prompt_template": "请帮我初始化作息管家,我是第一次使用(唤醒词:首次使用)",
            "editable_fields": []
          }
        ]
      }
    ]
  }
];

/** 扁平 85 条（顺序与 HELP 分组一致；单源派生，不重复落词）。 */
export const HELP_ASSETS: readonly HelpSceneAsset[] = HELP_GROUPS.flatMap((g) =>
  g.subgroups.flatMap((s) => s.scenes),
);

/** 源场景 `result` 原文（85/85，键＝场景 id）。契约里没有这个位，故不进 `HELP_GROUPS`；
 *  今天无消费者、不进任何渲染出口（见文件头「未决的下游风险」，归 #202）。 */
export const HELP_SCENE_RESULTS: Readonly<Record<string, string>> = {
  "record_add_single": "写入 1 条作息记录,自动生成三件套结果 HTML(全天时间轴 + 过去几小时推断高亮 + 状态总览)",
  "record_add_json": "逐条校验后写入,自动生成三件套结果 HTML(多条记录;批量场景由「批量导入」强化)",
  "record_add_illegal_category": "校验会报错,提示'提议新增 X'等心法 #5 申请流程,不生成结果 HTML",
  "record_add_l1_only": "写入成功但附加 warning:建议细化到二级,三件套结果 HTML 顶部显示警示条",
  "record_add_missing_field": "校验报错,提示缺哪个字段 + 当前值 + 期望值,不生成结果 HTML",
  "batch_add": "逐条校验复用 add 链路（batch-add 命令）后写入，单条失败不打断，返回 ok/partial JSON 回执；重复执行会重复插入",
  "prep_default": "返回分页消息(默认 200 条/页)",
  "prep_with_range": "返回该区间分页消息",
  "prep_pagination": "返回第 3 页消息 + pagination.has_next 提示",
  "prep_no_messages": "返回空列表,AI 应告知无消息",
  "sync_full": "AI 拉消息→分析→批量写入,每条生成回执 HTML",
  "sync_partial_day": "同步该日全量消息",
  "sync_incremental": "从 get_last_record_full 拿游标继续",
  "sync_no_cursor": "从最早消息开始同步",
  "summary_full_24h": "生成 record_day.html 综合报告(分类/时长/24h 时间轴/睡眠/AI 钩子)",
  "summary_partial": "生成简短摘要 + 提示'补全后再看完整报告'",
  "summary_specific_date": "生成该日 report",
  "summary_no_records": "报告空态,提示该日无记录",
  "summary_range_default": "生成 record_range.html(分类聚合+7维趋势+睡眠统计)",
  "summary_range_full": "生成纯文本分类聚合",
  "record_list_today": "生成 record_day.html(4 卡摘要+分类进度+时间轴+睡眠)",
  "record_list_yesterday": "生成昨日 report_day.html",
  "record_list_specific": "生成该日 record_day.html",
  "record_list_empty": "生成空态 HTML,提示该日无记录",
  "detail_day": "生成 record_detail.html(每条记录 11 字段全展开)",
  "detail_record": "生成 record_detail.html(单条)",
  "detail_with_reasoning": "详情页 analysis_reasoning 字段完整展示",
  "timeline_today": "生成 record_day.html(24h 时间轴高亮)",
  "timeline_specific": "生成该日 report 含时间轴",
  "range_default": "生成 record_range.html",
  "range_this_week": "本周一~周日 record_range.html",
  "range_text": "纯文本分类聚合",
  "status_default": "5 行文本(记录数/天数/最早/最近/同步状态)",
  "list_events_today": "生成 plan_list_events.html(24h 时间轴+事件卡+筛选)",
  "list_events_specific": "生成该日 plan_list_events.html",
  "search_event_title": "返回 search 结果(命中/未命中 JSON)",
  "search_event_triplet": "返回该时间槽事件(JSON)",
  "list_events_inactive": "返回含 ✗ 前缀的事件",
  "query_plans_today": "生成 plan_list_events.html(query-plans 模式,同小时 + 合并)",
  "query_plans_multi": "生成多日聚合 plan_list_events.html(不含 notes/completion/飞书状态)",
  "get_record_basic": "render-records-detail --record-id 123 → record_detail.html",
  "week_view": "render-record-week [日期] → 7×24 全分类热力图(复用 record_category 组件)+ 分类总览 + 每日汇总 + 健康分 + 复制 prompt 按钮",
  "ensure_event_basic": "ensure-plan-event → 生成 plan_receipt_add.html",
  "ensure_event_idempotent": "幂等命中,返回原 event_id,不重复创建",
  "ensure_event_with_notes": "ensure-plan-event with notes → receipt HTML",
  "review_today_normal": "list-events → 逐条 update-event --completion → render-plans-review.html",
  "review_today_all_done": "跳过 Step 0-5,直接进 Step 6 讨论模式",
  "review_no_events": "提示'该日没有计划,无法复盘',退出",
  "review_with_memo_sync": "询问用户是否已执行 /备忘录 备忘录同步",
  "plan_discuss_tomorrow": "多轮对话 → render-plans-preview.html → 用户确认 → upsert-plan-events → plan_receipt_write.html",
  "plan_with_locked": "Step 2 列出已有事件,询问保留策略,锁定后填空隙",
  "plan_with_wish": "Step 3 拉备忘·心愿,询问已完成的 + 本次推进的",
  "plan_24h_coverage_fail": "24h 联合校验失败,提示具体哪条不连续/越界,重新生成",
  "plan_feishu_sync": "CLI 探测后询问[Y/n],yes 则 diff_and_sync 批量 create + 回写 event_id",
  "plan_result_tomorrow": "多轮对话 → plan-result 渲染(时间轴+分类色带+历史贴合提示)→ 复制 prompt → upsert-plan-events → plan_receipt_write.html",
  "plan_result_adjust": "调整候选 → 再调 plan-result(同秒多版 _2/_3 不覆盖)→ 循环直至满意 → 写库",
  "plan_result_history_none": "历史窗口无记录 → 贴合率显示\"—\",逐段\"无参考\"提示,不降级仍可写库",
  "plan_result_conflict": "冲突段红色徽章 + §3 冲突清单,提示调整时段或更新已锁定后重新生成",
  "plan_result_drift": "偏离段显示「⚠️ 偏离」+ 历史主要分类提示,用户确认是刻意安排后仍可写库",
  "update_event_basic": "update-event → render-plan-receipt.html",
  "update_event_time": "飞书删旧 event_id + 建新 event_id + 回写新 feishu_event_id",
  "update_event_completion": "update-event --completion,生成 receipt HTML",
  "update_event_feishu_ask": "询问'飞书那边也要改吗?',yes 则飞书 +update",
  "deactivate_event": "deactivate-event → is_active=0 → render-plan-receipt.html",
  "deactivate_with_feishu": "软删 + 询问飞书删,yes 则 feishu_delete_event + 清空 feishu_event_id",
  "feishu_resync_basic": "Phase 0 反向对账 → diff create/update/delete → 逐条询问 [Y/n] → 执行",
  "replay_day": "render-replay <今日> <今日> --granularity day → 一体模板今日区块:计划 vs 实际对照表 + 实际作息 + 健康分;缺计划 → 补齐引导(不降级);底部复盘→制定明日计划衔接",
  "replay_week": "render-replay <周一> <周日> --granularity week → 一体模板周区块:7 维趋势折线 + 24h×N 热力图 + 健康分均值趋势 + 亮点/问题",
  "replay_month": "render-replay <月初> <月末> --granularity month → 一体模板月区块:分类聚合 + 环比对比(vs 上月同期) + 目标达成(完成率 + 维持占比) + 健康分趋势",
  "replay_range": "render-replay <start> <end>(默认粒度 range)→ 一体模板按区间跨度自动路由区块(≤1天→今日 / ≤7天→周 / ≤31天→月 / 其他→通用 4 段叙事)",
  "add_summary_basic": "add-summary 写入 daily_summary(解决孤儿表问题)",
  "add_summary_idempotent": "upsert,total_minutes 覆盖",
  "compare_months": "render-record-compare-months → record_compare.html(4 卡+7维差异柱+AI 钩子)",
  "compare_range": "render-record-compare → record_compare.html",
  "compare_week_vs_week": "render-record-compare 自动计算 + record_compare.html",
  "amend_basic": "amend-record → render-record-receipt-edit.html(蓝调 diff)",
  "amend_json_inline": "amend-record --json '{...}' → 蓝调 diff",
  "amend_24h_warn": "写入成功但附加 warning:操作规范建议 24h 内",
  "category_range": "render-record-category-range → record_category.html(24h × N 天热力图)",
  "category_day": "render-record-category → record_category.html",
  "anomaly_default": "render-record-anomaly → record_anomaly.html(7 维雷达 + 红/黄框异常)",
  "anomaly_window_30": "render-record-anomaly --window 30 → record_anomaly.html",
  "feishu_probe": "返回 FeishuStatus( cli_installed/authenticated/calendar_writable/tier=full/partial/missing )",
  "init_default": "创建 schedule_records / daily_summary / schedule_plans 三表",
  "first_use": "6 步向导(环境检测→路径确认→建库→状态确认→初始化报告→完成),幂等可重试,已有库不重置;飞书强引导(配合飞书效果最好,拒绝才跳过);初始化报告 HTML + 复制数据/复制日志"
};

/** 源一级分组 `desc` 原文（5/5，键＝分组 id）。同上：契约里没有这个位，
 *  今天无消费者、不进任何渲染出口（见文件头「未决的下游风险」，归 #202）。 */
export const HELP_GROUP_NOTES: Readonly<Record<string, string>> = {
  "write": "记录作息 / 同步消息 / 增量同步",
  "query": "查作息 / 查日程 / 查状态 / 时间轴 / 范围",
  "plan": "计划 CRUD / 商量 / 复盘 / 飞书同步",
  "analyze": "对比 / 修正 / 类别深挖 / 异常检测 / 摘要",
  "admin": "飞书探测 / 初始化数据库"
};

/** 计数（全部由数据算出；改资产即跟变，内容另由测试里的摘要锁钉住）。 */
export const HELP_TOTALS = Object.freeze({
  groups: HELP_GROUPS.length,
  subgroups: HELP_GROUPS.reduce((n, g) => n + g.subgroups.length, 0),
  scenes: HELP_ASSETS.length,
  pending: HELP_ASSETS.filter((s) => s.status !== '').length,
});
