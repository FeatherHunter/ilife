/** skill-home · 词条表（**基准语言 zh**：key 集合的权威，回退链第二站）。
 *
 *  归属：本包自己的命名空间（ADR-0004 §3「词条随包存放，命名空间＝包名」）。
 *  key 形态（第一轮＝**派生命名**，见地图 #1197 决定记录）：<件名>.<位置>.<键>。
 *
 *  **生成段别手改**：迁移票迁入本包词条时，由 `tooling/i18n-migrate.mjs` 往下面那张表**追加**条目，
 *  人只在生成段之外补说明（注：编写本文件时 `tooling/i18n-migrate.mjs` 尚未在盘上，
 *  迁入前先确认生成器已落盘，别照这份注释去手抄条目）。
 *
 *  本表现在是空的——本包还没有迁入任何用户可见文案；空表由迁移票内补齐。
 */
import type { MessageTable } from 'base-entries';

export const zh = {
  /* ── packages/skill-home/src/help/helpFile.ts（--files 迁入） ── */
  'skill-home.help-helpFile.c001': "HELP 更新时间须为有效 Date（缺失阻断，不返空串）。",
  'skill-home.help-helpFile.c002': "HELP 内容资产为空（HELP_GROUPS 无域，不返空页）。",
  'skill-home.help-helpFile.c003': "HELP 过滤 deprecated 后无剩余分组（不返空页）。",
  'skill-home.help-helpFile.c004': "HELP 分组无子功能（{p0} 的 subgroups 为空）。",
  'skill-home.help-helpFile.c005': "HELP 子功能无场景（{p0} 的 scenes 为空，契约 scenes[] 非空）。",
  'skill-home.help-helpFile.c006': "HELP 场景缺 prompt（{p0}）。",
  'skill-home.help-helpFile.c007': "HELP 首次使用横幅缺 prompt：场景 {p0} 的 prompt_template 为空。",
  'skill-home.help-helpFile.c008': "HELP 首次使用横幅缺 prompt：内容资产无场景 {p0}。",
  'skill-home.help-helpFile.c009': "{p0} 功能域 · {p1} 场景 · 版本 {p2} · 更新于 {p3}",
  'skill-home.help-helpFile.c010': "骨架 {p0} 条，联动 {p1} 条已停用不列",
  'skill-home.help-helpFile.c011': "HELP 汇总块缺摘要行（subtitle 不许为空）。",
  'skill-home.help-helpFile.c012': "HELP 唤醒词块为空：口径层 WAKE_TABLE 无 {p0} 条目。",
  'skill-home.help-helpFile.c013': "HELP 汇总",
  'skill-home.help-helpFile.c014': "HELP 唤醒词",
  'skill-home.help-helpFile.c015': "🚀 第一次用居家管家?",
  'skill-home.help-helpFile.c016': "从「首次使用」开始 — 检测环境、确认数据目录、建库、验证读写,全程零决策。完成初始化后,本区域将不再出现。",
  'skill-home.help-helpFile.c017': "📋 复制初始化 prompt",
  'skill-home.help-helpFile.c018': "居家管家",
  'skill-home.help-helpFile.c019': "居家管家 · 使用手册(HELP)",
  'skill-home.help-helpFile.c020': "邮箱",
  /* ── packages/skill-home/src/help/lookup.ts（--files 迁入） ── */
  'skill-home.help-lookup.c001': "旧",
  'skill-home.help-lookup.c002': "新",
  'skill-home.help-lookup.c003': "<值>",
  'skill-home.help-lookup.c004': "搜物品（名称/位置/标签/分类，紧急定位/筛选/图搜/查重复）",
  'skill-home.help-lookup.c005': "看单品详情（含历史/照片/照片墙 view 分流，须 id）",
  'skill-home.help-lookup.c006': "录物品 op=single/batch/backfill（含拍物品一次写入）",
  'skill-home.help-lookup.c007': "改物品 op=generic/move/qty/status/tags/merge/undo/relate/photo（须 id）",
  'skill-home.help-lookup.c008': "看标签（标签总览 + 分类树）",
  'skill-home.help-lookup.c009': "管标签/管分类/合标签/整理建议 op 分流",
  'skill-home.help-lookup.c010': "盘点核对 op=round/resolve/move（按位置/分类/全屋）",
  'skill-home.help-lookup.c011': "盘点记录（复查入口）",
  'skill-home.help-lookup.c012': "位置查 mode=manage/space/suggest/find/storage",
  'skill-home.help-lookup.c013': "位置改 op=manage/fixed（含固定位锚定）",
  'skill-home.help-lookup.c014': "穿搭推荐 kind=pick/wardrobe/season/trip-plan",
  'skill-home.help-lookup.c015': "出行清单 mode=pack/return（旅游中↔在家）",
  'skill-home.help-lookup.c016': "总体统计 kind=summary/inventory（状态/分类/价值/高频 TOP）",
  'skill-home.help-lookup.c017': "闲置/过期 kind=idle/expiring",
  'skill-home.help-lookup.c018': "购物查 kind=list/missing/stock/express",
  'skill-home.help-lookup.c019': "购物改 op=list-add/list-check/missing-to-list/stock-threshold/stock-fix/express-confirm",
  'skill-home.help-lookup.c020': "票据查 kind=purchase/warranty/cert/account",
  'skill-home.help-lookup.c021': "票据改 kind+op（购买/保修/证件/账号，账号须 master-key）",
  'skill-home.help-lookup.c022': "协作查 kind=borrow/member/firstuse-status/lint/backup-list",
  'skill-home.help-lookup.c023': "协作改 kind=init/backup/export/import/borrow/member（幂等可重试）",
  'skill-home.help-lookup.c024': "HELP 现找（q 可空，不过滤即全表）",
  /* ── packages/skill-home/src/items/add.ts（--files 迁入） ── */
  'skill-home.items-add.c001': "批量录入须给 items 非空数组",
  'skill-home.items-add.c002': "已批量录入：{p0} 件",
  'skill-home.items-add.c003': "预览通过：{p0} {p1}（确认后去掉 preview 落盘；本调用已落盘，预览仅口径提示）",
  'skill-home.items-add.c004': "已录物品：{p0} {p1}",
  /* ── packages/skill-home/src/items/detail.ts（--files 迁入） ── */
  'skill-home.items-detail.c001': "看物品须给 id",
  'skill-home.items-detail.c002': "(无历史)",
  /* ── packages/skill-home/src/items/inventory.ts（--files 迁入） ── */
  'skill-home.items-inventory.c004': "已盘点：#{p0} {p1} 共 {p2} 条位置记录",
  'skill-home.items-inventory.c005': "差异处理须给 record_id",
  'skill-home.items-inventory.c006': "已处理差异：#{p0}（缺/多/异/待确认人工逐条确认）",
  'skill-home.items-inventory.c007': "已提交搬家盘点（带走/不带走已落盘）",
  'skill-home.items-inventory.c008': "搬家清单已生成（带走/不带走待确认，确认后 mode=commit）",
  'skill-home.items-inventory.c009': "未知 inventory op：{p0}",
  /* ── packages/skill-home/src/items/search.ts（--files 迁入） ── */
  'skill-home.items-search.c001': "category_id 须为正整数",
  'skill-home.items-search.c002': "limit 须为正整数",
  'skill-home.items-search.c003': "库空或无命中：真实无记录（非故障）",
  /* ── packages/skill-home/src/items/tag.ts（--files 迁入） ── */
  'skill-home.items-tag.c001': "合标签须给 from/to",
  'skill-home.items-tag.c002': "已合标签：{p0}→{p1}（{p2} 件）",
  'skill-home.items-tag.c003': "标签总览：{p0} 个标签（详情走 home.tag.query）",
  'skill-home.items-tag.c004': "无相近标签",
  'skill-home.items-tag.c005': "相近标签：{p0}",
  'skill-home.items-tag.c006': "分类新增须给 name",
  'skill-home.items-tag.c007': "已新增分类：{p0}",
  'skill-home.items-tag.c008': "分类改名须给 category_id+name",
  'skill-home.items-tag.c009': "已改名分类：{p0}",
  'skill-home.items-tag.c010': "分类合并须给 from/to id",
  'skill-home.items-tag.c011': "已合并分类：{p0}→{p1}",
  'skill-home.items-tag.c012': "分类树：{p0} 节点（详情走 home.tag.query kind=categories）",
  'skill-home.items-tag.c013': "未知 tag op：{p0}",
  /* ── packages/skill-home/src/items/update.ts（--files 迁入） ── */
  'skill-home.items-update.c002': "plus 须为正整数",
  'skill-home.items-update.c003': "minus 须为正整数",
  'skill-home.items-update.c004': "set 须为非负整数",
  'skill-home.items-update.c005': "已变更数量：{p0}",
  'skill-home.items-update.c006': "已变更状态：{p0}→{p1}",
  'skill-home.items-update.c007': "移物品须给 new_location",
  'skill-home.items-update.c008': "已移动：{p0}→{p1}",
  'skill-home.items-update.c009': "标物品须给 tags 逗号分隔",
  'skill-home.items-update.c010': "已更新标签：{p0}",
  'skill-home.items-update.c011': "合并须给 target",
  'skill-home.items-update.c012': "合并须给 sources 逗号 id 列表",
  'skill-home.items-update.c013': "已合并到 {p0}：+{p1} 件",
  'skill-home.items-update.c014': "最近操作：#{p0} {p1}（一次性回滚须人工确认，本调用仅登记意图）",
  'skill-home.items-update.c015': "关联须给 related",
  'skill-home.items-update.c016': "已解除关联：{p0}×{p1}",
  'skill-home.items-update.c017': "已关联：{p0}×{p1}",
  'skill-home.items-update.c018': "管照片须给 photo",
  'skill-home.items-update.c019': "已更新照片：{p0}",
  'skill-home.items-update.c020': "name 须非空",
  'skill-home.items-update.c021': "改物品须给至少一个可改字段",
  'skill-home.items-update.c022': "指定位置无记录：{p0}",
  'skill-home.items-update.c023': "已更新：{p0}",
  'skill-home.items-update.c024': "无可撤销操作",
} as const satisfies MessageTable;