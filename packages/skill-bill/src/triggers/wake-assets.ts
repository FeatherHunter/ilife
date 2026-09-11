/** #146 · 饼干记账 HELP 内容资产（typed TS module，74 场景 ＝ 老 71 ＋ 现表多出 3 条）。
 *
 * 唯一事实源：老技能**新世代**实物 `D:\2Study\StudyNotes\SKILLS\饼干记账\饼干记账.html`
 * 的 `<script id="help-data">` payload——7 域／20 二级组／71 场景逐字落地，域、组、场景顺序与实物一致。
 * ⚠️ 别拿 `.db\biscuit_accountant_html\饼干记账_HELP_20260813_161051.html` 当基准：那是 pre-v4.0 的
 * **上一代**（技能自带壳 + `domains→subs→scenes` 旧信封），比老技能切到公共组件模板早 6.5 小时。
 *
 * 本文件由 `scripts/gen-wake-assets.mjs` 机器生成（逐字 `JSON.stringify`），**禁止手工改词**：
 * 改内容＝改事实源或改生成器里的新增条目段，再跑 `node packages/skill-bill/scripts/gen-wake-assets.mjs`
 * （`--check` 只比对不落盘；事实源在仓外，故 CI 不跑，改词必走生成器）。
 *
 * 与「纯搬运」不同的三处（生成器里写死、可复核）：
 *  1. 新增 3 条场景 `write_record`/`query_bills`/`query_bill_detail` ＝现 `WAKE_TABLE` 比老 HELP
 *     多出的 3 条（`记一笔`/`查账单`/`查账单详情`，用户 Q8=A 补进对应域）；老实物无此三条，
 *     `prompt_template` 按老实样重写（`____` 空槽 ＋ `(唤醒词:…)` 尾注）。
 *  2. `status` 全空照老实样（71/71 可用，无「待开发」）。
 *  3. `types` 沿用老词（采集／查看／选择／向导／回执）——共享 help 模板 `help-template.html:TYPE_DEFAULT`
 *     的徽章配色表里本来就有这 5 个词，零模板改动。
 *
 * 4 条 HELP 短语（`bill.help.lookup`）**不进场景目录**：HELP 是资产的呈现载体而非场景（防自指，
 * 照卡路里口径），由 `HELP_WAKE_WORDS` 从口径层 `WAKE_TABLE` **派生**——见本文件头下方说明。
 * 与 `WAKE_TABLE` 的双向对账由 `test/wake-assets.test.mjs` 钉住：老 70 个唯一唤醒词 100% 在位、
 * 现表 73 条非 HELP 短语全部有场景、场景唤醒词全部在现表。
 */
import { WAKE_TABLE } from '../policy/wakewords.js';

/** 徽章类型词（老实物用到的全集；共享 help 模板 `TYPE_DEFAULT` 认得这些词，缺席即配色表要改）。 */
export type WakeSceneType = '采集' | '查看' | '选择' | '向导' | '回执';

export interface WakeSceneAsset {
  readonly id: string;
  readonly title: string;
  readonly wake_word: string;
  /** 老实物 71/71 为空串（可用）；`【待开发】` 为本仓预留态。 */
  readonly status: string;
  /** 「复制指令」按钮按出来的正文，逐字保留。 */
  readonly prompt_template: string;
  readonly types: readonly WakeSceneType[];
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

/** 7 域／20 二级组／74 场景（老 71 逐字 ＋ 新增 3 条接在对应二级组末尾）。 */
export const WAKE_GROUPS: readonly WakeGroupAsset[] = [
  {
    "id": "write",
    "icon": "✏️",
    "label": "写入",
    "subgroups": [
      {
        "id": "write_1",
        "label": "记账",
        "scenes": [
          {
            "id": "write_expense",
            "title": "记一笔支出",
            "wake_word": "记支出",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔支出(唤醒词:记支出):\n\n  金  额: ____\n  分类/名目: ____ (如:房租 / 午饭 / 打车)\n  备  注: ____ (选填)\n  时  间: ____ (选填,默认现在;补记昨天写「昨天」)\n  账  户: ____ (选填,如:支付宝 / 微信)\n  账  本: ____ (选填,如:旅行 / 生活)\n  币  种: ____ (选填,默认人民币;外币如:USD)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_income",
            "title": "记一笔收入",
            "wake_word": "记收入",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔收入(唤醒词:记收入):\n\n  金  额: ____\n  分类/名目: ____ (如:工资 / 退款 / 卖闲置)\n  备  注: ____ (选填)\n  时  间: ____ (选填,默认现在)\n  账  户: ____ (选填,如:银行卡 / 微信)\n  币  种: ____ (选填,默认人民币;外币如:USD)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_bill_photo",
            "title": "拍账单记账(图片识别)",
            "wake_word": "拍账单",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我拍账单记账(唤醒词:拍账单):\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_batch",
            "title": "批量录入多笔",
            "wake_word": "批量录入",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我批量记几笔账(唤醒词:批量录入):\n\n  条  目: ____ (每行一笔,如:午饭35 / 奶茶25 / 打车20)\n  账  本: ____ (选填,如:旅行)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_record",
            "title": "记一笔",
            "wake_word": "记一笔",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔(唤醒词:记一笔):\n\n  金  额: ____ (支出写负数,收入写正数)\n  分类/名目: ____ (如:餐饮 / 工资 / 打车)\n  备  注: ____ (选填)\n  时  间: ____ (选填,默认现在;补记昨天写「昨天」)\n  账  户: ____ (选填,如:支付宝 / 微信)\n",
            "types": [
              "采集"
            ]
          }
        ]
      },
      {
        "id": "write_2",
        "label": "特殊收支",
        "scenes": [
          {
            "id": "write_refund",
            "title": "记一笔退款(冲销原支出)",
            "wake_word": "记退款",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔退款(唤醒词:记退款):\n\n  金  额: ____\n  原支出: ____ (描述哪一笔,如:昨天那笔午饭 / 5月1日买的衣服)\n  退款原因: ____ (选填,如:退货/取消订单/差价)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_reimburse",
            "title": "记一笔报销支出(#待报销)",
            "wake_word": "记报销",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔报销支出(唤醒词:记报销):\n\n  金  额: ____\n  分  类: ____ (选填,如:餐饮 / 差旅)\n  备  注: ____ (选填,自动加 #待报销)\n  时  间: ____ (选填,默认现在)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_reimburse_done",
            "title": "报销到账(记收入 + 流转标签)",
            "wake_word": "报销到账",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记录报销到账(唤醒词:报销到账):\n\n  金  额: ____\n  关  联: ____ (选填,如:哪一笔 #待报销)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_lend",
            "title": "借给别人钱",
            "wake_word": "记借出",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔借出(唤醒词:记借出):\n\n  金  额: ____\n  对  象: ____ (借给谁)\n  期  限: ____ (选填,如:月底还)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_borrow",
            "title": "向别人借钱",
            "wake_word": "记借入",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔借入(唤醒词:记借入):\n\n  金  额: ____\n  对  象: ____ (向谁借)\n  期  限: ____ (选填)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_collect",
            "title": "收回借出的钱",
            "wake_word": "记收回",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔收回(唤醒词:记收回):\n\n  哪一笔: ____ (对象/金额/描述,如:小明还我那 500)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_payback",
            "title": "偿还借入的钱",
            "wake_word": "记偿还",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔偿还(唤醒词:记偿还):\n\n  哪一笔: ____ (对象/金额/描述,如:还小明那 500)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "write_installment",
            "title": "记一笔分期(平摊预写)",
            "wake_word": "记分期",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔分期(唤醒词:记分期):\n\n  名  目: ____ (如:手机 / 电脑)\n  总  价: ____\n  期  数: ____ (如:24)\n  首期日: ____ (选填,默认今天,每月固定这一天)\n  账  户: ____ (选填)\n  账  本: ____ (选填)\n",
            "types": [
              "向导"
            ]
          }
        ]
      },
      {
        "id": "write_3",
        "label": "修正",
        "scenes": [
          {
            "id": "write_update",
            "title": "修改已有记录",
            "wake_word": "改记录",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我改一条记录(唤醒词:改记录):\n\n  目  标: ____ (如:最近一笔 / 某天的某条 / ID)\n  要改的字段: ____ (如:金额改成 38 / 分类改成交通 / 备注加牛奶)\n",
            "types": [
              "选择"
            ]
          },
          {
            "id": "write_undo",
            "title": "撤销一条记录(软删)",
            "wake_word": "撤销",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我撤销一条记录(唤醒词:撤销):\n\n  目  标: ____ (默认最近一笔;或描述某条)\n",
            "types": [
              "选择"
            ]
          },
          {
            "id": "write_restore",
            "title": "恢复已撤销记录",
            "wake_word": "恢复",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我恢复一条已撤销的记录(唤醒词:恢复):\n\n  目  标: ____ (描述被撤销的记录,如:昨天撤销的午饭)\n",
            "types": [
              "选择"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "query",
    "icon": "🔍",
    "label": "查询",
    "subgroups": [
      {
        "id": "query_1",
        "label": "按时间",
        "scenes": [
          {
            "id": "query_today",
            "title": "查今天收支",
            "wake_word": "查今天",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看今天的收支(唤醒词:查今天):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_yesterday",
            "title": "查昨天收支",
            "wake_word": "查昨天",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看昨天的收支(唤醒词:查昨天):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_date",
            "title": "查某一天的账",
            "wake_word": "查某天",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某天的账(唤醒词:查某天):\n\n  日  期: ____ (如:5月1号 / 上周五 / 2026-05-01)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_recent",
            "title": "查最近记录",
            "wake_word": "查最近",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看最近的记录(唤醒词:查最近):\n\n  条  数: ____ (选填,默认 10)\n  排  序: ____ (选填,如:金额从大到小)\n  近几天: ____ (选填,如:近7天 / 近30天;与条数二选一)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_week",
            "title": "查某周的账",
            "wake_word": "查周",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某周的账(唤醒词:查周):\n\n  周: ____ (如:本周 / 上周 / 5月第2周 / 2026-05-11那一周)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_month",
            "title": "查某个月的账",
            "wake_word": "查月",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某个月的账(唤醒词:查月):\n\n  月: ____ (如:本月 / 上月 / 3月 / 2026-03)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_range",
            "title": "查任意时间段",
            "wake_word": "查区间",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某段时间的账(唤醒词:查区间):\n\n  开始日期: ____ (如:5月1号 / 2026-05-01)\n  结束日期: ____ (如:5月10号 / 2026-05-10;某年填 12月31日)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_bills",
            "title": "查账单",
            "wake_word": "查账单",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查账单(唤醒词:查账单):\n\n  日  期: ____ (选填,默认今天;可写「昨天」或「2026-09-06」)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_bill_detail",
            "title": "查账单详情",
            "wake_word": "查账单详情",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查一条账单的详情(唤醒词:查账单详情):\n\n  记录 id: ____ (从「查账单」或「查今天」的列表里取)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "query_2",
        "label": "按条件",
        "scenes": [
          {
            "id": "query_category",
            "title": "查某分类的账",
            "wake_word": "查分类",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某分类的账(唤醒词:查分类):\n\n  分  类: ____ (如:餐饮 / 出行 / 奶茶)\n  时  间: ____ (选填,如:本月 / 5月 / 5月1到10号)\n  账  户: ____ (选填,如:支付宝)\n  账  本: ____ (选填)\n  收  支: ____ (选填,支出/收入/全部,默认全部)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_search",
            "title": "搜索备注关键词",
            "wake_word": "搜备注",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我搜备注关键词(唤醒词:搜备注):\n\n  关键词: ____\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_tag",
            "title": "查标签(#tag 聚合)",
            "wake_word": "查标签",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查标签(唤醒词:查标签):\n\n  标  签: ____ (如:#旅行 / #待报销)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_account",
            "title": "查某账户流水",
            "wake_word": "查账户",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某账户的流水(唤醒词:查账户):\n\n  账  户: ____ (如:支付宝 / 微信 / 招行)\n  时  间: ____ (选填,如:本月 / 上月)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_ledger",
            "title": "查某账本的记录",
            "wake_word": "查账本",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查某账本的记录(唤醒词:查账本):\n\n  账  本: ____ (如:生活 / 旅行 / 借贷)\n  时  间: ____ (选填)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "query_3",
        "label": "按状态",
        "scenes": [
          {
            "id": "query_debt",
            "title": "查未还欠款(借贷状态)",
            "wake_word": "查欠款",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查欠款(唤醒词:查欠款):\n\n  对  象: ____ (选填,如:小明;不填查全部)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_pending_reimburse",
            "title": "查待报销",
            "wake_word": "查待报销",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查待报销(唤醒词:查待报销):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "query_installment",
            "title": "查进行中的分期",
            "wake_word": "查分期",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我查分期(唤醒词:查分期):\n\n  名  目: ____ (选填,如:手机;不填查全部)\n",
            "types": [
              "查看"
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
        "label": "汇总",
        "scenes": [
          {
            "id": "monthly_summary",
            "title": "某月收支汇总",
            "wake_word": "看月度",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看某个月的收支汇总(唤醒词:看月度):\n\n  月: ____ (如:本月 / 上月 / 3月 / 2026-03)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "yearly_summary",
            "title": "年度收支汇总",
            "wake_word": "看年度",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看某年的收支汇总(唤醒词:看年度):\n\n  年: ____ (如:今年 / 2026 / 去年)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "range_overview",
            "title": "时间段收支总览",
            "wake_word": "看总览",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看某段时间的收支总览(唤醒词:看总览):\n\n  开始日期: ____ (选填,默认本月1号)\n  结束日期: ____ (选填,默认今天)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "week_brief",
            "title": "本周简报(对比上周)",
            "wake_word": "看周报",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看本周简报(唤醒词:看周报):\n\n  周: ____ (选填,本周 / 上周)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "analysis_2",
        "label": "结构",
        "scenes": [
          {
            "id": "category_breakdown",
            "title": "钱花在哪些分类",
            "wake_word": "看分类",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看钱花在哪些分类(唤醒词:看分类):\n\n  时  间: ____ (选填,如:本月 / 5月 / 5月1到10号)\n  账  户: ____ (选填,如:支付宝)\n  收  支: ____ (选填,支出/收入/全部,默认支出)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "account_breakdown",
            "title": "各账户花销情况",
            "wake_word": "看账户",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看各账户的花销情况(唤醒词:看账户):\n\n  时  间: ____ (选填,如:本月 / 上月)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "ledger_summary",
            "title": "各账本收支汇总",
            "wake_word": "看账本",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看各账本的收支汇总(唤醒词:看账本):\n\n  时  间: ____ (选填,如:本月)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "income_expense_structure",
            "title": "收入支出来源去向",
            "wake_word": "看结构",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看收入和支出的结构(唤醒词:看结构):\n\n  时  间: ____ (选填,如:本月 / 5月)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "analysis_3",
        "label": "对比",
        "scenes": [
          {
            "id": "period_compare",
            "title": "本期和上期对比",
            "wake_word": "看对比",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看本期和上期对比(唤醒词:看对比):\n\n  周  期: ____ (如:本周vs上周 / 本月vs上月 / 今年vs去年)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "range_compare",
            "title": "两段时间对比",
            "wake_word": "看双区间",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我对比两段时间(唤醒词:看双区间):\n\n  区间一: ____ (如:5月 / 5月1到10号)\n  区间二: ____ (如:6月 / 6月1到10号)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "year_over_year",
            "title": "今年和去年同比",
            "wake_word": "看同比",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看同比对比(唤醒词:看同比):\n\n  月: ____ (如:本月 / 6月)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "category_compare",
            "title": "两段时间分类差异",
            "wake_word": "看分类对比",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看两段时间的分类差异(唤醒词:看分类对比):\n\n  区间一: ____ (如:5月)\n  区间二: ____ (如:6月)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "analysis_4",
        "label": "趋势",
        "scenes": [
          {
            "id": "monthly_trend",
            "title": "每月收支走势",
            "wake_word": "看趋势",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看每月的收支走势(唤醒词:看趋势):\n\n  月  数: ____ (选填,近 6 / 12 个月,默认 12)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "category_trend",
            "title": "某分类的月度变化",
            "wake_word": "看分类趋势",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看某分类的月度变化(唤醒词:看分类趋势):\n\n  分  类: ____ (如:餐饮 / 出行)\n  月  数: ____ (选填,近 6 / 12 个月,默认 12)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "analysis_5",
        "label": "金额",
        "scenes": [
          {
            "id": "top_expense",
            "title": "大额支出排行",
            "wake_word": "看大额",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看大额支出排行(唤醒词:看大额):\n\n  条  数: ____ (选填,默认 10)\n  时  间: ____ (选填,如:本月 / 5月)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "top_frequency",
            "title": "高频消费排行",
            "wake_word": "看高频",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看高频消费排行(唤醒词:看高频):\n\n  时  间: ____ (选填,如:本月 / 近30天)\n  条  数: ____ (选填,默认 10)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "amount_distribution",
            "title": "金额区间分布",
            "wake_word": "看分布",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看金额区间分布(唤醒词:看分布):\n\n  时  间: ____ (选填,如:本月 / 5月)\n  收  支: ____ (选填,支出/收入,默认支出)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "analysis_6",
        "label": "统计洞察",
        "scenes": [
          {
            "id": "stats",
            "title": "记账情况统计",
            "wake_word": "做统计",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看记账情况统计(唤醒词:做统计):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "activity",
            "title": "记账活跃度",
            "wake_word": "看活跃",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看记账活跃度(唤醒词:看活跃):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "insight",
            "title": "AI 消费洞察",
            "wake_word": "看洞察",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看 AI 消费洞察(唤醒词:看洞察):\n\n  时  间: ____ (选填,如:本月 / 近90天,默认近30天)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "anomaly",
            "title": "异常波动检测",
            "wake_word": "看异常",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看异常波动(唤醒词:看异常):\n\n  时  间: ____ (选填,近 N 个月,默认 6)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "analysis_7",
        "label": "状态聚合",
        "scenes": [
          {
            "id": "debt_summary",
            "title": "借贷总览",
            "wake_word": "看借贷",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看借贷总览(唤醒词:看借贷):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "reimburse_summary",
            "title": "报销汇总",
            "wake_word": "看报销",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看报销汇总(唤醒词:看报销):\n\n  时  间: ____ (选填,如:本月)\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "installment_summary",
            "title": "分期总览",
            "wake_word": "看分期",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看分期总览(唤醒词:看分期):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "refund_summary",
            "title": "退款统计",
            "wake_word": "看退款",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看退款统计(唤醒词:看退款):\n\n  时  间: ____ (选填,如:本月)\n",
            "types": [
              "查看"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "goal",
    "icon": "🎯",
    "label": "目标",
    "subgroups": [
      {
        "id": "goal_1",
        "label": "预算",
        "scenes": [
          {
            "id": "goal_set_budget",
            "title": "设定月度预算",
            "wake_word": "设定预算",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我设定月度预算(唤醒词:设定预算):\n\n  金  额: ____ (如:3000)\n  月  份: ____ (选填,如:本月 / 8月;默认本月起)\n  分  类: ____ (选填,如:餐饮;不填 = 总预算)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "goal_budget_status",
            "title": "查看预算执行",
            "wake_word": "看预算",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看预算执行情况(唤醒词:看预算):\n\n  月  份: ____ (选填,如:本月 / 8月)\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "goal_2",
        "label": "目标",
        "scenes": [
          {
            "id": "goal_set_saving",
            "title": "设定储蓄目标",
            "wake_word": "设定目标",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我设定储蓄目标(唤醒词:设定目标):\n\n  目  标: ____ (如:换手机 / 旅行基金)\n  金  额: ____ (如:10000)\n  截止日期: ____ (选填,如:12月底)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "goal_saving_status",
            "title": "查看目标进度",
            "wake_word": "看目标",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看储蓄目标进度(唤醒词:看目标):\n",
            "types": [
              "查看"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "account",
    "icon": "💳",
    "label": "账户",
    "subgroups": [
      {
        "id": "account_1",
        "label": "账户管理",
        "scenes": [
          {
            "id": "account_add",
            "title": "新增账户",
            "wake_word": "新增账户",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我新增账户(唤醒词:新增账户):\n\n  账户名: ____ (如:招行卡 / 花呗)\n  类  型: ____ (选填,如:银行卡 / 支付 / 信用)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "account_update",
            "title": "修改账户",
            "wake_word": "改账户",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我修改账户(唤醒词:改账户):\n\n  账  户: ____ (如:招行卡)\n  改成什么: ____ (如:改名「招行工资卡」 / 停用)\n",
            "types": [
              "选择"
            ]
          },
          {
            "id": "account_transfer",
            "title": "账户间转账",
            "wake_word": "账户转账",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我做账户间转账(唤醒词:账户转账):\n\n  金  额: ____\n  从账户: ____ (如:支付宝)\n  到账户: ____ (如:招行卡)\n  时  间: ____ (选填,默认现在)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "account_summary",
            "title": "查看账户汇总",
            "wake_word": "看账户汇总",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看账户汇总(唤醒词:看账户汇总):\n",
            "types": [
              "查看"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "link",
    "icon": "🔗",
    "label": "联动",
    "subgroups": [
      {
        "id": "link_1",
        "label": "联动",
        "scenes": [
          {
            "id": "link_purchase",
            "title": "买东西联动(记账 + 录物品)",
            "wake_word": "买东西",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔买东西的账并联动录入(唤醒词:买东西):\n\n  金  额: ____\n  物  品: ____ (如:空气炸锅)\n  分  类: ____ (选填,默认居家/家电)\n",
            "types": [
              "采集"
            ]
          },
          {
            "id": "link_meal",
            "title": "吃饭联动(记账 + 记卡路里)",
            "wake_word": "吃饭",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我记一笔吃饭的账并联动卡路里(唤醒词:吃饭):\n\n  金  额: ____\n  吃  了: ____ (如:午饭 鸡腿饭)\n  分  类: ____ (选填,默认餐饮)\n",
            "types": [
              "采集"
            ]
          }
        ]
      }
    ]
  },
  {
    "id": "setup",
    "icon": "🚀",
    "label": "开始使用",
    "subgroups": [
      {
        "id": "setup_1",
        "label": "初始化",
        "scenes": [
          {
            "id": "setup_init_wizard",
            "title": "首次使用向导(4 步零决策)",
            "wake_word": "初始化",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我开始使用饼干记账(唤醒词:初始化):\n",
            "types": [
              "向导"
            ]
          },
          {
            "id": "setup_init_status",
            "title": "初始化状态(是否已就绪)",
            "wake_word": "初始化状态",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看看饼干记账初始化了没有(唤醒词:初始化状态):\n",
            "types": [
              "查看"
            ]
          }
        ]
      },
      {
        "id": "setup_2",
        "label": "备份恢复",
        "scenes": [
          {
            "id": "setup_backup_create",
            "title": "一键备份",
            "wake_word": "备份",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我备份饼干记账的数据(唤醒词:备份):\n",
            "types": [
              "回执"
            ]
          },
          {
            "id": "setup_backup_list",
            "title": "查看备份",
            "wake_word": "备份",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我看看有哪些备份(唤醒词:备份):\n",
            "types": [
              "查看"
            ]
          },
          {
            "id": "setup_restore",
            "title": "从备份恢复",
            "wake_word": "恢复备份",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我从备份恢复数据(唤醒词:恢复备份):\n\n  备  份: ____ (选填,默认最新备份)\n",
            "types": [
              "向导"
            ]
          }
        ]
      },
      {
        "id": "setup_3",
        "label": "导入",
        "scenes": [
          {
            "id": "setup_import",
            "title": "导入 CSV 账单(列映射向导)",
            "wake_word": "导入",
            "status": "",
            "prompt_template": "请加载「饼干记账」技能,帮我导入 CSV 账单(唤醒词:导入):\n\n  文件路径: ____\n  列映射: ____ (选填,自动识别,如:日期=第1列,金额=第3列)\n",
            "types": [
              "向导"
            ]
          }
        ]
      }
    ]
  }
];

/** 扁平 74 条（顺序与 HELP 分组一致；单源派生，不重复落词）。 */
export const WAKE_ASSETS: readonly WakeSceneAsset[] = WAKE_GROUPS.flatMap((g) =>
  g.subgroups.flatMap((s) => s.scenes),
);

/** id → 场景（74/74 唯一）。 */
export const SCENE_BY_ID: Readonly<Record<string, WakeSceneAsset>> = Object.fromEntries(
  WAKE_ASSETS.map((s) => [s.id, s]),
);

/** 资产总数（由 `WAKE_ASSETS` 派生，单源不复写第二遍数；改资产即跟变，测试仍钉 74）。 */
export const WAKE_ASSET_TOTAL: number = WAKE_ASSETS.length;

/** HELP 自身的唤醒词（老实物 `meta_blocks.help_wake_words` 那一块；4 条，不进场景目录）。
 *
 * 从口径层 `WAKE_TABLE` **派生**而非复写：口径层是唤醒词的单一事实源，本文件只投影。
 * （老实物写的是「饼干记账 帮助」（带空格），现表口径为「饼干记账帮助」——以现表为准。） */
export const HELP_WAKE_WORDS: readonly string[] = WAKE_TABLE
  .filter((e) => e.key === 'bill.help.lookup')
  .map((e) => e.phrase);
