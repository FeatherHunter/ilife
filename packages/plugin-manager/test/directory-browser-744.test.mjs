// 票 #744 · 共用件「目录浏览器」自证回路（纯逻辑半：不碰 DOM、不碰宿主）。
//
// 咬三件事，都不咬写法：
//   ① 路径换算（上一层／拼接／草稿切分）在 Windows 与 POSIX 两种写法下都对；
//   ② 操作半喂假取数面能跑通全流程（开图／进目录／回上一级／筛选／新建文件夹／取消）；
//   ③ **本件不认识宿主**：源码与产物里都不许出现 `remote.`／`directoryPicker`／`native`／`browse` 字样。
//      （这条是本票「高度解耦」的机械判据；谁把宿主名词写进来，这里就红。）
//
// 先构建再跑：`node node_modules/typescript/bin/tsc -b packages/plugin-manager`
// （读数来自产物 `dist/directory-browser-contract.js` 与 `dist/directory-browser-state.js`。）
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const PKG = join(HERE, '..');

const contract = await import('../dist/directory-browser-contract.js');
const state = await import('../dist/directory-browser-state.js');

const {
  isBrowseFace,
  hasPickFn,
  pickerModeOf,
  readPickAnswer,
  browseFaceOf,
  readBrowseAnswer,
  BrowseAnswerError,
  parentOf,
  joinPath,
  splitDraft,
  visibleEntries,
  filterEntries,
  hiddenCount,
  locationLabel,
  validateFolderName,
} = contract;
const { createBrowseController, rowsOf, canGoUp, targetOf, createBaseOf, entryPath, createDirectoryRowBrowser, openRowBrowser } = state;

/** 假取数面：一张写死的目录树，`C:\a` 下面有 `b`（普通）、`.hidden`（隐藏）、`c`（普通）。 */
function fakeFace(options = {}) {
  const tree = options.tree ?? {
    'C:\\a': [
      { name: 'b', path: 'C:\\a\\b', hidden: false },
      { name: '.hidden', path: 'C:\\a\\.hidden', hidden: true },
      { name: 'c', path: 'C:\\a\\c', hidden: false },
    ],
    'C:\\a\\b': [],
    'C:\\a\\c': [],
  };
  const calls = [];
  return {
    calls,
    async list(path) {
      calls.push(['list', path ?? null]);
      if (options.failOn !== undefined && (path ?? null) === options.failOn) {
        const error = new Error('读不出这一层');
        error.code = 'directory-picker/unreadable';
        throw error;
      }
      const target = path ?? 'C:\\a';
      return {
        path: target,
        home: 'C:\\',
        crumbs: [{ name: 'C:\\', path: 'C:\\', hidden: false }, { name: 'a', path: 'C:\\a', hidden: false }],
        entries: tree[target] ?? [],
        truncated: false,
      };
    },
    async createDirectory(path, name) {
      calls.push(['createDirectory', path, name]);
      if (options.createFails === true) {
        const error = new Error('这个名字已经有人用了');
        error.code = 'directory-picker/exists';
        throw error;
      }
      return path + '\\' + name;
    },
  };
}

describe('#744 路径换算（Windows 与 POSIX 两种写法）', () => {
  it('parentOf：尾分隔符先吃掉，Windows 与 POSIX 各一路', () => {
    assert.equal(parentOf('C:\\a\\b'), 'C:\\a');
    assert.equal(parentOf('C:\\a\\b\\'), 'C:\\a', '尾反斜杠不能让它原地打转');
    assert.equal(parentOf('/home/me/photos/'), '/home/me');
    assert.equal(parentOf('C:\\'), 'C:\\', '盘根回自身');
    assert.equal(parentOf('/'), '/', 'POSIX 根回自身');
    assert.equal(parentOf('C:\\a'), 'C:\\', '一级子目录回盘根');
    assert.equal(parentOf('相对名'), '相对名', '没有任何分隔符时回自身');
  });

  it('joinPath：看路径里出现过哪种分隔符，尾分隔符不重复叠', () => {
    assert.equal(joinPath('C:\\a', 'b'), 'C:\\a\\b');
    assert.equal(joinPath('C:\\a\\', 'b'), 'C:\\a\\b');
    assert.equal(joinPath('/home/me', 'photos'), '/home/me/photos');
  });

  it('splitDraft：按最后一个分隔符切「目录部分 ＋ 筛选词」', () => {
    assert.deepEqual(splitDraft('C:\\a\\b'), { directory: 'C:\\a\\', filter: 'b' });
    assert.deepEqual(splitDraft('/home/me/p'), { directory: '/home/me/', filter: 'p' });
    assert.deepEqual(splitDraft('没有分隔符'), { directory: null, filter: '没有分隔符' });
    assert.deepEqual(splitDraft('C:\\a\\'), { directory: 'C:\\a\\', filter: '' });
  });

  it('filterEntries 大小写不敏感；空筛选词＝全留', () => {
    const entries = [{ name: 'Photos', path: 'x', hidden: false }];
    assert.equal(filterEntries(entries, 'pho').length, 1);
    assert.equal(filterEntries(entries, 'PHO').length, 1);
    assert.equal(filterEntries(entries, 'zzz').length, 0);
    assert.equal(filterEntries(entries, '   ').length, 1);
  });

  it('visibleEntries 与 hiddenCount：隐藏目录靠开关，计数照全量', async () => {
    const full = await fakeFace().list('C:\\a');
    assert.equal(visibleEntries(full, false).length, 2, '关着时只剩两个非隐藏目录');
    assert.equal(visibleEntries(full, true).length, 3);
    assert.equal(hiddenCount(full), 1);
  });

  it('locationLabel：home 里的话缩成 ~，外面照原样', () => {
    assert.equal(locationLabel({ path: 'C:\\a\\b', home: 'C:\\', crumbs: [], entries: [], truncated: false }), '~\\a\\b');
    assert.equal(locationLabel({ path: 'D:\\x', home: 'C:\\', crumbs: [], entries: [], truncated: false }), 'D:\\x');
  });

  it('validateFolderName：空、带分隔符、. 与 .. 都拦下并给人话', () => {
    assert.equal(validateFolderName('图库').ok, true);
    assert.equal(validateFolderName('   ').ok, false);
    assert.match(validateFolderName('a\\b').reason, /分隔符/);
    assert.match(validateFolderName('a/b').reason, /分隔符/);
    assert.equal(validateFolderName('..').ok, false);
  });
});

describe('#744 入口三态与回执归一（宿主名词只在这一层出现）', () => {
  it('pickerModeOf：两格浏览原语齐＝browse（**先认它**），只有 pick＝native，都没有＝none', () => {
    assert.equal(pickerModeOf({ pick: async () => null }), 'native');
    assert.equal(pickerModeOf({ pick: async () => null, list: async () => {}, createDirectory: async () => {} }), 'browse',
      '真机上三条动词都在（命名空间按描述符生成）——先认 pick 就会每次都去唤一次被拒的系统对话框（#744 实测）');
    assert.equal(pickerModeOf(fakeFace()), 'browse');
    assert.equal(pickerModeOf({}), 'none');
    assert.equal(pickerModeOf(undefined), 'none');
    assert.equal(pickerModeOf(null), 'none');
  });

  it('isBrowseFace／hasPickFn：认不出就当没有，绝不抛', () => {
    assert.equal(isBrowseFace({ list: () => {}, createDirectory: () => {} }), true);
    assert.equal(isBrowseFace({ list: () => {} }), false, '缺一格就不算');
    assert.equal(isBrowseFace('x'), false);
    assert.equal(hasPickFn({ pick: 1 }), false);
  });

  it('readPickAnswer：信封三态（选中／取消／供不了），裸串兜底，认不出当供不了', () => {
    assert.deepEqual(readPickAnswer({ ok: true, value: 'D:\\x' }), { kind: 'picked', path: 'D:\\x' });
    assert.deepEqual(readPickAnswer({ ok: true, value: null }), { kind: 'cancelled' });
    assert.deepEqual(readPickAnswer({ ok: true, value: '   ' }), { kind: 'cancelled' });
    const refused = readPickAnswer({ ok: false, error: { message: 'no native backend' } });
    assert.equal(refused.kind, 'unavailable');
    assert.match(refused.message, /系统文件夹对话框/);
    assert.match(refused.message, /no native backend/, '平台原话不许吞');
    assert.deepEqual(readPickAnswer('D:\\裸串'), { kind: 'picked', path: 'D:\\裸串' });
    assert.equal(readPickAnswer(undefined).kind, 'unavailable');
  });
});

describe('#744 操作半：喂假取数面跑全流程', () => {
  it('open 列举家目录 → 进子目录 → 回上一级', async () => {
    const face = fakeFace();
    const picked = [];
    const ctl = createBrowseController({
      face,
      initialPath: '',
      onPicked: (p) => picked.push(p),
      onClose: () => picked.push('closed'),
    });
    await ctl.open();
    assert.equal(ctl.getState().phase, 'ready');
    assert.equal(ctl.getState().listing.path, 'C:\\a');
    assert.equal(rowsOf(ctl.getState()).length, 2, '隐藏目录默认不出现');

    await ctl.enter('C:\\a\\b');
    assert.equal(ctl.getState().listing.path, 'C:\\a\\b');
    assert.equal(canGoUp(ctl.getState()), true);

    await ctl.up();
    assert.equal(ctl.getState().listing.path, 'C:\\a');
    assert.deepEqual(face.calls, [['list', null], ['list', 'C:\\a\\b'], ['list', 'C:\\a']]);
  });

  it('根目录上「回上一级」不动（不再多发一次列举）', async () => {
    const face = fakeFace();
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.enter('C:\\');
    const before = face.calls.length;
    await ctl.up();
    assert.equal(face.calls.length, before, '原地不动');
  });

  it('选中走 targetOf，取消走 onClose 且不写值', async () => {
    const face = fakeFace();
    const events = [];
    const ctl = createBrowseController({
      face,
      initialPath: '',
      onPicked: (p) => events.push(['picked', p]),
      onClose: () => events.push(['closed']),
    });
    await ctl.open();
    assert.equal(targetOf(ctl.getState()), 'C:\\a', '没选中时「打开」＝当前层');
    ctl.select('C:\\a\\c');
    assert.equal(targetOf(ctl.getState()), 'C:\\a\\c');
    ctl.pick();
    assert.deepEqual(events, [['picked', 'C:\\a\\c']]);

    ctl.cancel();
    assert.deepEqual(events, [['picked', 'C:\\a\\c'], ['closed']]);
  });

  it('草稿末段筛当前层（同一层才筛，换层就清）', async () => {
    const face = fakeFace();
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.open();
    assert.equal(rowsOf(ctl.getState()).length, 2);
    ctl.setDraft('C:\\a\\b');
    assert.equal(rowsOf(ctl.getState()).length, 1, '只剩名字里带 b 的那一个');
    ctl.setDraft('C:\\a\\');
    assert.equal(rowsOf(ctl.getState()).length, 2, '筛选词空了就全留');
    ctl.setDraft('D:\\别的');
    assert.equal(rowsOf(ctl.getState()).length, 2, '草稿指到别处时不筛这一层');
  });

  it('隐藏目录开关：打开后行数变多', async () => {
    const face = fakeFace();
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.open();
    ctl.toggleHidden();
    assert.equal(rowsOf(ctl.getState()).length, 3);
    assert.equal(ctl.getState().showHidden, true);
  });

  it('新建文件夹：建完进它并选中它；名字不合法只出人话、不发请求', async () => {
    const face = fakeFace();
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.open();
    await ctl.createFolder('图库');
    assert.deepEqual(face.calls.at(-2), ['createDirectory', 'C:\\a', '图库']);
    assert.equal(ctl.getState().listing.path, 'C:\\a\\图库');
    assert.equal(ctl.getState().selected, 'C:\\a\\图库');
    assert.equal(ctl.getState().creating, null, '建完收起输入行');

    const before = face.calls.length;
    await ctl.createFolder('a\\b');
    assert.equal(face.calls.length, before, '非法名字不发请求');
    assert.match(ctl.getState().notice, /分隔符/);
  });

  it('新建失败出人话（把人话留在 notice，不当取消吞掉）', async () => {
    const face = fakeFace({ createFails: true });
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.open();
    await ctl.createFolder('图库');
    assert.match(ctl.getState().notice, /这个名字已经有人用了/);
    assert.equal(ctl.getState().phase, 'ready', '失败不影响这一层还在图上');
  });

  it('这一层读不出来：phase=failed ＋ 人话带平台原话，不抛', async () => {
    const face = fakeFace({ failOn: 'C:\\坏' });
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.enter('C:\\坏');
    assert.equal(ctl.getState().phase, 'failed');
    assert.match(ctl.getState().failure.message, /读不出这一层/);
    assert.match(ctl.getState().failure.message, /浏览失败/);
  });

  it('晚回来的旧回执不许覆盖新一层（世代号）', async () => {
    const slow = fakeFace();
    const original = slow.list;
    let releaseSlow;
    slow.list = async (path) => {
      if (path === 'C:\\慢') await new Promise((resolve) => (releaseSlow = resolve));
      return original.call(slow, path);
    };
    const ctl = createBrowseController({ face: slow, initialPath: '', onPicked: () => {}, onClose: () => {} });
    const pending = ctl.enter('C:\\慢');
    await ctl.enter('C:\\a');
    releaseSlow();
    await pending;
    assert.equal(ctl.getState().listing.path, 'C:\\a', '慢的那次被丢掉');
  });

  it('订阅：每次变更都推一份新状态，退订后不再推', async () => {
    const face = fakeFace();
    const ctl = createBrowseController({ face, initialPath: '', onPicked: () => {}, onClose: () => {} });
    const seen = [];
    const off = ctl.subscribe((s) => seen.push(s.phase));
    await ctl.open();
    assert.deepEqual(seen, ['loading', 'ready']);
    off();
    ctl.toggleHidden();
    assert.deepEqual(seen, ['loading', 'ready'], '退订后不再推');
  });
});

describe('#744 解密判据：共用件不认识宿主', () => {
  // 只禁「宿主接缝名」：包名、命名空间名、服务键。**不禁** 'native'／'browse' 这两个值——
  // 它们是入口三态的取值（界面按它决定画哪个入口），属于本件自己的词汇，不是宿主的名字。
  const HOST_TOKENS = /remote\.|directoryPicker|directory-picker/;

  /** 去掉注释再查：注释里解释「为什么不认识宿主」是允许的，代码里出现才违规。 */
  const stripComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  it('源码三件的**代码**里不出现宿主接缝名', () => {
    for (const file of ['directory-browser-contract.ts', 'directory-browser-state.ts', 'directory-browser-ui.ts']) {
      const source = stripComments(readFileSync(join(PKG, 'src', file), 'utf8'));
      const hit = source.match(HOST_TOKENS);
      assert.equal(hit, null, `${file} 的代码里出现了宿主接缝名：${hit?.[0]}`);
    }
  });

  it('产物两件的**代码**里也不出现宿主接缝名', () => {
    for (const file of ['directory-browser-contract.js', 'directory-browser-state.js']) {
      const source = stripComments(readFileSync(join(PKG, 'dist', file), 'utf8'));
      const hit = source.match(HOST_TOKENS);
      assert.equal(hit, null, `${file} 的代码里出现了宿主接缝名：${hit?.[0]}`);
    }
  });

  it('出口只经两条子路径：纯逻辑一条、视图一条（视图那条是给六家 require 的）', () => {
    const manifest = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.exports).sort(), [
      '.',
      './client',
      './directory-browser',
      './directory-browser-ui',
      './package.json',
    ]);
  });
});

describe('#744 图上要用的三个读数', () => {
  it('createBaseOf 与 entryPath：选中优先，没选中用当前层', async () => {
    const ctl = createBrowseController({ face: fakeFace(), initialPath: '', onPicked: () => {}, onClose: () => {} });
    await ctl.open();
    assert.equal(createBaseOf(ctl.getState()), 'C:\\a');
    ctl.select('C:\\a\\c');
    assert.equal(createBaseOf(ctl.getState()), 'C:\\a\\c');
    assert.equal(entryPath('C:\\a', { name: 'c', path: '', hidden: false }), 'C:\\a\\c', '宿主没给 path 时按名字拼');
  });
});

describe('#744 六家取用的两条子路径真的能 require', () => {
  it('./directory-browser：开图接线在 Node 里能跑（六家的 client 束就是 require 这一条）', async () => {
    const picked = [];
    const row = createDirectoryRowBrowser({
      face: fakeFace(),
      initialPath: '',
      onPicked: (p) => picked.push(p),
    });
    assert.equal(row.state().phase, 'idle');
    await row.open();
    assert.equal(row.state().phase, 'ready');
    assert.match(row.summary(), /C:\\a/);
    assert.equal(typeof row.actions.onPick, 'function');
    row.actions.onSelect('C:\\a\\c');
    row.actions.onPick();
    assert.deepEqual(picked, ['C:\\a\\c']);
  });

  it('./directory-browser-ui：组件与界面的挂钩都转出来了（require 它不炸）', async () => {
    const ui = await import('../dist/directory-browser-ui.js');
    assert.equal(typeof ui.DirectoryBrowser, 'function');
    assert.equal(typeof ui.DirectoryBrowserFromRow, 'function');
    assert.equal(typeof ui.createDirectoryRowBrowser, 'function');
    assert.equal(ui.DirectoryBrowser({ open: false, state: stateFixture, labels: labelsFixture, ...noopActions }), null,
      '没开图时不画任何东西');
  });

  it('面包屑每一格写自己那一层的名字（第一格不是「上一级」——那是路径行那颗按钮的文案）', async () => {
    const ui = await import('../dist/directory-browser-ui.js');
    const listing = {
      ...stateFixture.listing,
      path: 'C:\\子目录层',
      crumbs: [
        { name: 'C:\\', path: 'C:\\', hidden: false },
        { name: '子目录层', path: 'C:\\子目录层', hidden: false },
      ],
    };
    const element = ui.DirectoryBrowser({ open: true, state: { ...stateFixture, listing }, labels: labelsFixture, ...noopActions });
    assert.equal(countText(element, labelsFixture.up), 1, '「上一级」在图上只该出现一次（路径行那颗按钮）');
    assert.equal(countText(element, 'C:\\'), 1, '第一格面包屑写根自己的名字');
    assert.equal(countText(element, '子目录层'), 1, '第二格写那一层的名字');
  });
});

/** 视图用例用的最小 state：满载但空列表。 */
const stateFixture = {
  phase: 'ready',
  listing: { path: 'C:\\a', home: 'C:\\', crumbs: [{ name: 'C:\\', path: 'C:\\', hidden: false }], entries: [], truncated: false },
  failure: null,
  selected: null,
  showHidden: false,
  draft: 'C:\\a',
  filter: '',
  creating: null,
  notice: null,
};

const labelsFixture = {
  title: '选择数据目录',
  close: '关闭',
  up: '上一级',
  pathPlaceholder: '路径',
  go: '转到',
  showHidden: (n) => `显示隐藏目录（${n}）`,
  empty: '没有子目录',
  loading: '正在读取…',
  newFolder: '新建文件夹',
  createConfirm: '创建',
  createCancel: '取消',
  select: '选',
  selected: '已选',
  open: '打开',
  cancel: '取消',
  willPick: '将选定：',
};

const noopActions = {
  onPick: () => {},
  onClose: () => {},
  onEnter: () => {},
  onUp: () => {},
  onSelect: () => {},
  onToggleHidden: () => {},
  onDraft: () => {},
  onCommitDraft: () => {},
  onCreate: () => {},
  onCreatingChange: () => {},
};

/** 数一数元素树里某个文本出现了几次（React 元素是普通对象：`type`／`props.children`）。 */
function countText(node, needle) {
  let found = 0;
  const walk = (value) => {
    if (typeof value === 'string') {
      if (value === needle) found += 1;
      return;
    }
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (value !== null && typeof value === 'object' && 'props' in value) walk(value.props.children);
  };
  walk(node);
  return found;
}

/** 宿主命名空间**真机上的样子**（#744 返修的三条读数都咬在这里）：
 *  ① 三条动词都在（按描述符生成，与组合里服务哪种能力无关）；
 *  ② 回的不是值而是信封 `{ok:true,value}`／`{ok:false,error}`（`@deepseek-ai/dsh-api-gateway` 的 `invoke()`）；
 *  ③ 组合里没给的那条路一律回 `directory-picker/unavailable`（宿主 `requireCapability()`）。 */
function wireNamespace(options = {}) {
  const calls = [];
  const listing = (path) => ({
    path,
    home: 'C:\\Users\\me',
    crumbs: [{ name: 'C:\\', path: 'C:\\', hidden: false }],
    entries: [
      { name: 'b', path: path + '\\b', hidden: false },
      { name: '.hidden', path: path + '\\.hidden', hidden: true },
    ],
    truncated: false,
  });
  const refused = (method) => ({
    ok: false,
    error: {
      code: 'directory-picker/unavailable',
      message: `directoryPicker.${method} needs the native capability; the composed picker serves "browse"`,
    },
  });
  return {
    calls,
    async list(path) {
      calls.push(['list', path ?? null]);
      if (options.refuseBrowse === true) return refused('list');
      return { ok: true, value: listing(path ?? 'C:\\Users\\me') };
    },
    async createDirectory(path, name) {
      calls.push(['createDirectory', path, name]);
      if (options.refuseBrowse === true) return refused('createDirectory');
      return { ok: true, value: path + '\\' + name };
    },
    async pick() {
      calls.push(['pick']);
      return options.refuseBrowse === true ? { ok: true, value: 'D:\\选中的' } : refused('pick');
    },
  };
}

describe('#744 返修：宿主信封、组合只服务一种能力', () => {
  it('readPickAnswer：平台给了回执码就带上（分辨「没这条路」与「别的失败」）', () => {
    const refused = readPickAnswer({ ok: false, error: { code: 'directory-picker/unavailable', message: 'x' } });
    assert.equal(refused.kind, 'unavailable');
    assert.equal(refused.code, 'directory-picker/unavailable');
    assert.equal('code' in readPickAnswer({ ok: false, error: { message: 'x' } }), false, '没给码就不带这一格');
  });

  it('browseFaceOf：把信封拆成值；被拒按码抛（信封当值用＝图上空目录，不是报错）', async () => {
    const face = browseFaceOf(wireNamespace());
    assert.ok(face !== null, '两格原语都在 ⇒ 有取数面');
    const listed = await face.list('C:\\a');
    assert.equal(listed.path, 'C:\\a', '信封里的 value 才是那一层');
    assert.equal(listed.entries.length, 2);
    assert.equal(await face.createDirectory('C:\\a', '新建'), 'C:\\a\\新建');

    const refused = browseFaceOf(wireNamespace({ refuseBrowse: true }));
    await assert.rejects(
      () => refused.list('C:\\a'),
      (error) => {
        assert.equal(error.code, 'directory-picker/unavailable');
        assert.match(error.message, /needs the native capability/, '平台原话不许吞');
        return true;
      },
    );
    assert.equal(browseFaceOf({ pick: async () => ({ ok: true, value: null }) }), null, '只有 pick 的命名空间没有浏览那条路');
    assert.equal(browseFaceOf(null), null);
  });

  it('readBrowseAnswer：认得信封与自己的失败类型（用例与本件同一处读数）', () => {
    assert.deepEqual(readBrowseAnswer({ ok: true, value: { path: 'C:\\a' } }, '列举目录'), { path: 'C:\\a' });
    assert.throws(() => readBrowseAnswer({ ok: false, error: { code: 'directory-picker/unreadable', message: '这一层读不出来' } }, '列举目录'),
      (error) => error instanceof BrowseAnswerError && error.code === 'directory-picker/unreadable' && /这一层读不出来/.test(error.message));
    assert.throws(() => readBrowseAnswer(undefined, '列举目录'), /没有回执/, '认不出的形状要报出来，不许当空目录');
  });

  it('openRowBrowser：先应用内浏览 → 图上落定第一层，选中回填该行', async () => {
    const rows = [];
    const changed = [];
    const opened = openRowBrowser({
      picker: wireNamespace(),
      initialPath: 'C:\\a',
      onChange: (next) => changed.push(next),
      onRow: (next) => rows.push(next),
      refusalCode: 'directory-picker/unavailable',
    });
    assert.equal(typeof opened?.then, 'function', '回 Promise（用例据此判，不信「点了没反应」）');
    assert.equal(await opened, 'open');
    const row = rows[0];
    assert.ok(row !== null && row !== undefined, '图开着：调用方拿到了那一条');
    assert.equal(row.state().phase, 'ready');
    assert.equal(row.state().listing.path, 'C:\\a', '初值指到哪一层就从哪一层开');
    assert.equal(rowsOf(row.state()).length, 1, '隐藏目录默认不出现');
    row.actions.onSelect('C:\\a\\b');
    row.actions.onPick();
    assert.deepEqual(changed, ['C:\\a\\b'], '选中之后回填给这一行');
    assert.equal(rows.at(-1), null, '选中之后图收起');
  });

  it('openRowBrowser：宿主只服务 native ⇒ refused，并把图收起（调用方据此换系统对话框）', async () => {
    const rows = [];
    const opened = openRowBrowser({
      picker: wireNamespace({ refuseBrowse: true }),
      initialPath: '',
      onChange: () => {},
      onRow: (next) => rows.push(next),
      refusalCode: 'directory-picker/unavailable',
    });
    assert.equal(await opened, 'refused');
    assert.equal(rows.length, 2);
    assert.notEqual(rows[0], null, '先开着图（列举是这一步才知道给不给）');
    assert.equal(rows[1], null, '被拒之后图要收起，不留一张读不动的空图');
  });

  it('openRowBrowser：命名空间只给 pick（或干脆没有）⇒ undefined，调用方走系统对话框', () => {
    const base = { initialPath: '', onChange: () => {}, onRow: () => {}, refusalCode: 'directory-picker/unavailable' };
    assert.equal(openRowBrowser({ ...base, picker: { pick: async () => ({ ok: true, value: null }) } }), undefined);
    assert.equal(openRowBrowser({ ...base, picker: null }), undefined);
    assert.equal(openRowBrowser({ ...base, picker: undefined }), undefined);
  });

  it('订阅：状态变更推到订阅者（视图靠 `useSyncExternalStore` 用它重画，没有它只画第一帧）', async () => {
    const seen = [];
    const row = createDirectoryRowBrowser({ face: browseFaceOf(wireNamespace()), initialPath: 'C:\\a', onPicked: () => {} });
    assert.equal(typeof row.subscribe, 'function');
    const off = row.subscribe((next) => seen.push(next.phase));
    await row.open();
    assert.deepEqual(seen, ['loading', 'ready'], '列举落定要推一次，否则图上永远「正在读取…」');
    off();
    row.actions.onToggleHidden();
    assert.deepEqual(seen, ['loading', 'ready'], '退订后不再推');
  });

  it('开图先试初值那一层，读不出来（不存在／没权限）退回宿主家目录', async () => {
    const face = browseFaceOf(wireNamespace());
    // 让带初值的那次列举失败：真机上就是 `directory-picker/unreadable`。
    const broken = createDirectoryRowBrowser({
      face: {
        list: async (path) => {
          if (path === 'D:\\没有这一层') throw Object.assign(new Error('读不出来'), { code: 'directory-picker/unreadable' });
          return face.list(path);
        },
        createDirectory: face.createDirectory,
      },
      initialPath: 'D:\\没有这一层',
      onPicked: () => {},
    });
    await broken.open();
    assert.equal(broken.state().phase, 'ready', '读不出来不把图卡死');
    assert.equal(broken.state().listing.path, 'C:\\Users\\me', '退回宿主家目录');
  });
});
