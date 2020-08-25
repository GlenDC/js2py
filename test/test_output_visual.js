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
      // TODO: test
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
      // TODO: test; x = (x++, x);
    });
  });

  describe("Loops", () => {
    describe("While Loops", () => {
      // TODO: test
    });

    describe("Do-While Loops", () => {
      // TODO: test
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
    // TODO: test
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
