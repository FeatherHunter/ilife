# base复用存量基线（棘轮冻结值，#1072）

冻结当刻：MEASURE 件=1000 命中=513 去重=340。
判据两向恒等：实况新增即红、修好未下调即红。只许随修好逐条删除，不许新增。

<!--基线:begin -->
| 件 | 规则 | 证据 |
|---|---|---|
| packages/skill-bill/src/account/pageParts.ts | 丁 | ', 'section[data-key="account.write"] .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="account.query"] .copy-menu-open.ilife-cop |
| packages/skill-bill/src/account/pageParts.ts | 丁 | ', 'section[data-key="account.write"] .ilife-action-row-ghost, section[data-key="account.query"] .ilife-action-row-ghost { … } |
| packages/skill-bill/src/account/pageParts.ts | 丁 | ', 'section[data-key="account.write"] .ilife-copy-btn, section[data-key="account.query"] .ilife-copy-btn { … } |
| packages/skill-bill/src/account/pageParts.ts | 丁 | ', 'section[data-key="account.write"] .ilife-copy-btn.copied::after, section[data-key="account.query"] .ilife-copy-btn.copied::after { … } |
| packages/skill-bill/src/account/pageParts.ts | 丁 | ', 'section[data-key="account.write"] .ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="account.query"] .ilife-copy-menu-wrap > .ilife-copy-btn: |
| packages/skill-bill/src/account/pageParts.ts | 丁 | ', 'section[data-key="account.write"] .ilife-copy-menu-wrap, section[data-key="account.query"] .ilife-copy-menu-wrap { … } |
| packages/skill-bill/src/goal/pageParts.ts | 丁 | ', 'section[data-key="goal.write"] .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="goal.query"] .copy-menu-open.ilife-copy-menu |
| packages/skill-bill/src/goal/pageParts.ts | 丁 | ', 'section[data-key="goal.write"] .ilife-action-row-ghost, section[data-key="goal.query"] .ilife-action-row-ghost { … } |
| packages/skill-bill/src/goal/pageParts.ts | 丁 | ', 'section[data-key="goal.write"] .ilife-copy-btn, section[data-key="goal.query"] .ilife-copy-btn { … } |
| packages/skill-bill/src/goal/pageParts.ts | 丁 | ', 'section[data-key="goal.write"] .ilife-copy-btn.copied::after, section[data-key="goal.query"] .ilife-copy-btn.copied::after { … } |
| packages/skill-bill/src/goal/pageParts.ts | 丁 | ', 'section[data-key="goal.write"] .ilife-copy-menu-wrap > .ilife-copy-btn::after, section[data-key="goal.query"] .ilife-copy-menu-wrap > .ilife-copy-btn::after |
| packages/skill-bill/src/goal/pageParts.ts | 丁 | ', 'section[data-key="goal.write"] .ilife-copy-menu-wrap, section[data-key="goal.query"] .ilife-copy-menu-wrap { … } |
| packages/skill-bill/src/query/list-tag.ts | 乙 | border-radius:10px |
| packages/skill-bill/src/query/list.ts | 乙 | border-radius:999px |
| packages/skill-bill/src/query/pageParts.ts | 丁 | ', '.ilife-list .copy-menu-open.ilife-copy-menu-wrap > .ilife-copy-btn::after, .ilife-bill-sheet-page.ilife-ticket-detail .copy-menu-open.ilife-copy-menu-wrap > |
| packages/skill-bill/src/query/pageParts.ts | 丁 | ', '.ilife-list .ilife-action-row-ghost, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-action-row-ghost { … } |
| packages/skill-bill/src/query/pageParts.ts | 丁 | ', '.ilife-list .ilife-copy-btn, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-btn { … } |
| packages/skill-bill/src/query/pageParts.ts | 丁 | ', '.ilife-list .ilife-copy-btn.copied::after, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-btn.copied::after { … } |
| packages/skill-bill/src/query/pageParts.ts | 丁 | ', '.ilife-list .ilife-copy-menu-wrap > .ilife-copy-btn::after, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-menu-wrap > .ilife-copy-btn::after { … } |
| packages/skill-bill/src/query/pageParts.ts | 丁 | ', '.ilife-list .ilife-copy-menu-wrap, .ilife-bill-sheet-page.ilife-ticket-detail .ilife-copy-menu-wrap { … } |
| packages/skill-bill/src/query/ticket-day.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketAccount.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketCategory.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketDebt.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketInstallment.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketInterval.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketLedger.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketMonth.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketRecent.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketReimburse.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketToday.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketWeek.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/query/ticketYesterday.ts | 乙 | border-radius: 999px |
| packages/skill-bill/src/render/html.ts | 乙 | border-radius:4px |
| packages/skill-bill/src/render/html.ts | 乙 | border-radius:8px |
| packages/skill-bill/src/shared/docPage.ts | 丁 | ', '.ilife-bill-sheet-page .ilife-action-row-ghost { … } |
| packages/skill-bill/src/shared/docPage.ts | 丁 | ', '.ilife-bill-sheet-page .ilife-copy-btn { … } |
| packages/skill-bill/src/shared/docPage.ts | 丁 | ', '.ilife-bill-sheet-page .ilife-copy-btn.copied { … } |
| packages/skill-bill/src/shared/docPage.ts | 丁 | ', '.ilife-bill-sheet-page .ilife-copy-menu-wrap + .ilife-copy-btn { … } |
| packages/skill-bill/src/shared/docPage.ts | 丁 | ', '.ilife-bill-sheet-page .ilife-copy-menu-wrap { … } |
| packages/skill-bill/src/shared/docPage.ts | 丁 | ', '/* 次按钮那一族是公共层复制区的产物（`.ilife-copy-btn`），这里按原型 `.btn-secondary` 改形状：', ' 整行宽、13px 圆角、白底暖边。高度钉 47px＝原型那一颗的**实测盒高**（它的标签里带着一个 `▾` 字符，', ' 那一枚字形把行盒抬到 23px ⇒ 12+2 |
| packages/skill-bill/src/shared/docPage.ts | 丙 | box-shadow: 0 8px 20px color-mix(in srgb, var(--ilife-danger) 28%, transparent), inset 0 1px 0 color-mix(in srgb, var(--ilife-surface) 25%, transparent) |
| packages/skill-bill/src/shared/docPage.ts | 乙 | border-radius: 14px |
| packages/skill-bill/src/shared/docPage.ts | 乙 | border-radius: 4px |
| packages/skill-bill/src/shared/docPage.ts | 乙 | border-radius: 999px |
| packages/skill-calorie/src/body/bodyReadUi.ts | 乙 | border-radius:12px |
| packages/skill-calorie/src/body/bodyReadUi.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/body/bodyReadUi.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/body/compareUi.ts | 丁 | ' + ' .ilife-copy-btn,.ilife-copy-btn-wide { … } |
| packages/skill-calorie/src/body/receiptUi.ts | 丁 | ' + '.ilife-block-disclosure-summary,.ilife-copy-btn,.ilife-copy-menu-item { … } |
| packages/skill-calorie/src/body/receiptUi.ts | 丁 | ' + '.ilife-copy-btn { … } |
| packages/skill-calorie/src/body/receiptUi.ts | 丁 | ' + '.ilife-copy-menu-wrap { … } |
| packages/skill-calorie/src/body/receiptUi.ts | 乙 | border-radius:14px |
| packages/skill-calorie/src/body/wizardUi.ts | 丁 | ' + ' .ilife-copy-btn,.ilife-copy-btn-wide { … } |
| packages/skill-calorie/src/diet/dietUi.ts | 乙 | border-radius:3px |
| packages/skill-calorie/src/diet/dietUi.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/diet/dietUi.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/diet/dietUi.ts | 甲 | --sheet-col: … |
| packages/skill-calorie/src/diet/libraryDocs.ts | 乙 | border-radius:12px |
| packages/skill-calorie/src/diet/libraryDocs.ts | 乙 | border-radius:6px |
| packages/skill-calorie/src/diet/libraryDocs.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/diet/rankingDocs.ts | 乙 | border-radius:2px |
| packages/skill-calorie/src/diet/rankingDocs.ts | 乙 | border-radius:3px |
| packages/skill-calorie/src/exercise/sportUi.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/photo/photoUi.ts | 丁 | ' + '.ilife-copy-btn,.ilife-copy-menu-item { … } |
| packages/skill-calorie/src/photo/photoUi.ts | 乙 | border-radius:10px |
| packages/skill-calorie/src/photo/photoUi.ts | 乙 | border-radius:14px |
| packages/skill-calorie/src/photo/photoUi.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/photo/receiptUi.ts | 丁 | ' + '.ilife-copy-btn,.ilife-copy-menu-item,.ilife-block-disclosure-summary { … } |
| packages/skill-calorie/src/photo/receiptUi.ts | 乙 | border-radius:14px |
| packages/skill-calorie/src/photo/receiptUi.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/photo/wizardUi.ts | 丙 | box-shadow:0 1px 2px rgba(0,0,0,.03) |
| packages/skill-calorie/src/photo/wizardUi.ts | 乙 | border-radius:12px |
| packages/skill-calorie/src/photo/wizardUi.ts | 乙 | border-radius:14px |
| packages/skill-calorie/src/photo/wizardUi.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/profile/sheetDoc.ts | 丁 | .cs-copy .ilife-copy-btn { … } |
| packages/skill-calorie/src/profile/sheetDoc.ts | 丁 | .cs-copy .ilife-copy-btn-ghost { … } |
| packages/skill-calorie/src/profile/sheetDoc.ts | 丁 | .cs-copy .ilife-copy-btn-primary { … } |
| packages/skill-calorie/src/profile/sheetDoc.ts | 丁 | .cs-copy .ilife-copy-btn[disabled] { … } |
| packages/skill-calorie/src/profile/sheetDoc.ts | 丁 | .cs-copy .ilife-copy-menu-wrap { … } |
| packages/skill-calorie/src/profile/sheetDoc.ts | 丙 | box-shadow:0 8px 24px rgba(0,0,0,.08) |
| packages/skill-calorie/src/profile/sheetDoc.ts | 乙 | border-radius:10px |
| packages/skill-calorie/src/profile/sheetDoc.ts | 乙 | border-radius:3px |
| packages/skill-calorie/src/profile/sheetDoc.ts | 乙 | border-radius:4px |
| packages/skill-calorie/src/profile/sheetDoc.ts | 乙 | border-radius:6px |
| packages/skill-calorie/src/profile/sheetDoc.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/render/planWizardCss.ts | 乙 | border-radius:0 8px 8px 0 |
| packages/skill-calorie/src/render/planWizardCss.ts | 乙 | border-radius:10px |
| packages/skill-calorie/src/render/planWizardCss.ts | 乙 | border-radius:12px |
| packages/skill-calorie/src/render/planWizardCss.ts | 乙 | border-radius:16px |
| packages/skill-calorie/src/render/planWizardCss.ts | 乙 | border-radius:5px |
| packages/skill-calorie/src/render/planWizardCss.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/render/trendPredictDocs.ts | 乙 | border-radius:12px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:14px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:16px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:1px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:4px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:5px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:6px 6px 0 0 |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 甲 | --accent: … |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 甲 | --ink2: … |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 甲 | --ink3: … |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 甲 | --ink: … |
| packages/skill-calorie/src/render/workoutPlanCss.ts | 甲 | --lineS: … |
| packages/skill-calorie/src/shared/docPage.ts | 乙 | border-radius:6px |
| packages/skill-calorie/src/shared/pageStrips.ts | 乙 | border-radius:10px |
| packages/skill-calorie/src/shared/pageStrips.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/shared/pageStrips.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/weight/weightUi.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 丙 | box-shadow:0 0 0 3px rgba(0,122,255,.12) |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:10px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:12px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:16px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:18px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:5px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/workout/planEditorCss.ts | 乙 | border-radius:999px |
| packages/skill-calorie/src/workout/reviewDocsCss.ts | 乙 | border-radius:10px |
| packages/skill-calorie/src/workout/reviewDocsCss.ts | 乙 | border-radius:16px |
| packages/skill-calorie/src/workout/reviewDocsCss.ts | 乙 | border-radius:2px |
| packages/skill-calorie/src/workout/reviewDocsCss.ts | 乙 | border-radius:3px |
| packages/skill-calorie/src/workout/reviewDocsCss.ts | 乙 | border-radius:8px |
| packages/skill-calorie/src/workout/reviewDocsCss.ts | 乙 | border-radius:999px |
| packages/skill-chef/src/cook/page-css.ts | 乙 | border-radius: 14px |
| packages/skill-chef/src/cook/page-css.ts | 乙 | border-radius: 999px |
| packages/skill-chef/src/data/pages.ts | 丁 | const rules = [ root + ' .ilife-block-copy-block .ilife-action-row-ghost-single { … } |
| packages/skill-chef/src/data/pages.ts | 乙 | border-radius: 14px |
| packages/skill-chef/src/history/page-css.ts | 乙 | border-radius: 999px |
| packages/skill-chef/src/relation/shapes.ts | 乙 | border-radius: 14px |
| packages/skill-chef/src/relation/shapes.ts | 乙 | border-radius: 8px |
| packages/skill-chef/src/relation/shapes.ts | 乙 | border-radius: 999px |
| packages/skill-chef/src/relation/treeShapes.ts | 乙 | border-radius: 14px |
| packages/skill-chef/src/relation/treeShapes.ts | 乙 | border-radius: 999px |
| packages/skill-chef/src/render/html.ts | 乙 | border-radius:4px |
| packages/skill-chef/src/render/html.ts | 乙 | border-radius:8px |
| packages/skill-chef/src/render/skin.ts | 丙 | box-shadow: 0 0 0 3px rgba( |
| packages/skill-chef/src/render/skin.ts | 丙 | box-shadow: 0 1px 2px rgba( |
| packages/skill-chef/src/render/skin.ts | 丙 | box-shadow: 0 1px 3px rgba( |
| packages/skill-chef/src/render/skin.ts | 丙 | box-shadow: 0 2px 6px rgba( |
| packages/skill-chef/src/setup/pages.ts | 丙 | box-shadow: 0 1px 3px rgba( |
| packages/skill-chef/src/setup/pages.ts | 乙 | border-radius: 13px |
| packages/skill-chef/src/setup/pages.ts | 乙 | border-radius: 14px |
| packages/skill-chef/src/shopping/pages.ts | 乙 | border-radius: 13px |
| packages/skill-home/src/express/pages/express.ts | 乙 | border-radius:10px |
| packages/skill-home/src/express/pages/express.ts | 乙 | border-radius:12px |
| packages/skill-home/src/express/pages/express.ts | 乙 | border-radius:14px |
| packages/skill-home/src/express/pages/express.ts | 乙 | border-radius:999px |
| packages/skill-home/src/express/pages/list.ts | 乙 | border-radius:12px |
| packages/skill-home/src/express/pages/list.ts | 乙 | border-radius:999px |
| packages/skill-home/src/express/pages/missing.ts | 乙 | border-radius:12px |
| packages/skill-home/src/express/pages/missing.ts | 乙 | border-radius:999px |
| packages/skill-home/src/express/pages/stock.ts | 乙 | border-radius:12px |
| packages/skill-home/src/express/pages/stock.ts | 乙 | border-radius:999px |
| packages/skill-home/src/family/pages/family_borrow.ts | 乙 | border-radius:10px |
| packages/skill-home/src/family/pages/family_borrow.ts | 乙 | border-radius:14px |
| packages/skill-home/src/family/pages/family_borrow.ts | 乙 | border-radius:16px |
| packages/skill-home/src/family/pages/family_borrow.ts | 乙 | border-radius:999px |
| packages/skill-home/src/family/pages/family_borrow.ts | 乙 | border-radius:99px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:10px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:12px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:14px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:16px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:8px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:999px |
| packages/skill-home/src/family/pages/family_members.ts | 乙 | border-radius:99px |
| packages/skill-home/src/items/pages/add_form.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/add_form.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/add_form.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/add_form.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/browse.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/browse.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/category_manage.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.05) |
| packages/skill-home/src/items/pages/category_manage.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.06) |
| packages/skill-home/src/items/pages/category_manage.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/category_manage.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/category_manage.ts | 乙 | border-radius:8px |
| packages/skill-home/src/items/pages/category_manage.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/confirm.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.05) |
| packages/skill-home/src/items/pages/confirm.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.06) |
| packages/skill-home/src/items/pages/confirm.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/confirm.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/confirm.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/confirm.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/confirm.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/detail.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/detail.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/duplicates.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/duplicates.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/history.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/history.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/history.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/history.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/history.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/inventory_diff.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/inventory_diff.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/inventory_diff.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/inventory_diff.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/inventory_diff.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/inventory_records.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/inventory_records.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/inventory_records.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/inventory_records.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/inventory_records.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/inventory_records.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/inventory_round.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/inventory_round.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/inventory_round.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/inventory_round.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/locate.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/locate.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/move_checklist.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/move_checklist.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/move_checklist.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/move_checklist.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:6px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:8px |
| packages/skill-home/src/items/pages/photo_wall.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/photos.ts | 乙 | border-radius:10px |
| packages/skill-home/src/items/pages/photos.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/photos.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/photos.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/photos.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/receipt.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.05) |
| packages/skill-home/src/items/pages/receipt.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.06) |
| packages/skill-home/src/items/pages/receipt.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/receipt.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/receipt.ts | 乙 | border-radius:8px |
| packages/skill-home/src/items/pages/receipt.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/relations.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.05) |
| packages/skill-home/src/items/pages/relations.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.06) |
| packages/skill-home/src/items/pages/relations.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/relations.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/relations.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/relations.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/search_list.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/search_list.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/tag_manage.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.05) |
| packages/skill-home/src/items/pages/tag_manage.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.06) |
| packages/skill-home/src/items/pages/tag_manage.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/tag_manage.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/tag_manage.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/tag_manage.ts | 乙 | border-radius:8px |
| packages/skill-home/src/items/pages/tag_manage.ts | 乙 | border-radius:999px |
| packages/skill-home/src/items/pages/undo_select.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.05) |
| packages/skill-home/src/items/pages/undo_select.ts | 丙 | box-shadow:0 1px 3px rgba(0,0,0,.06) |
| packages/skill-home/src/items/pages/undo_select.ts | 乙 | border-radius:12px |
| packages/skill-home/src/items/pages/undo_select.ts | 乙 | border-radius:14px |
| packages/skill-home/src/items/pages/undo_select.ts | 乙 | border-radius:16px |
| packages/skill-home/src/items/pages/undo_select.ts | 乙 | border-radius:20px |
| packages/skill-home/src/items/pages/undo_select.ts | 乙 | border-radius:8px |
| packages/skill-home/src/items/pages/undo_select.ts | 乙 | border-radius:999px |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 丙 | box-shadow:0 0 0 2px #e4d9c2 |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 乙 | border-radius:10px |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 乙 | border-radius:12px |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 乙 | border-radius:16px |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 乙 | border-radius:20px |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 乙 | border-radius:8px |
| packages/skill-home/src/outfit/pages/outfit_picker.ts | 乙 | border-radius:99px |
| packages/skill-home/src/outfit/pages/travel_trip.ts | 乙 | border-radius:16px |
| packages/skill-home/src/outfit/pages/travel_trip.ts | 乙 | border-radius:20px |
| packages/skill-home/src/outfit/pages/travel_trip.ts | 乙 | border-radius:6px |
| packages/skill-home/src/outfit/pages/travel_trip.ts | 乙 | border-radius:99px |
| packages/skill-home/src/outfit/pages/trip_outfit_plan.ts | 乙 | border-radius:10px |
| packages/skill-home/src/outfit/pages/trip_outfit_plan.ts | 乙 | border-radius:12px |
| packages/skill-home/src/outfit/pages/trip_outfit_plan.ts | 乙 | border-radius:16px |
| packages/skill-home/src/outfit/pages/trip_outfit_plan.ts | 乙 | border-radius:20px |
| packages/skill-home/src/outfit/pages/trip_outfit_plan.ts | 乙 | border-radius:8px |
| packages/skill-home/src/outfit/pages/trip_outfit_plan.ts | 乙 | border-radius:99px |
| packages/skill-home/src/outfit/pages/wardrobe_analyze.ts | 乙 | border-radius:12px |
| packages/skill-home/src/outfit/pages/wardrobe_analyze.ts | 乙 | border-radius:16px |
| packages/skill-home/src/outfit/pages/wardrobe_analyze.ts | 乙 | border-radius:20px |
| packages/skill-home/src/outfit/pages/wardrobe_analyze.ts | 乙 | border-radius:4px |
| packages/skill-home/src/outfit/pages/wardrobe_analyze.ts | 乙 | border-radius:6px |
| packages/skill-home/src/outfit/pages/wardrobe_analyze.ts | 乙 | border-radius:99px |
| packages/skill-home/src/outfit/pages/wardrobe_season.ts | 乙 | border-radius:10px |
| packages/skill-home/src/outfit/pages/wardrobe_season.ts | 乙 | border-radius:16px |
| packages/skill-home/src/outfit/pages/wardrobe_season.ts | 乙 | border-radius:20px |
| packages/skill-home/src/outfit/pages/wardrobe_season.ts | 乙 | border-radius:6px |
| packages/skill-home/src/outfit/pages/wardrobe_season.ts | 乙 | border-radius:99px |
| packages/skill-home/src/receipt/pages/accounts.ts | 乙 | border-radius:10px |
| packages/skill-home/src/receipt/pages/accounts.ts | 乙 | border-radius:12px |
| packages/skill-home/src/receipt/pages/certificates.ts | 乙 | border-radius:10px |
| packages/skill-home/src/receipt/pages/purchase_records.ts | 乙 | border-radius:10px |
| packages/skill-home/src/receipt/pages/purchase_records.ts | 乙 | border-radius:12px |
| packages/skill-home/src/receipt/pages/purchase_records.ts | 乙 | border-radius:14px |
| packages/skill-home/src/receipt/pages/warranty.ts | 乙 | border-radius:10px |
| packages/skill-home/src/receipt/pages/warranty.ts | 乙 | border-radius:14px |
| packages/skill-home/src/render/copyArea.ts | 乙 | border-radius:999px |
| packages/skill-home/src/render/html.ts | 乙 | border-radius:4px |
| packages/skill-home/src/render/html.ts | 乙 | border-radius:8px |
| packages/skill-home/src/setup/pages/backup_receipt.ts | 乙 | border-radius:12px |
| packages/skill-home/src/setup/pages/backup_receipt.ts | 乙 | border-radius:14px |
| packages/skill-home/src/setup/pages/backup_receipt.ts | 乙 | border-radius:16px |
| packages/skill-home/src/setup/pages/backup_receipt.ts | 乙 | border-radius:20px |
| packages/skill-home/src/setup/pages/backup_receipt.ts | 乙 | border-radius:999px |
| packages/skill-home/src/setup/pages/first_use_wizard.ts | 乙 | border-radius:12px |
| packages/skill-home/src/setup/pages/first_use_wizard.ts | 乙 | border-radius:14px |
| packages/skill-home/src/setup/pages/first_use_wizard.ts | 乙 | border-radius:16px |
| packages/skill-home/src/setup/pages/first_use_wizard.ts | 乙 | border-radius:20px |
| packages/skill-home/src/setup/pages/first_use_wizard.ts | 乙 | border-radius:999px |
| packages/skill-home/src/setup/pages/health_report.ts | 乙 | border-radius:12px |
| packages/skill-home/src/setup/pages/health_report.ts | 乙 | border-radius:14px |
| packages/skill-home/src/setup/pages/health_report.ts | 乙 | border-radius:16px |
| packages/skill-home/src/setup/pages/health_report.ts | 乙 | border-radius:20px |
| packages/skill-home/src/setup/pages/health_report.ts | 乙 | border-radius:999px |
| packages/skill-home/src/setup/pages/import_restore.ts | 乙 | border-radius:12px |
| packages/skill-home/src/setup/pages/import_restore.ts | 乙 | border-radius:14px |
| packages/skill-home/src/setup/pages/import_restore.ts | 乙 | border-radius:16px |
| packages/skill-home/src/setup/pages/import_restore.ts | 乙 | border-radius:20px |
| packages/skill-home/src/setup/pages/import_restore.ts | 乙 | border-radius:999px |
| packages/skill-home/src/stats/pages/expiring.ts | 乙 | border-radius:10px |
| packages/skill-home/src/stats/pages/expiring.ts | 乙 | border-radius:14px |
| packages/skill-home/src/stats/pages/expiring.ts | 乙 | border-radius:16px |
| packages/skill-home/src/stats/pages/expiring.ts | 乙 | border-radius:99px |
| packages/skill-home/src/stats/pages/idle.ts | 乙 | border-radius:10px |
| packages/skill-home/src/stats/pages/idle.ts | 乙 | border-radius:14px |
| packages/skill-home/src/stats/pages/idle.ts | 乙 | border-radius:16px |
| packages/skill-home/src/stats/pages/idle.ts | 乙 | border-radius:99px |
| packages/skill-home/src/stats/pages/inventory_stat.ts | 乙 | border-radius:10px |
| packages/skill-home/src/stats/pages/inventory_stat.ts | 乙 | border-radius:14px |
| packages/skill-home/src/stats/pages/inventory_stat.ts | 乙 | border-radius:16px |
| packages/skill-home/src/stats/pages/inventory_stat.ts | 乙 | border-radius:99px |
| packages/skill-home/src/stats/pages/inventory_stat.ts | 乙 | border-radius:9px |
| packages/skill-home/src/stats/pages/overview.ts | 乙 | border-radius:10px |
| packages/skill-home/src/stats/pages/overview.ts | 乙 | border-radius:14px |
| packages/skill-home/src/stats/pages/overview.ts | 乙 | border-radius:16px |
| packages/skill-home/src/stats/pages/overview.ts | 乙 | border-radius:3px |
| packages/skill-home/src/stats/pages/overview.ts | 乙 | border-radius:3px 3px 0 0 |
| packages/skill-home/src/stats/pages/overview.ts | 乙 | border-radius:99px |
| packages/skill-memo-ilife/src/render/memoPageAssets.ts | 乙 | border-radius:6px |
| packages/skill-schedule/src/shared/pageParts.ts | 乙 | border-radius: 3px |
| packages/skill-schedule/src/shared/pageParts.ts | 乙 | border-radius: 4px |
| packages/skill-schedule/src/shared/templateFill.ts | 乙 | border-radius:4px |
| packages/skill-schedule/src/shared/templateFill.ts | 乙 | border-radius:8px |
<!--基线:end -->
