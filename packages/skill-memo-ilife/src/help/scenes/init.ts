/** #227 · 备忘录 HELP 内容资产 · `init` 域（初始化类）：1 个二级组／1 个场景
 *
 * ⚠️ 机器生成，**禁手改**：由 `packages/skill-memo-ilife/scripts/gen-help-assets.mjs` 产出。
 *    改内容＝改 `scripts/help-assets.rewrite.mjs`（30 场景重写表），再跑
 *    `node packages/skill-memo-ilife/scripts/gen-help-assets.mjs`（`--check` 只比对不落盘）。
 *
 * 事实源（仓外，全程只读）：老实物契约载荷 `备忘录_HELP_20260820_162453.html`（老 `script/memo_render.py:527-599` 的产出）
 *   与老 `references/scenarios.yaml` 顶层 `version`（＝1.3.0）。老侧**只出身份与路由**
 *   （`id`／`wake_word`／`types`／`status`／域序／组序／别名挂载），两地逐条交叉复核 30/30。
 * 摘要锁：老 30 条 sha256＝0aa8c228b1f277cf1053586887566cd5f2a33b6002ce4172a54657cc5f7d141c
 *           资产 30 条 sha256＝27745af5504a724cad59ec699ebe802f15fe2002e0b69c2fbfcafe7c7701cd55
 *
 * **#974 起三件内容**（`title`／`prompt_template`／`editable_fields`）**逐句重写**，规范＝卡路里标杆
 * `.scratch/help-prompt-rewrite/PROMPT-REWRITE.md`（口径取其关闭后终态）：
 *   1. 首行＝`请你加载技能 备忘录,执行唤醒词「<唤醒词>」。`——唤醒词本体逐字取自冻结词表，路由一行不动；
 *   2. 正文只留「唤醒词与参数行没说到的信息」那一句人话；老骨架的 `请按以下格式填写你的参数:`／
 *      `期望效果:` 标签／`无需参数,直接发送。` 一律不写（页面用控件有无表达「没有要填的」）；
 *   3. 参数行＝`<标签>:{{<name>}}`，一行一参，标签＝字段 `label`（`required:false` 的带 `(选填)`）；
 *      `editable_fields` 按 kind 闭集标注：本家 60 条落在 `text`／`select`／`date`，
 *      `number`／`week` 零实例（缺省 kind＝`text`）；
 *   4. `aliases` 12 条随场景挂载、渲染时剥离（裁决 5）；`status` 全空串（U1／U2／U3：HELP 是完整体）。
 * 与老骨架的逐条对账见 `docs/skills/skill-memo-ilife/t227-assets-report.md`（#227 那一代）与
 * `docs/skills/skill-memo-ilife/t974-实施-证据.md`（#974 这一代）。
 *
 * 本文件只给 1 个导出：`MEMO_HELP_INIT`＝该域**一个** `groups[]` 条目。
 */
export const MEMO_HELP_INIT = {
  id: "init",
  icon: "🚀",
  label: "初始化类",
  subgroups: [
    {
      id: "init_1",
      label: "基础",
      scenes: [
        {
          id: "memo_init_setup",
          title: "首次使用",
          wake_word: "首次使用",
          status: "",
          prompt_template: "请你加载技能 备忘录,执行唤醒词「首次使用」。\n\n我是第一次用,请按步骤帮我把环境搭起来:检查并配置运行环境、数据存储(全文搜索)、飞书联动(未安装就引导我安装并授权)、配置项,初始化数据库,配置提醒调度;每步缺什么就告诉我怎么装、怎么配。完成后生成初始化报告页给我,并带我浏览一遍全部功能。",
          types: ["向导", "采集", "回执"],
          aliases: ["初始化", "新手"],
        },
      ],
    },
  ],
};
