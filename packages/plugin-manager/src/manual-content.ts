/** 手册正文内容（票 #1239）：目录行可点＋三场景定稿文字＋合页锁页样＋签徽入句＋静态面板＋备注。
 *
 * 硬规矩：SCENES 与冻结原型第 276 行 SCENES 逐字一致（用例现场提 JSON 深比）；
 * 组合与样子逐字取原型 pageBody 系（标题／导语／步骤链／片段／备注／静态面板／目录／合页）。
 * 纠偏口径（#1242）：frag 全空不造复制按钮（文案悬空不管）；warn 不渲染，仅数据目录 note；
 * tags／apps 只作数据携带；合页无小字脚注；HELP 死链不写。
 *
 * 浏览器束约束：展示纯函数，无 DOM 直写；步骤内联签徽经 dangerouslySetInnerHTML
 * （字符串即冻结原文，可信源，不拼用户输入）。
 */
import * as React from 'react';
import { planManual } from './manual-plan.js';
import type { ManualScene } from './manual-plan.js';

export interface ManualContentScene extends ManualScene {
  readonly kind?: string;
  readonly name?: string;
  readonly kicker?: string;
  readonly lead?: string;
  readonly steps?: readonly string[];
  readonly tags?: readonly string[];
  readonly apps?: readonly string[];
  readonly frag?: string;
  readonly shot?: boolean;
  readonly warn?: string;
  readonly note?: string;
  readonly panelStatic?: boolean;
  readonly items?: readonly string[];
}

/** 内容数据：与冻结原型 SCENES 逐字一致（顺序即页码顺序）。 */
export const SCENES: readonly ManualContentScene[] = [
  { key: 'contents', title: '目录', state: 'written', kind: 'contents', kicker: '这本手册里有什么' },
  {
    key: 'basic', title: '基本使用：对 DSH 说什么 help', state: 'written', name: '基本使用',
    kicker: '给 DSH 一句话，换回一份手册', lead: '',
    steps: [
      '对 <span class="dbadge">DSH</span> 说「技能名 help」，比如「饼干记账 help」。',
      '打开 <span class="dbadge">DSH</span> 落下的 help.html 文件（看<span class="po">回执<i>DSH 回复里那句结果说明</i></span>里那一句）。',
      '在文件里找到自己想用的场景。',
      '点复制按钮，把 <span class="po">prompt<i>手册里让你复制的那句话，原样发给 DSH 就行</i></span>提示词模板复制出来。',
      '把复制出来的模板发给 <span class="dbadge">DSH</span>。',
      '<span class="dbadge">DSH</span> 执行成功，把结果返回给你。',
    ],
    tags: [], apps: [], frag: '', shot: false, warn: '没收到文件，看回执里失败那一句。',
  },
  {
    key: 'datadir', title: '数据目录：你专属的数据存放位置', state: 'written', name: '数据目录',
    kicker: '你的数据你做主', lead: '数据目录就是你专属的数据存放位置。',
    steps: [
      '点 <span class="ctag">配置面板 › 数据目录</span>蓝底那一行进去；它不在顶层，要先进这一区。',
      '按你要用的技能，把数据存放在哪个目录下设置好。',
      '点保存。',
    ],
    tags: ['配置面板 › 数据目录'], apps: [], frag: '', shot: false, panelStatic: true,
    note: '备注：我们不对你数据目录里的数据库文件加密，由你自己保证数据安全——避免因密码遗忘导致的数据丢失与损坏。',
    warn: '目录填错或没权限，db 就落不下去；面板告警只看 message 那一句，按它说的改。',
  },
  {
    key: 'im', title: '增强体验：装 IM 插件手机远程用', state: 'written', name: '增强体验',
    kicker: '手机远程使用全部功能', lead: '利用 IM 插件搭配手机App远程使用：',
    steps: [
      '在 DSH 里装上 IM 插件，比如 <span class="capp">dsh-im</span> <span class="capp">dsh-im-companion</span> 这一对。',
      '绑好<span class="po">机器人<i>飞书里的机器人，插件靠它把消息发给你</i></span>，推荐飞书等对 HTML 支持好的App。',
      '在IM如飞书里发一句「技能名 help」，比如「饼干记账 help」。',
      'DSH 通过 IM 插件把 help.html 文件发回来。',
      '复制出想用场景的 prompt 提示词模板，通过 IM 插件发给 <span class="dbadge">DSH</span>。',
      '<span class="dbadge">DSH</span> 执行完，把结果通过 IM 插件发回到你手机上。',
    ],
    tags: [], apps: ['dsh-im', 'dsh-im-companion'], frag: '', shot: false,
    warn: '收不到消息，先看绑定还在不在，再看插件装没装上。',
  },
  { key: 'upcoming', title: '后续场景，待补充', state: 'pending', items: ['待定 4', '待定 5', '待定 6', '待定 7', '待定 8'] },
];

/** 正文样式（逐字取原型正文系；废弃三件缩略图／大图／切换条不在内）。 */
export function manualContentCss(): string {
  return [
    '.pg{padding:5.5% 6%;display:flex;flex-direction:column;height:100%;box-sizing:border-box;color:#33291c;position:relative;overflow:hidden}',
    '.pg h2{font-size:1.45em;line-height:1.35;margin:0;color:#2e2418}',
    '.pg .kick{font-size:.8em;color:#8a7550;letter-spacing:.1em;margin-top:.35em}',
    '.pg .hr{height:1px;background:linear-gradient(to right,#b08a2e77,transparent);margin:.9em 0}',
    '.pg .lead{font-size:1.04em;line-height:2;margin:.2em 0 .1em;color:#3a2f1e}',
    '.pg .ol{margin:.3em 0 0;padding:0;list-style:none}',
    '.pg .ol li{display:flex;gap:.75em;margin:.62em 0;font-size:1em;line-height:1.95}',
    '.pg .ol .n{flex:none;width:1.55em;height:1.55em;border-radius:50%;border:1px solid #8a6a15;background:linear-gradient(#f8e7ae,#d9ab3c);color:#3a2607;display:flex;align-items:center;justify-content:center;font-size:.82em;font-weight:700;margin-top:.22em;box-shadow:inset 0 1px 0 #fffbe8,0 1px 3px #00000044}',
    '.pg .ctag{display:inline-block;background:#42506b;color:#f8f1e2;border-radius:.28em;padding:.12em .68em;font-size:.86em;margin:.16em .35em .16em 0}',
    '.pg .capp{display:inline-block;background:#7a1f1f;color:#f8f1e2;border:1px solid #c9a227;border-radius:.28em;padding:.1em .62em;font-size:.86em;margin:.16em .35em .16em 0}',
    '.pg .dbadge{display:inline-block;background:#1c1913;color:#f7f4ec;border:1px solid #1c1913;border-radius:.28em;padding:.1em .55em;font-size:.86em;margin:0 .15em;white-space:nowrap;letter-spacing:.06em;box-shadow:inset 0 1px 0 #ffffff22}',
    '.pg .dbadge::before{content:"";display:inline-block;width:1.15em;height:1.15em;margin-right:.4em;vertical-align:-.22em;background:url("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAB1klEQVR4nO2avW7DMAyExYMXAxnz/k/YsUDGFh4MFIYjk9TRplN+W1L++RSppJLWiqIoiqIobsLr++uHGQ/tn4swtSSFz4+njPhfJsDrTVHrA2mK1jx8FGIxjlgBy8Pv5feKt8aavImzsNbmFRIW48xo69zayWhABtrVs54nGnt4EzFh51viaWOiJcFS9FEcre38eAqy7fnRXsEKtMnP5Iw6VjFxZlJmg8UCLTFRIvz1Ry/RJ4qw9UO7AQwRFts9+6ndhEUE66pr7EWrbpZtou30tGJNWscsgniGnx6T19Hac7PjsRYAjCDvDhiLf+91JGAGG7mc2M4CTEF7YK8Yb2Jr8j1YImhBRFDPltAevmwQGXz0vs8TxwpaMGff+FrzYe9N9v/4K6+9j0BLCOt2SIOsCc9YteiH8tSMrF+CfOwWmINE8MZFzznLBBgJjgzusBVG4oER5M7nATRGmbfCqJAS0ZJaBpoRcRmfIliMPcUeNTWs212aAHPQijFFYJ4f8CTwrupVE18P6f1x5Pc9R76s3oN+CI5+3WzxYTZgXiEk6xBzlgiiNczcC4R/ArL8dihibJdPmeu9yIjzJ1ydCSvQ1S2tF4kMvhUlywRYFEVRFEWxKPALURpUQsGttUcAAAAASUVORK5CYII=") no-repeat center/contain}',
    '.pg .po{position:relative;border-bottom:1px dashed #42506b88;cursor:help}',
    '.pg .po i{position:absolute;left:50%;bottom:150%;transform:translate(-50%,4px);opacity:0;pointer-events:none;background:#fffdf6;color:#3a2f1e;border:1px solid #c9b98f;box-shadow:0 10px 22px #00000033;font-style:normal;font-size:.78em;line-height:1.7;border-radius:.4em;padding:.45em .7em;width:14em;z-index:40;transition:opacity .18s ease,transform .18s cubic-bezier(.2,.9,.25,1.4)}',
    '.pg .po:hover i{opacity:1;transform:translate(-50%,0)}',
    '.pg .frag{display:inline-flex;align-items:center;gap:.5em;margin-top:auto;font-family:ui-monospace,Consolas,monospace;font-size:.82em;color:#3a2607;background:linear-gradient(#f4ecd8,#e6d9b8);border:1px solid #8a7a55;border-radius:.4em;padding:.4em .8em;cursor:pointer;align-self:flex-start;box-shadow:inset 0 1px 0 #fffef8,0 2px 0 #8a7a55}',
    '.pg .frag em{font-style:normal;color:#8a7550;font-size:.92em}',
    '.pg .tail{margin-top:auto;font-size:.84em;line-height:1.9;color:#6b5f45}',
    '.pg .toc{margin:.6em 0 0;padding:0;list-style:none}',
    '.pg .toc li{display:flex;align-items:center;gap:.9em;border-bottom:1px solid #ddd0b0;padding:.8em .3em;font-size:1.15em;cursor:pointer}',
    '.pg .toc li:hover{background:#f4ecd8}',
    '.pg .toc .no{flex:none;width:2em;height:2em;border-radius:.25em;background:linear-gradient(#e6d9bc,#c9b98f);border:1px solid #6b5636;display:flex;align-items:center;justify-content:center;font-size:.85em;font-weight:700;color:#4a3a22}',
    '.pg .toc .pg-no{margin-left:auto;color:#8a7550;font-size:.9em}',
    '.pg .toc li.todo-row{color:#8a8578}',
    '.pg .bar{background:#e6d9bc;border:1px solid #6b5636;border-radius:.2em;padding:.5em .65em .5em 0;margin:.65em 0;display:flex;gap:.65em;align-items:center;cursor:default}',
    '.pg .bar .num{background:#c9b98f;border-right:1px solid #6b5636;padding:.5em .8em;font-weight:700;color:#4a3a22}',
    '.pg .bar .lock{margin-left:auto;font-size:1.15em}',
    '.pg .panel{background:#151310;border:1px solid #3a352c;border-radius:.5em;padding:.9em 1em;color:#c9c2b4;font-size:.86em;pointer-events:none;margin-top:.9em}',
    '.pg .panel .p-title b{color:#f2ede2;font-size:1.15em}',
    '.pg .panel .p-mod{display:inline-block;margin-left:.6em;font-size:.78em;color:#ffd9a0;border:1px solid #b26a1b;border-radius:.3em;padding:.1em .6em;vertical-align:middle}',
    '.pg .panel .p-desc{color:#8f8672;margin:.4em 0 .7em}',
    '.pg .panel .p-input{background:#0c0a08;border:1px solid #3a352c;border-radius:.35em;padding:.45em .7em;color:#e8e2d4;font-family:ui-monospace,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-bottom:.6em}',
    '.pg .panel .p-btns{display:flex;gap:.5em;margin-bottom:.7em}',
    '.pg .panel .p-btn{border:1px solid #4a4438;border-radius:.35em;padding:.3em .9em;color:#a89f8d;background:#24211c;cursor:default}',
    '.pg .panel .p-bar{display:flex;gap:.5em;align-items:center;border-top:1px solid #2e2a22;padding-top:.7em}',
    '.pg .panel .p-note{margin-left:auto;color:#6e675c;font-size:.85em}',
  ].join('\n');
}

/** 静态深色面板（数据目录页内：只展示，一处不可点；路径行即冻结原文）。 */
function staticPanel(): React.ReactElement {
  return React.createElement(
    'div',
    { 'data-ilife-manual': 'static-panel' },
    React.createElement(
      'div',
      { className: 'panel' },
      React.createElement(
        'div',
        { className: 'p-title' },
        React.createElement('b', null, '数据目录'),
        React.createElement('span', { className: 'p-mod' }, '可改'),
      ),
      React.createElement('div', { className: 'p-desc' }, '库文件与备份的根目录。留空 = 用默认目录。'),
      React.createElement('div', { className: 'p-input' }, 'D:\\2Study\\StudyNotes\\.db'),
      React.createElement(
        'div',
        { className: 'p-btns' },
        React.createElement('span', { className: 'p-btn' }, '浏览文件夹'),
        React.createElement('span', { className: 'p-btn' }, '复制'),
      ),
      React.createElement(
        'div',
        { className: 'p-bar' },
        React.createElement('span', { className: 'p-btn' }, '保存'),
        React.createElement('span', { className: 'p-btn' }, '重置为默认'),
        React.createElement('span', { className: 'p-btn' }, '重新读取'),
        React.createElement('span', { className: 'p-note' }, '没有未保存的改动'),
      ),
    ),
  );
}

/** 一页正文（组合逐字取原型：目录／步骤链／静态面板／片段／备注／合页）。
 * frag 为空不渲染按钮（#1242 纠偏）；warn 不渲染（仅备注留）。 */
export function renderManualPage(
  scenes: readonly ManualContentScene[],
  page: { page: number; key: string; state: string },
  goPage: (pg: number) => void,
): React.ReactElement | null {
  const scene = scenes.find((s) => s.key === page.key) ?? null;
  if (scene === null) return null;
  const head = (title: string, kicker?: string) => [
    React.createElement('h2', { key: 'h' }, title),
    React.createElement('div', { key: 'k', className: 'kick' }, kicker ?? ''),
    React.createElement('div', { key: 'r', className: 'hr' }),
  ];
  if (scene.kind === 'contents') {
    const rows: { page: number; title: string; pending: boolean; jump: number }[] = [];
    const spreadCount = planManual([...scenes], 0).spreadCount;
    for (let i = 0; i < spreadCount; i++) {
      for (const p of planManual([...scenes], i).pages) {
        const s = scenes.find((x) => x.key === p.key) ?? null;
        const pend = p.state === 'pending';
        rows.push({
          page: p.page,
          title: s !== null && s.kind === 'contents' ? '目录' : p.title,
          pending: pend,
          jump: pend ? planManual([...scenes], spreadCount - 1).pages.slice(-1)[0].page : p.page,
        });
      }
    }
    return React.createElement(
      'div',
      { className: 'pg' },
      ...head('目录', scene.kicker),
      React.createElement(
        'ul',
        { className: 'toc' },
        rows.map((r) => React.createElement(
          'li',
          {
            key: 'toc' + r.page,
            className: r.pending ? 'todo-row' : undefined,
            'data-ilife-manual': 'toc-row',
            'data-jump': r.jump,
            onClick: () => { goPage(r.jump); },
          },
          React.createElement('span', { className: 'no' }, String(r.page)),
          React.createElement('span', null, r.title),
          React.createElement('span', { className: 'pg-no' }, r.pending ? '待补充' : '第 ' + r.page + ' 页'),
        )),
      ),
    );
  }
  if (scene.state === 'pending') {
    const items = scene.items ?? [];
    return React.createElement(
      'div',
      { className: 'pg' },
      React.createElement('h2', null, '后续场景'),
      React.createElement('div', { className: 'hr' }),
      items.map((text, i) => {
        const nb = text.replace(/\D/g, '') || String(i + 1);
        return React.createElement(
          'div',
          { key: 'todo' + i, className: 'bar todo', 'data-ilife-manual': 'pending-row' },
          React.createElement('span', { className: 'num' }, nb),
          React.createElement('span', null, '后续场景，待补充'),
          React.createElement('span', { className: 'lock', 'aria-hidden': 'true' }, '🔒'),
        );
      }),
    );
  }
  return React.createElement(
    'div',
    { className: 'pg' },
    ...head(scene.title, scene.kicker),
    scene.lead === undefined || scene.lead === ''
      ? null
      : React.createElement('p', { className: 'lead' }, scene.lead),
    React.createElement(
      'ul',
      { className: 'ol' },
      (scene.steps ?? []).map((step, i) => React.createElement(
        'li',
        { key: 'st' + i },
        React.createElement('span', { className: 'n' }, String(i + 1)),
        // 步骤串即冻结原文（含签徽内联），可信源，不拼用户输入。
        React.createElement('span', { dangerouslySetInnerHTML: { __html: step } }),
      )),
    ),
    scene.panelStatic === true ? staticPanel() : null,
    scene.frag === undefined || scene.frag === ''
      ? null
      : React.createElement(
        'div',
        {
          className: 'frag',
          'data-ilife-manual': 'frag-copy',
          onClick: () => {},
        },
        scene.frag,
        React.createElement('em', null, '点一下复制'),
      ),
    scene.note === undefined
      ? null
      : React.createElement('div', { className: 'tail' }, scene.note),
  );
}
