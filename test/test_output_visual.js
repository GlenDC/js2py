const { assert } = require('chai');
const { transpile }  = require('../src');

describe('OutputVisual', function () {
  describe('None', function () {
    const tests = ['undefined', 'null'];
    tests.forEach(test => {
      it(`should use None for null-like value '${test}'`, () => {
        assert.equal(transpile(test), 'None\n');
      });
    });
  });

  describe('Booleans', function () {
    const tests = [['true', 'True\n'], ['false', 'False\n']];
    tests.forEach(([testInput, testOutput]) => {
      it(`should correctly interpret boolean value: '${testInput}'`, () => {
        assert.equal(transpile(testInput), testOutput);
      });
    });
  });

  describe('Strings', function () {
    const tests = [
      [`""`, `""\n`],
      [`''`, `""\n`],
      ['``', `""\n`],
      [`"Foo"`, `"Foo"\n`],
      [`"aBc"`, `"aBc"\n`],
      [`"Hello, World!"`, `"Hello, World!"\n`],
      ['`Hello,\nWorld!`', `"""Hello,\nWorld!"""\n`],
    ];
    tests.forEach(([testInput, testOutput]) => {
      it(`should correctly interpret string value: '${testInput}'`, () => {
        assert.equal(transpile(testInput), testOutput);
      });
    });
  });

  describe('Template Strings', function () {
    const tests = [
      ['``', `""\n`],
      ['`"`', `"\""\n`],
      [
        '`This is a {w}on{k{y}} "string"`',
        `"This is a {w}on{k{y}} \"string\""\n`,
      ],
      ['`Hello, world!`', `"Hello, world!"\n`],
      ['`Hello, ${name}!`', `f"Hello, {name}!"\n`],
      [
        '`This is a {w}on{k{y}} "string", do you agree ${name}?`',
        `f"This is a {{w}}on{{k{{y}}}} \"string\", do you agree {name}?"\n`,
      ],
    ];
    tests.forEach(([testInput, testOutput]) => {
      it(`should correctly interpret template string value: '${testInput}'`, () => {
        assert.equal(transpile(testInput), testOutput);
      });
    });
  });

  describe('Numbers', function () {
    const tests = [
      [`0`, `0\n`],
      [`-42`, `-(42)\n`],
      [`-4.2`, `-(4.2)\n`],
      [`42`, `42\n`],
      [`4.2`, `4.2\n`],
      [`+42`, `+(42)\n`],
      [`+4.2`, `+(4.2)\n`],
      [`0xAEF`, `2799\n`],
      [`3200303003`, `3200303003\n`],
      [`1000000000000000`, `1e15\n`],
      [`1e15`, `1e15\n`],
      [`1E15`, `1e15\n`],
      [`0.00000000000001`, `1e-14\n`],
      [`0.00000000000123`, `1.23e-12\n`],
      [`3400000404005005`, `0xC14484851208D\n`],
      [`1e2`, `100\n`],
      [`Infinity`, `float('+Inf')\n`],
      [`NaN`, `float('nan')\n`],
    ];
    tests.forEach(([testInput, testOutput]) => {
      it(`should correctly interpret numeric value: '${testInput}'`, () => {
        assert.equal(transpile(testInput), testOutput);
      });
    });
  });
});
