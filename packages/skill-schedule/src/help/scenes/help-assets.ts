/** #201 · 作息管家 HELP 内容资产（机器生成，禁手改词）。
 *
 * 两个源（分工写死在生成器里，可复核）：
 *  1. **结构**取自受跟踪 fixture `test/fixtures/t198-old-scenarios.json`（老实物取证，一个字不改）：
 *     分组／唤醒词／场景的条数与先后次序、场景 id、待开发状态；
 *  2. **内容**取自 `scripts/help-rewrite-table.mjs`（#975 逐句重写表）：标题／唤醒词／prompt 正文／字段表。
 * 本文件由 `scripts/gen-help-assets.mjs` 生成：5 个一级分组／34 条唤醒词／85 条场景。
 *
 * 载荷契约：`packages/base-render/src/spec/help.ts` 的 `SCENE_DATA_SCHEMA`——`HELP_GROUPS` 就是
 * 共享 help 模板要的 `groups` 参数，分三层：一级分组 → 子功能（＝一条唤醒词）→ 场景卡片。
 * 该 schema 各层都是 `additionalProperties:false`，多一个键即校验失败，故本文件里的对象字段是闭集。
 *
 * 两处派生（生成器里写死、可复核）：
 *  1. 唤醒词去序号：老 HELP 的 `#0 记作息`／`T4 类别深挖` → 裸词 `记作息`／`类别深挖`
 *     （与路由表 `src/triggers/routes.generated.ts` 的 `phrase` 同形）。重写表里写的就是裸词，
 *     生成器另有「表里的唤醒词必须等于源去序号后的裸词」一条断言把两边钉在一起。
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
 * **不立字段的两种东西**（#975 重写时从老 `dimensions` 里摘掉的，逐条在重写表里具名声明）：
 *  · 场景条件开关：`true`／`false`／`已有 4 条` 这类**描述当前局面**的值——它们不是用户要填的参数，
 *    进意图句（让 AI 自己看局面），立成字段＝逼用户去描述 AI 自己能看出来的事；
 *  · 口径层**自算**的值：`duration_minutes` 由起止时刻算，`src/policy/record.ts:99-104` 还会核对
 *    用户给的值——立成字段只会让用户填错就报错。
 *  硬门：老维度名既不在新字段、又没写进重写表的 `drops` ⇒ 生成器 fail-closed（信息不丢失台账）；
 *  老维度表本身不全（多数场景缺 date／time_start 这类必填位），故只查「不丢」一个方向，新增不拦。
 *
 * 本文件**不再带**老的两张伴随表（`HELP_SCENE_RESULTS`＝场景 `result` 镜像／`HELP_GROUP_NOTES`＝
 * 一级分组 `desc` 镜像）：用户 2026-09-27 裁定「以后不再有预期这种 UI 显示和装填的内容，和预期相关的
 * 直接删掉」。老文本仍完整躺在 fixture 里，留档由那份取证承担，不在产物里再镜像一遍。
 *
 * 计数全部由数据算出（见 `HELP_TOTALS`），本文件不写第二个数；改资产即跟变。
 * 改词走生成器：`node packages/skill-schedule/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 */

/** 参数化表单字段（契约 `editable_fields` 的一条；#975 起带 kind 与控件附属）。 */
export interface HelpSceneField {
  /** 机器键：正文里的 `{{name}}` 与复制载荷末尾 `label: value` 行的 key 都用它（ASCII snake_case）。 */
  readonly name: string;
  /** 人类可读标签（进复制载荷的 `label: value` 行；不列枚举／单位／格式）。 */
  readonly label: string;
  /** 缺省机器值——一律空串。相对默认词（今天／明天）写在 `hint` 里，由执行侧解成 ISO。 */
  readonly value: string;
  /** 输入类型（`packages/base-render/src/spec/help.ts` 的 `SceneFieldKind`）：
   *  text／number／select／date／week／month／year／time。 */
  readonly kind: string;
  /** 必填：空的必填项挡住「复制指令」并提示补齐（模板 `getMissing`）。 */
  readonly required: boolean;
  /** 格式／例／默认值说明（一句话；单位与枚举不进标签，进这里）。 */
  readonly hint?: string;
  /** 仅 `select`：候选项（必填非空）。 */
  readonly options?: readonly string[];
  /** 仅 `number`：值域与步长。 */
  readonly min?: number;
  readonly max?: number;
  readonly step?: number;
  /** 控件占位提示。 */
  readonly placeholder?: string;
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
        "label": "记作息",
        "scenes": [
          {
            "id": "record_add_single",
            "title": "记一条作息",
            "wake_word": "记作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「记作息」。\n\n我刚做完一件事,帮我记一条作息。如果我没说全日期或起止时刻,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}\n开始时刻:{{time_start}}\n结束时刻:{{time_end}}\n做了什么:{{activity}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD，如 2026-09-27"
              },
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 14:00"
              },
              {
                "name": "time_end",
                "label": "结束时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 15:00；须晚于开始时刻"
              },
              {
                "name": "activity",
                "label": "做了什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 写 AI 调优代码"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的二级分类，如 工作.AI调优；只写一级会提示细化"
              }
            ]
          },
          {
            "id": "record_add_json",
            "title": "从 JSON 文件导入",
            "wake_word": "记作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「记作息」。\n\n我要从这个 JSON 文件批量导入作息数据。如果字段没对上,告诉我哪一条差什么。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n文件路径:{{input}}",
            "editable_fields": [
              {
                "name": "input",
                "label": "文件路径",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "JSON 文件路径,如 D:\\\\data\\\\records.json"
              }
            ]
          },
          {
            "id": "record_add_illegal_category",
            "title": "分类不在白名单里",
            "wake_word": "记作息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「记作息」。\n\n我要记一条分类不在白名单里的作息,看看会怎么提示我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始时刻:{{time_start}}\n做了什么:{{activity}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 14:00"
              },
              {
                "name": "activity",
                "label": "做了什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 写代码"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "写一个不在白名单里的二级分类,如 娱乐.游戏"
              }
            ]
          },
          {
            "id": "record_add_l1_only",
            "title": "只写到一级分类",
            "wake_word": "记作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「记作息」。\n\n我只写一级分类,看看会不会提示我细化。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n做了什么:{{activity}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "activity",
                "label": "做了什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 写代码"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "只写一级,如 创作"
              }
            ]
          },
          {
            "id": "record_add_missing_field",
            "title": "漏说了一样必填的",
            "wake_word": "记作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「记作息」。\n\n我记一条作息,但漏说了一样必填的,看看会不会问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          },
          {
            "id": "batch_add",
            "title": "一次导入一批",
            "wake_word": "记作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「记作息」。\n\n我要一次导入一批作息数据(没有唯一键,重复执行会重复插入)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n文件路径:{{input}}\n目标日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "input",
                "label": "文件路径",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "JSON 文件路径,如 D:\\\\data\\\\batch.json"
              },
              {
                "name": "date",
                "label": "目标日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD"
              }
            ]
          }
        ]
      },
      {
        "id": "write_2",
        "label": "准备消息",
        "scenes": [
          {
            "id": "prep_default",
            "title": "从上次游标拉到当前",
            "wake_word": "准备消息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「准备消息」。\n\n帮我把消息准备到当前时间(接着上次的位置)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          },
          {
            "id": "prep_with_range",
            "title": "按区间拉取消息",
            "wake_word": "准备消息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「准备消息」。\n\n我要把某一段时间的聊天消息拉出来备用。起止都按整天算。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:{{start_date}}\n结束日期:{{end_date}}",
            "editable_fields": [
              {
                "name": "start_date",
                "label": "开始日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-20；含当天 00:00"
              },
              {
                "name": "end_date",
                "label": "结束日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-24；含当天 23:59"
              }
            ]
          },
          {
            "id": "prep_pagination",
            "title": "往后翻一页",
            "wake_word": "准备消息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「准备消息」。\n\n帮我往后翻页看更早的消息。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n页码:{{page}}",
            "editable_fields": [
              {
                "name": "page",
                "label": "页码",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "第几页,从 1 开始,如 3",
                "min": 1
              }
            ]
          },
          {
            "id": "prep_no_messages",
            "title": "这一天没有消息",
            "wake_word": "准备消息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「准备消息」。\n\n我要拉某一天的消息(那天没有消息,看看会怎么回我)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-23"
              }
            ]
          }
        ]
      },
      {
        "id": "write_3",
        "label": "同步作息",
        "scenes": [
          {
            "id": "sync_full",
            "title": "把消息同步成作息记录",
            "wake_word": "同步作息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「同步作息」。\n\n把我今天的消息同步成作息记录(准备、分析、写入一条龙)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "sync_partial_day",
            "title": "同步指定那一天",
            "wake_word": "同步作息",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「同步作息」。\n\n把指定那天的消息同步成作息记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-22"
              }
            ]
          }
        ]
      },
      {
        "id": "write_4",
        "label": "增量同步",
        "scenes": [
          {
            "id": "sync_incremental",
            "title": "接着上次继续同步",
            "wake_word": "增量同步",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「增量同步」。\n\n接着上次结束的位置继续增量同步。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          },
          {
            "id": "sync_no_cursor",
            "title": "第一次同步没有游标",
            "wake_word": "增量同步",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「增量同步」。\n\n我从来没同步过,从最早的消息开始同步。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
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
        "label": "今天总结",
        "scenes": [
          {
            "id": "summary_full_24h",
            "title": "一整天记满的回顾",
            "wake_word": "今天总结",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「今天总结」。\n\n我要今天一整天的作息综合报告,这一天已经记满 24 小时。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "summary_partial",
            "title": "还没记完的当天小结",
            "wake_word": "今天总结",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「今天总结」。\n\n我要今天的作息小结,这一天还没记完,先按已有的记录给。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "summary_specific_date",
            "title": "指定某天的总结",
            "wake_word": "今天总结",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「今天总结」。\n\n我要某一天的作息总结。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-22"
              }
            ]
          },
          {
            "id": "summary_no_records",
            "title": "那天一条记录都没有",
            "wake_word": "今天总结",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「今天总结」。\n\n我要某一天的作息总结,那天一条记录都没有,如实告诉我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-22"
              }
            ]
          }
        ]
      },
      {
        "id": "query_2",
        "label": "汇总作息",
        "scenes": [
          {
            "id": "summary_range_default",
            "title": "一段日期的作息汇总",
            "wake_word": "汇总作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「汇总作息」。\n\n我要一段日期的作息汇总。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:{{start_date}}\n结束日期:{{end_date}}",
            "editable_fields": [
              {
                "name": "start_date",
                "label": "开始日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-13；含当天"
              },
              {
                "name": "end_date",
                "label": "结束日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-19；不早于开始日期"
              }
            ]
          },
          {
            "id": "summary_range_full",
            "title": "一段时间的文本汇总",
            "wake_word": "汇总作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「汇总作息」。\n\n我要一段时间的作息汇总,直接回文本,不用出页面。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围:{{range}}",
            "editable_fields": [
              {
                "name": "range",
                "label": "时间范围",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "接受 本周、上周、上月 这类相对词，也可写起止日期"
              }
            ]
          }
        ]
      },
      {
        "id": "query_3",
        "label": "查作息",
        "scenes": [
          {
            "id": "record_list_today",
            "title": "今天做过什么",
            "wake_word": "查作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息」。\n\n我想看看今天我做了什么。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "record_list_yesterday",
            "title": "昨天做过什么",
            "wake_word": "查作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息」。\n\n我想看看昨天我做了什么。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝昨天；填了必须是 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "record_list_specific",
            "title": "某一天做过什么",
            "wake_word": "查作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息」。\n\n我想看看某一天我做了什么。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-15"
              }
            ]
          },
          {
            "id": "record_list_empty",
            "title": "那天没有任何记录",
            "wake_word": "查作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息」。\n\n我想看看某一天我做了什么,那天一条记录都没有,如实告诉我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-01"
              }
            ]
          }
        ]
      },
      {
        "id": "query_4",
        "label": "查作息详情",
        "scenes": [
          {
            "id": "detail_day",
            "title": "某一天的全部详情",
            "wake_word": "查作息详情",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息详情」。\n\n我要看某一天的全部作息详情,每条记录都展开。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-15"
              }
            ]
          },
          {
            "id": "detail_record",
            "title": "这条记录的完整详情",
            "wake_word": "查作息详情",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息详情」。\n\n我要看某一条记录的完整详情。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{record_id}}",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 123；从查作息或时间轴里取",
                "min": 1
              }
            ]
          },
          {
            "id": "detail_with_reasoning",
            "title": "某一天的分类依据",
            "wake_word": "查作息详情",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息详情」。\n\n我要看某一天的作息是怎么被归类的,把 AI 的判断依据一起给我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-15"
              }
            ]
          }
        ]
      },
      {
        "id": "query_5",
        "label": "查作息时间轴",
        "scenes": [
          {
            "id": "timeline_today",
            "title": "今天的时间轴",
            "wake_word": "查作息时间轴",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息时间轴」。\n\n我要看今天的 24 小时时间轴。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "timeline_specific",
            "title": "某一天的时间轴",
            "wake_word": "查作息时间轴",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息时间轴」。\n\n我要看某一天的 24 小时时间轴。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-15"
              }
            ]
          }
        ]
      },
      {
        "id": "query_6",
        "label": "查作息范围",
        "scenes": [
          {
            "id": "range_default",
            "title": "一段日期的统计",
            "wake_word": "查作息范围",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息范围」。\n\n我要看一段日期的作息统计。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:{{start_date}}\n结束日期:{{end_date}}",
            "editable_fields": [
              {
                "name": "start_date",
                "label": "开始日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-13；含当天"
              },
              {
                "name": "end_date",
                "label": "结束日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-19；不早于开始日期"
              }
            ]
          },
          {
            "id": "range_this_week",
            "title": "本周的统计",
            "wake_word": "查作息范围",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息范围」。\n\n我要看本周的作息统计,就按周一到周日这一整周。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          },
          {
            "id": "range_text",
            "title": "统计直接给文本",
            "wake_word": "查作息范围",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息范围」。\n\n我要看某一段时间的作息统计,直接回文本,不用出页面。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围:{{range}}",
            "editable_fields": [
              {
                "name": "range",
                "label": "时间范围",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "接受 本周、上周、上月 这类相对词，也可写起止日期"
              }
            ]
          }
        ]
      },
      {
        "id": "query_7",
        "label": "查作息状态",
        "scenes": [
          {
            "id": "status_default",
            "title": "作息库整体怎么样",
            "wake_word": "查作息状态",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查作息状态」。\n\n我要看作息库整体的状态,一共记了多少、最近记到哪一天。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          }
        ]
      },
      {
        "id": "query_8",
        "label": "查日程",
        "scenes": [
          {
            "id": "list_events_today",
            "title": "今天的日程",
            "wake_word": "查日程",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查日程」。\n\n我要看今天的日程安排。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          },
          {
            "id": "list_events_specific",
            "title": "某一天的日程",
            "wake_word": "查日程",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查日程」。\n\n我要看某一天的日程安排。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-15"
              }
            ]
          },
          {
            "id": "search_event_title",
            "title": "按标题找一条日程",
            "wake_word": "查日程",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查日程」。\n\n我想在今天里找找有没有某件事的安排。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}\n标题关键词:{{title}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              },
              {
                "name": "title",
                "label": "标题关键词",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 健身"
              }
            ]
          },
          {
            "id": "search_event_triplet",
            "title": "某个时段有没有安排",
            "wake_word": "查日程",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查日程」。\n\n我想看看今天某个时段里有没有安排。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}\n开始时刻:{{time_start}}\n结束时刻:{{time_end}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              },
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 17:00"
              },
              {
                "name": "time_end",
                "label": "结束时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 18:00；须晚于开始时刻"
              }
            ]
          },
          {
            "id": "list_events_inactive",
            "title": "今天删掉了哪些日程",
            "wake_word": "查日程",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查日程」。\n\n我要看今天有哪些日程被删掉了,删掉的那些也要一并列出来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          }
        ]
      },
      {
        "id": "query_9",
        "label": "24h 概览",
        "scenes": [
          {
            "id": "query_plans_today",
            "title": "今天一整天的安排",
            "wake_word": "24h 概览",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「24h 概览」。\n\n我要看今天 24 小时的整体安排。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；填了必须是 YYYY-MM-DD"
              }
            ]
          }
        ]
      },
      {
        "id": "query_10",
        "label": "查多日计划",
        "scenes": [
          {
            "id": "query_plans_multi",
            "title": "连着几天的计划",
            "wake_word": "查多日计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「查多日计划」。\n\n我要看连着几天的计划安排。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(可多天):{{dates}}",
            "editable_fields": [
              {
                "name": "dates",
                "label": "日期(可多天)",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "格式 YYYY-MM-DD，多天用逗号分隔，如 2026-07-13,2026-07-14,2026-07-15"
              }
            ]
          }
        ]
      },
      {
        "id": "query_11",
        "label": "按 ID 查记录",
        "scenes": [
          {
            "id": "get_record_basic",
            "title": "按记录 ID 定位一条",
            "wake_word": "按 ID 查记录",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「按 ID 查记录」。\n\n我要看某一条记录的详情,靠记录 ID 定位。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{record_id}}",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 123；从查作息或时间轴里取",
                "min": 1
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
            "title": "一周七天的作息总览",
            "wake_word": "周视图",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「周视图」。\n\n我要看这一周从周一到周日的作息总览。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n锚点日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "锚点日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝本周；填这一周里的任意一天，格式 YYYY-MM-DD"
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
        "label": "补计划",
        "scenes": [
          {
            "id": "ensure_event_basic",
            "title": "给某一天补一条安排",
            "wake_word": "补计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「补计划」。\n\n我要往某一天的计划里补一条安排。如果我没说全日期、起止时刻或做什么,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n开始时刻:{{time_start}}\n结束时刻:{{time_end}}\n做什么:{{title}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天／后天"
              },
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 17:00"
              },
              {
                "name": "time_end",
                "label": "结束时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 18:00；须晚于开始时刻"
              },
              {
                "name": "title",
                "label": "做什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 健身"
              }
            ]
          },
          {
            "id": "ensure_event_idempotent",
            "title": "同一时段重复补也不新建",
            "wake_word": "补计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「补计划」。\n\n我要在同一天的同一时段再补一遍,这个时段之前已经排过了;已经有了就照原来的留着,别再建一条。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n开始时刻:{{time_start}}\n结束时刻:{{time_end}}\n做什么:{{title}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-27；也可写 今天"
              },
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 17:00"
              },
              {
                "name": "time_end",
                "label": "结束时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 18:00；须晚于开始时刻"
              },
              {
                "name": "title",
                "label": "做什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 健身"
              }
            ]
          },
          {
            "id": "ensure_event_with_notes",
            "title": "带细节与分类的一条安排",
            "wake_word": "补计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「补计划」。\n\n我要补一条带细节的安排,顺便把它归到某个分类里。如果我没说全日期、起止时刻或做什么,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n开始时刻:{{time_start}}\n结束时刻:{{time_end}}\n做什么:{{title}}\n细节(选填):{{notes}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              },
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 17:00"
              },
              {
                "name": "time_end",
                "label": "结束时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 18:00；须晚于开始时刻"
              },
              {
                "name": "title",
                "label": "做什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 健身"
              },
              {
                "name": "notes",
                "label": "细节(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "这条安排的补充说明，如 练背+有氧"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的二级分类，如 健康.健身；只写一级会提示细化"
              }
            ]
          }
        ]
      },
      {
        "id": "plan_2",
        "label": "复盘",
        "scenes": [
          {
            "id": "review_today_normal",
            "title": "把这一天的执行情况逐条对一遍",
            "wake_word": "复盘",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘」。\n\n我要把这一天的计划逐条对一下执行情况,一条条标出完成状态。先给我看这一天的排布,确认后再写入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD，如 2026-09-27"
              }
            ]
          },
          {
            "id": "review_today_all_done",
            "title": "都标过完成之后再看一遍",
            "wake_word": "复盘",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘」。\n\n这一天的计划我全都标过完成了,别再让我逐条重标,直接说这一天的结论。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD，如 2026-09-27"
              }
            ]
          },
          {
            "id": "review_no_events",
            "title": "这一天没有计划时怎么看",
            "wake_word": "复盘",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘」。\n\n我要看的那一天没有任何计划,别报成故障,告诉我这一天没得对就行。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-01"
              }
            ]
          },
          {
            "id": "review_with_memo_sync",
            "title": "先对备忘录打卡数据再逐条对",
            "wake_word": "复盘",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘」。\n\n我要先把备忘录里这一天的打卡数据对一遍,再逐条对计划的执行情况。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD，如 2026-09-27"
              }
            ]
          }
        ]
      },
      {
        "id": "plan_3",
        "label": "商量计划",
        "scenes": [
          {
            "id": "plan_discuss_tomorrow",
            "title": "商量某一天怎么安排",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n我想商量某一天怎么安排,先跟我把候选排出来,我看过再落库。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天／后天"
              }
            ]
          },
          {
            "id": "plan_with_locked",
            "title": "已有几条锁定时把空档填起来",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n这一天我已经排了几条,就在这几条之外把空档填起来,先跟我把候选排出来,我看过再落库。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          },
          {
            "id": "plan_with_wish",
            "title": "把心愿排进这一天",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n我想把心愿清单里的事排进这一天,先把心愿列出来跟我一起挑,看过候选再定。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n要排的心愿(选填):{{wish}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              },
              {
                "name": "wish",
                "label": "要排的心愿(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "要推进的那件事，如 体检预约；空＝我自己从心愿清单里挑"
              }
            ]
          },
          {
            "id": "plan_24h_coverage_fail",
            "title": "候选有空隙或撞车时重新排",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n我这次排出来的安排有空隙或者撞车,请把不连续的地方点出来,重新排到一天首尾相接。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          },
          {
            "id": "plan_feishu_sync",
            "title": "商量完顺手同步到飞书",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n商量完这一天的安排之后,顺便整份同步到飞书日历,同步前先问我一句。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          },
          {
            "id": "plan_result_tomorrow",
            "title": "出一张计划结果页",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n帮我按这一天的空档把计划排出来,出一张能看的计划结果,标出跟平时习惯贴不贴。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          },
          {
            "id": "plan_result_adjust",
            "title": "改一处再出一版候选",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n候选那一版我看过了,想改一处再出一版,新版跟上一版都留着,别把上一版盖掉。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n要怎么改:{{change}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              },
              {
                "name": "change",
                "label": "要怎么改",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 第 2 段改成 19:00 开始"
              }
            ]
          },
          {
            "id": "plan_result_history_none",
            "title": "还没有历史作息可参考时怎么排",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n这是个新环境,还没有历史作息可参考,照样把这一天的计划排出来,贴合那一栏空着就行。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          },
          {
            "id": "plan_result_conflict",
            "title": "候选跟已锁定的安排撞上了",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n这一天已经锁定了不能动的安排,候选里有跟它们撞上的,请把冲突点标出来让我改。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          },
          {
            "id": "plan_result_drift",
            "title": "排得跟平时习惯不一样",
            "wake_word": "商量计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「商量计划」。\n\n我想把下午换成运动,跟平时下午都在工作的习惯不一样,是我有意这么排的;请把偏离的地方标出来,我看过仍然可以落库。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-28；也可写 明天"
              }
            ]
          }
        ]
      },
      {
        "id": "plan_4",
        "label": "改计划",
        "scenes": [
          {
            "id": "update_event_basic",
            "title": "换掉某一条的标题或备注",
            "wake_word": "改计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「改计划」。\n\n我要把一条已经排好的安排调一调,换成别的说法或者补上备注。如果我没说清是哪一条或改成什么,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{event_id}}\n标题:{{title}}\n备注(选填):{{notes}}",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 544；先在日程里查到这条记录的编号"
              },
              {
                "name": "title",
                "label": "标题",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "要改成什么，如 健身(上午)"
              },
              {
                "name": "notes",
                "label": "备注(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "要改成什么；空＝这一项不动"
              }
            ]
          },
          {
            "id": "update_event_time",
            "title": "把某一条挪到别的时段",
            "wake_word": "改计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「改计划」。\n\n我要把一条已经排好的安排挪到别的时段。如果我没说清是哪一条或新的起止时刻,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{event_id}}\n开始时刻:{{time_start}}\n结束时刻:{{time_end}}",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 544；先在日程里查到这条记录的编号"
              },
              {
                "name": "time_start",
                "label": "开始时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 17:30"
              },
              {
                "name": "time_end",
                "label": "结束时刻",
                "value": "",
                "kind": "time",
                "required": true,
                "hint": "格式 HH:MM，如 18:30；须晚于开始时刻"
              }
            ]
          },
          {
            "id": "update_event_completion",
            "title": "标某一条的完成状态",
            "wake_word": "改计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「改计划」。\n\n我要给一条已经排好的安排标上完成状态,就标这一条,别动别的。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{event_id}}\n完成状态:{{completion}}",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 544；先在日程里查到这条记录的编号"
              },
              {
                "name": "completion",
                "label": "完成状态",
                "value": "",
                "kind": "select",
                "required": true,
                "hint": "按这条实际做到什么程度选",
                "options": [
                  "已完成",
                  "已完成(超时)",
                  "部分完成",
                  "未完成",
                  "未完成(不可抗力)",
                  "未复盘"
                ]
              }
            ]
          },
          {
            "id": "update_event_feishu_ask",
            "title": "改完先问要不要同步飞书",
            "wake_word": "改计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「改计划」。\n\n我要改一条已经同步到飞书的安排,改完先问我飞书那边要不要一起改。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{event_id}}\n标题:{{title}}\n备注(选填):{{notes}}",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 544；先在日程里查到这条记录的编号"
              },
              {
                "name": "title",
                "label": "标题",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "要改成什么，如 健身(上午)"
              },
              {
                "name": "notes",
                "label": "备注(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "要改成什么；空＝这一项不动"
              }
            ]
          }
        ]
      },
      {
        "id": "plan_5",
        "label": "删计划",
        "scenes": [
          {
            "id": "deactivate_event",
            "title": "撤掉某一条安排",
            "wake_word": "删计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「删计划」。\n\n我要把一条已经排好的安排撤掉。删之前先告诉我这条是什么,确认后再删。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{event_id}}",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 544；先在日程里查到这条记录的编号"
              }
            ]
          },
          {
            "id": "deactivate_with_feishu",
            "title": "撤掉已同步飞书的那一条",
            "wake_word": "删计划",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「删计划」。\n\n我要撤掉一条已经同步到飞书的安排,删之前先问我飞书那边要不要一起删,确认后再删。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{event_id}}",
            "editable_fields": [
              {
                "name": "event_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "纯数字，如 544；先在日程里查到这条记录的编号"
              }
            ]
          }
        ]
      },
      {
        "id": "plan_6",
        "label": "日程管家同步",
        "scenes": [
          {
            "id": "feishu_resync_basic",
            "title": "跟飞书对账之后同步某一天",
            "wake_word": "日程管家同步",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「日程管家同步」。\n\n我要把某一天的日程跟飞书那边对一遍,差在哪就一条条问我,我确认了再同步。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD，如 2026-09-27"
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
            "title": "一整天的计划与实际对照",
            "wake_word": "复盘今日",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘今日」。\n\n我要把计划跟实际对一遍,看看这一天过得怎么样。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(选填):{{date}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝今天；格式 YYYY-MM-DD，如 2026-09-27"
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
            "title": "一周的趋势与规律",
            "wake_word": "复盘本周",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘本周」。\n\n我要把这一周整个过一遍,看趋势和规律,起止不用我报。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          }
        ]
      },
      {
        "id": "plan_9",
        "label": "复盘本月",
        "scenes": [
          {
            "id": "replay_month",
            "title": "一个月的聚合与环比",
            "wake_word": "复盘本月",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘本月」。\n\n我要把这一个月整个过一遍,跟上一段比一比,看看目标达成得怎么样。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          }
        ]
      },
      {
        "id": "plan_10",
        "label": "复盘区间",
        "scenes": [
          {
            "id": "replay_range",
            "title": "任意一段区间的跨域回看",
            "wake_word": "复盘区间",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「复盘区间」。\n\n我要跨一段区间整体回看一遍,起止我自己给。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n区间:{{range}}",
            "editable_fields": [
              {
                "name": "range",
                "label": "区间",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "写 本周／上周／本月／上月，或自己给起止，如 2026-07-13~2026-07-19"
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
        "label": "写作息摘要",
        "scenes": [
          {
            "id": "add_summary_basic",
            "title": "写摘要",
            "wake_word": "写作息摘要",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「写作息摘要」。\n\n我要给某天的某个分类补一条时长摘要。如果我没说全日期、分类或时长,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n分类:{{category}}\n总时长:{{total_minutes}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-22"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的一级分类(八类之一)，如 工作"
              },
              {
                "name": "total_minutes",
                "label": "总时长",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "单位分钟，纯数字，如 60",
                "min": 0,
                "max": 1440,
                "step": 1
              }
            ]
          },
          {
            "id": "add_summary_idempotent",
            "title": "重写已有摘要",
            "wake_word": "写作息摘要",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「写作息摘要」。\n\n同一天同一个分类我已经写过一条了,再写一次要把原来那条的时长盖掉。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-22"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的一级分类(八类之一)，如 工作"
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_2",
        "label": "对比两个月",
        "scenes": [
          {
            "id": "compare_months",
            "title": "整月对比",
            "wake_word": "对比两个月",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「对比两个月」。\n\n我要对比两个月的作息。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n前一个月:{{month_a}}\n后一个月:{{month_b}}",
            "editable_fields": [
              {
                "name": "month_a",
                "label": "前一个月",
                "value": "",
                "kind": "month",
                "required": true,
                "hint": "格式 YYYY-MM，如 2026-06"
              },
              {
                "name": "month_b",
                "label": "后一个月",
                "value": "",
                "kind": "month",
                "required": true,
                "hint": "格式 YYYY-MM，如 2026-07"
              }
            ]
          },
          {
            "id": "compare_range",
            "title": "任意范围对比",
            "wake_word": "对比两个月",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「对比两个月」。\n\n我要对比前后两段自定义日期区间的作息(这次不是整月对整月)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n前一段名称(选填):{{label_a}}\n前一段开始日期:{{range_a_start}}\n前一段结束日期:{{range_a_end}}\n后一段名称(选填):{{label_b}}\n后一段开始日期:{{range_b_start}}\n后一段结束日期:{{range_b_end}}",
            "editable_fields": [
              {
                "name": "label_a",
                "label": "前一段名称(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "如 上周；空＝用起止日期当名字"
              },
              {
                "name": "range_a_start",
                "label": "前一段开始日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-14"
              },
              {
                "name": "range_a_end",
                "label": "前一段结束日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-20"
              },
              {
                "name": "label_b",
                "label": "后一段名称(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "如 本周；空＝用起止日期当名字"
              },
              {
                "name": "range_b_start",
                "label": "后一段开始日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-21"
              },
              {
                "name": "range_b_end",
                "label": "后一段结束日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-09-27"
              }
            ]
          },
          {
            "id": "compare_week_vs_week",
            "title": "周对比",
            "wake_word": "对比两个月",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「对比两个月」。\n\n我要比上周和这周这两段(这次不是整月对整月)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n前一段名称(选填):{{label_a}}\n后一段名称(选填):{{label_b}}",
            "editable_fields": [
              {
                "name": "label_a",
                "label": "前一段名称(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "空＝上周"
              },
              {
                "name": "label_b",
                "label": "后一段名称(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "空＝本周"
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_3",
        "label": "修正作息",
        "scenes": [
          {
            "id": "amend_basic",
            "title": "改 1 条记录多字段",
            "wake_word": "修正作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「修正作息」。\n\n我这条作息记错了,要改它的分类和活动。如果我没说清改成什么,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{record_id}}\n改成哪个分类:{{category}}\n改成做了什么:{{activity}}",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "正整数，纯数字，如 123",
                "min": 1,
                "step": 1
              },
              {
                "name": "category",
                "label": "改成哪个分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的二级分类，如 工作.AI调优；只写一级会提示细化"
              },
              {
                "name": "activity",
                "label": "改成做了什么",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "如 写代码"
              }
            ]
          },
          {
            "id": "amend_json_inline",
            "title": "JSON 内联修改",
            "wake_word": "修正作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「修正作息」。\n\n我要用一段 JSON 一次改掉一条记录的多个字段。如果我没说全改哪条或改成什么,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{record_id}}\nJSON 内容:{{json}}",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "正整数，纯数字，如 123",
                "min": 1,
                "step": 1
              },
              {
                "name": "json",
                "label": "JSON 内容",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "一段 JSON 对象，键＝字段名；如 {\"category\":\"工作.AI调优\",\"activity\":\"写代码\"}"
              }
            ]
          },
          {
            "id": "amend_24h_warn",
            "title": "超过 24h 修改警告",
            "wake_word": "修正作息",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「修正作息」。\n\n我要改一条几天前记的作息(已经超过 24 小时了),看看会怎么提醒我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n记录 ID:{{record_id}}\n改成哪个分类(选填):{{category}}\n改成做了什么(选填):{{activity}}",
            "editable_fields": [
              {
                "name": "record_id",
                "label": "记录 ID",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "正整数，纯数字，如 123",
                "min": 1,
                "step": 1
              },
              {
                "name": "category",
                "label": "改成哪个分类(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "白名单里的二级分类，如 工作.AI调优"
              },
              {
                "name": "activity",
                "label": "改成做了什么(选填)",
                "value": "",
                "kind": "text",
                "required": false,
                "hint": "如 写代码；和分类至少填一样"
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_4",
        "label": "类别深挖",
        "scenes": [
          {
            "id": "category_range",
            "title": "区间内某分类深挖",
            "wake_word": "类别深挖",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「类别深挖」。\n\n我要看某个分类在这段时间里都是什么时候做的。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(选填):{{range_start}}\n结束日期(选填):{{range_end}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "range_start",
                "label": "开始日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝本周一；格式 YYYY-MM-DD，如 2026-09-21"
              },
              {
                "name": "range_end",
                "label": "结束日期(选填)",
                "value": "",
                "kind": "date",
                "required": false,
                "hint": "空＝本周日；格式 YYYY-MM-DD，如 2026-09-27"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的分类，如 健身；写二级会按它的一级分类算"
              }
            ]
          },
          {
            "id": "category_day",
            "title": "单日某分类",
            "wake_word": "类别深挖",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「类别深挖」。\n\n我要看某个分类在这一天都是什么时候做的。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:{{date}}\n分类:{{category}}",
            "editable_fields": [
              {
                "name": "date",
                "label": "日期",
                "value": "",
                "kind": "date",
                "required": true,
                "hint": "格式 YYYY-MM-DD，如 2026-07-15"
              },
              {
                "name": "category",
                "label": "分类",
                "value": "",
                "kind": "text",
                "required": true,
                "hint": "白名单里的分类，如 健身；写二级会按它的一级分类算"
              }
            ]
          }
        ]
      },
      {
        "id": "analyze_5",
        "label": "异常检测",
        "scenes": [
          {
            "id": "anomaly_default",
            "title": "默认 7 天窗口检测",
            "wake_word": "异常检测",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「异常检测」。\n\n帮我看看最近的状态正不正常,有没有异常。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n回看天数(选填):{{window}}",
            "editable_fields": [
              {
                "name": "window",
                "label": "回看天数(选填)",
                "value": "",
                "kind": "number",
                "required": false,
                "hint": "空＝最近 7 天；单位天，纯数字，如 7",
                "min": 2,
                "max": 90,
                "step": 1
              }
            ]
          },
          {
            "id": "anomaly_window_30",
            "title": "30 天窗口",
            "wake_word": "异常检测",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「异常检测」。\n\n帮我回看更长一段时间里有没有异常。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n回看天数:{{window}}",
            "editable_fields": [
              {
                "name": "window",
                "label": "回看天数",
                "value": "",
                "kind": "number",
                "required": true,
                "hint": "单位天，纯数字，如 30",
                "min": 2,
                "max": 90,
                "step": 1
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
        "label": "飞书探测",
        "scenes": [
          {
            "id": "feishu_probe",
            "title": "看看飞书能不能用",
            "wake_word": "飞书探测",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「飞书探测」。\n\n我想知道飞书这条路通不通。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n探测到哪一层(选填):{{scope}}",
            "editable_fields": [
              {
                "name": "scope",
                "label": "探测到哪一层(选填)",
                "value": "",
                "kind": "select",
                "required": false,
                "hint": "空＝三层全探；只关心某一层就选它",
                "options": [
                  "cli",
                  "auth",
                  "calendar"
                ]
              }
            ]
          }
        ]
      },
      {
        "id": "admin_2",
        "label": "初始化数据库",
        "scenes": [
          {
            "id": "init_default",
            "title": "建好作息的三张表",
            "wake_word": "初始化数据库",
            "status": "",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「初始化数据库」。\n\n帮我把作息要用的数据库建起来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "editable_fields": []
          }
        ]
      },
      {
        "id": "admin_3",
        "label": "首次使用",
        "scenes": [
          {
            "id": "first_use",
            "title": "第一次用的上手流程",
            "wake_word": "首次使用",
            "status": "【待开发】",
            "prompt_template": "请你加载技能 作息管家,执行唤醒词「首次使用」。\n\n我是第一次用它,带我走一遍上手流程。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
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

/** 计数（全部由数据算出；改资产即跟变，内容另由测试里的摘要锁钉住）。 */
export const HELP_TOTALS = Object.freeze({
  groups: HELP_GROUPS.length,
  subgroups: HELP_GROUPS.reduce((n, g) => n + g.subgroups.length, 0),
  scenes: HELP_ASSETS.length,
  pending: HELP_ASSETS.filter((s) => s.status !== '').length,
  fields: HELP_ASSETS.reduce((n, s) => n + s.editable_fields.length, 0),
});
