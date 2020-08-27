const { assert } = require("chai");
const { transpile } = require("../src");

describe("OutputVisual", () => {
  describe("Primitive Values", () => {
    describe("None", () => {
      const tests = ["undefined", "null"];
      tests.forEach((test) => {
        it(`should use None for null-like value '${test}'`, () => {
          assert.equal(transpile(test), "None\n");
        });
      });
    });

    describe("Booleans", () => {
      const tests = [
        ["true", "True\n"],
        ["false", "False\n"],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret boolean value: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });

    describe("Strings", () => {
      const tests = [
        [`""`, `""\n`],
        [`''`, `""\n`],
        ["``", `""\n`],
        [`"Foo"`, `"Foo"\n`],
        [`"aBc"`, `"aBc"\n`],
        [`"Hello, World!"`, `"Hello, World!"\n`],
        ["`Hello,\nWorld!`", `"""Hello,\nWorld!"""\n`],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret string value: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });

    describe("Template Strings", () => {
      const tests = [
        ["``", `""\n`],
        ['`"`', `"\\""\n`],
        [
          '`This is a {w}on{k{y}} "string"`',
          `"This is a {w}on{k{y}} \\"string\\""\n`,
        ],
        ["`Hello, world!`", `"Hello, world!"\n`],
        ["`Hello, ${name}!`", `f"Hello, {name}!"\n`],
        [
          '`This is a {w}on{k{y}} "string", do you agree ${name}?`',
          `f"This is a {{w}}on{{k{{y}}}} \\"string\\", do you agree {name}?"\n`,
        ],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret template string value: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });

    describe("Numbers", () => {
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

  describe("Regular Expressions", () => {
    describe("Instances", () => {
      // TODO: support the `new Regexp` syntax
      const tests = [
        [`/foo/`, `import re\n\nre.compile(r"foo")\n`],
        [`/"foo"/`, `import re\n\nre.compile(r"\\"foo\\"")\n`],
        [`/\\//`, `import re\n\nre.compile(r"\\/")\n`],
        [
          `/www\\.[^.]+\\.com/`,
          `import re\n\nre.compile(r"www\\.[^.]+\\.com")\n`,
        ],
        [`/foo/g`, `import re\n\nre.compile(r"foo")\n`],
        [`/foo/i`, `import re\n\nre.compile(r"foo", re.IGNORECASE)\n`],
        [`/foo/s`, `import re\n\nre.compile(r"foo", re.DOTALL)\n`],
        [`/foo/m`, `import re\n\nre.compile(r"foo", re.MULTILINE)\n`],
        [
          `/foo/is`,
          `import re\n\nre.compile(r"foo", re.DOTALL, re.IGNORECASE)\n`,
        ],
        [
          `/foo/si`,
          `import re\n\nre.compile(r"foo", re.DOTALL, re.IGNORECASE)\n`,
        ],
        [
          `/foo/mis`,
          `import re\n\nre.compile(r"foo", re.DOTALL, re.IGNORECASE, re.MULTILINE)\n`,
        ],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret Regular Expression value: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });
  });

  // TODO: move operators to polyfill functions,
  // as there is a lot of behaviour that would need to be replicated

  describe("UnaryOperations", () => {
    // TODO: test
  });

  describe("BinaryOperations", () => {
    // TODO: test
  });

  describe("Javascript Tricks", () => {
    describe("Convert to String (+)", () => {
      // TODO: test
    });

    describe("Convert to Number (+)", () => {
      // TODO: test
    });

    describe("Convert to Number (~~)", () => {
      // this trick works in Python as well, same as in JS
      const tests = [
        [`~~0`, `~(~(0))\n`],
        [`~~1`, `~(~(1))\n`],
        [`~~true`, `~(~(True))\n`],
        [`~~false`, `~(~(False))\n`],
        // TODO: for string it returns `-1`, to be supported
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret (~~) number conversion using input: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });

    describe("Float->Int (OR)", () => {
      // TODO: test (23.9 | 0)
    });

    describe("Merge Objects", () => {
      // TODO: test; {...person, ...tools, ...attributes}
    });

    describe("Destructuring Aliases", () => {
      // TODO: test+code; const { x: otherName } = onst obj = { x: 1 };
    });

    describe("Comma Operator", () => {
      const tests = [
        [`x = (x++, x)`, `x = x + 1\nx = x\n`],
        [`x = (foo(x), x++)`, `foo(x)\nx = x\nx = x + 1\n`],
        [`const y = (foo(x), x++)`, `foo(x)\ny = x\nx = x + 1\n`],
        [`foo((bar(x), x++, x))`, `bar(x)\nx = x + 1\nfoo(x)\n`],
        [`foo((bar(x), ++x, x))`, `bar(x)\nx = x + 1\nfoo(x)\n`],
        [`foo((bar(x), x++))`, `bar(x)\nfoo(x)\nx = x + 1\n`],
        [`foo((bar(x), ++x))`, `bar(x)\nx = x + 1\nfoo(x)\n`],
        // TODO: cases like this go horribly wrong however, we can repeat our logic
        // in repeat, but in order to allow all edge cases, as well as cases that would
        // only be able to be caught at runtime we might want instead to somehow
        // polyfill this comma separator trick via a magic class :/
        // [`foo(bar((baz(x), x++)))`, `baz(x)\nfoo(bar(x))\nx = x + 1\n`],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret comma operator trick using input: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });
  });

  describe("Loops", () => {
    describe("While Loops", () => {
      const tests = [
        [`while (foo) { bar(baz); }`, `while foo:\n    bar(baz)\n\n`],
        [`while (foo) bar(baz);`, `while foo:\n    bar(baz)\n\n`],
        [`while (foo) {}`, `while foo:\n    pass\n\n`],
        [`while (true) {}`, `while True:\n    pass\n\n`],
        [
          `while (a && b) { b = a++ }`,
          `while a and b:\n    b = a\n    a = a + 1\n\n`,
        ],
        [
          `while (a <= b()) { b = foo(x); baz(b) }`,
          `while a <= b():\n    b = foo(x)\n    baz(b)\n\n`,
        ],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret while loop: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });

    describe("Do-While Loops", () => {
      const tests = [
        [
          `do { bar(baz); } while (foo)`,
          `bar(baz)\nwhile foo:\n    bar(baz)\n\n`,
        ],
        [`do {} while (foo)`, `while foo:\n    pass\n\n`],
        [`do {} while (true) {}`, `while True:\n    pass\n\n`],
        [
          `do { b = a++ } while (a && b)`,
          `b = a\na = a + 1\nwhile a and b:\n    b = a\n    a = a + 1\n\n`,
        ],
        [
          `do { b = foo(x); baz(b) } while (a <= b())`,
          `b = foo(x)\nbaz(b)\nwhile a <= b():\n    b = foo(x)\n    baz(b)\n\n`,
        ],
      ];
      tests.forEach(([testInput, testOutput]) => {
        it(`should correctly interpret do-while loop: '${testInput}'`, () => {
          assert.equal(transpile(testInput), testOutput);
        });
      });
    });

    describe("For Loops", () => {
      // TODO: test
    });
  });

  describe("If Statements", () => {
    // TODO: test
  });

  describe("Switch Statements", () => {
    // TODO: code+test
  });

  describe("Function Calls (Simple)", () => {
    const tests = [
      // function calls
      [`foo()`, `foo()\n`],
      [`foo()()`, `foo()()\n`],
      [`(foo())()`, `foo()()\n`],
      [`foo(a)`, `foo(a)\n`],
      // calls of generated functions
      [`foo(a)(b)`, `foo(a)(b)\n`],
      [`(foo(a))(b)`, `foo(a)(b)\n`],
      // multiple arguments
      [`foo(a, b)`, `foo(a, b)\n`],
      // expand arguments
      [`foo(...a)`, `foo(*(a))\n`],
      [`foo(...a, ...b)`, `foo(*(a), *(b))\n`],
      [`foo(...a, x, ...b)`, `foo(*(a), x, *(b))\n`],
    ];
    tests.forEach(([testInput, testOutput]) => {
      it(`should correctly interpret function call: '${testInput}'`, () => {
        assert.equal(transpile(testInput), testOutput);
      });
    });
  });

  describe("Function Calls (Advanced)", () => {
    // TODO: test
  });

  describe("Function Declarations", () => {
    // TODO: code+test
  });

  describe("Arrow Function Declarations", () => {
    // TODO: code+test
  });
});
