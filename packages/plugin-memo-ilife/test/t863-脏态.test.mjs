/**
 * #863 · 脏标记与跟随态（备忘）——改动行有标记、派生行进跟随态、保存栏吸底常显。
 * 运行：`node --test packages/plugin-memo-ilife/test/t863-脏态.test.mjs`。
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadClientBundle, nodesOfType, textOf } from '../../../test/helpers/client-bundle.mjs';
import { CONFIG_ITEMS } from '../dist/index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const CLIENT_SRC = readFileSync(join(HERE, '..', 'src', 'client.ts'), 'utf8');
const CLIENT = loadClientBundle(join(HERE, '..'));
const { Row, followKeysOf } = CLIENT.exports;

const itemOf = (key) => CONFIG_ITEMS.find((i) => i.key === key);

describe('#863 脏标记与跟随态（备忘）', () => {
  it('跟随映射：数据目录一脏，两项只读派生行全进跟随', () => {
    assert.deepEqual(followKeysOf(['db.dir']).sort(), ['db.name', 'html.dir']);
    assert.deepEqual(followKeysOf([]), []);
    assert.deepEqual(followKeysOf(['media.dir']), [], '附件目录无只读派生行');
  });

  it('脏行：标题旁有已改动标记，输入框描边变色', () => {
    const node = Row({ item: itemOf('db.dir'), value: 'D:\\新目录', disabled: false, onChange: () => {}, dirty: true });
    assert.match(textOf(node), /已改动/);
    assert.equal(nodesOfType(node, 'input')[0].props.style.borderColor,
      'var(--dsw-alias-state-warning-primary, #b26a00)');
  });

  it('干净行：无标记无变色（与旧渲染一致）', () => {
    const node = Row({ item: itemOf('db.dir'), value: 'D:\\旧目录', disabled: false, onChange: () => {} });
    assert.doesNotMatch(textOf(node), /已改动/);
    assert.equal(nodesOfType(node, 'input')[0].props.style.borderColor, undefined);
  });

  it('跟随行：只读行出跟随提示并置灰；不跟随时没有', () => {
    const on = Row({ item: itemOf('db.name'), value: 'C:\\x\\a.db', disabled: false, onChange: () => {}, follow: true });
    assert.match(textOf(on), /将跟随更新/);
    assert.equal(nodesOfType(on, 'input')[0].props.style.opacity, 0.55);
    assert.equal(nodesOfType(on, 'input')[0].props.disabled, true, '跟随态仍不可编辑');
    const off = Row({ item: itemOf('db.name'), value: 'C:\\x\\a.db', disabled: false, onChange: () => {} });
    assert.doesNotMatch(textOf(off), /将跟随更新/);
  });

  it('保存栏吸底常显＋脏计数文案', () => {
    assert.match(CLIENT_SRC, /position: 'sticky'/);
    assert.match(CLIENT_SRC, /项未保存/);
    assert.match(CLIENT_SRC, /浏览改动后请点保存/);
  });
});
