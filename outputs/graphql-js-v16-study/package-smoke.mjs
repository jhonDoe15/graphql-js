import assert from 'assert';

(async () => {
  const imported = await import(process.argv[2]);
  const g = imported.default || imported;
  const schema = g.buildSchema('type Query { value: String! child: Child! } type Child { value: String! }');
  const document = g.parse('{ __proto__: value constructor: value toString: value first: child { value } second: child { value } }');
  for (const asynchronous of [false, true]) {
    const value = asynchronous ? () => Promise.resolve('value') : 'value';
    const rootValue = Object.freeze({ value, child: Object.freeze({ value }) });
    const result = await g.execute({ schema, document, rootValue });
    assert.strictEqual(result.errors, undefined);
    assert.strictEqual(Object.getPrototypeOf(result.data), null);
    assert.strictEqual(Object.getPrototypeOf(result.data.first), null);
    assert.notStrictEqual(result.data.first, result.data.second);
    assert.deepStrictEqual(Object.getOwnPropertyDescriptor(result.data, '__proto__'), { value: 'value', enumerable: true, configurable: true, writable: true });
    assert.strictEqual(result.data.constructor, 'value');
    assert.strictEqual(result.data.toString, 'value');
    result.data.first.value = 'changed';
    assert.strictEqual(result.data.second.value, 'value');
    assert.strictEqual(rootValue.child.value, value);
  }
  console.log(`PASS ${process.version} ${process.argv[2]} sync + async result maps`);
})().catch(error => { console.error(error); process.exitCode = 1; });
