/** T2-① #133 · 唤醒词资产清单（typed TS module，全量 436 条，encoding UTF8）。
 *
 * 唯一事实源：老实物 HELP `help-data`（10 组／54 子组／436 场景），逐字落地，顺序与实物分组一致；
 * `status` 实物全空（保留字段，不断言语义）；legacy 22 条实物本无 `types` 键（保持缺席，不补空数组）。
 * 元词豁免（HELP 自身不入资产）：HELP 是资产的呈现载体而非场景——实物 436 场景无 HELP 自身条目，
 * 老家 `_triggers.py` AST 436 条同样不含 HELP（HELP-in-asset=False），沿豁免防自指。
 * 技术选型（TS 架构下最优）：typed TS module（本文件）vs JSON＋运行时校验（否决）。
 * 选型理由：① 类型安全——`WakeSceneAsset` 等接口由 `tsc -b` 编译期钉死字段，JSON 缺字段只能运行时暴露；
 * ② AI 可导航——具名导出 `WAKE_GROUPS／WAKE_ASSETS／SCENE_BY_ID`，grep 与跳转直达单条，JSON 需先解析再定位；
 * ③ base 契约亲和——与仓内 `scene-*.ts: Trigger[]`、`SceneDataContractV1` 同形态（typed const 数组），复用既有 `tsc -b` 门禁，
 * 且 `base-render/help.ts` 消费 typed Scene，JSON 需另写适配层。
 * 否决 JSON＋校验：运行时才暴露缺字段；双载体并存必漂移（单源原则）；多一层解析＋适配代码。
 * legacy verdict（以 AST 实测为准）：`_triggers.py` 键数谱＝{17 键×413，18 键×1（看今日主页独含 `aliases`），6 键×22}，
 * 其中 414 条含 `key`（任务口径“新13字段”＝所列 13 键全含）＋22 条 legacy（6 键无 `key`，逐词＝实物无 `types` 22 条＝新家无 `key` 22 条，三源一致）；
 * “23”＝路由层 `NON_EXEC_REASONS` 闭集条数（理由码表，非唤醒词），误读口径所致，不存在第 23 条 legacy。
 *
 * 本文件由实物 JSON 机器生成（逐字 `JSON.stringify`），禁止手工改词；改词即改 SoT。
 */

export type WakeSceneType = '结果' | '回执' | '过程';

export interface WakeSceneAsset {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  readonly status: string;
  readonly prompt_template: string;
  /** 实物 legacy 22 条本无此键（保持缺席）；其余 414 条恰含一个类型。 */
  readonly types?: readonly WakeSceneType[];
}

export interface WakeSubgroupAsset {
  readonly id: string;
  readonly label: string;
  readonly scenes: readonly WakeSceneAsset[];
}

export interface WakeGroupAsset {
  readonly id: string;
  readonly icon: string;
  readonly label: string;
  readonly subgroups: readonly WakeSubgroupAsset[];
}

export const WAKE_GROUPS: readonly WakeGroupAsset[] = [
  {
    "id": "home",
    "icon": "🏠",
    "label": "主页",
    "subgroups": [
      {
        "id": "home_1",
        "label": "看今日主页",
        "scenes": [
          {
            "id": "home_today_overview",
            "title": "看今日主页",
            "wake_word": "看今日主页",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日主页」。\n\n我想看今天的主页 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "home_today_diet_overview",
            "title": "看今日饮食概览",
            "wake_word": "看今日饮食概览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日饮食概览」。\n\n我想看今天饮食 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "home_today_exercise_overview",
            "title": "看今日运动概览",
            "wake_word": "看今日运动概览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日运动概览」。\n\n我想看今天运动 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "home_today_weight_overview",
            "title": "看今日体重概览",
            "wake_word": "看今日体重概览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日体重概览」。\n\n我想看今天体重 widget。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "home_today_goal_progress",
            "title": "看今日目标进度",
            "wake_word": "看今日目标进度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日目标进度」。\n\n我想看今天 4 项目标(热量/蛋白/饮水/运动)完成度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "home_today_budget",
            "title": "看今日热量预算",
            "wake_word": "看今日热量预算",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日热量预算」。\n\n我想看今天还能吃多少。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "home_2",
        "label": "看今日成就",
        "scenes": [
          {
            "id": "home_streak_days",
            "title": "看连续记录天数",
            "wake_word": "看连续记录天数",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看连续记录天数」。\n\n我想看我的连续记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "home_3",
        "label": "看周期主页",
        "scenes": [
          {
            "id": "home_week_overview",
            "title": "看本周主页",
            "wake_word": "看本周主页",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周主页」。\n\n我想看本周 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "home_month_overview",
            "title": "看本月主页",
            "wake_word": "看本月主页",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本月主页」。\n\n我想看本月 dashboard。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "diet",
    "icon": "🍚",
    "label": "饮食",
    "subgroups": [
      {
        "id": "diet_1",
        "label": "记饮食",
        "scenes": [
          {
            "id": "diet_add_meal",
            "title": "记一餐",
            "wake_word": "记一餐",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记一餐」。\n\n我刚吃了一顿,帮我记录。如果我没说全克数或营养,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食物名称:____\n克数(选填,默认按食品库每 100g):____\n\n⚠️ 同餐多食物(用「和/、/同时/一起」连接)必须合并为 1 个回执:全部食物确认后一次调用 --live-diet-batch-meal(issue #158),禁止逐个 --live-diet-add。",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_add_meal_note",
            "title": "记一餐（含备注）",
            "wake_word": "记一餐（含备注）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记一餐（含备注）」。\n\n我刚吃了一顿,要连同备注一起记录(如「加了辣酱」「食堂打的」)。如果我没说全克数或营养,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食物名称:____\n克数(选填,默认按食品库每 100g):____\n备注:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_backfill",
            "title": "补记饮食",
            "wake_word": "补记饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「补记饮食」。\n\n我要补录之前某天的饮食(不是现在吃的)。如果我没说全克数或营养,问我补齐。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食物名称:____\n日期(YYYY-MM-DD):____\n时间(选填):____\n克数(选填,默认按食品库每 100g):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_backfill_batch",
            "title": "批量补记饮食",
            "wake_word": "批量补记饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量补记饮食」。\n\n我要一次补录多餐(不同日期/不同餐别),一行一餐地说。写之前先给我看整理好的清单,确认无误再写入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n每行一餐(日期/时间/食物/克数/营养,换行分隔):\n____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_scan_label",
            "title": "拍营养表记一餐",
            "wake_word": "拍营养表记一餐",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「拍营养表记一餐」。\n\n我刚吃了这个食物,手边有包装。我拍下包装上的营养成分表给你,请你识别出热量/蛋白/碳水/脂肪等字段,给我看识别结果(照片 + 识别出的营养),我确认后记入今天的饮食。识别不确定的地方标注一下。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n营养表图片路径:____",
            "types": [
              "过程"
            ]
          },
          {
            "id": "diet_scan_label_date",
            "title": "拍营养表补记一餐",
            "wake_word": "拍营养表补记一餐",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「拍营养表补记一餐」。\n\n我某天吃了这个食物但忘了记,现在手边有包装,拍给你识别。请你识别出热量/蛋白/碳水/脂肪等字段,给我看识别结果(照片 + 识别出的营养 + 补录日期),我确认后按那天记入饮食。识别不确定的地方标注一下。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n营养表图片路径:____\n日期(YYYY-MM-DD):____",
            "types": [
              "过程"
            ]
          },
          {
            "id": "diet_log_water",
            "title": "记喝水",
            "wake_word": "记喝水",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记喝水」。\n\n我喝了水,帮我记录。如果我说「喝了几杯」,请按一杯约 250ml 折算成总量;如果我只说了杯子大小,先问我确认。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n喝水量(ml,或「几杯」):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_copy_yesterday",
            "title": "复制昨日饮食",
            "wake_word": "复制昨日饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「复制昨日饮食」。\n\n我要把昨天(或指定某天)吃的东西原样复制到今天(或指定某天),省得重新记。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n来源日期(选填,默认昨天):____\n目标日期(选填,默认今天):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "diet_2",
        "label": "改饮食",
        "scenes": [
          {
            "id": "diet_update_record",
            "title": "改饮食记录",
            "wake_word": "改饮食记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改饮食记录」。\n\n我要改某条饮食记录。如果我没说清是哪条,请先列出最近的记录让我选。改之前先给我看这条记录的当前内容。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要改的记录(如「最近一条」或日期+食物):____\n要改的字段(食物/克数/热量/蛋白/碳水/脂肪/日期/时间/备注):____\n新值:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_update_by_date",
            "title": "改某日饮食",
            "wake_word": "改某日饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改某日饮食」。\n\n我要改某一天的全部饮食记录(如那天的时间/克数/备注都记错了)。改之前先告诉我那天有几条记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(YYYY-MM-DD):____\n要改的字段与新值(如 备注=修正):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_delete_record",
            "title": "删饮食记录",
            "wake_word": "删饮食记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删饮食记录」。\n\n我要删一条饮食记录。如果我没说清是哪条,请先列出最近的几条让我选。删除前先给我看这条记录的内容,确认无误再删,最后给我确认回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要删的记录(选填,如「最近一条」或日期):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_delete_by_meal",
            "title": "删一餐",
            "wake_word": "删一餐",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删一餐」。\n\n我要删某天某一餐的全部记录(如删掉今天的早餐)。如果我没说日期默认今天。删除前告诉我这一餐有几条,确认后删除。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n餐别(早餐/午餐/下午茶/晚餐/夜宵/加餐):____\n日期(选填,默认今天):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_delete_by_date",
            "title": "删某日饮食",
            "wake_word": "删某日饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删某日饮食」。\n\n我要清空某一天的整日饮食记录。删除前告诉我那天有几条,确认后删除。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(YYYY-MM-DD):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "diet_delete_by_range",
            "title": "批量删饮食",
            "wake_word": "批量删饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量删饮食」。\n\n我要按日期范围批量删除饮食记录。删除前告诉我这个范围有几条,确认后删除。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "diet_3",
        "label": "看饮食",
        "scenes": [
          {
            "id": "diet_view_today",
            "title": "看今日饮食",
            "wake_word": "看今日饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日饮食」。\n\n我想看今天的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_yesterday",
            "title": "看昨日饮食",
            "wake_word": "看昨日饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看昨日饮食」。\n\n我想看昨天的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_this_week",
            "title": "看本周饮食",
            "wake_word": "看本周饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周饮食」。\n\n我想看本周(周一到今天)的饮食明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_last_week",
            "title": "看上周饮食",
            "wake_word": "看上周饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上周饮食」。\n\n我想看上周(上一个自然周)的饮食明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_this_month",
            "title": "看本月饮食",
            "wake_word": "看本月饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本月饮食」。\n\n我想看本月(自然月)的饮食明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_last_month",
            "title": "看上月饮食",
            "wake_word": "看上月饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上月饮食」。\n\n我想看上月(上一个自然月)的饮食明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_7d",
            "title": "看最近 7 天饮食",
            "wake_word": "看最近 7 天饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 7 天饮食」。\n\n我想看最近 7 天(滚动窗口)的饮食明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_30d",
            "title": "看最近 30 天饮食",
            "wake_word": "看最近 30 天饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 30 天饮食」。\n\n我想看最近 30 天(滚动窗口)的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_range",
            "title": "看某段时间饮食",
            "wake_word": "看某段时间饮食",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看某段时间饮食」。\n\n我想看自定义日期区间的饮食明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_water",
            "title": "看今日喝水",
            "wake_word": "看今日喝水",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日喝水」。\n\n我想看今天的饮水。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_view_with_note",
            "title": "看「有备注」的饮食记录",
            "wake_word": "看有备注的饮食记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看有备注的饮食记录」。\n\n我想看带备注的饮食记录(如「加了辣酱」「食堂打的」)。时间范围默认最近 7 天,也可指定。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(选填,默认最近 7 天):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "diet_4",
        "label": "查食品",
        "scenes": [
          {
            "id": "food_search",
            "title": "查食品",
            "wake_word": "查食品",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查食品」。\n\n我想查某食物的营养数据。如果没查到精确的,给我相近的几条。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食物名称:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "food_search_category",
            "title": "查食品（按分类）",
            "wake_word": "查食品（按分类）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查食品（按分类）」。\n\n我想按分类查食品库(如 饮料/主食/蛋白类/水果/零食):列出该分类全部食品 + 营养数据,按分类分组。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n分类名称:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "food_add",
            "title": "存食品",
            "wake_word": "存食品",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「存食品」。\n\n我要把新食品的营养数据存进食品库(每 100g 为基准)。告诉我必填字段:名称/品牌/热量/蛋白/脂肪/饱和脂肪/碳水/糖/纤维/钠/来源。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食品名称:____\n品牌:____\n热量(每 100g):____\n蛋白:____\n脂肪:____\n饱和脂肪(选填):____\n碳水:____\n糖(选填):____\n纤维(选填):____\n钠:____\n来源(选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "food_update",
            "title": "改食品",
            "wake_word": "改食品",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改食品」。\n\n我要改食品库里某条食品的营养数据。如果我没说清是哪条,先列出相近的几条让我选。改前给我看原值。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食品名称或编号:____\n要改的字段(热量/蛋白/脂肪/碳水/糖/钠/品牌等):____\n新值:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "food_deprecate",
            "title": "下架食品",
            "wake_word": "下架食品",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「下架食品」。\n\n我要把食品库里的某条食品下架(标废弃,以后查询/搜索/导入去重都不再出现)。先确认是哪条,下架后给我回执并提示「已下架」。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n食品名称或编号:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "food_dedupe",
            "title": "看食品库（去重）",
            "wake_word": "看食品库（去重）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看食品库（去重）」。\n\n我想检查食品库有没有重复的食品(同名同品牌多条)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "food_batch_import",
            "title": "批量导入食品",
            "wake_word": "批量导入食品",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量导入食品」。\n\n我有一个食品数据文件(每行一条:名称/热量/蛋白/脂肪/碳水/钠/来源等)要批量导入食品库。先给我看导入预览(导入条数/跳过条数/失败明细),我确认后再真正写入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n文件路径:____",
            "types": [
              "过程"
            ]
          },
          {
            "id": "food_batch_validate",
            "title": "校验批量导入",
            "wake_word": "校验批量导入",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「校验批量导入」。\n\n我有一个食品数据文件(每行一条),只想先校验能不能导入,不真正写入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n文件路径:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "food_source_stats",
            "title": "看食品来源统计",
            "wake_word": "看食品来源统计",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看食品来源统计」。\n\n我想看食品库的食品来源分布(按来源分组计数)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "diet_5",
        "label": "看营养",
        "scenes": [
          {
            "id": "nutrition_ratio",
            "title": "看营养结构",
            "wake_word": "看营养结构",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看营养结构」。\n\n我想看最近一段时间(默认 7 天)的蛋白/碳水/脂肪占比。如果我要看别的窗口会告诉你。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(选填,默认最近 7 天):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nutrition_today",
            "title": "看今日营养",
            "wake_word": "看今日营养",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日营养」。\n\n我想看今天 4 项营养(热量/蛋白/碳水/脂肪)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nutrition_overview",
            "title": "看饮食总览",
            "wake_word": "看饮食总览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看饮食总览」。\n\n我想看周期累计的饮食总览。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nutrition_detail",
            "title": "看营养素深度",
            "wake_word": "看营养素深度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看营养素深度」。\n\n我想看微量营养素摄入。食品库没有的按缺数据标注。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(选填,默认最近 7 天):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "diet_6",
        "label": "看排行",
        "scenes": [
          {
            "id": "ranking_high_calorie",
            "title": "看高热量榜",
            "wake_word": "看高热量榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高热量榜」。\n\n我想看最近一段时间(默认 7 天)热量最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_low_calorie",
            "title": "看低热量榜",
            "wake_word": "看低热量榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看低热量榜」。\n\n我想看最近一段时间(默认 7 天)热量最低的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_frequent",
            "title": "看频繁吃榜",
            "wake_word": "看频繁吃榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看频繁吃榜」。\n\n我想看最近一段时间(默认 7 天)吃得最多的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_carb",
            "title": "看高碳水榜",
            "wake_word": "看高碳水榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高碳水榜」。\n\n我想看最近一段时间(默认 7 天)碳水最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_protein",
            "title": "看高蛋白榜",
            "wake_word": "看高蛋白榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高蛋白榜」。\n\n我想看最近一段时间(默认 7 天)蛋白最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_all",
            "title": "看全部排行榜",
            "wake_word": "看全部排行榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看全部排行榜」。\n\n我想同时看所有食物榜单。时间范围默认最近 7 天,也可指定。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(选填,默认最近 7 天):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_calorie_30d",
            "title": "看高热量榜（最近 30 天）",
            "wake_word": "看高热量榜（最近 30 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高热量榜（最近 30 天）」。\n\n我想看最近 30 天热量最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_calorie_month",
            "title": "看高热量榜（本月）",
            "wake_word": "看高热量榜（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高热量榜（本月）」。\n\n我想看本月(自然月)热量最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_calorie_custom",
            "title": "看高热量榜（自定义）",
            "wake_word": "看高热量榜（自定义）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高热量榜（自定义）」。\n\n我想看自定义日期区间热量最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_low_calorie_30d",
            "title": "看低热量榜（最近 30 天）",
            "wake_word": "看低热量榜（最近 30 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看低热量榜（最近 30 天）」。\n\n我想看最近 30 天热量最低的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_low_calorie_month",
            "title": "看低热量榜（本月）",
            "wake_word": "看低热量榜（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看低热量榜（本月）」。\n\n我想看本月(自然月)热量最低的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_low_calorie_custom",
            "title": "看低热量榜（自定义）",
            "wake_word": "看低热量榜（自定义）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看低热量榜（自定义）」。\n\n我想看自定义日期区间热量最低的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_frequent_30d",
            "title": "看频繁吃榜（最近 30 天）",
            "wake_word": "看频繁吃榜（最近 30 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看频繁吃榜（最近 30 天）」。\n\n我想看最近 30 天吃得最多的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_frequent_month",
            "title": "看频繁吃榜（本月）",
            "wake_word": "看频繁吃榜（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看频繁吃榜（本月）」。\n\n我想看本月(自然月)吃得最多的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_frequent_custom",
            "title": "看频繁吃榜（自定义）",
            "wake_word": "看频繁吃榜（自定义）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看频繁吃榜（自定义）」。\n\n我想看自定义日期区间吃得最多的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_carb_30d",
            "title": "看高碳水榜（最近 30 天）",
            "wake_word": "看高碳水榜（最近 30 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高碳水榜（最近 30 天）」。\n\n我想看最近 30 天碳水最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_carb_month",
            "title": "看高碳水榜（本月）",
            "wake_word": "看高碳水榜（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高碳水榜（本月）」。\n\n我想看本月(自然月)碳水最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_carb_custom",
            "title": "看高碳水榜（自定义）",
            "wake_word": "看高碳水榜（自定义）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高碳水榜（自定义）」。\n\n我想看自定义日期区间碳水最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_protein_30d",
            "title": "看高蛋白榜（最近 30 天）",
            "wake_word": "看高蛋白榜（最近 30 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高蛋白榜（最近 30 天）」。\n\n我想看最近 30 天蛋白最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_protein_month",
            "title": "看高蛋白榜（本月）",
            "wake_word": "看高蛋白榜（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高蛋白榜（本月）」。\n\n我想看本月(自然月)蛋白最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "ranking_high_protein_custom",
            "title": "看高蛋白榜（自定义）",
            "wake_word": "看高蛋白榜（自定义）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看高蛋白榜（自定义）」。\n\n我想看自定义日期区间蛋白最高的食物 TOP 10。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "diet_7",
        "label": "饮食复盘",
        "scenes": [
          {
            "id": "diet_review_week",
            "title": "饮食复盘（本周）",
            "wake_word": "饮食复盘（本周）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「饮食复盘（本周）」。\n\n我想看本周饮食复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_review_month",
            "title": "饮食复盘（本月）",
            "wake_word": "饮食复盘（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「饮食复盘（本月）」。\n\n我想看本月饮食复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_review_90d",
            "title": "饮食复盘（最近 90 天）",
            "wake_word": "饮食复盘（最近 90 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「饮食复盘（最近 90 天）」。\n\n我想看最近 90 天饮食复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_review_year",
            "title": "饮食复盘（今年）",
            "wake_word": "饮食复盘（今年）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「饮食复盘（今年）」。\n\n我想看今年饮食复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diet_review_range",
            "title": "饮食复盘（自定义时间）",
            "wake_word": "饮食复盘（自定义时间）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「饮食复盘（自定义时间）」。\n\n我想看自定义日期区间的饮食复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期(YYYY-MM-DD):____\n结束日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "diet_8",
        "label": "餐别分布",
        "scenes": [
          {
            "id": "meal_dist_breakfast",
            "title": "看早餐（最近 7 天）",
            "wake_word": "看早餐（最近 7 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看早餐（最近 7 天）」。\n\n我想看最近 7 天早餐的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "meal_dist_lunch",
            "title": "看午餐（最近 7 天）",
            "wake_word": "看午餐（最近 7 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看午餐（最近 7 天）」。\n\n我想看最近 7 天午餐的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "meal_dist_dinner",
            "title": "看晚餐（最近 7 天）",
            "wake_word": "看晚餐（最近 7 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看晚餐（最近 7 天）」。\n\n我想看最近 7 天晚餐的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "meal_dist_snack",
            "title": "看加餐（最近 7 天）",
            "wake_word": "看加餐（最近 7 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看加餐（最近 7 天）」。\n\n我想看最近 7 天加餐(下午茶+夜宵)的饮食。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "meal_dist_all",
            "title": "看全部餐别分布（最近 7 天）",
            "wake_word": "看全部餐别分布（最近 7 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看全部餐别分布（最近 7 天）」。\n\n我想看最近 7 天各餐别(早餐/午餐/晚餐/加餐)的分布对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "diet_9",
        "label": "既有唤醒词",
        "scenes": [
          {
            "id": "legacy_看「有备注」的饮食记录",
            "title": "看「有备注」的饮食记录",
            "wake_word": "看「有备注」的饮食记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看「有备注」的饮食记录」。\n\n我想看带备注的饮食记录(如「加了辣酱」「食堂打的」)。时间范围默认最近 7 天,也可指定。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(选填,默认最近 7 天):____"
          }
        ]
      }
    ]
  },
  {
    "id": "weight",
    "icon": "⚖️",
    "label": "体重",
    "subgroups": [
      {
        "id": "weight_1",
        "label": "体重复盘",
        "scenes": [
          {
            "id": "w_overview",
            "title": "看体重总览",
            "wake_word": "看体重总览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重总览」。\n\n我想看体重综合总览。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_review_week",
            "title": "体重复盘（本周）",
            "wake_word": "体重复盘（本周）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「体重复盘（本周）」。\n\n我想看本周的体重复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_review_month",
            "title": "体重复盘（本月）",
            "wake_word": "体重复盘（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「体重复盘（本月）」。\n\n我想看本月的体重复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_review_90d",
            "title": "体重复盘（最近 90 天）",
            "wake_word": "体重复盘（最近 90 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「体重复盘（最近 90 天）」。\n\n我想看最近 90 天的体重复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_review_year",
            "title": "体重复盘（今年）",
            "wake_word": "体重复盘（今年）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「体重复盘（今年）」。\n\n我想看今年的体重复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_review_range",
            "title": "体重复盘（自定义时间）",
            "wake_word": "体重复盘（自定义时间）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「体重复盘（自定义时间）」。\n\n我想看某段时间的体重复盘(自定义起止日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n起止日期(YYYY-MM-DD):____ ~ ____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_milestones",
            "title": "看里程碑回溯",
            "wake_word": "看里程碑回溯",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看里程碑回溯」。\n\n我想看所有达成过的体重里程碑。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "weight_2",
        "label": "对比体重",
        "scenes": [
          {
            "id": "w_cmp_30d",
            "title": "对比体重：最近 30 天 vs 之前 30 天",
            "wake_word": "对比体重：最近 30 天 vs 之前 30 天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：最近 30 天 vs 之前 30 天」。\n\n我想对比最近 30 天和之前 30 天两段体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_custom",
            "title": "对比体重：自定义两段时间",
            "wake_word": "对比体重：自定义两段时间",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：自定义两段时间」。\n\n我想自定义两段日期对比体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n第一段起止(YYYY-MM-DD):____ ~ ____\n第二段起止(YYYY-MM-DD):____ ~ ____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_week",
            "title": "对比体重：本周 vs 上周",
            "wake_word": "对比体重：本周 vs 上周",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：本周 vs 上周」。\n\n我想对比本周和上周的体重(自然周对齐)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_month",
            "title": "对比体重：本月 vs 上月",
            "wake_word": "对比体重：本月 vs 上月",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：本月 vs 上月」。\n\n我想对比本月和上月的体重(自然月对齐)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_ndays",
            "title": "对比体重：近 N 天 vs 上一个 N 天",
            "wake_word": "对比体重：近 N 天 vs 上一个 N 天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：近 N 天 vs 上一个 N 天」。\n\n我想对比最近 N 天和之前同样 N 天(滚动窗口)的体重,N 由我指定。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\nN(天数):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_1y",
            "title": "对比体重：今天 vs 一年前今天",
            "wake_word": "对比体重：今天 vs 一年前今天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：今天 vs 一年前今天」。\n\n我想对比今天的体重和一年前同一天的体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_6m",
            "title": "对比体重：今天 vs 半年前今天",
            "wake_word": "对比体重：今天 vs 半年前今天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：今天 vs 半年前今天」。\n\n我想对比今天的体重和半年前同一天的体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_3m",
            "title": "对比体重：今天 vs 三月前今天",
            "wake_word": "对比体重：今天 vs 三月前今天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：今天 vs 三月前今天」。\n\n我想对比今天的体重和三个月前同一天的体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_target",
            "title": "对比体重：当前 vs 目标体重",
            "wake_word": "对比体重：当前 vs 目标体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：当前 vs 目标体重」。\n\n我想对比当前体重和目标体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_plateau",
            "title": "对比体重：当前 vs 平台期首日",
            "wake_word": "对比体重：当前 vs 平台期首日",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：当前 vs 平台期首日」。\n\n请自动识别我最近一次平台期,并对比当前体重和平台期首日的体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_min",
            "title": "对比体重：当前 vs 历史最低",
            "wake_word": "对比体重：当前 vs 历史最低",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：当前 vs 历史最低」。\n\n请自动定位我历史最低的体重并和当前对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_max",
            "title": "对比体重：当前 vs 历史最高",
            "wake_word": "对比体重：当前 vs 历史最高",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：当前 vs 历史最高」。\n\n请自动定位我历史最高的体重并和当前对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_5kg",
            "title": "对比体重：减重 5kg 那天 vs 今天",
            "wake_word": "对比体重：减重 5kg 那天 vs 今天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：减重 5kg 那天 vs 今天」。\n\n请反查我减重 5kg 达成的那一天,和今天对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_10kg",
            "title": "对比体重：减重 10kg 那天 vs 今天",
            "wake_word": "对比体重：减重 10kg 那天 vs 今天",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：减重 10kg 那天 vs 今天」。\n\n请反查我减重 10kg 达成的那一天,和今天对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_summer",
            "title": "对比体重：当前 vs 入夏最低",
            "wake_word": "对比体重：当前 vs 入夏最低",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：当前 vs 入夏最低」。\n\n请定位我今年夏天的体重最低点并和当前对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_winter",
            "title": "对比体重：当前 vs 入冬最低",
            "wake_word": "对比体重：当前 vs 入冬最低",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：当前 vs 入冬最低」。\n\n请定位我最近一个冬天的体重最低点并和当前对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_exercise",
            "title": "对比体重：运动多 vs 运动少的两个月",
            "wake_word": "对比体重：运动多 vs 运动少的两个月",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：运动多 vs 运动少的两个月」。\n\n请自动选出我运动量最高和最低的两个月对比体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_cmp_weekend",
            "title": "对比体重：工作日 vs 周末",
            "wake_word": "对比体重：工作日 vs 周末",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体重：工作日 vs 周末」。\n\n请把最近一周的体重按 工作日(周一至周五)和 周末(周六周日)分组对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "weight_3",
        "label": "改体重记录",
        "scenes": [
          {
            "id": "w_update",
            "title": "改体重记录",
            "wake_word": "改体重记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改体重记录」。\n\n我要改某条体重记录(体重值或备注)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要改的记录(最近一条/日期/编号):____\n新体重(kg):____\n新备注:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_update_by_date",
            "title": "改某日体重",
            "wake_word": "改某日体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改某日体重」。\n\n我要按日期改某天的体重记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(YYYY-MM-DD):____\n新体重(kg):____\n新备注:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_delete",
            "title": "删体重记录",
            "wake_word": "删体重记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删体重记录」。\n\n我要删一条体重记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要删的记录(最近一条/日期/编号):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_delete_by_date",
            "title": "删某日体重",
            "wake_word": "删某日体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删某日体重」。\n\n我要删某一天的全部体重记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(YYYY-MM-DD):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_delete_batch",
            "title": "批量删体重",
            "wake_word": "批量删体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量删体重」。\n\n我要按日期范围批量删除体重记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n起止日期(YYYY-MM-DD):____ ~ ____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "weight_4",
        "label": "看体重备注",
        "scenes": [
          {
            "id": "w_notes",
            "title": "看「有备注」的体重记录",
            "wake_word": "看「有备注」的体重记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看「有备注」的体重记录」。\n\n我想看所有带备注的体重记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "weight_5",
        "label": "看体重明细",
        "scenes": [
          {
            "id": "w_detail_week",
            "title": "看本周体重",
            "wake_word": "看本周体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周体重」。\n\n我想看本周(自然周,周一开始)的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_detail_last_week",
            "title": "看上周体重",
            "wake_word": "看上周体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上周体重」。\n\n我想看上周(自然周)的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_detail_month",
            "title": "看本月体重",
            "wake_word": "看本月体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本月体重」。\n\n我想看本月(自然月)的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_detail_last_month",
            "title": "看上月体重",
            "wake_word": "看上月体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上月体重」。\n\n我想看上个月(自然月)的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_detail_7d",
            "title": "看最近 7 天体重",
            "wake_word": "看最近 7 天体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 7 天体重」。\n\n我想看最近 7 天(滚动)的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_detail_90d",
            "title": "看最近 90 天体重",
            "wake_word": "看最近 90 天体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 90 天体重」。\n\n我想看最近 90 天的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_detail_range",
            "title": "看某段时间体重",
            "wake_word": "看某段时间体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看某段时间体重」。\n\n我想看某段时间(自定义起止日期)的体重明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n起止日期(YYYY-MM-DD):____ ~ ____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "weight_6",
        "label": "看体重曲线",
        "scenes": [
          {
            "id": "w_curve",
            "title": "看体重曲线",
            "wake_word": "看体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重曲线」。\n\n我想看体重曲线(默认最近 30 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_target",
            "title": "看体重曲线（带目标）",
            "wake_word": "看体重曲线（带目标）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重曲线（带目标）」。\n\n我想看最近 30 天的体重曲线,并把我的目标体重画成目标线。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_milestone",
            "title": "看体重曲线（带里程碑）",
            "wake_word": "看体重曲线（带里程碑）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重曲线（带里程碑）」。\n\n我想看最近 30 天的体重曲线,并在上面标出里程碑点(如减重 5kg/10kg 达成的那天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_anomaly",
            "title": "看体重曲线（带异常点）",
            "wake_word": "看体重曲线（带异常点）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重曲线（带异常点）」。\n\n我想看最近 30 天的体重曲线,并标出异常点(与正常波动偏差较大的记录)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_month",
            "title": "看本月体重曲线",
            "wake_word": "看本月体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本月体重曲线」。\n\n我想看本月(自然月)的体重曲线。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_last_month",
            "title": "看上月体重曲线",
            "wake_word": "看上月体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上月体重曲线」。\n\n我想看上个月(自然月)的体重曲线。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_90d",
            "title": "看最近 90 天体重曲线",
            "wake_word": "看最近 90 天体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 90 天体重曲线」。\n\n我想看最近 90 天的体重曲线(每 3 天降采样显示)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_180d",
            "title": "看最近 180 天体重曲线",
            "wake_word": "看最近 180 天体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 180 天体重曲线」。\n\n我想看最近 180 天的体重曲线(每周降采样显示)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_365d",
            "title": "看最近 365 天体重曲线",
            "wake_word": "看最近 365 天体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 365 天体重曲线」。\n\n我想看最近 365 天的体重曲线(每月降采样显示)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_curve_range",
            "title": "看某段时间体重曲线",
            "wake_word": "看某段时间体重曲线",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看某段时间体重曲线」。\n\n我想看某段时间(自定义起止日期)的体重曲线,跨度大时自动降采样。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n起止日期(YYYY-MM-DD):____ ~ ____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "weight_7",
        "label": "看体重稳不稳",
        "scenes": [
          {
            "id": "w_vol",
            "title": "看体重稳不稳（增强版）",
            "wake_word": "看体重稳不稳（增强版）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重稳不稳（增强版）」。\n\n我想看最近 30 天我的体重稳不稳。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_vol_month",
            "title": "看本月波动",
            "wake_word": "看本月波动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本月波动」。\n\n我想看本月(自然月)体重波动。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_vol_90d",
            "title": "看最近 90 天波动",
            "wake_word": "看最近 90 天波动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 90 天波动」。\n\n我想看最近 90 天的体重波动(降采样显示)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_vol_180d",
            "title": "看最近 180 天波动",
            "wake_word": "看最近 180 天波动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 180 天波动」。\n\n我想看最近 180 天的体重波动(降采样显示)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "w_vol_anomalies",
            "title": "看波动异常点",
            "wake_word": "看波动异常点",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看波动异常点」。\n\n我想只看体重波动中的异常点。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "weight_8",
        "label": "量体重",
        "scenes": [
          {
            "id": "w_log",
            "title": "记体重",
            "wake_word": "记体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记体重」。\n\n我刚称了体重,帮我记录今天的体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n体重(kg):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_log_note",
            "title": "记体重（含备注）",
            "wake_word": "记体重（含备注）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记体重（含备注）」。\n\n我刚称了体重,记录今天的体重并带上备注(如 晨起空腹/运动后/睡前)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n体重(kg):____\n备注:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_backfill",
            "title": "补录体重",
            "wake_word": "补录体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「补录体重」。\n\n我要补录过去某天的体重(不是今天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n体重(kg):____\n日期(YYYY-MM-DD):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_backfill_batch",
            "title": "批量补录体重",
            "wake_word": "批量补录体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量补录体重」。\n\n我要一次补录多天的体重。我会给你 日期+体重 的列表(每行一条),也可能只说连续天数加起始体重让你帮我生成。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n多天体重(每行一条: 日期 体重):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "w_today",
            "title": "看今日体重",
            "wake_word": "看今日体重",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日体重」。\n\n我想看今天的体重数据。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "exercise",
    "icon": "🏃",
    "label": "运动",
    "subgroups": [
      {
        "id": "exercise_1",
        "label": "记运动",
        "scenes": [
          {
            "id": "exercise_add",
            "title": "记运动",
            "wake_word": "记运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记运动」。\n\n我做了运动,请记下来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n运动类型:____\n时长(分钟):____\n热量(卡,选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_add_note",
            "title": "记运动（含备注）",
            "wake_word": "记运动（含备注）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记运动（含备注）」。\n\n我做了运动,请连同备注一起记下来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n运动类型:____\n时长(分钟):____\n热量(卡,选填):____\n备注:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_add_strength",
            "title": "记力量训练",
            "wake_word": "记力量训练",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记力量训练」。\n\n我练了力量训练,请记下来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n动作名:____\n组数:____\n单组重量(kg):____\n每组次数:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_add_cardio",
            "title": "记有氧运动",
            "wake_word": "记有氧运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记有氧运动」。\n\n我做了有氧运动,请记下来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n运动类型:____\n时长(分钟):____\n距离(km,选填):____\n平均心率(选填):____\n最高心率(选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_add_daily",
            "title": "记日常活动",
            "wake_word": "记日常活动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记日常活动」。\n\n我做了日常活动(家务/通勤/走路等),请记下来。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n活动类型:____\n步数(选填):____\n时段(上午/下午/晚上,选填):____\n时长(分钟):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_backfill",
            "title": "补记运动",
            "wake_word": "补记运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「补记运动」。\n\n我忘了记某天的运动,请补录到指定日期。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n运动类型:____\n日期:____\n时长(分钟):____\n热量(卡,选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_batch_add",
            "title": "批量补记运动",
            "wake_word": "批量补记运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量补记运动」。\n\n我要一次性补录多天的运动,每条含日期/类型/时长/热量。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n批量数据(每行一条:日期 类型 时长(分钟) 热量(卡)):\n____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_copy",
            "title": "复制昨日运动",
            "wake_word": "复制昨日运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「复制昨日运动」。\n\n我想把昨天的运动记录复制到今天(或指定日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n复制到哪一天(选填,默认今天):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "exercise_2",
        "label": "改运动",
        "scenes": [
          {
            "id": "exercise_update",
            "title": "改运动记录",
            "wake_word": "改运动记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改运动记录」。\n\n我要改一条运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要改的记录(选填,如「最近一条」或日期):____\n要改的字段(类型/时长/热量/日期/备注):____\n新值:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_update_day",
            "title": "改某日运动",
            "wake_word": "改某日运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改某日运动」。\n\n我要改某一天的运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:____\n要改的字段:____\n新值:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_delete",
            "title": "删运动记录",
            "wake_word": "删运动记录",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删运动记录」。\n\n我要删一条运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要删的记录(选填,如「最近一条」或日期):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_delete_day",
            "title": "删某日运动",
            "wake_word": "删某日运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删某日运动」。\n\n我要删某一天的全部运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "exercise_delete_range",
            "title": "批量删运动",
            "wake_word": "批量删运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「批量删运动」。\n\n我要删除一个时间范围内的运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "exercise_3",
        "label": "看运动",
        "scenes": [
          {
            "id": "exercise_view_today",
            "title": "看今日运动",
            "wake_word": "看今日运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日运动」。\n\n我想看今天运动明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_yesterday",
            "title": "看昨日运动",
            "wake_word": "看昨日运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看昨日运动」。\n\n我想看昨天运动明细。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_week",
            "title": "看本周运动",
            "wake_word": "看本周运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周运动」。\n\n我想看本周运动(周一到今天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_last_week",
            "title": "看上周运动",
            "wake_word": "看上周运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上周运动」。\n\n我想看上周运动(周一至周日)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_month",
            "title": "看本月运动",
            "wake_word": "看本月运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本月运动」。\n\n我想看本月运动(1 号到今天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_last_month",
            "title": "看上月运动",
            "wake_word": "看上月运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上月运动」。\n\n我想看上月运动。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_7d",
            "title": "看最近 7 天运动",
            "wake_word": "看最近 7 天运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 7 天运动」。\n\n我想看最近 7 天运动。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_30d",
            "title": "看最近 30 天运动",
            "wake_word": "看最近 30 天运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 30 天运动」。\n\n我想看最近 30 天运动。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_range",
            "title": "看某段时间运动",
            "wake_word": "看某段时间运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看某段时间运动」。\n\n我想看一段自定义时间的运动。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_today_vs_goal",
            "title": "看今日运动（vs 目标）",
            "wake_word": "看今日运动（vs 目标）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日运动（vs 目标）」。\n\n我想看今天的运动目标达成情况。如果还没设过每日运动消耗目标,先问我目标值。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_week_vs_goal",
            "title": "看本周运动（vs 目标）",
            "wake_word": "看本周运动（vs 目标）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周运动（vs 目标）」。\n\n我想看本周的运动目标达成情况。如果还没设过每日运动消耗目标,先问我目标值。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_notes",
            "title": "看运动记录（有备注）",
            "wake_word": "看运动记录（有备注）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看运动记录（有备注）」。\n\n我想看带备注的运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_strength",
            "title": "看运动记录（按力量筛选）",
            "wake_word": "看运动记录（按力量筛选）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看运动记录（按力量筛选）」。\n\n我想看力量训练记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_cardio",
            "title": "看运动记录（按有氧筛选）",
            "wake_word": "看运动记录（按有氧筛选）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看运动记录（按有氧筛选）」。\n\n我想看有氧运动记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_60d",
            "title": "看最近 60 天运动",
            "wake_word": "看最近 60 天运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 60 天运动」。\n\n我想看最近 60 天运动(每天一行)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_180d",
            "title": "看最近 180 天运动",
            "wake_word": "看最近 180 天运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 180 天运动」。\n\n我想看最近 180 天运动(每 3 天降采样一行)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_view_365d",
            "title": "看最近 365 天运动",
            "wake_word": "看最近 365 天运动",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看最近 365 天运动」。\n\n我想看最近 365 天运动(每周降采样一行)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "exercise_4",
        "label": "运动分析",
        "scenes": [
          {
            "id": "exercise_distribution",
            "title": "看运动类型分布",
            "wake_word": "看运动类型分布",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看运动类型分布」。\n\n我想看运动类型分布。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_strength_overview",
            "title": "看力量训练总览",
            "wake_word": "看力量训练总览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看力量训练总览」。\n\n我想看力量训练总览。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_cardio_overview",
            "title": "看有氧训练总览",
            "wake_word": "看有氧训练总览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看有氧训练总览」。\n\n我想看有氧训练总览。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_trend",
            "title": "看运动趋势",
            "wake_word": "看运动趋势",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看运动趋势」。\n\n我想看运动趋势。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间窗口(天,选填,默认 30):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "exercise_5",
        "label": "运动复盘",
        "scenes": [
          {
            "id": "exercise_recap_week",
            "title": "运动复盘（本周）",
            "wake_word": "运动复盘（本周）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「运动复盘（本周）」。\n\n我想看本周运动复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_recap_month",
            "title": "运动复盘（本月）",
            "wake_word": "运动复盘（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「运动复盘（本月）」。\n\n我想看本月运动复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_recap_90d",
            "title": "运动复盘（最近 90 天）",
            "wake_word": "运动复盘（最近 90 天）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「运动复盘（最近 90 天）」。\n\n我想看最近 90 天运动复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_recap_year",
            "title": "运动复盘（今年）",
            "wake_word": "运动复盘（今年）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「运动复盘（今年）」。\n\n我想看今年运动复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "exercise_recap_range",
            "title": "运动复盘（自定义时间）",
            "wake_word": "运动复盘（自定义时间）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「运动复盘（自定义时间）」。\n\n我想看一段自定义时间的运动复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "workout",
    "icon": "💪",
    "label": "健身计划",
    "subgroups": [
      {
        "id": "workout_1",
        "label": "定训练计划",
        "scenes": [
          {
            "id": "plan_set",
            "title": "定训练计划",
            "wake_word": "定训练计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定训练计划」。\n\n我想制定一份新的健身计划,根据我的目标和训练情况来安排(标题/总周数/起始日)。如果我没说清楚我的目标和训练情况,请先问我。请先给我看完整计划预览,我确认后再保存,保存后给我回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_copy",
            "title": "复制训练计划",
            "wake_word": "复制训练计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「复制训练计划」。\n\n我想把现有训练计划复制一份作为模板(可以复制整个计划或某一周)。请告诉我复制了哪些内容、新计划/新周的标题或周次。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要复制的周次(选填,空=整个计划):____\n新标题(选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_set_rest",
            "title": "定休息日",
            "wake_word": "定休息日",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定休息日」。\n\n我想把某一天的训练标记为休息日(或取消休息)。完成后给我设置回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期或周次+星期:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_add_movement",
            "title": "加训练动作",
            "wake_word": "加训练动作",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「加训练动作」。\n\n我想给计划里的某一天或某个训练时段加训练动作,包括动作名、组数和重量。如果计划是每周循环的,告诉我加在哪一周,不说就所有周都加。完成后给我回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n加到哪天(如 周三):____\n加到第几周(选填,空=所有周):____\n时段(选填):____\n动作名:____\n组数:____\n重量(kg,选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_set_week",
            "title": "定一周计划",
            "wake_word": "定一周计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定一周计划」。\n\n我想快速设置某一周的训练安排,告诉我这周每天(周一至周日)练什么或休息,只想练其中几天也没关系,空着的天按休息处理。完成后给我设置回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n第几周(默认本周):____\n一周安排(如:周一胸、周三腿,没说的天按休息):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "workout_2",
        "label": "看训练计划",
        "scenes": [
          {
            "id": "plan_view_this_week",
            "title": "看本周计划",
            "wake_word": "看本周计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周计划」。\n\n我想看本周的训练日历。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_next_week",
            "title": "看下周计划",
            "wake_word": "看下周计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看下周计划」。\n\n我想看下周的训练日历。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_last_week",
            "title": "看上周计划",
            "wake_word": "看上周计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看上周计划」。\n\n我想看上周的训练日历。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_week",
            "title": "看指定周计划",
            "wake_word": "看指定周计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看指定周计划」。\n\n我想看某一周的训练日历。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n周次(如第 3 周):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_today",
            "title": "看今天练什么",
            "wake_word": "看今天练什么",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今天练什么」。\n\n我想看今天要练的动作。如果今天休息或计划还没开始,请明确告诉我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_day",
            "title": "看某天练什么",
            "wake_word": "看某天练什么",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看某天练什么」。\n\n我想看指定日期的训练内容(动作/组数/重量)。如果那天休息或计划还没开始,请明确告诉我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(YYYY-MM-DD,默认今天):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_overview",
            "title": "看计划概览",
            "wake_word": "看计划概览",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看计划概览」。\n\n我想看整个健身计划的概览。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_full",
            "title": "看完整计划",
            "wake_word": "看完整计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看完整计划」。\n\n我想一次看完整的健身计划(所有周的全部训练安排)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_view_movement",
            "title": "看某动作安排",
            "wake_word": "看某动作安排",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看某动作安排」。\n\n我想查一个动作在训练计划里的安排(哪天练/几组/重量/下次练习日)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n动作名:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_vs_actual",
            "title": "看计划 vs 实际",
            "wake_word": "看计划 vs 实际",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看计划 vs 实际」。\n\n我想对比一段时间里计划和实际完成。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(默认本周,可给日期):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "workout_3",
        "label": "改训练计划",
        "scenes": [
          {
            "id": "plan_update",
            "title": "改训练计划",
            "wake_word": "改训练计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改训练计划」。\n\n我想改训练计划的某个字段(如标题、总周数、开始日期、描述)。改完并提示影响(如改开始日期会影响周次计算)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要改的字段(标题/总周数/开始日期/描述,可改多个):____\n新值:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_update_day",
            "title": "改某天训练",
            "wake_word": "改某天训练",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改某天训练」。\n\n我想改某一天的训练安排(时段、动作、组数等)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:____\n要改的内容:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_delete_day",
            "title": "删某天训练",
            "wake_word": "删某天训练",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删某天训练」。\n\n我想删掉某一天的训练安排(或某天的某个训练时段)。删除前先让我确认,确认后删除,给我确认回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期:____\n要删的时段(选填,空=删整天):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_update_movement",
            "title": "改动作",
            "wake_word": "改动作",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改动作」。\n\n我想把计划里的某个动作换成另一个动作(或改它的组数)。如果计划是每周循环的,告诉我要改哪一周,不说就所有周都改。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要改的周(选填,空=所有周):____\n原动作:____\n新动作:____\n组数(选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_delete",
            "title": "撤销训练计划",
            "wake_word": "撤销训练计划",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「撤销训练计划」。\n\n我想删除整个训练计划(所有周次和配置)。删除前先让我确认,确认后删除,给我删除回执和提示(删除后如何重新制定)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "workout_4",
        "label": "落地训练",
        "scenes": [
          {
            "id": "plan_execute",
            "title": "落地训练",
            "wake_word": "落地训练",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「落地训练」。\n\n我想把某天的训练计划真正落地执行:补计划到日历、记心愿、推送到训记、拉取训记实绩 4 步全流程,逐动作确认实际做的重量和组数。给我看 4 步进度和每步结果(已补计划/已记心愿/已推送/已回写),以及完成度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(默认今天):____",
            "types": [
              "过程"
            ]
          },
          {
            "id": "plan_execute_weekend",
            "title": "落地到本周末",
            "wake_word": "落地到本周末",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「落地到本周末」。\n\n我想把从今天到周日所有训练日一次落地执行(补计划/记心愿/推训记/回写),如果今天已是周日就只落地今天。请给我看跨天列表、每一步的汇总(已补计划/已记心愿/已推送/已回写)和总完成度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "过程"
            ]
          },
          {
            "id": "plan_execute_month",
            "title": "落地到本月底",
            "wake_word": "落地到本月底",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「落地到本月底」。\n\n我想把从今天到本月底所有训练日一次落地执行(补计划/记心愿/推训记/回写),如果今天已是月底就只落地今天。请给我看跨天列表、每一步的汇总(已补计划/已记心愿/已推送/已回写)和总完成度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "过程"
            ]
          },
          {
            "id": "plan_sync_xunji",
            "title": "同步到训记",
            "wake_word": "同步到训记",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「同步到训记」。\n\n我想把某天的训练计划推送到训记 App(落地流程里的训记推送这一步单独做)。推送前先检查计划里的动作名训记能否识别,有识别不了的先告诉我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(默认今天):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "plan_backfill_xunji",
            "title": "拉训记实绩",
            "wake_word": "拉训记实绩",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「拉训记实绩」。\n\n我想把训记 App 里的实际训练数据拉回来,写进卡路里的运动记录(落地流程里的回写这一步单独做)。如有冲突请提示我处理。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(默认今天):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "workout_5",
        "label": "计划复盘",
        "scenes": [
          {
            "id": "plan_review_week",
            "title": "计划复盘（本周）",
            "wake_word": "计划复盘（本周）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「计划复盘（本周）」。\n\n我想复盘本周的训练:完成率、训练日数、消耗等关键数字,完成趋势,以及本周与上周的对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_review_month",
            "title": "计划复盘（本月）",
            "wake_word": "计划复盘（本月）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「计划复盘（本月）」。\n\n我想复盘本月的训练:完成率、训练日数、消耗等关键数字,完成趋势,以及本月与上月的对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_review_all",
            "title": "计划复盘（全部）",
            "wake_word": "计划复盘（全部）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「计划复盘（全部）」。\n\n我想复盘整个训练计划:总完成率,以及做得最多的动作(高频动作)排名。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_completion_rate",
            "title": "看计划完成率",
            "wake_word": "看计划完成率",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看计划完成率」。\n\n我想看训练计划的完成率趋势。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_missed",
            "title": "看未完成训练",
            "wake_word": "看未完成训练",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看未完成训练」。\n\n我想看哪些天的训练没完成(漏练)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(默认最近 4 周):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "plan_movement_rate",
            "title": "看动作完成率",
            "wake_word": "看动作完成率",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看动作完成率」。\n\n我想看每个动作的完成率排名。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间范围(默认最近 4 周):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "workout_6",
        "label": "安全检查",
        "scenes": [
          {
            "id": "plan_contraindication",
            "title": "扫禁忌",
            "wake_word": "扫禁忌",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「扫禁忌」。\n\n我想检查训练计划里有没有伤腰/膝/肩的禁忌动作(默认全身位,也可以指定部位)。请列出有风险的动作、原因,以及推荐的替代动作。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n部位(腰/膝/肩,选填,默认全部):____",
            "types": [
              "结果"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "goal",
    "icon": "🎯",
    "label": "目标管理",
    "subgroups": [
      {
        "id": "goal_1",
        "label": "定目标",
        "scenes": [
          {
            "id": "goal_set_nutrition",
            "title": "定营养目标",
            "wake_word": "定营养目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定营养目标」。\n\n我想设每日 4 大宏量营养目标(热量/蛋白/碳水/脂肪)+ 饮水目标。若热量明显低于我的基础代谢(BMR),请提示我注意。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的目标数值(请按实际替换,不知道的可以空着):\n热量(卡):____\n蛋白(g):____\n碳水(g):____\n脂肪(g):____\n饮水(ml):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_nutrition_auto",
            "title": "定营养目标(自动算)",
            "wake_word": "定营养目标(自动算)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定营养目标(自动算)」。\n\n想根据我的档案(身高/体重/年龄/活动量)+ 目标方向自动算出 4 项营养目标。若我未提供方向或档案信息缺失,请先询问补齐;若我已明确表达,直接计算,必要时做几句信息确认即可。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的目标方向(减脂 / 维持 / 增肌):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_weight",
            "title": "定体重目标",
            "wake_word": "定体重目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定体重目标」。\n\n我想设定体重目标(目标 kg + 可选截止日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的体重目标(kg):____\n截止日期(选填):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_weight_auto_deadline",
            "title": "定体重目标(自动算截止)",
            "wake_word": "定体重目标(自动算截止)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定体重目标(自动算截止)」。\n\n我想设定体重目标(目标 kg + 期望每周减重速率),由你自动推算合理截止日期,并校验速率是否合理(不超安全范围)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的体重目标(kg):____\n期望每周减重速率(kg/周):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_weight_with_start",
            "title": "定体重目标(含起始日)",
            "wake_word": "定体重目标(含起始日)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定体重目标(含起始日)」。\n\n我想完整设定体重目标:目标 kg + 起始日 + 截止日 + 起点体重。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的体重目标(kg):____\n起始日:____\n截止日期:____\n起点体重(kg):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_water",
            "title": "定饮水目标",
            "wake_word": "定饮水目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定饮水目标」。\n\n我想设定每天饮水目标(ml)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的饮水目标(ml):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_water_auto",
            "title": "定饮水目标(自动算)",
            "wake_word": "定饮水目标(自动算)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「定饮水目标(自动算)」。\n\n想按我的体重(ml/kg)自动推算饮水目标推荐值,并和旧目标对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的体重(kg,选填,默认取最新记录):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_set_full_kit",
            "title": "一键定全套目标",
            "wake_word": "一键定全套目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「一键定全套目标」。\n\n想一键设定 3 类目标(营养 + 体重 + 饮水),基于我的档案自动计算,先给我看结果,等我确认后再采纳。若我的档案(身高/年龄/活动量)未设置、无体重记录或信息缺失,请先询问补齐;若我已明确表达,直接计算,必要时做几句信息确认即可。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的目标方向(减脂 / 维持 / 增肌):____\n我的体重目标(kg,选填):____\n截止日期(选填):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "goal_2",
        "label": "看目标",
        "scenes": [
          {
            "id": "goal_view_today",
            "title": "看今日目标",
            "wake_word": "看今日目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看今日目标」。\n\n我想看今日 5 项目标完成度(热量/蛋白/碳水/脂肪/饮水)。体重是累计目标,若我想看,请引导我到「看体重目标进度」。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_week",
            "title": "看本周目标",
            "wake_word": "看本周目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看本周目标」。\n\n我想看本周目标完成情况(热量/蛋白/碳水/脂肪/饮水)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_nutrition_progress",
            "title": "看营养目标进度",
            "wake_word": "看营养目标进度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看营养目标进度」。\n\n我想看 4 项营养目标(热量/蛋白/碳水/脂肪)的完成进度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_weight_progress",
            "title": "看体重目标进度",
            "wake_word": "看体重目标进度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重目标进度」。\n\n我想看体重目标进度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_water_progress",
            "title": "看饮水目标进度",
            "wake_word": "看饮水目标进度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看饮水目标进度」。\n\n我想看今日饮水进度。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_vs_actual",
            "title": "看目标对比实际",
            "wake_word": "看目标对比实际",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看目标对比实际」。\n\n我想看热量目标线 vs 实际摄入线的对比与偏差分析,默认最近 30 天(可自定义时间窗口)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间窗口(天,选填,默认 30):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_completion",
            "title": "看目标完成度（含缺口）",
            "wake_word": "看目标完成度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看目标完成度」。\n\n我想看全部目标完成度汇总(热量/蛋白/碳水/脂肪/饮水)和总评分。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_expiring",
            "title": "看即将到期的目标",
            "wake_word": "看即将到期的目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看即将到期的目标」。\n\n我想看即将到期的体重目标(默认 14 天内到期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n到期窗口(天,选填,默认 14):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_completion_rate_week",
            "title": "看目标完成率(按周)",
            "wake_word": "看目标完成率(按周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看目标完成率(按周)」。\n\n我想看本周(7 天)每日目标完成率 + 达标天数(达标带 80%-120%)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_completion_rate_month",
            "title": "看目标完成率(按月)",
            "wake_word": "看目标完成率(按月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看目标完成率(按月)」。\n\n我想看本月(30 天)每日目标完成率 + 达标天数(达标带 80%-120%)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_history_complete",
            "title": "看目标历史完成",
            "wake_word": "看目标历史完成",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看目标历史完成」。\n\n我想看历史目标达成情况,含每日达成列表与完成/未完成天数统计(达标带 80%-120%)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n回看天数(选填,默认 30):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "goal_view_predict",
            "title": "看目标预测达成",
            "wake_word": "看目标预测达成",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看目标预测达成」。\n\n我想看按当前趋势预测的目标达成日与置信度(体重部分复用对比体重的预测逻辑)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "goal_3",
        "label": "改目标",
        "scenes": [
          {
            "id": "goal_modify_nutrition",
            "title": "改营养目标",
            "wake_word": "改营养目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改营养目标」。\n\n我想修改营养目标(热量/蛋白/碳水/脂肪/饮水),可同时改多项,并预估修改后的影响(热量缺口/预算变化)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我要改的项(每行一项,不改的留空):\n热量(卡)新目标值:____\n蛋白(g)新目标值:____\n碳水(g)新目标值:____\n脂肪(g)新目标值:____\n饮水(ml)新目标值:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_modify_weight",
            "title": "改体重目标",
            "wake_word": "改体重目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改体重目标」。\n\n我想修改体重目标值或截止日期,并给出新的建议减重速率。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我要改的项(每行一项,不改的留空):\n体重目标(kg):____\n截止日期:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_modify_water",
            "title": "改饮水目标",
            "wake_word": "改饮水目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改饮水目标」。\n\n我想单独修改饮水目标,其他营养目标保持不变。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n饮水目标(ml):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_pause_all",
            "title": "暂停所有目标",
            "wake_word": "暂停所有目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「暂停所有目标」。\n\n我想临时冻结全部目标(营养 + 体重 + 饮水),记录照常,仅目标暂停,并提示恢复入口。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "回执"
            ]
          },
          {
            "id": "goal_resume_all",
            "title": "重启所有目标",
            "wake_word": "重启所有目标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「重启所有目标」。\n\n我想从暂停恢复全部目标(营养 + 体重 + 饮水)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "回执"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "body_detail",
    "icon": "🧬",
    "label": "身体细节",
    "subgroups": [
      {
        "id": "body_detail_1",
        "label": "记身体细节",
        "scenes": [
          {
            "id": "body_comp_add_caliper",
            "title": "记体脂（皮褶钳）",
            "wake_word": "记体脂（皮褶钳）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记体脂（皮褶钳）」。\n\n我用皮褶钳测了 7 点(胸/腹/大腿/三头/肩胛下/髂上/腋中 mm),请按 Jackson-Pollock 7 点法帮我算体脂率并记录。如果我没说性别/年龄,请先问我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n7 点皮褶厚度(mm):\n胸:____\n腹:____\n大腿:____\n三头:____\n肩胛下:____\n髂上:____\n腋中:____\n性别(男/女):____\n年龄:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_comp_add_external",
            "title": "记体脂（外部测量）",
            "wake_word": "记体脂（外部测量）",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记体脂（外部测量）」。\n\n我用外部设备(健身房 InBody/医院/其他)测了体脂率,请帮我记录体脂率和来源、日期。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n体脂率(%):____\n来源(健身房/医院/其他):____\n日期:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_meas_add",
            "title": "记围度",
            "wake_word": "记围度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记围度」。\n\n我量了身体围度,请帮我记录 13 项围度(胸/腰/腹/臀/肩/大腿/小腿/手臂/前臂,左+右),量了哪项填哪项,没量的留空。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n胸围(cm):____\n腰围(cm):____\n腹围(cm):____\n臀围(cm):____\n肩围(cm):____\n左大腿(cm):____\n右大腿(cm):____\n左小腿(cm):____\n右小腿(cm):____\n左上臂(cm):____\n右上臂(cm):____\n左前臂(cm):____\n右前臂(cm):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_comp_backfill",
            "title": "补记体脂",
            "wake_word": "补记体脂",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「补记体脂」。\n\n我要补录之前某天的体脂测量(不是今天的)。如果那天已有记录,请先告诉我冲突再确认。补完后可以问我还要不要补其他日期。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n体脂率(%):____\n来源(皮褶钳/健身房/医院/其他):____\n日期:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_meas_backfill",
            "title": "补记围度",
            "wake_word": "补记围度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「补记围度」。\n\n我要补录之前某天的围度测量(不是今天的)。如果那天已有记录,请先告诉我冲突再确认。补完后可以问我还要不要补其他日期。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n各围度(cm,量了哪项填哪项):\n胸围:____\n腰围:____\n腹围:____\n臀围:____\n肩围:____\n左大腿:____\n右大腿:____\n左小腿:____\n右小腿:____\n左上臂:____\n右上臂:____\n左前臂:____\n右前臂:____\n日期:____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "body_detail_2",
        "label": "看身体细节",
        "scenes": [
          {
            "id": "body_comp_list",
            "title": "看体脂",
            "wake_word": "看体脂",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体脂」。\n\n我想看历史体脂记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "body_comp_trend",
            "title": "看体脂趋势",
            "wake_word": "看体脂趋势",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体脂趋势」。\n\n我想看体脂率趋势,默认用我最近用的来源,也可以切换来源。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "body_meas_list",
            "title": "看围度",
            "wake_word": "看围度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看围度」。\n\n我想看历史围度记录。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "body_meas_trend",
            "title": "看围度趋势",
            "wake_word": "看围度趋势",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看围度趋势」。\n\n我想看某个部位的围度变化。请先让我选部位。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "body_detail_3",
        "label": "比身体细节",
        "scenes": [
          {
            "id": "body_comp_compare",
            "title": "对比体脂",
            "wake_word": "对比体脂",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比体脂」。\n\n我想对比两次体脂测量,第一次和第二次都可以给具体日期或一段时间。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n第一次(日期或时间段):____\n第二次(日期或时间段):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "body_meas_compare",
            "title": "对比围度",
            "wake_word": "对比围度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比围度」。\n\n我想对比两次围度测量。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n第一次日期:____\n第二次日期:____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "body_detail_4",
        "label": "删身体细节",
        "scenes": [
          {
            "id": "body_comp_delete",
            "title": "删体脂",
            "wake_word": "删体脂",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删体脂」。\n\n我要删一条体脂记录。如果我没说清是哪条,请先列出最近的几条记录(日期/体脂率/来源)让我选。确认后,删除前先给我看这条记录的内容,确认无误再删,最后给我确认回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要删的记录(选填,如「最近一条」或日期):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_meas_delete",
            "title": "删围度",
            "wake_word": "删围度",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删围度」。\n\n我要删一条围度记录。如果我没说清是哪条,请先列出最近的几条记录(日期/各围度)让我选。确认后,删除前先给我看这条记录的内容,确认无误再删,最后给我确认回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要删的记录(选填,如「最近一条」或日期):____",
            "types": [
              "回执"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "body_photo",
    "icon": "📸",
    "label": "身材照片",
    "subgroups": [
      {
        "id": "body_photo_1",
        "label": "存身材照",
        "scenes": [
          {
            "id": "body_photo_add_single",
            "title": "存一张照片",
            "wake_word": "记身材照",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记身材照」。\n\n我要存一张身材照。你可以直接发照片给我(手机/飞书),也可以告诉我照片文件路径(电脑)。如果标签没说,请问我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n标签(如 正面/侧面/背部):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_photo_add_note",
            "title": "存照片（含备注）",
            "wake_word": "记身材照",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记身材照」。\n\n我要存一张身材照并附备注(比如当时的状态/饮食阶段)。你可以直接发照片给我(手机/飞书),也可以告诉我照片文件路径(电脑)。如果标签没说,请问我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n标签(如 正面/侧面/背部):____\n备注:____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_photo_add_batch",
            "title": "批量存照片",
            "wake_word": "记身材照",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「记身材照」。\n\n我要一次性存多张身材照(可连发多张照片,或给多个路径)。每张照片可以单独指定标签(如\"这张是侧面\"),没指定的用我给的默认标签。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n默认标签(如 正面):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "body_photo_2",
        "label": "看身材照",
        "scenes": [
          {
            "id": "body_photo_list",
            "title": "看身材照",
            "wake_word": "查身材照",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查身材照」。\n\n我想浏览身材照。时间可以用天数(如最近 30 天)、某个日期(如 7月1日)、或一段范围(如 6月1日~7月1日);没填默认最近 90 天。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n时间(最近 N 天 / 某日期 / 某范围,选填):____\n标签(选填,如 正面):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "body_photo_3",
        "label": "比身材照",
        "scenes": [
          {
            "id": "body_photo_gif",
            "title": "生成身材照 GIF",
            "wake_word": "生成身材照GIF",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「生成身材照GIF」。\n\n我要把一段时间的多张身材照合成变化 GIF。请先确认照片范围(标签/时间)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n标签(如 正面):____\n时间范围(如 最近3个月 / 起始日期):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "body_photo_compare",
            "title": "对比两张照片",
            "wake_word": "对比两张照片",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「对比两张照片」。\n\n我想把两张身材照并排对比。可以说日期(如\"月初 vs 月底\")、编号,或让我从最近的照片里选。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n照片 1(日期/编号/留空):____\n照片 2(日期/编号/留空):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "body_photo_4",
        "label": "管身材照",
        "scenes": [
          {
            "id": "body_photo_delete",
            "title": "删身材照",
            "wake_word": "删身材照",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删身材照」。\n\n我要删一张身材照(删除后无法恢复)。如果我没说清是哪张,请先列出最近的几张照片(缩略图+日期+标签)让我选。确认后,删除前先给我看这张照片的内容(快照),确认无误再删,最后给我确认回执。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n要删的照片(选填,如「最近一张」或日期):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_photo_tag_set",
            "title": "改照片标签",
            "wake_word": "改照片标签",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改照片标签」。\n\n我要把某张照片的标签换成整套新标签(覆盖旧的,可多个)。请先确认这张照片原来的完整标签列表。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n照片(日期或编号):____\n新标签(可多个,如 正面,侧面):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_photo_tag_add",
            "title": "加照片标签",
            "wake_word": "加照片标签",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「加照片标签」。\n\n我要给某张照片追加标签(不覆盖已有,可一次加多个)。如果某个标签已经存在,请提示我。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n照片(日期或编号):____\n要加的标签(可多个,逗号分隔):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "body_photo_tag_remove",
            "title": "删照片标签",
            "wake_word": "删照片标签",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「删照片标签」。\n\n我要从某张照片上移除标签(其余保留,可一次删多个)。请先告诉我这张照片当前有哪些标签,每张照片至少保留 1 个标签,删空会提示我;想清空全部标签请用「改照片标签」。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n照片(日期或编号):____\n要删的标签(可多个,逗号分隔):____",
            "types": [
              "回执"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "profile",
    "icon": "⚙️",
    "label": "基础信息",
    "subgroups": [
      {
        "id": "profile_1",
        "label": "设置资料",
        "scenes": [
          {
            "id": "profile_setup",
            "title": "设置档案",
            "wake_word": "设置档案",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「设置档案」。\n\n我想设置基础档案(身高/年龄/性别/活动量)。如果我没说全,请一项一项问我,并根据我的日常情况推荐合适的活动量。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的身高(cm):____\n年龄:____\n性别(男/女):____\n日常活动情况(选填,用于推荐活动量):____",
            "types": [
              "回执"
            ]
          },
          {
            "id": "profile_set_activity",
            "title": "设活动量",
            "wake_word": "设活动量",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「设活动量」。\n\n我要单独设置活动量(久坐/轻度/中度/活跃/高度活跃)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我的活动量(久坐/轻度/中度/活跃/高度活跃):____",
            "types": [
              "回执"
            ]
          }
        ]
      },
      {
        "id": "profile_2",
        "label": "看档案",
        "scenes": [
          {
            "id": "profile_view",
            "title": "查档案",
            "wake_word": "查档案",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查档案」。\n\n我想看自己的完整档案。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "profile_3",
        "label": "改资料",
        "scenes": [
          {
            "id": "profile_update",
            "title": "改档案",
            "wake_word": "改档案",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「改档案」。\n\n我要改档案里的字段(身高/年龄/性别/活动量/备注)。改之前请先确认我原来的值。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n我要改的字段(允许一行一条,可改多个):\n身高(新值):____\n年龄(新值):____\n性别(新值):____\n活动量(新值):____\n备注(新值):____",
            "types": [
              "回执"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "analysis",
    "icon": "📊",
    "label": "分析",
    "subgroups": [
      {
        "id": "analysis_1",
        "label": "健康报告",
        "scenes": [
          {
            "id": "report_full_week_cur",
            "title": "看健康报告(本周)",
            "wake_word": "看健康报告(本周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(本周)」。\n\n我想看本周的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_week_prev",
            "title": "看健康报告(上周)",
            "wake_word": "看健康报告(上周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(上周)」。\n\n我想看上周的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_7d",
            "title": "看健康报告(最近 7 天)",
            "wake_word": "看健康报告(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(最近 7 天)」。\n\n我想看最近 7 天的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_30d",
            "title": "看健康报告(最近 30 天)",
            "wake_word": "看健康报告(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(最近 30 天)」。\n\n我想看最近 30 天的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_90d",
            "title": "看健康报告(最近 90 天)",
            "wake_word": "看健康报告(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(最近 90 天)」。\n\n我想看最近 90 天的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_180d",
            "title": "看健康报告(最近 180 天)",
            "wake_word": "看健康报告(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(最近 180 天)」。\n\n我想看最近 180 天的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_365d",
            "title": "看健康报告(最近 365 天)",
            "wake_word": "看健康报告(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(最近 365 天)」。\n\n我想看最近 365 天的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_month_cur",
            "title": "看健康报告(本月)",
            "wake_word": "看健康报告(本月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(本月)」。\n\n我想看本月的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_month_prev",
            "title": "看健康报告(上月)",
            "wake_word": "看健康报告(上月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(上月)」。\n\n我想看上月的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_year_cur",
            "title": "看健康报告(今年)",
            "wake_word": "看健康报告(今年)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(今年)」。\n\n我想看今年的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_full_custom",
            "title": "看健康报告(自定义)",
            "wake_word": "看健康报告(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(自定义)」。\n\n我想看自定义时间段(开始日期到结束日期)的跨 8 维综合健康报告(饮食/运动/体重/饮水/体脂/围度/缺口/目标)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_bmi",
            "title": "看BMI报告",
            "wake_word": "看BMI报告",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看BMI报告」。\n\n我想看BMI报告。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_tdee",
            "title": "看TDEE报告",
            "wake_word": "看TDEE报告",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看TDEE报告」。\n\n我想看TDEE报告。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_bmr",
            "title": "看BMR报告",
            "wake_word": "看BMR报告",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看BMR报告」。\n\n我想看BMR报告。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_protein",
            "title": "看蛋白质摄入报告",
            "wake_word": "看蛋白质摄入报告",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白质摄入报告」。\n\n我想看蛋白质摄入报告。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_water",
            "title": "看水分摄入报告",
            "wake_word": "看水分摄入报告",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看水分摄入报告」。\n\n我想看水分摄入报告。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_score",
            "title": "看综合评分",
            "wake_word": "看综合评分",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看综合评分」。\n\n我想看综合评分。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_trend",
            "title": "看健康趋势",
            "wake_word": "看健康趋势",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康趋势」。\n\n我想看健康趋势。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "report_compare",
            "title": "看健康报告(含对比)",
            "wake_word": "看健康报告(含对比)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看健康报告(含对比)」。\n\n我想看健康报告(含对比)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_2",
        "label": "单点分析",
        "scenes": [
          {
            "id": "six_factors_daily",
            "title": "看每日 6 因素综合",
            "wake_word": "看每日 6 因素综合",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看每日 6 因素综合」。\n\n我想看某一天的全维度健康快照(体重/饮食/运动/饮水/体脂/围度)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n日期(YYYY-MM-DD):____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_3",
        "label": "整体趋势",
        "scenes": [
          {
            "id": "trend_g1",
            "title": "看整体趋势(体重+摄入+运动)",
            "wake_word": "看整体趋势(体重+摄入+运动)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(体重+摄入+运动)」。\n\n我想看多指标整体趋势(「体重+摄入+运动」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g2",
            "title": "看整体趋势(体重+体脂+围度)",
            "wake_word": "看整体趋势(体重+体脂+围度)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(体重+体脂+围度)」。\n\n我想看多指标整体趋势(「体重+体脂+围度」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g3",
            "title": "看整体趋势(饮食+蛋白+纤维)",
            "wake_word": "看整体趋势(饮食+蛋白+纤维)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(饮食+蛋白+纤维)」。\n\n我想看多指标整体趋势(「饮食+蛋白+纤维」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g4",
            "title": "看整体趋势(运动+力量+有氧)",
            "wake_word": "看整体趋势(运动+力量+有氧)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(运动+力量+有氧)」。\n\n我想看多指标整体趋势(「运动+力量+有氧」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g5",
            "title": "看整体趋势(BMI+体脂+肌肉量)",
            "wake_word": "看整体趋势(BMI+体脂+肌肉量)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(BMI+体脂+肌肉量)」。\n\n我想看多指标整体趋势(「BMI+体脂+肌肉量」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g6",
            "title": "看整体趋势(摄入+蛋白+运动)",
            "wake_word": "看整体趋势(摄入+蛋白+运动)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(摄入+蛋白+运动)」。\n\n我想看多指标整体趋势(「摄入+蛋白+运动」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g7",
            "title": "看整体趋势(体重+蛋白+缺口)",
            "wake_word": "看整体趋势(体重+蛋白+缺口)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(体重+蛋白+缺口)」。\n\n我想看多指标整体趋势(「体重+蛋白+缺口」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g8",
            "title": "看整体趋势(体重+摄入+缺口)",
            "wake_word": "看整体趋势(体重+摄入+缺口)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(体重+摄入+缺口)」。\n\n我想看多指标整体趋势(「体重+摄入+缺口」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g9",
            "title": "看整体趋势(体重+摄入+运动+缺口)",
            "wake_word": "看整体趋势(体重+摄入+运动+缺口)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(体重+摄入+运动+缺口)」。\n\n我想看多指标整体趋势(「体重+摄入+运动+缺口」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g10",
            "title": "看整体趋势(蛋白+运动)",
            "wake_word": "看整体趋势(蛋白+运动)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(蛋白+运动)」。\n\n我想看多指标整体趋势(「蛋白+运动」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_g11",
            "title": "看整体趋势(综合多指标)",
            "wake_word": "看整体趋势(综合多指标)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(综合多指标)」。\n\n我想看多指标整体趋势(「综合多指标」3 个以上指标同图)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_period_monthly",
            "title": "看整体趋势(含月度对比)",
            "wake_word": "看整体趋势(含月度对比)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(含月度对比)」。\n\n我想看全维度综合趋势图并含周期对比(含月度对比)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_period_quarterly",
            "title": "看整体趋势(含季度对比)",
            "wake_word": "看整体趋势(含季度对比)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(含季度对比)」。\n\n我想看全维度综合趋势图并含周期对比(含季度对比)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_period_yearly",
            "title": "看整体趋势(含年度对比)",
            "wake_word": "看整体趋势(含年度对比)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(含年度对比)」。\n\n我想看全维度综合趋势图并含周期对比(含年度对比)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "trend_period_target",
            "title": "看整体趋势(含目标对比)",
            "wake_word": "看整体趋势(含目标对比)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看整体趋势(含目标对比)」。\n\n我想看全维度综合趋势图并含周期对比(含目标对比)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_4",
        "label": "组合分析",
        "scenes": [
          {
            "id": "cross_weight_calorie_7d",
            "title": "看体重 vs 摄入(最近 7 天)",
            "wake_word": "看体重 vs 摄入(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 7 天)」。\n\n我想看最近 7 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_15d",
            "title": "看体重 vs 摄入(最近 15 天)",
            "wake_word": "看体重 vs 摄入(最近 15 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 15 天)」。\n\n我想看最近 15 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_30d",
            "title": "看体重 vs 摄入(最近 30 天)",
            "wake_word": "看体重 vs 摄入(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 30 天)」。\n\n我想看最近 30 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_60d",
            "title": "看体重 vs 摄入(最近 60 天)",
            "wake_word": "看体重 vs 摄入(最近 60 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 60 天)」。\n\n我想看最近 60 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_90d",
            "title": "看体重 vs 摄入(最近 90 天)",
            "wake_word": "看体重 vs 摄入(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 90 天)」。\n\n我想看最近 90 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_180d",
            "title": "看体重 vs 摄入(最近 180 天)",
            "wake_word": "看体重 vs 摄入(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 180 天)」。\n\n我想看最近 180 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_365d",
            "title": "看体重 vs 摄入(最近 365 天)",
            "wake_word": "看体重 vs 摄入(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(最近 365 天)」。\n\n我想看最近 365 天的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_week_cur",
            "title": "看体重 vs 摄入(本周)",
            "wake_word": "看体重 vs 摄入(本周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(本周)」。\n\n我想看本周的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_month_cur",
            "title": "看体重 vs 摄入(本月)",
            "wake_word": "看体重 vs 摄入(本月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(本月)」。\n\n我想看本月的体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_calorie_custom",
            "title": "看体重 vs 摄入(自定义)",
            "wake_word": "看体重 vs 摄入(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 摄入(自定义)」。\n\n我想看体重走势 vs 每日摄入热量的关系(吃多少影响体重吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_7d",
            "title": "看体重 vs 运动(最近 7 天)",
            "wake_word": "看体重 vs 运动(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 7 天)」。\n\n我想看最近 7 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_15d",
            "title": "看体重 vs 运动(最近 15 天)",
            "wake_word": "看体重 vs 运动(最近 15 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 15 天)」。\n\n我想看最近 15 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_30d",
            "title": "看体重 vs 运动(最近 30 天)",
            "wake_word": "看体重 vs 运动(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 30 天)」。\n\n我想看最近 30 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_60d",
            "title": "看体重 vs 运动(最近 60 天)",
            "wake_word": "看体重 vs 运动(最近 60 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 60 天)」。\n\n我想看最近 60 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_90d",
            "title": "看体重 vs 运动(最近 90 天)",
            "wake_word": "看体重 vs 运动(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 90 天)」。\n\n我想看最近 90 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_180d",
            "title": "看体重 vs 运动(最近 180 天)",
            "wake_word": "看体重 vs 运动(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 180 天)」。\n\n我想看最近 180 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_365d",
            "title": "看体重 vs 运动(最近 365 天)",
            "wake_word": "看体重 vs 运动(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(最近 365 天)」。\n\n我想看最近 365 天的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_week_cur",
            "title": "看体重 vs 运动(本周)",
            "wake_word": "看体重 vs 运动(本周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(本周)」。\n\n我想看本周的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_month_cur",
            "title": "看体重 vs 运动(本月)",
            "wake_word": "看体重 vs 运动(本月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(本月)」。\n\n我想看本月的体重走势 vs 每日运动消耗的关系(运动影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_exercise_custom",
            "title": "看体重 vs 运动(自定义)",
            "wake_word": "看体重 vs 运动(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 运动(自定义)」。\n\n我想看体重走势 vs 每日运动消耗的关系(运动影响体重吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_7d",
            "title": "看体重 vs 蛋白(最近 7 天)",
            "wake_word": "看体重 vs 蛋白(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 7 天)」。\n\n我想看最近 7 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_15d",
            "title": "看体重 vs 蛋白(最近 15 天)",
            "wake_word": "看体重 vs 蛋白(最近 15 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 15 天)」。\n\n我想看最近 15 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_30d",
            "title": "看体重 vs 蛋白(最近 30 天)",
            "wake_word": "看体重 vs 蛋白(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 30 天)」。\n\n我想看最近 30 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_60d",
            "title": "看体重 vs 蛋白(最近 60 天)",
            "wake_word": "看体重 vs 蛋白(最近 60 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 60 天)」。\n\n我想看最近 60 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_90d",
            "title": "看体重 vs 蛋白(最近 90 天)",
            "wake_word": "看体重 vs 蛋白(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 90 天)」。\n\n我想看最近 90 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_180d",
            "title": "看体重 vs 蛋白(最近 180 天)",
            "wake_word": "看体重 vs 蛋白(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 180 天)」。\n\n我想看最近 180 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_365d",
            "title": "看体重 vs 蛋白(最近 365 天)",
            "wake_word": "看体重 vs 蛋白(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(最近 365 天)」。\n\n我想看最近 365 天的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_week_cur",
            "title": "看体重 vs 蛋白(本周)",
            "wake_word": "看体重 vs 蛋白(本周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(本周)」。\n\n我想看本周的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_month_cur",
            "title": "看体重 vs 蛋白(本月)",
            "wake_word": "看体重 vs 蛋白(本月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(本月)」。\n\n我想看本月的体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_protein_custom",
            "title": "看体重 vs 蛋白(自定义)",
            "wake_word": "看体重 vs 蛋白(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 蛋白(自定义)」。\n\n我想看体重走势 vs 每日蛋白摄入的关系(蛋白够不够影响体重吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_7d",
            "title": "看体重 vs 缺口(最近 7 天)",
            "wake_word": "看体重 vs 缺口(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 7 天)」。\n\n我想看最近 7 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_15d",
            "title": "看体重 vs 缺口(最近 15 天)",
            "wake_word": "看体重 vs 缺口(最近 15 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 15 天)」。\n\n我想看最近 15 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_30d",
            "title": "看体重 vs 缺口(最近 30 天)",
            "wake_word": "看体重 vs 缺口(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 30 天)」。\n\n我想看最近 30 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_60d",
            "title": "看体重 vs 缺口(最近 60 天)",
            "wake_word": "看体重 vs 缺口(最近 60 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 60 天)」。\n\n我想看最近 60 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_90d",
            "title": "看体重 vs 缺口(最近 90 天)",
            "wake_word": "看体重 vs 缺口(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 90 天)」。\n\n我想看最近 90 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_180d",
            "title": "看体重 vs 缺口(最近 180 天)",
            "wake_word": "看体重 vs 缺口(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 180 天)」。\n\n我想看最近 180 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_365d",
            "title": "看体重 vs 缺口(最近 365 天)",
            "wake_word": "看体重 vs 缺口(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(最近 365 天)」。\n\n我想看最近 365 天的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_week_cur",
            "title": "看体重 vs 缺口(本周)",
            "wake_word": "看体重 vs 缺口(本周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(本周)」。\n\n我想看本周的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_month_cur",
            "title": "看体重 vs 缺口(本月)",
            "wake_word": "看体重 vs 缺口(本月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(本月)」。\n\n我想看本月的体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_deficit_custom",
            "title": "看体重 vs 缺口(自定义)",
            "wake_word": "看体重 vs 缺口(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 缺口(自定义)」。\n\n我想看体重走势 vs 每日热量缺口的关系(缺口大小影响减重速度吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_calorie_exercise_7d",
            "title": "看摄入 vs 运动(最近 7 天)",
            "wake_word": "看摄入 vs 运动(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看摄入 vs 运动(最近 7 天)」。\n\n我想看最近 7 天的每日摄入 vs 每日运动消耗的关系(吃得和动得匹配吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_calorie_exercise_30d",
            "title": "看摄入 vs 运动(最近 30 天)",
            "wake_word": "看摄入 vs 运动(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看摄入 vs 运动(最近 30 天)」。\n\n我想看最近 30 天的每日摄入 vs 每日运动消耗的关系(吃得和动得匹配吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_calorie_exercise_90d",
            "title": "看摄入 vs 运动(最近 90 天)",
            "wake_word": "看摄入 vs 运动(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看摄入 vs 运动(最近 90 天)」。\n\n我想看最近 90 天的每日摄入 vs 每日运动消耗的关系(吃得和动得匹配吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_calorie_exercise_180d",
            "title": "看摄入 vs 运动(最近 180 天)",
            "wake_word": "看摄入 vs 运动(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看摄入 vs 运动(最近 180 天)」。\n\n我想看最近 180 天的每日摄入 vs 每日运动消耗的关系(吃得和动得匹配吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_calorie_exercise_365d",
            "title": "看摄入 vs 运动(最近 365 天)",
            "wake_word": "看摄入 vs 运动(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看摄入 vs 运动(最近 365 天)」。\n\n我想看最近 365 天的每日摄入 vs 每日运动消耗的关系(吃得和动得匹配吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_calorie_exercise_custom",
            "title": "看摄入 vs 运动(自定义)",
            "wake_word": "看摄入 vs 运动(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看摄入 vs 运动(自定义)」。\n\n我想看每日摄入 vs 每日运动消耗的关系(吃得和动得匹配吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_bodyfat_7d",
            "title": "看体重 vs 体脂(最近 7 天)",
            "wake_word": "看体重 vs 体脂(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 体脂(最近 7 天)」。\n\n我想看最近 7 天的体重走势 vs 体脂率走势的关系(减的是脂肪还是水分)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_bodyfat_30d",
            "title": "看体重 vs 体脂(最近 30 天)",
            "wake_word": "看体重 vs 体脂(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 体脂(最近 30 天)」。\n\n我想看最近 30 天的体重走势 vs 体脂率走势的关系(减的是脂肪还是水分)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_bodyfat_90d",
            "title": "看体重 vs 体脂(最近 90 天)",
            "wake_word": "看体重 vs 体脂(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 体脂(最近 90 天)」。\n\n我想看最近 90 天的体重走势 vs 体脂率走势的关系(减的是脂肪还是水分)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_bodyfat_180d",
            "title": "看体重 vs 体脂(最近 180 天)",
            "wake_word": "看体重 vs 体脂(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 体脂(最近 180 天)」。\n\n我想看最近 180 天的体重走势 vs 体脂率走势的关系(减的是脂肪还是水分)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_bodyfat_365d",
            "title": "看体重 vs 体脂(最近 365 天)",
            "wake_word": "看体重 vs 体脂(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 体脂(最近 365 天)」。\n\n我想看最近 365 天的体重走势 vs 体脂率走势的关系(减的是脂肪还是水分)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_bodyfat_custom",
            "title": "看体重 vs 体脂(自定义)",
            "wake_word": "看体重 vs 体脂(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 体脂(自定义)」。\n\n我想看体重走势 vs 体脂率走势的关系(减的是脂肪还是水分)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_waist_7d",
            "title": "看体重 vs 围度(最近 7 天)",
            "wake_word": "看体重 vs 围度(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 围度(最近 7 天)」。\n\n我想看最近 7 天的体重走势 vs 各部位围度走势的关系(腰围真的在变小吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_waist_30d",
            "title": "看体重 vs 围度(最近 30 天)",
            "wake_word": "看体重 vs 围度(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 围度(最近 30 天)」。\n\n我想看最近 30 天的体重走势 vs 各部位围度走势的关系(腰围真的在变小吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_waist_90d",
            "title": "看体重 vs 围度(最近 90 天)",
            "wake_word": "看体重 vs 围度(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 围度(最近 90 天)」。\n\n我想看最近 90 天的体重走势 vs 各部位围度走势的关系(腰围真的在变小吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_waist_180d",
            "title": "看体重 vs 围度(最近 180 天)",
            "wake_word": "看体重 vs 围度(最近 180 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 围度(最近 180 天)」。\n\n我想看最近 180 天的体重走势 vs 各部位围度走势的关系(腰围真的在变小吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_waist_365d",
            "title": "看体重 vs 围度(最近 365 天)",
            "wake_word": "看体重 vs 围度(最近 365 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 围度(最近 365 天)」。\n\n我想看最近 365 天的体重走势 vs 各部位围度走势的关系(腰围真的在变小吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_weight_waist_custom",
            "title": "看体重 vs 围度(自定义)",
            "wake_word": "看体重 vs 围度(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看体重 vs 围度(自定义)」。\n\n我想看体重走势 vs 各部位围度走势的关系(腰围真的在变小吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_water_weight_30d",
            "title": "看饮水 vs 体重(最近 30 天)",
            "wake_word": "看饮水 vs 体重(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看饮水 vs 体重(最近 30 天)」。\n\n我想看最近 30 天的饮水量 vs 体重的关系(喝水多少影响体重吗)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "cross_water_weight_custom",
            "title": "看饮水 vs 体重(自定义)",
            "wake_word": "看饮水 vs 体重(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看饮水 vs 体重(自定义)」。\n\n我想看饮水量 vs 体重的关系(喝水多少影响体重吗)。请帮我分析自定义时间段(开始日期到结束日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_5",
        "label": "缺口分析",
        "scenes": [
          {
            "id": "deficit_analysis",
            "title": "查热量缺口",
            "wake_word": "查热量缺口",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查热量缺口」。\n\n我想看热量缺口:摄入 vs 运动消耗 vs TDEE 的每日构成与累计缺口。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_6",
        "label": "自动分析",
        "scenes": [
          {
            "id": "diag_weight_volatility",
            "title": "诊断体重波动原因",
            "wake_word": "诊断体重波动原因",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断体重波动原因」。\n\n我想诊断体重波动的来源(为什么忽上忽下)。并分解波动来源(水分/盐分/摄入)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_weight_plateau",
            "title": "诊断体重停滞(含平台期判断)",
            "wake_word": "诊断体重停滞(含平台期判断)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断体重停滞(含平台期判断)」。\n\n我想诊断体重停滞:帮我判断是否进入平台期(≥14 天体重变化 ≤±0.5kg)。数据不足时降级提示。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_weight_rebound",
            "title": "诊断体重反弹",
            "wake_word": "诊断体重反弹",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断体重反弹」。\n\n我想诊断体重反弹:追溯反弹起点与可能原因(摄入回升/水分滞留/盐分)。数据不足时降级提示。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_weight_loss_cause",
            "title": "诊断体重下降原因",
            "wake_word": "诊断体重下降原因",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断体重下降原因」。\n\n我想诊断近期体重下降的原因:评估速度是否健康(0.5-1kg/周),区分来自饮食缺口还是运动。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_weight_anomaly",
            "title": "诊断体重异常点",
            "wake_word": "诊断体重异常点",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断体重异常点」。\n\n我想找出体重记录里的异常点(偏离均值过大的日期)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_weight_divergence",
            "title": "诊断体重vs体脂围度背离",
            "wake_word": "诊断体重vs体脂围度背离",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断体重vs体脂围度背离」。\n\n我想诊断体重与体脂/围度是否背离(体重没变但腰细了?体重降但体脂没降?):背离检测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_diet_over",
            "title": "诊断饮食超标",
            "wake_word": "诊断饮食超标",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断饮食超标」。\n\n我想诊断我的饮食是否超标:超标日统计 + 超标来源食物 TOP。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_diet_under",
            "title": "诊断饮食不足",
            "wake_word": "诊断饮食不足",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断饮食不足」。\n\n我想诊断我的饮食是否不足:低于 BMR 天数。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_diet_unbalanced",
            "title": "诊断营养不均衡(含均衡判断)",
            "wake_word": "诊断营养不均衡(含均衡判断)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断营养不均衡(含均衡判断)」。\n\n我想诊断我的营养是否均衡:三大营养占比 + 失衡维度 + 钠摄入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_diet_structure",
            "title": "诊断饮食结构问题",
            "wake_word": "诊断饮食结构问题",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断饮食结构问题」。\n\n我想诊断我的饮食结构:餐次分布(早/午/晚/夜宵)+ 单日进食频率 + 结构定位。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_exercise_insufficient",
            "title": "诊断运动不足",
            "wake_word": "诊断运动不足",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断运动不足」。\n\n我想诊断我的运动是否不足:运动频率(次/周)+ 日均消耗 + 与建议对比。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_exercise_overload",
            "title": "诊断运动过量",
            "wake_word": "诊断运动过量",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断运动过量」。\n\n我想诊断我是否运动过量:连续训练天数检测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_exercise_type_imbalance",
            "title": "诊断运动类型失衡",
            "wake_word": "诊断运动类型失衡",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断运动类型失衡」。\n\n我想诊断我的运动类型是否均衡:力量/有氧/柔韧占比 + 建议搭配。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_exercise_efficiency",
            "title": "诊断运动效率(含有效判断)",
            "wake_word": "诊断运动效率(含有效判断)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断运动效率(含有效判断)」。\n\n我想诊断我的运动效率:单位时长消耗(卡/分钟)+ 分类效率 + 有效性判断。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_exercise_advice",
            "title": "诊断运动建议(含类型推荐)",
            "wake_word": "诊断运动建议(含类型推荐)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「诊断运动建议(含类型推荐)」。\n\n我想知道我应该加哪种运动:基于当前运动结构的类型推荐 + 频率建议。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_why_not_losing",
            "title": "为什么我没瘦",
            "wake_word": "为什么我没瘦",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「为什么我没瘦」。\n\n为什么我没瘦?请全维度归因(缺口是否真的为负/平台期/水分/漏记)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_why_losing_fast",
            "title": "为什么我瘦太快",
            "wake_word": "为什么我瘦太快",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「为什么我瘦太快」。\n\n为什么我瘦太快?请评估速度是否危险(>1.5kg/周 为过快)+ 摄入是否过低。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_rate_reasonable",
            "title": "我的减重速度合理吗",
            "wake_word": "我的减重速度合理吗",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「我的减重速度合理吗」。\n\n我的减重速度合理吗?请与健康范围(0.5-1.0kg/周)对比,给出判定。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_strategy_check",
            "title": "我的减肥策略对吗",
            "wake_word": "我的减肥策略对吗",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「我的减肥策略对吗」。\n\n我的减肥策略对吗?请做元评估:缺口是否合理 + 蛋白是否足够 + 运动是否有贡献。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_gap_to_goal",
            "title": "我距离目标还差什么",
            "wake_word": "我距离目标还差什么",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「我距离目标还差什么」。\n\n我距离目标还差什么?当前体重 vs 目标体重差距 + 按当前速度的预计达成时间。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_month_highlights",
            "title": "我这个月做得好的",
            "wake_word": "我这个月做得好的",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「我这个月做得好的」。\n\n我这个月做得好的有哪些?请做正向复盘:体重/运动/摄入各维度的亮点。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_month_improve",
            "title": "我这个月需要改的",
            "wake_word": "我这个月需要改的",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「我这个月需要改的」。\n\n我这个月需要改什么?请做负向复盘:超标日/运动不足/饮水不足等短板。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "diag_overall",
            "title": "综合健康评估",
            "wake_word": "综合健康评估",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「综合健康评估」。\n\n请给我做一次综合健康评估。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_7",
        "label": "营养分析",
        "scenes": [
          {
            "id": "nut_protein_carbs_7d",
            "title": "看蛋白 vs 碳水(最近 7 天)",
            "wake_word": "看蛋白 vs 碳水(最近 7 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 碳水(最近 7 天)」。\n\n我想看最近 7 天的蛋白与碳水摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_protein_carbs_30d",
            "title": "看蛋白 vs 碳水(最近 30 天)",
            "wake_word": "看蛋白 vs 碳水(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 碳水(最近 30 天)」。\n\n我想看最近 30 天的蛋白与碳水摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_protein_carbs_90d",
            "title": "看蛋白 vs 碳水(最近 90 天)",
            "wake_word": "看蛋白 vs 碳水(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 碳水(最近 90 天)」。\n\n我想看最近 90 天的蛋白与碳水摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_protein_carbs_custom",
            "title": "看蛋白 vs 碳水(自定义)",
            "wake_word": "看蛋白 vs 碳水(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 碳水(自定义)」。\n\n我想看自定义时间段(开始日期到结束日期)的蛋白与碳水摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_protein_fat_30d",
            "title": "看蛋白 vs 脂肪(最近 30 天)",
            "wake_word": "看蛋白 vs 脂肪(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 脂肪(最近 30 天)」。\n\n我想看最近 30 天的蛋白与脂肪摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_protein_fat_90d",
            "title": "看蛋白 vs 脂肪(最近 90 天)",
            "wake_word": "看蛋白 vs 脂肪(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 脂肪(最近 90 天)」。\n\n我想看最近 90 天的蛋白与脂肪摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_protein_fat_custom",
            "title": "看蛋白 vs 脂肪(自定义)",
            "wake_word": "看蛋白 vs 脂肪(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看蛋白 vs 脂肪(自定义)」。\n\n我想看自定义时间段(开始日期到结束日期)的蛋白与脂肪摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_carbs_fat_30d",
            "title": "看碳水 vs 脂肪(最近 30 天)",
            "wake_word": "看碳水 vs 脂肪(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看碳水 vs 脂肪(最近 30 天)」。\n\n我想看最近 30 天的碳水与脂肪摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_carbs_fat_90d",
            "title": "看碳水 vs 脂肪(最近 90 天)",
            "wake_word": "看碳水 vs 脂肪(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看碳水 vs 脂肪(最近 90 天)」。\n\n我想看最近 90 天的碳水与脂肪摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_carbs_fat_custom",
            "title": "看碳水 vs 脂肪(自定义)",
            "wake_word": "看碳水 vs 脂肪(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看碳水 vs 脂肪(自定义)」。\n\n我想看自定义时间段(开始日期到结束日期)的碳水与脂肪摄入量的关系。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_sodium_fiber",
            "title": "看钠糖纤维趋势",
            "wake_word": "看钠糖纤维趋势",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看钠糖纤维趋势」。\n\n我想看钠/糖/纤维三种营养素的趋势(可让我选时间窗口,默认最近 90 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_sodium_combined",
            "title": "看钠糖纤维综合",
            "wake_word": "看钠糖纤维综合",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看钠糖纤维综合」。\n\n我想看钠/糖/纤维综合报告。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_advice",
            "title": "看营养建议",
            "wake_word": "看营养建议",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看营养建议」。\n\n我想看营养改进建议。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_macro3_30d",
            "title": "看三大营养交叉(最近 30 天)",
            "wake_word": "看三大营养交叉(最近 30 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看三大营养交叉(最近 30 天)」。\n\n我想看最近 30 天的蛋白/碳水/脂肪三者交叉。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_macro3_90d",
            "title": "看三大营养交叉(最近 90 天)",
            "wake_word": "看三大营养交叉(最近 90 天)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看三大营养交叉(最近 90 天)」。\n\n我想看最近 90 天的蛋白/碳水/脂肪三者交叉。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "nut_macro3_custom",
            "title": "看三大营养交叉(自定义)",
            "wake_word": "看三大营养交叉(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「看三大营养交叉(自定义)」。\n\n我想看自定义时间段(开始日期到结束日期)的蛋白/碳水/脂肪三者交叉。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n开始日期:____\n结束日期:____",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_8",
        "label": "预测模拟",
        "scenes": [
          {
            "id": "pred_weight_week",
            "title": "预测体重(1 周后)",
            "wake_word": "预测体重(1 周后)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「预测体重(1 周后)」。\n\n我想预测 1 周后的体重。若数据不足 14 天请明确提示不预测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_weight_month",
            "title": "预测体重(1 月后)",
            "wake_word": "预测体重(1 月后)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「预测体重(1 月后)」。\n\n我想预测 1 月后的体重。若数据不足 14 天请明确提示不预测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_weight_3m",
            "title": "预测体重(3 月后)",
            "wake_word": "预测体重(3 月后)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「预测体重(3 月后)」。\n\n我想预测 3 月后的体重。若数据不足 14 天请明确提示不预测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_weight_6m",
            "title": "预测体重(6 月后)",
            "wake_word": "预测体重(6 月后)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「预测体重(6 月后)」。\n\n我想预测 6 月后的体重。若数据不足 14 天请明确提示不预测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_weight_custom_t",
            "title": "预测体重(自定义时间)",
            "wake_word": "预测体重(自定义时间)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「预测体重(自定义时间)」。\n\n我想预测自定义时间后的体重。若数据不足 14 天请明确提示不预测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n预测多少天后:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_weight_target",
            "title": "预测体重(自定义目标)",
            "wake_word": "预测体重(自定义目标)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「预测体重(自定义目标)」。\n\n我想按当前趋势预测达成目标体重的日期:预计达成日 + 所需天数 + 假设说明 + 可行性提示;若数据不足 14 天请明确提示不预测。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n目标体重(kg):____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_cut_300",
            "title": "模拟减重(每天-300卡)",
            "wake_word": "模拟减重(每天-300卡)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(每天-300卡)」。\n\n我想模拟每天多减 300 卡的减重效果。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_cut_500",
            "title": "模拟减重(每天-500卡)",
            "wake_word": "模拟减重(每天-500卡)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(每天-500卡)」。\n\n我想模拟每天多减 500 卡的减重效果。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_cut_700",
            "title": "模拟减重(每天-700卡)",
            "wake_word": "模拟减重(每天-700卡)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(每天-700卡)」。\n\n我想模拟每天多减 700 卡的减重效果。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_target_30",
            "title": "模拟减重(30天减Xkg)",
            "wake_word": "模拟减重(30天减Xkg)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(30天减Xkg)」。\n\n我想模拟 30 天减 X 公斤。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n30 天想减多少 kg:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_target_60",
            "title": "模拟减重(60天减Xkg)",
            "wake_word": "模拟减重(60天减Xkg)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(60天减Xkg)」。\n\n我想模拟 60 天减 X 公斤。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n60 天想减多少 kg:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_target_90",
            "title": "模拟减重(90天减Xkg)",
            "wake_word": "模拟减重(90天减Xkg)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(90天减Xkg)」。\n\n我想模拟 90 天减 X 公斤。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n90 天想减多少 kg:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_sim_target_custom",
            "title": "模拟减重(自定义天数减Xkg)",
            "wake_word": "模拟减重(自定义天数减Xkg)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「模拟减重(自定义天数减Xkg)」。\n\n我想模拟自定义天数内减 X 公斤。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n天数:____\n想减多少 kg:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_week",
            "title": "摄入预测(按当前速率 1 周)",
            "wake_word": "摄入预测(按当前速率 1 周)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(按当前速率 1 周)」。\n\n我想按当前速率预测 1 周后的日均摄入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_month",
            "title": "摄入预测(按当前速率 1 月)",
            "wake_word": "摄入预测(按当前速率 1 月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(按当前速率 1 月)」。\n\n我想按当前速率预测 1 月后的日均摄入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_3m",
            "title": "摄入预测(按当前速率 3 月)",
            "wake_word": "摄入预测(按当前速率 3 月)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(按当前速率 3 月)」。\n\n我想按当前速率预测 3 月后的日均摄入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_custom",
            "title": "摄入预测(自定义)",
            "wake_word": "摄入预测(自定义)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(自定义)」。\n\n我想预测自定义时间后的日均摄入。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。\n\n预测多少天后:____",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_goal",
            "title": "摄入预测(营养目标达成预测)",
            "wake_word": "摄入预测(营养目标达成预测)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(营养目标达成预测)」。\n\n我想预测营养目标能否达成。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_deficit",
            "title": "摄入预测(卡路里缺口预测)",
            "wake_word": "摄入预测(卡路里缺口预测)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(卡路里缺口预测)」。\n\n我想预测卡路里缺口。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          },
          {
            "id": "pred_cal_stability",
            "title": "摄入预测(摄入稳定性预测)",
            "wake_word": "摄入预测(摄入稳定性预测)",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「摄入预测(摄入稳定性预测)」。\n\n我想预测摄入的稳定性。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。",
            "types": [
              "结果"
            ]
          }
        ]
      },
      {
        "id": "analysis_9",
        "label": "既有唤醒词",
        "scenes": [
          {
            "id": "legacy_今日复盘",
            "title": "今日复盘",
            "wake_word": "今日复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「今日复盘」。\n\n我要看当日复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_关闭定时复盘",
            "title": "关闭定时复盘",
            "wake_word": "关闭定时复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「关闭定时复盘」。\n\n我要关掉每天自动复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_复盘",
            "title": "复盘",
            "wake_word": "复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「复盘」。\n\n我要看一份复盘报告,默认最近 7 天。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_复盘日期范围",
            "title": "复盘日期范围",
            "wake_word": "复盘日期范围",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「复盘日期范围」。\n\n我要看任意起止日期的复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_开启定时复盘",
            "title": "开启定时复盘",
            "wake_word": "开启定时复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「开启定时复盘」。\n\n我要设每天自动跑复盘(默认 23:00 跑过去 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_本周复盘",
            "title": "本周复盘",
            "wake_word": "本周复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「本周复盘」。\n\n我要看本周一-今天的复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_本年复盘",
            "title": "本年复盘",
            "wake_word": "本年复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「本年复盘」。\n\n我要看今年 1/1 - 今天的复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_本月复盘",
            "title": "本月复盘",
            "wake_word": "本月复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「本月复盘」。\n\n我要看本月 1 号-今天的复盘。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查低热量榜",
            "title": "查低热量榜",
            "wake_word": "查低热量榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查低热量榜」。\n\n我想看热量最低的 5 个健康食物(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查健康报告",
            "title": "查健康报告",
            "wake_word": "查健康报告",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查健康报告」。\n\n我要看 4 维健康仪表盘(热量/营养/运动/体重综合,默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查卡路里数据",
            "title": "查卡路里数据",
            "wake_word": "查卡路里数据",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查卡路里数据」。\n\n我要检查数据库的健康性。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查定时复盘",
            "title": "查定时复盘",
            "wake_word": "查定时复盘",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查定时复盘」。\n\n我想看当前定时复盘配置。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查热量趋势",
            "title": "查热量趋势",
            "wake_word": "查热量趋势",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查热量趋势」。\n\n我想看每日热量摄入趋势(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查营养结构",
            "title": "查营养结构",
            "wake_word": "查营养结构",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查营养结构」。\n\n我想看蛋白/碳水/脂肪占比(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查运动分布",
            "title": "查运动分布",
            "wake_word": "查运动分布",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查运动分布」。\n\n我想看 4 类运动(力量/有氧/柔韧/日常)的时间/消耗分布(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查运动贡献",
            "title": "查运动贡献",
            "wake_word": "查运动贡献",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查运动贡献」。\n\n我想看运动在热量缺口里的占比(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查频繁吃榜",
            "title": "查频繁吃榜",
            "wake_word": "查频繁吃榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查频繁吃榜」。\n\n我想看吃最多次的食物(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查食物排行",
            "title": "查食物排行",
            "wake_word": "查食物排行",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查食物排行」。\n\n我想看 TOP 食物热量榜(默认高热量,默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查高热量榜",
            "title": "查高热量榜",
            "wake_word": "查高热量榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查高热量榜」。\n\n我想看热量最高的 5 个食物(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查高碳水榜",
            "title": "查高碳水榜",
            "wake_word": "查高碳水榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查高碳水榜」。\n\n我想看碳水最高的 5 个食物(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          },
          {
            "id": "legacy_查高蛋白榜",
            "title": "查高蛋白榜",
            "wake_word": "查高蛋白榜",
            "status": "",
            "prompt_template": "请你加载技能 卡路里,执行唤醒词「查高蛋白榜」。\n\n我想看蛋白最高的 5 个食物(默认 7 天)。交付 HTML 时,文字只回复精简而全面概括的信息,文字不允许超过三句话。"
          }
        ]
      }
    ]
  }
];

/** 扁平 436 条（顺序与 HELP 分组一致；单源派生，不重复落词）。 */
export const WAKE_ASSETS: readonly WakeSceneAsset[] = WAKE_GROUPS.flatMap((g) =>
  g.subgroups.flatMap((s) => s.scenes),
);

/** id → 场景（实物 id 436/436 唯一）。 */
export const SCENE_BY_ID: Readonly<Record<string, WakeSceneAsset>> = Object.fromEntries(
  WAKE_ASSETS.map((s) => [s.id, s]),
);

/** 资产总数（由 `WAKE_ASSETS` 派生，单源不复写第二遍数；改资产即跟变，测试仍钉 436）。 */
export const WAKE_ASSET_TOTAL: number = WAKE_ASSETS.length;
