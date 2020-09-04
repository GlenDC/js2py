require("./polyfill");

// TODO: check with Python docs
const Precedence = {
  Sequence: 0,
  Yield: 1,
  Assignment: 1,
  Conditional: 2,
  ArrowFunction: 2,
  LogicalOR: 3,
  LogicalAND: 4,
  BitwiseOR: 5,
  BitwiseXOR: 6,
  BitwiseAND: 7,
  Equality: 8,
  Relational: 9,
  BitwiseSHIFT: 10,
  Additive: 11,
  Multiplicative: 12,
  Exponential: 13,
  Prefix: 14,
  Postfix: 15,
  New: 16,
  Call: 17,
  TaggedTemplate: 18,
  Member: 19,
  Primary: 20,
};

const BinaryPrecedence = {
  ",": Precedence.Sequence,
  "||": Precedence.LogicalOR,
  "&&": Precedence.LogicalAND,
  "|": Precedence.BitwiseOR,
  "^": Precedence.BitwiseXOR,
  "&": Precedence.BitwiseAND,
  "==": Precedence.Equality,
  "!=": Precedence.Equality,
  "===": Precedence.Equality,
  "!==": Precedence.Equality,
  "<": Precedence.Relational,
  ">": Precedence.Relational,
  "<=": Precedence.Relational,
  ">=": Precedence.Relational,
  in: Precedence.Relational,
  instanceof: Precedence.Relational,
  "<<": Precedence.BitwiseSHIFT,
  ">>": Precedence.BitwiseSHIFT,
  ">>>": Precedence.BitwiseSHIFT,
  "+": Precedence.Additive,
  "-": Precedence.Additive,
  "*": Precedence.Multiplicative,
  "%": Precedence.Multiplicative,
  "/": Precedence.Multiplicative,
  "**": Precedence.Exponential,
};

function toPythonOp(operator) {
  switch (operator) {
    case "&&":
      return "and";
    case "||":
      return "or";
    case "===":
      return "is";
    case "!==":
      return "is not";
    case ">>>":
      return ">>"; // unsigned right bit shifts are meaningless in Python
    default:
      return operator;
  }
}

function toPythonPrefixOp(operator) {
  switch (operator) {
    case "!":
      return "not";
    default:
      return operator;
  }
}

function GetPrecedence(node) {
  switch (node.type) {
    case "ArrayExpression":
    case "FunctionExpression":
    case "ClassExpression":
    case "IdentifierExpression":
    case "AssignmentTargetIdentifier":
    case "NewTargetExpression":
    case "Super":
    case "LiteralBooleanExpression":
    case "LiteralNullExpression":
    case "LiteralNumericExpression":
    case "LiteralInfinityExpression":
    case "LiteralRegExpExpression":
    case "LiteralStringExpression":
    case "ObjectExpression":
    case "ThisExpression":
    case "SpreadElement":
    case "FunctionBody":
      return Precedence.Primary;

    case "ArrowExpression":
    case "AssignmentExpression":
    case "CompoundAssignmentExpression":
    case "YieldExpression":
    case "YieldGeneratorExpression":
      return Precedence.Assignment;

    case "ConditionalExpression":
      return Precedence.Conditional;

    case "ComputedMemberExpression":
    case "StaticMemberExpression":
    case "ComputedMemberAssignmentTarget":
    case "StaticMemberAssignmentTarget":
      switch (node.object.type) {
        case "CallExpression":
        case "ComputedMemberExpression":
        case "StaticMemberExpression":
        case "TemplateExpression":
          return GetPrecedence(node.object);
        default:
          return Precedence.Member;
      }

    case "TemplateExpression":
      if (node.tag == null) return Precedence.Member;
      switch (node.tag.type) {
        case "CallExpression":
        case "ComputedMemberExpression":
        case "StaticMemberExpression":
        case "TemplateExpression":
          return GetPrecedence(node.tag);
        default:
          return Precedence.Member;
      }

    case "BinaryExpression":
      return BinaryPrecedence[node.operator];

    case "CallExpression":
      return Precedence.Call;
    case "NewExpression":
      return node.arguments.length === 0 ? Precedence.New : Precedence.Member;
    case "UpdateExpression":
      return node.isPrefix ? Precedence.Prefix : Precedence.Postfix;
    case "AwaitExpression":
    case "UnaryExpression":
      return Precedence.Prefix;
    default:
      throw new Error("unreachable: " + node.type);
  }
}

// TODO: find a good way to check if an expression evaluates to an expected:
// - type of token
// - type of token with a specific property set

class Token {
  constructor() {}

  forEach(f) {
    f(this);
  }
}

class StringToken extends Token {
  constructor(str) {
    super();
    this.str = str;
  }

  emit(ts, opts) {
    ts.put(this.str, opts);
  }
}

class RawToken extends StringToken {}

class Identifier extends StringToken {}

class Keyword extends StringToken {}

class LiteralBoolean extends Token {
  constructor(value) {
    super();
    this.value = value ? "True" : "False";
  }

  emit(ts, opts) {
    // TODO: get constructor from scope
    // TODO: call constructor (static from type) instead of using `()` implicitly
    ts.put(`JSBool(${this.value})`, opts);
  }
}

class LiteralNumeric extends Token {
  constructor(x) {
    super();
    this.x = x;
  }

  emit(ts, opts) {
    // TODO: get constructor from scope
    // TODO: call constructor (static from type) instead of using `()` implicitly
    ts.put(`JSNumber(${renderNumber(this.x)})`, opts);
  }
}

function renderNumber(n) {
  let s;
  if (n >= 1e3 && n % 10 === 0) {
    s = n.toString(10);
    if (/[eE]/.test(s)) {
      return s.replace(/[eE]\+/, "e");
    }
    return n.toString(10).replace(/0{3,}$/, (match) => {
      return "e" + match.length;
    });
  } else if (n % 1 === 0) {
    if (n > 1e15 && n < 1e20) {
      return "0x" + n.toString(16).toUpperCase();
    }
    return n.toString(10).replace(/[eE]\+/, "e");
  }
  return n
    .toString(10)
    .replace(/^0\./, ".")
    .replace(/[eE]\+/, "e");
}

class LiteralString extends Token {
  constructor(str, delim, isRaw) {
    super();
    this.str = str;
    this.delim = delim || `'`;
    this.isRaw = !!isRaw;
  }

  emit(ts, opts) {
    // TODO: get constructor from scope
    // TODO: call constructor (static from type) instead of using `()` implicitly
    ts.put(`JSString(`), opts;
    if (this.isRaw) {
      ts.put("r", opts);
    }
    ts.put(this.delim, opts);
    ts.put(
      this.str,
      Object.assign(Object.assign({}, opts), {
        escape: [[this.delim, `\\${this.delim}`]],
      })
    );
    ts.put(this.delim, opts);
    ts.put(`)`, opts);
  }
}

// TODO: check differences between JS Regexp and Python Regexp,
// and ensure that we transform correctly :)
class LiteralRegexp extends Token {
  constructor(
    pattern,
    { dotAll, global, ignoreCase, multiLine, sticky, unicode } = {}
  ) {
    super();
    this.pattern = pattern;

    this.dotAll = !!dotAll;
    this.ignoreCase = !!ignoreCase;
    this.multiLine = !!multiLine;

    // ignored, but should probably be used somehow in to define what function to use...
    this.global = !!global;

    // ignored
    this.sticky = !!sticky;
    this.unicode = !!unicode;
  }

  emit(ts, opts) {
    ts.put('re.compile(r"', opts);
    ts.put(this.pattern.replace(/"/g, '\\"'), opts);
    ts.put('"', opts);
    const regOpts = [];
    if (this.dotAll) {
      regOpts.push("re.DOTALL");
    }
    if (this.ignoreCase) {
      regOpts.push("re.IGNORECASE");
    }
    if (this.multiLine) {
      regOpts.push("re.MULTILINE");
    }
    regOpts.forEach((opt) => ts.put(`, ${opt}`, opts));
    ts.put(")", opts);
  }
}

class RawTuple extends Token {
  constructor(...expressions) {
    super();
    this.expressions = (expressions || []).flat();
  }

  emit(ts, opts) {
    ts.put("(", opts);
    if (this.expressions.length > 0) {
      for (let i = 0; i < this.expressions.length - 1; i++) {
        this.expressions[i].emit(ts, opts);
        ts.put(", ", opts);
      }
      this.expressions[this.expressions.length - 1].emit(ts, opts);
    }
    ts.put(")", opts);
  }
}

class Line extends Token {
  constructor(...statements) {
    super();
    this.statements = (statements || []).flat();
  }

  emit(ts, opts) {
    if (this.statements.length > 0) {
      ts.putIndention(opts);
      this.statements.forEach((x) => x.emit(ts, opts));
    }
    ts.putEOL(opts);
  }
}

class Block extends Token {
  // TODO:
  // - scoping
  constructor(...lines) {
    super();
    this.lines = (lines || []).flat().filter((line) => {
      return !(line instanceof Block && line.lines.length === 0);
    });
    this.isTopLevel = false;
  }

  emit(ts, opts = {}) {
    if (this.lines.length > 0) {
      this.lines.forEach((line) => {
        if (!(line instanceof Line) && !(line instanceof Block)) {
          line = new Line(line);
        }
        line.emit(ts, opts);
      });
    } else if (!this.isTopLevel) {
      new Line(new Keyword("pass")).emit(ts, opts);
    }
  }
}

class TemplateExpression extends Token {
  constructor(...children) {
    super();
    this.children = (children || []).flat();
  }

  emit(ts, opts) {
    let delim = `"`;
    if (
      this.children.some(
        (child) => child instanceof RawToken && /\r|\n/.exec(child.str)
      )
    ) {
      delim = `"""`;
    }
    const childEscapePairs = [[/"/g, `\\"`]];
    if (this.children.some((child) => !(child instanceof RawToken))) {
      ts.put("f", opts);
      childEscapePairs.push([/\{/g, "{{"], [/\}/g, "}}"]);
    }
    ts.put(delim, opts);
    this.children.forEach((child) => {
      if (child instanceof RawToken) {
        child.emit(
          ts,
          Object.assign(Object.assign({}, opts), {
            escape: childEscapePairs,
          }),
          opts
        );
      } else {
        ts.put("{", opts);
        child.emit(ts, opts);
        ts.put("}", opts);
      }
    });
    ts.put(delim, opts);
  }
}

class CallExpression extends Token {
  constructor(callee, ...args) {
    super();
    this.callee = callee;
    this.arguments = (args || []).flat();
  }

  emit(ts, opts) {
    const postElements = [];
    const args = [];
    for (let i = 0; i < this.arguments.length; ++i) {
      if (this.arguments[i] instanceof ByOneOperation) {
        if (this.arguments[i].isPrefix) {
          this.arguments[i].emit(ts, opts);
          ts.putEOL(opts);
          ts.putIndention(opts);
        } else {
          postElements.push(this.arguments[i].toAssignment());
        }
        args.push(this.arguments[i].operand);
      } else {
        args.push(this.arguments[i]);
      }
    }

    // emit the callee, init arguments will already have been added
    this.callee.emit(ts, opts);
    // and the modified arguments
    new RawTuple(...args).emit(ts, opts);

    // draw all post elements
    postElements.forEach((element) => {
      ts.putEOL(opts);
      ts.putIndention(opts);
      element.emit(ts, opts);
    });
  }
}

class PropertyGetterExpression extends Token {
  constructor(obj, id) {
    super();
    this.obj = obj;
    this.id = id;
  }

  emit(ts, opts) {
    this.obj.emit(ts, opts);
    ts.put(".", opts);
    this.id.emit(ts, opts);
  }
}

class PrefixOperation extends Token {
  constructor(operator, expression) {
    super();
    this.operator = toPythonPrefixOp(operator);
    this.expression = expression;
  }

  emit(ts, opts) {
    ts.put(this.operator, opts);
    // parentheses aren't always required,
    // but they are always accepted in Python,
    // so better safe than sorry
    ts.put("(", opts);
    this.expression.emit(ts, opts);
    ts.put(")", opts);
  }
}

class InfixOperation extends Token {
  constructor(operator, left, right) {
    super();
    this.operator = toPythonOp(operator);
    this.left = left;
    this.right = right;
  }

  emit(ts, opts) {
    this.left.emit(ts, opts);
    if (this.operator !== ",") {
      ts.put(" ", opts);
    }
    ts.put(`${this.operator} `, opts);
    this.right.emit(ts, opts);
  }
}

class Assignment extends InfixOperation {
  constructor(left, right) {
    super("=", left, right);
  }

  emit(ts, opts) {
    if (this.right instanceof ByOneOperation) {
      const statements = [
        this.right,
        new Assignment(this.left, this.right.operand),
      ];
      if (!this.right.isPrefix) {
        statements.reverse();
      }
      statements[0].emit(ts, opts);
      // we never want to indent first statement in this case,
      // either not needed, if top-level,
      // or already done by parent (block)
      ts.putEOL(opts);
      // EOL at the end will be put by parent (block);
      ts.putIndention(opts);
      statements[1].emit(ts, opts);
    } else {
      this.left.emit(ts, opts);
      if (this.operator !== ",") {
        ts.put(" ", opts);
      }
      ts.put(`${this.operator} `, opts);
      this.right.emit(ts, opts);
    }
  }
}

class ByOneOperation extends Token {
  // NOTE: only in the case of being used as the right side of an assignment,
  // does the difference between prefix and suffix mode matter
  constructor(operator, operand, isPrefix) {
    super();
    if (operator !== "+" && operator !== "-") {
      throw `invalid by-one operation operator "${operator}"`;
    }
    this.operator = operator;
    this.operand = operand;
    this.isPrefix = isPrefix;
  }

  emit(ts, opts) {
    this.toAssignment().emit(ts, opts);
  }

  toAssignment() {
    return new Assignment(
      this.operand,
      new InfixOperation(this.operator, this.operand, new LiteralNumeric(1))
    );
  }
}

class Comment extends Token {
  constructor(str) {
    super();
    this.str = str;
  }

  emit(ts, opts) {
    ts.put(`# ${this.str}`, opts);
  }
}

class MultiLineComment extends Token {
  constructor(...lines) {
    super();
    this.lines = (lines || []).flat();
  }

  emit(ts, opts) {
    const delim = new Line(new RawToken(`"""`));
    delim.emit(ts, opts);
    this.lines.forEach((line) => {
      new Line(new RawToken(line)).emit(ts, opts);
    });
    delim.emit(ts, opts);
    // to make more python, add extra EOL
    ts.putEOL();
  }
}

class ImportStatement extends Token {
  constructor(moduleName, { alias, children } = {}) {
    super();
    this.moduleName = moduleName;
    if (children && alias) {
      throw "cannot use alias when using children";
    }
    this.children = children;
    this.alias = alias;
  }

  emit(ts, opts) {
    if (this.children) {
      new Line(
        new RawToken(
          `from ${this.moduleName} import ${this.children.join(", ")}`
        )
      ).emit(ts, opts);
      return;
    }
    const statements = [new RawToken(`import ${this.moduleName}`)];
    if (this.alias) {
      statements.push(new RawToken(` as ${this.alias}`));
    }
    new Line(...statements).emit(ts, opts);
  }
}

class WhileExpression extends Token {
  constructor(test, body) {
    super();
    this.test = test;
    this.body = body instanceof Block ? body : new Block([body]);
  }

  emit(ts, opts) {
    ts.put("while ", opts);
    this.test.emit(ts, opts);
    ts.put(":", opts);
    ts.putEOL();
    this.body.emit(
      ts,
      Object.assign(Object.assign({}, opts), {
        lineIndention: (opts.lineIndention || 0) + (this.isTopLevel ? 0 : 1),
      })
    );
  }
}

class IfExpression extends Token {
  constructor(test, consequent, alternate) {
    super();
    this.test = test;
    this.consequent =
      consequent instanceof Block ? consequent : new Block([consequent]);
    this.alternate = alternate;
    if (
      alternate &&
      !(this.alternate instanceof IfExpression) &&
      !(this.alternate instanceof IfExpression)
    ) {
      this.alternate = new Block([this.alternate]);
    }
  }

  emit(ts, opts) {
    this._emitConsequent(ts, opts);
    this._emitAlternate(ts, opts);
  }

  _emitConsequent(ts, opts = {}) {
    if (opts.isAlternateOfIfExpression) {
      new Line(new RawToken(`elif `), this.test, new RawToken(":")).emit(
        ts,
        opts
      );
    } else {
      ts.put("if ", opts);
      this.test.emit(ts, opts);
      ts.put(":", opts);
      ts.putEOL(opts);
    }
    this.consequent.emit(
      ts,
      Object.assign(Object.assign({}, opts), {
        lineIndention: (opts.lineIndention || 0) + 1,
        isAlternateOfIfExpression: false,
      })
    );
  }

  _emitAlternate(ts, opts) {
    // if we have nothing to do, ..., do nothing ;)
    if (!this.alternate) {
      return;
    }

    // collapse the code a bit in case the alternate token is
    // a chained if expression, not needed, but easy enough, so why not
    if (this.alternate instanceof IfExpression) {
      this.alternate.emit(
        ts,
        Object.assign(Object.assign({}, opts), {
          isAlternateOfIfExpression: true,
        })
      );
      return;
    }

    new Line(new RawToken("else:")).emit(ts, opts);
    this.alternate.emit(
      ts,
      Object.assign(Object.assign({}, opts), {
        lineIndention: (opts.lineIndention || 0) + 1,
        isAlternateOfIfExpression: true,
      })
    );
  }
}

class TODO extends Token {
  constructor(element, reduceFunc) {
    super();
    this.element = element;
    this.reduceFunc = reduceFunc;
  }

  emit(ts, opts) {
    ts.put(
      `raise Exception("TODO: support token '${this.element.result}' via '${this.reduceFunc}'")`
    );
  }
}

const PyNaN = new CallExpression(
  // TODO: use and get constructed object from (global) scope
  new Identifier("JSNaN")
);
const PyInf = new CallExpression(
  // TODO: use and get constructed object from (global) scope
  // TODO: support negated Infinity
  new Identifier("JSInfinity")
);

// TODO: use and get constructed object from (global) scope
const PyNone = new CallExpression(new Identifier("JSUndefined"));

const PyEmpty = new RawToken("");

module.exports = {
  // Base Types
  Token,
  StringToken,
  RawToken,

  // Primitive Types
  LiteralBoolean,
  LiteralNumeric,
  LiteralString,
  LiteralRegexp,

  // Branch Types
  IfExpression,

  // Loop Types
  WhileExpression,

  // Expression Types
  PrefixOperation, // AKA Unary Operations
  InfixOperation, // AKA binary operations
  ByOneOperation, // ++ / --
  Assignment,
  CallExpression,
  PropertyGetterExpression,
  TemplateExpression,

  // Reference Related Types
  Identifier,

  // Scope Types
  Block,

  // Special Types
  PyNaN,
  PyInf,
  PyNone,
  PyEmpty,

  // Other Types
  Comment,
  MultiLineComment,
  ImportStatement,
  Keyword,
  Line,
  RawTuple,

  // Temporary
  TODO,

  // Token Utilities
  GetPrecedence,
};
