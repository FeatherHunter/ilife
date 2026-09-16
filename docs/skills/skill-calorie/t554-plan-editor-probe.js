/* T554 · 契约门页内探针（收进仓的 T351-v15 复核席探针，本席自写）。
 *
 * 这段在**真出口渲染出来的页面**里跑：读实时计算样式、点真按钮、填真输入框，
 * 最后把读数写进 <pre id="review-json">，由 headless Chrome 的 --dump-dom 取回来。
 * 作者脚本只数「几格／几条链接／缺几件」，本探针打的是它覆盖不到的地方：
 * 计算样式（nowrap／overflow-x）、滚动条占位、一次只渲一天、锁周禁用真伪、参数输入框个数与坐标，
 * 以及「在锁周改有氧时长，值到底写进了哪一行」。
 *
 * 件内四处读数与判据直接挂钩，别删：
 *   · `day3Inputs` 每格都带 `d／s／m`（null ＝ 缺坐标）⇒ C3.4 的坐标面；
 *   · `day3Inputs` 每格另带 `posD／posS／posM`（该格在页内实际位置：日页签 d／段序号／动作序号）⇒ C3.4 的「坐标对」面（T557 加固：只验齐不验对的盲区）；
 *   · `day3Inputs` 每格带 `disabled` ⇒ C3.4 的「能填」面（T557 加固：全 disabled 也全绿的盲区）；
 *   · `cardioEdit.beforeSentinel／afterSentinel`（当周周一凌晨爬楼机，回落 (0,0,0) 真正写脏的那一行）⇒ X1 的哨兵（T557 加固：原哨兵指成第 1 周那行恒真）；
 *   · `cardioEdit.beforeOrigin／afterOrigin`（第 1 周同名行）只作对照读数，不计分。
 */
(function () {
  var R = { state: (window.__RV || {}).name || '?', viewport: window.innerWidth, ok: false, facts: {}, errors: [] };
  function q(s) { return document.querySelector(s); }
  function qa(s) { return Array.prototype.slice.call(document.querySelectorAll(s)); }
  function txt(el) { return el ? String(el.textContent).replace(/\s+/g, ' ').trim() : null; }
  /** 日页签文本带数量徽章（「周四2」），比点位名时要剥掉尾数。 */
  function tabName(el) { return el ? txt(el).replace(/[0-9０-９]+\s*$/, '') : null; }
  function bar(sel) {
    var el = q(sel); if (!el) return null;
    var c = getComputedStyle(el);
    return {
      flexWrap: c.flexWrap, overflowX: c.overflowX, scrollbarWidth: c.scrollbarWidth,
      clientW: el.clientWidth, scrollW: el.scrollWidth, barLane: el.offsetHeight - el.clientHeight,
    };
  }
  function rows() {
    return qa('#pe-out-body tbody tr').map(function (tr) {
      return Array.prototype.slice.call(tr.children).map(function (td) { return String(td.textContent).replace(/\s+/g, ' ').trim(); });
    });
  }
  function row(week, dow, name) {
    var rs = rows();
    for (var i = 0; i < rs.length; i++) {
      var c = rs[i];
      if (c[0] === week && c[1] === dow && c[3] === name) return { week: c[0], dow: c[1], slot: c[2], name: c[3], amount: c[6], load: c[7] };
    }
    return null;
  }
  function inputs(scope) {
    var dayD = null;
    var onTab = q('.pe-daytab.is-on');
    if (onTab) dayD = onTab.getAttribute('data-d');
    var sessList = qa('.pe-sess');
    return qa((scope || '') + '.pe-move input[data-act]').map(function (e) {
      var sessEl = e.closest ? e.closest('.pe-sess') : null;
      var posS = sessEl ? sessList.indexOf(sessEl) : -1;
      var moveEl = e.closest ? e.closest('.pe-move') : null;
      var posM = -1;
      if (sessEl && moveEl) {
        var movesInSess = Array.prototype.slice.call(sessEl.querySelectorAll('.pe-move'));
        posM = movesInSess.indexOf(moveEl);
      }
      return {
        act: e.getAttribute('data-act'), d: e.getAttribute('data-d'), s: e.getAttribute('data-s'), m: e.getAttribute('data-m'),
        disabled: e.disabled, value: e.value,
        posD: dayD, posS: posS < 0 ? null : String(posS), posM: posM < 0 ? null : String(posM),
      };
    });
  }
  try {
    /* ── a. 结构面：日页签 / 只渲一天 / 不再有星期列 ── */
    R.facts.hasDaytabs = !!q('.pe-daytabs');
    R.facts.daytabs = qa('.pe-daytabs .pe-daytab').map(function (b) {
      return { t: txt(b), on: b.classList.contains('is-on'), act: b.getAttribute('data-act'), d: b.getAttribute('data-d'), aria: b.getAttribute('aria-current') };
    });
    R.facts.weekDayEls = qa('.pe-week .pe-day').length;
    R.facts.dowEls = qa('.pe-dow').length;
    var pd = q('.pe-day');
    R.facts.peDay = pd ? { display: getComputedStyle(pd).display, grid: getComputedStyle(pd).gridTemplateColumns, padding: getComputedStyle(pd).padding } : null;

    /* ── b. 页签条形状（周／日两条） ── */
    R.facts.tabsBar = bar('.pe-tabs');
    R.facts.daytabsBar = bar('.pe-daytabs');
    R.facts.tabLabels = qa('.pe-tabs .pe-tab').map(txt);

    /* ── c. 空态兜底：点「定一份计划」看能不能起来 ── */
    var isEmpty = !q('.pe-tabs');
    if (isEmpty) {
      R.facts.empty = { box: !!q('.pe-empty'), cta: txt(q('[data-act="start"]')) };
      var st = q('[data-act="start"]');
      if (st) {
        st.click();
        R.facts.afterStart = {
          tabs: qa('.pe-tabs .pe-tab').map(txt), daytabs: qa('.pe-daytabs .pe-daytab').length,
          weekDayEls: qa('.pe-week .pe-day').length, emptyGone: !q('.pe-empty'),
        };
      }
    }

    /* ── d. 切到「周四」（日页签 d=3），验证一次只渲一天且页签真能切 ── */
    var dt3 = q('.pe-daytab[data-d="3"]');
    if (dt3) {
      dt3.click();
      R.facts.afterGoDay3 = {
        on: tabName(q('.pe-daytab.is-on')), onRaw: txt(q('.pe-daytab.is-on')), weekDayEls: qa('.pe-week .pe-day').length,
        moves: qa('.pe-move .pe-move-nm').map(txt), inputs: inputs(),
        dowCol: !!q('.pe-week .pe-dow'),
      };
    }

    /* ── e. 锁周结构面：加训练 / 加动作 / 删训练 / 删动作 / 时段 ── */
    var at = q('[data-act="add-train"]');
    R.facts.addTrain = at ? { disabled: at.disabled, attr: at.hasAttribute('disabled'), text: txt(at) } : null;
    var am = q('[data-act="add-move"]');
    R.facts.addMove = am ? { disabled: am.disabled, attr: am.hasAttribute('disabled'), text: txt(am) } : null;
    R.facts.delTrain = qa('[data-act="del-train"]').length;
    R.facts.delMove = qa('[data-act="del-move"]').length;
    R.facts.lockIco = qa('.pe-lockico').length;
    R.facts.slotDis = qa('.pe-slot').filter(function (e) { return e.disabled; }).length + '/' + qa('.pe-slot').length;
    R.facts.disabledActs = qa('[disabled]').map(function (e) { return e.getAttribute('data-act') || e.tagName; });
    R.facts.weekbar = txt(q('.pe-weekbar'));

    /* ── f. 参数面：锁周里每个动作到底有几个可填的格（并记每格的坐标） ── */
    R.facts.day3Inputs = inputs();
    R.facts.day3Plain = qa('.pe-plain').map(txt);
    R.facts.day3ModeBtns = qa('.pe-mode').length;
    R.facts.day3MoveNames = qa('.pe-move .pe-move-nm').map(txt);

    /* ── g. 锁周改有氧时长：值写进了哪一行？（表里逐行对账） ── */
    var minIn = q('.pe-move input[data-act="set-min"]');
    if (minIn) {
      var sentinelWeek = txt(q('.pe-week-t')) || '第 3 周';
      var edit = {
        html: minIn.outerHTML,
        onDayTab: tabName(q('.pe-daytab.is-on')),
        sentinelWeek: sentinelWeek,
        beforeSentinel: row(sentinelWeek, '周一', '爬楼机'),
        beforeOrigin: row('第 1 周', '周一', '爬楼机'),
        beforeTarget: row('第 3 周', '周四', '椭圆机') || row('第 2 周', '周四', '椭圆机') || row('第 1 周', '周四', '椭圆机'),
        tableBefore: rows(),
      };
      minIn.value = '77';
      minIn.dispatchEvent(new Event('input', { bubbles: true }));
      edit.afterSentinel = row(sentinelWeek, '周一', '爬楼机');
      edit.afterOrigin = row('第 1 周', '周一', '爬楼机');
      edit.afterTarget = row('第 3 周', '周四', '椭圆机') || row('第 2 周', '周四', '椭圆机') || row('第 1 周', '周四', '椭圆机');
      edit.inputStillShows = minIn.value;
      edit.tableAfter = rows();
      R.facts.cardioEdit = edit;
    }

    /* ── h. 正向对照：母版周里力量参数是真能写的（证明探针这条写路是通的） ── */
    var setsIn = q('.pe-move input[data-act="set-sets"]');
    if (setsIn) {
      var mvEl = setsIn.closest ? setsIn.closest('.pe-move') : null;
      var nm = txt(mvEl ? mvEl.querySelector('.pe-move-nm') : null);
      var onTab = tabName(q('.pe-daytab.is-on')) || '周一';
      var rec = { name: nm, dayTab: onTab, week: txt(q('.pe-week-t')), before: row('第 1 周', onTab, nm), tableBefore: rows() };
      setsIn.value = '9';
      setsIn.dispatchEvent(new Event('input', { bubbles: true }));
      rec.after = row('第 1 周', onTab, nm);
      rec.tableAfter = rows();
      rec.html = setsIn.outerHTML;
      R.facts.strengthEdit = rec;
    }

    /* ── i. 备注（不计分）：锁周的加训练钮只靠 disabled 挡，委派处理器里没有 lock 守卫 ── */
    var at2 = q('[data-act="add-train"]');
    if (at2 && at2.disabled) {
      var yesSess = qa('.pe-sess').length;
      try { at2.dispatchEvent(new MouseEvent('click', { bubbles: true })); } catch (e2) { R.errors.push('synthetic: ' + e2); }
      R.facts.syntheticAddTrain = { before: yesSess, after: qa('.pe-sess').length };
    }

    R.ok = true;
  } catch (err) {
    R.errors.push(String((err && err.stack) || err));
  }
  document.body.innerHTML = '<pre id="review-json">'
    + JSON.stringify(R).replace(/</g, '\\u003c') + '</pre>';
})();
