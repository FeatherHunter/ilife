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
  parentOf,
  joinPath,
  splitDraft,
  visibleEntries,
  filterEntries,
  hiddenCount,
  locationLabel,
  validateFolderName,
} = contract;
const { createBrowseController, rowsOf, canGoUp, targetOf, createBaseOf, entryPath } = state;

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
  it('pickerModeOf：有 pick＝native，只有两格原语＝browse，都没有＝none', () => {
    assert.equal(pickerModeOf({ pick: async () => null }), 'native');
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

  it('出口只经唯一门：package.json 只给一条 ./directory-browser 子路径', () => {
    const manifest = JSON.parse(readFileSync(join(PKG, 'package.json'), 'utf8'));
    assert.deepEqual(Object.keys(manifest.exports).sort(), ['.', './client', './directory-browser', './package.json']);
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
