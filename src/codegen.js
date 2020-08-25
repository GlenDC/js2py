const { TokenStream } = require("./token-stream");
const { default: codeGen, FormattedCodeGen } = require("shift-codegen");
const { version: projectVersion } = require("../package.json");

// some polyfill stuff
if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, "flat", {
    value: function (depth = 8192, stack = []) {
      for (let item of this) {
        if (item instanceof Array && depth > 0) {
          item.flat(depth - 1, stack);
        } else {
          stack.push(item);
        }
      }

      return stack;
    },
  });
}

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

function getPrecedence(node) {
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
          return getPrecedence(node.object);
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
          return getPrecedence(node.tag);
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

function rawTupleIfNeeded(node, precedence, a) {
  return getPrecedence(node) < precedence ? new RawTuple(a) : a;
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

class LiteralBoolean extends StringToken {
  constructor(value) {
    super(value ? "True" : "False");
  }
}

class LiteralNumeric extends Token {
  constructor(x) {
    super();
    this.x = x;
  }

  emit(ts, opts) {
    ts.putNumber(this.x, opts);
  }
}

class LiteralString extends Token {
  constructor(str, delim, isRaw) {
    super();
    this.str = str;
    this.delim = delim || `'`;
    this.isRaw = !!isRaw;
  }

  emit(ts, opts) {
    if (this.isRaw) {
      ts.put("r", opts);
    }
    ts.put(`${this.delim}${this.str}${this.delim}`, opts);
  }
}

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
    const opts = [];
    if (this.dotAll) {
      opts.push("re.DOTALL");
    }
    if (this.ignoreCase) {
      opts.push("re.IGNORECASE");
    }
    if (this.multiLine) {
      opts.push("re.MULTILINE");
    }
    opts.forEach((opt) => ts.put(`, ${opt}`, opts));
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
    const childEscapePairs = [[/"/g, `\"`]];
    if (this.children.some((child) => !(child instanceof RawToken))) {
      ts.put("f", opts);
      childEscapePairs.push([/\{/g, "{{"], [/\}/g, "}}"]);
    }
    ts.put(delim, opts);
    this.children.forEach((child) => {
      if (child instanceof RawToken) {
        child.emit(
          ts,
          {
            escape: childEscapePairs,
          },
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
    this.arguments = new RawTuple(...args);
  }

  emit(ts, opts) {
    this.callee.emit(ts, opts);
    this.arguments.emit(ts, opts);
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
    new Assignment(
      this.operand,
      new InfixOperation(this.operator, this.operand, new LiteralNumeric(1))
    ).emit(ts, opts);
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
    this.body = body;
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
    this.consequent = consequent;
    this.alternate = alternate;
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

const pyNaN = new CallExpression(
  new Identifier("float"),
  new LiteralString("nan")
);
const pyInf = new CallExpression(
  new Identifier("float"),
  new LiteralString("+Inf")
);

const pyNone = new Identifier("None");

const pyEmpty = new RawToken("");

class PyCodeGen {
  constructor({ topLevelComment } = {}) {
    this.ignoreConsoleCalls = true; // hardcoded for now, would require polyfill if desired

    // a top level comment to indicate we generated it,
    // and including the original javascript code (or at least the one generated
    // from the AST that we used)
    this.topLevelComment = !!topLevelComment;

    // used for top-level std imports (e.g. re)
    this.importedModules = new Set();
  }

  // parenToAvoidBeingDirective(element, original) {
  //   if (
  //     element &&
  //     element.type === "ExpressionStatement" &&
  //     element.expression.type === "LiteralStringExpression"
  //   ) {
  //     return new Line(new RawTuple(original.children[0]));
  //   }
  //   return original;
  // }

  reduceArrayAssignmentTarget(node, elements) {
    return new TODO(node, "reduceArrayAssignmentTarget");
  }

  reduceArrayBinding(node, elements) {
    return new TODO(node, "reduceArrayBinding");
  }

  reduceArrayExpression(node, elements) {
    return new TODO(node, "reduceArrayExpression");
  }

  reduceArrowExpression(node, elements) {
    return new TODO(node, "reduceArrowExpression");
  }

  reduceAssignmentExpression(node, { binding, expression }) {
    return new Assignment(binding, expression);
  }

  reduceAssignmentTargetIdentifier(node) {
    return new Identifier(node.name);
  }

  reduceAssignmentTargetPropertyIdentifier(node, elements) {
    return new TODO(node, "reduceAssignmentTargetPropertyIdentifier");
  }

  reduceAssignmentTargetPropertyProperty(node, elements) {
    return new TODO(node, "reduceAssignmentTargetPropertyProperty");
  }

  reduceAssignmentTargetWithDefault(node, elements) {
    return new TODO(node, "reduceAssignmentTargetWithDefault");
  }

  reduceAwaitExpression(node, elements) {
    return new TODO(node, "reduceAwaitExpression");
  }

  reduceBinaryExpression(node, { left, right }) {
    let leftCode = left;
    let rightCode = right;

    // some corrections based on the operator,
    // I have a feeling we might need to refactor this out eventually,
    // as it could become very hairy and long
    switch (node.operator) {
      case "+":
        // TODO: will need more complicated logic eventually,
        // to also take into account anything that would evaluate to...
        if (
          (leftCode instanceof LiteralString ||
            leftCode instanceof TemplateExpression) &&
          rightCode instanceof LiteralNumeric
        ) {
          rightCode = new CallExpression(new Identifier("str"), rightCode);
        } else if (
          leftCode instanceof LiteralNumeric &&
          (rightCode instanceof LiteralString ||
            rightCode instanceof TemplateExpression)
        ) {
          leftCode = new CallExpression(new Identifier("str"), leftCode);
        }
      case "-":
        if (
          (leftCode instanceof LiteralString ||
            leftCode instanceof TemplateExpression) &&
          rightCode instanceof LiteralNumeric
        ) {
          return pyNaN;
        } else if (
          leftCode instanceof LiteralNumeric &&
          (rightCode instanceof LiteralString ||
            rightCode instanceof TemplateExpression)
        ) {
          return pyNaN;
        }
    }

    let isRightAssociative = node.operator === "**";
    if (
      getPrecedence(node.left) < getPrecedence(node) ||
      (isRightAssociative &&
        (getPrecedence(node.left) === getPrecedence(node) ||
          node.left.type === "UnaryExpression"))
    ) {
      leftCode = new RawTuple(leftCode);
    }
    if (
      getPrecedence(node.right) < getPrecedence(node) ||
      (!isRightAssociative && getPrecedence(node.right) === getPrecedence(node))
    ) {
      rightCode = new RawTuple(rightCode);
    }

    return new InfixOperation(node.operator, leftCode, rightCode);
  }

  reduceBindingIdentifier(node) {
    return new Identifier(node.name);
  }

  reduceBindingPropertyIdentifier(node, elements) {
    return new TODO(node, "reduceBindingPropertyIdentifier");
  }

  reduceBindingPropertyProperty(node, elements) {
    return new TODO(node, "reduceBindingPropertyProperty");
  }

  reduceBindingWithDefault(node, elements) {
    return new TODO(node, "reduceBindingWithDefault");
  }

  reduceBlock(node, { statements }) {
    return new Block(...statements);
  }

  reduceBlockStatement(node, { block }) {
    return block;
  }

  reduceBreakStatement(node, elements) {
    return new TODO(node, "reduceBreakStatement");
  }

  reduceCallExpression(node, { callee, arguments: args }) {
    // TODO: support ignore console calls better,
    // as aliasing and other indirect uses of console will still fail...
    const callExpression = new CallExpression(callee, args);
    if (
      this.ignoreConsoleCalls &&
      (callee.str == "console" || (callee.obj && callee.obj.str === "console"))
    ) {
      const ts = new TokenStream();
      callExpression.emit(ts);
      return new Comment(`code removed by js2py: ${ts.result}`);
    }
    return callExpression;
  }

  reduceCatchClause(node, elements) {
    return new TODO(node, "reduceCatchClause");
  }

  reduceClassDeclaration(node, elements) {
    return new TODO(node, "reduceClassDeclaration");
  }

  reduceClassElement(node, elements) {
    return new TODO(node, "reduceClassElement");
  }

  reduceClassExpression(node, elements) {
    return new TODO(node, "reduceClassExpression");
  }

  reduceCompoundAssignmentExpression(node, { binding, expression }) {
    // to keep things simple, use a regular assignment + infix operation
    return new Assignment(
      binding,
      new InfixOperation(node.operator.slice(0, -1), binding, expression)
    );
  }

  reduceComputedMemberAssignmentTarget(node, elements) {
    return new TODO(node, "reduceComputedMemberAssignmentTarget");
  }

  reduceComputedMemberExpression(node, elements) {
    return new TODO(node, "reduceComputedMemberExpression");
  }

  reduceComputedPropertyName(node, elements) {
    return new TODO(node, "reduceComputedPropertyName");
  }

  reduceConditionalExpression(node, elements) {
    return new TODO(node, "reduceConditionalExpression");
  }

  reduceContinueStatement(node, elements) {
    return new TODO(node, "reduceContinueStatement");
  }

  reduceDataProperty(node, elements) {
    return new TODO(node, "reduceDataProperty");
  }

  reduceDebuggerStatement(node, elements) {
    return new TODO(node, "reduceDebuggerStatement");
  }

  reduceDirective(node) {
    const delim = node.rawValue.match(/(^|[^\\])(\\\\)*"/) ? "'" : '"';
    return new LiteralString(node.rawValue, delim);
  }

  reduceDoWhileStatement(node, { body, test }) {
    return [body, new WhileExpression(test, body)];
  }

  reduceEmptyStatement(node, elements) {
    return pyEmpty;
  }

  reduceExport(node, elements) {
    return new TODO(node, "reduceExport");
  }

  reduceExportAllFrom(node, elements) {
    return new TODO(node, "reduceExportAllFrom");
  }

  reduceExportDefault(node, elements) {
    return new TODO(node, "reduceExportDefault");
  }

  reduceExportFrom(node, elements) {
    return new TODO(node, "reduceExportFrom");
  }

  reduceExportFromSpecifier(node, elements) {
    return new TODO(node, "reduceExportFromSpecifier");
  }

  reduceExportLocalSpecifier(node, elements) {
    return new TODO(node, "reduceExportLocalSpecifier");
  }

  reduceExportLocals(node, elements) {
    return new TODO(node, "reduceExportLocals");
  }

  reduceExpressionStatement(node, { expression }) {
    return expression;
  }

  reduceForAwaitStatement(node, elements) {
    return new TODO(node, "reduceForAwaitStatement");
  }

  reduceForInStatement(node, elements) {
    return new TODO(node, "reduceForInStatement");
  }

  reduceForOfStatement(node, elements) {
    return new TODO(node, "reduceForOfStatement");
  }

  reduceForStatement(node, { init, test, update, body }) {
    if (update) {
      body.lines.push(update);
    }
    const whileExpr = new WhileExpression(test, body);
    return init ? [init, whileExpr] : whileExpr;
  }

  reduceFormalParameters(node, elements) {
    return new TODO(node, "reduceFormalParameters");
  }

  reduceFunctionBody(node, elements) {
    return new TODO(node, "reduceFunctionBody");
  }

  reduceFunctionDeclaration(node, elements) {
    return new TODO(node, "reduceFunctionDeclaration");
  }

  reduceFunctionExpression(node, elements) {
    return new TODO(node, "reduceFunctionExpression");
  }

  reduceGetter(node, elements) {
    return new TODO(node, "reduceGetter");
  }

  reduceIdentifierExpression(node, elements) {
    // TODO: what if name is `let, const, ...`???
    if (node.name === "undefined") {
      return pyNone;
    }
    if (node.name === "Infinity") {
      return pyInf;
    }
    if (node.name === "NaN") {
      return pyNaN;
    }
    return new Identifier(node.name);
  }

  reduceIfStatement(node, { test, consequent, alternate }) {
    return new IfExpression(test, consequent, alternate);
  }

  reduceImport(node, elements) {
    return new TODO(node, "reduceImport");
  }

  reduceImportNamespace(node, elements) {
    return new TODO(node, "reduceImportNamespace");
  }

  reduceImportSpecifier(node, elements) {
    return new TODO(node, "reduceImportSpecifier");
  }

  reduceLabeledStatement(node, elements) {
    return new TODO(node, "reduceLabeledStatement");
  }

  reduceLiteralBooleanExpression(node) {
    return new LiteralBoolean(node.value);
  }

  reduceLiteralInfinityExpression() {
    return pyInf;
  }

  reduceLiteralNullExpression() {
    return pyNone;
  }

  reduceLiteralNumericExpression(node) {
    return new LiteralNumeric(node.value);
  }

  reduceLiteralRegExpExpression(node) {
    this.importedModules.add("re"); // mark our now dependency on the std re pkg
    return new LiteralRegexp(
      node.pattern,
      node // used for opts
    );
  }

  reduceLiteralStringExpression(node, elements) {
    return new LiteralString(node.rawValue, delim, true);
  }

  reduceMethod(node, elements) {
    return new TODO(node, "reduceMethod");
  }

  reduceModule(node, elements) {
    return new TODO(node, "reduceModule");
  }

  reduceNewExpression(node, elements) {
    return new TODO(node, "reduceNewExpression");
  }

  reduceNewTargetExpression(node, elements) {
    return new TODO(node, "reduceNewTargetExpression");
  }

  reduceObjectAssignmentTarget(node, elements) {
    return new TODO(node, "reduceObjectAssignmentTarget");
  }

  reduceObjectBinding(node, elements) {
    return new TODO(node, "reduceObjectBinding");
  }

  reduceObjectExpression(node, elements) {
    return new TODO(node, "reduceObjectExpression");
  }

  reduceReturnStatement(node, elements) {
    return new TODO(node, "reduceReturnStatement");
  }

  reduceScript(node, { directives, statements }) {
    // if (statements.length) {
    //   statements[0] = this.parenToAvoidBeingDirective(
    //     node.statements[0],
    //     statements[0]
    //   );
    // }

    const commentStatements = [];
    if (this.topLevelComment) {
      const programSource = codeGen(node, new FormattedCodeGen());
      commentStatements.push(
        new MultiLineComment(
          `DO NOT EDIT — Code generated by py2js v${projectVersion} on ${new Date(
            new Date()
          ).toISOString()}`,
          "",
          "input script:",
          "```javascript",
          programSource,
          "```"
        )
      );
    }

    const importStatements = [];
    this.importedModules.forEach((importedModule) => {
      importStatements.push(new ImportStatement(importedModule));
    });
    if (importStatements.length > 0) {
      importStatements.push(new Line(), new Line()); // as to make it a bit more Pythonic
    }

    const block = new Block(
      ...commentStatements,
      ...importStatements,
      ...directives,
      ...statements
    );
    block.isTopLevel = true;
    return block;
  }

  reduceSetter(node, elements) {
    return new TODO(node, "reduceSetter");
  }

  reduceShorthandProperty(node, elements) {
    return new TODO(node, "reduceShorthandProperty");
  }

  reduceSpreadElement(node, { expression }) {
    // easy solution for now, we can make this more complicated if needed
    return new PrefixOperation("*", expression);
  }

  reduceSpreadProperty(node, elements) {
    return new TODO(node, "reduceSpreadProperty");
  }

  reduceStaticMemberAssignmentTarget(node, elements) {
    return new TODO(node, "reduceStaticMemberAssignmentTarget");
  }

  reduceStaticMemberExpression(node, { object }) {
    return new PropertyGetterExpression(
      rawTupleIfNeeded(node.object, getPrecedence(node), object),
      new Identifier(node.property)
    );
  }

  reduceStaticPropertyName(node, elements) {
    return new TODO(node, "reduceStaticPropertyName");
  }

  reduceSuper(node, elements) {
    return new TODO(node, "reduceSuper");
  }

  reduceSwitchCase(node, elements) {
    return new TODO(node, "reduceSwitchCase");
  }

  reduceSwitchDefault(node, elements) {
    return new TODO(node, "reduceSwitchDefault");
  }

  reduceSwitchStatement(node, elements) {
    return new TODO(node, "reduceSwitchStatement");
  }

  reduceSwitchStatementWithDefault(node, elements) {
    return new TODO(node, "reduceSwitchStatementWithDefault");
  }

  reduceTemplateElement(node, elements) {
    return new RawToken(node.rawValue);
  }

  reduceTemplateExpression(node, { tag, elements }) {
    return new TemplateExpression(...elements);
  }

  reduceThisExpression(node, elements) {
    return new TODO(node, "reduceThisExpression");
  }

  reduceThrowStatement(node, elements) {
    return new TODO(node, "reduceThrowStatement");
  }

  reduceTryCatchStatement(node, elements) {
    return new TODO(node, "reduceTryCatchStatement");
  }

  reduceTryFinallyStatement(node, elements) {
    return new TODO(node, "reduceTryFinallyStatement");
  }

  reduceUnaryExpression(node, { operand }) {
    return new PrefixOperation(node.operator, operand);
  }

  reduceUpdateExpression(node, { operand }) {
    switch (node.operator) {
      case "++":
        return new ByOneOperation("+", operand, node.isPrefix);
      case "--":
        return new ByOneOperation("-", operand, node.isPrefix);
      default:
        throw `invalid update expression operator '${node.operator}'`;
    }
  }

  reduceVariableDeclaration(node, { declarators }) {
    const elements = [];
    declarators.forEach((declarator) => {
      elements.push(new Line(declarator));
    });
    return elements; // NOTE: need to be flattened somewhere in callee
  }

  reduceVariableDeclarationStatement(node, { declaration }) {
    return declaration;
  }

  reduceVariableDeclarator(node, { binding, init }) {
    if (init === null) {
      init = pyNone;
    }
    // ---------------
    // as to emulate JS's behaviour of this silly comma-abuse, poor little comma
    function flatten(element) {
      let elements = [];
      let startElement = element;
      while (
        startElement instanceof RawTuple &&
        startElement.expressions.length === 1
      ) {
        startElement = startElement.expressions[0];
      }
      if (
        startElement instanceof InfixOperation &&
        startElement.operator === ","
      ) {
        // handle left element(s)
        let innerElement = startElement.left;
        while (
          innerElement instanceof InfixOperation &&
          innerElement.operator == ","
        ) {
          const [recElements, recElement] = flatten(innerElement.right);
          elements.unshift(new Line(recElement));
          if (recElements.length > 0) {
            elements.unshift(recElements);
          }
          innerElement = innerElement.left;
        }
        elements.unshift(new Line(innerElement));
        // handle right element(s)
        let [rightElements, rightElement] = flatten(startElement.right);
        while (rightElements.length > 0) {
          elements.push(rightElements);
          [rightElements, rightElement] = flatten(rightElement);
        }
        element = rightElement;
      }
      return [elements, element];
    }
    let [elements, initToBind] = flatten(init);
    elements = elements.flat();
    // ------------
    elements.push(new Assignment(binding, initToBind));
    return elements;
  }

  reduceWhileStatement(node, { test, body }) {
    return new WhileExpression(test, body);
  }

  reduceWithStatement(node, elements) {
    return new TODO(node, "reduceWithStatement");
  }

  reduceYieldExpression(node, elements) {
    return new TODO(node, "reduceYieldExpression");
  }

  reduceYieldGeneratorExpression(node, elements) {
    return new TODO(node, "reduceYieldGeneratorExpression");
  }
}

function escapeStringLiteral(stringValue) {
  let result = "";
  let nSingle = 0,
    nDouble = 0;
  for (let i = 0, l = stringValue.length; i < l; ++i) {
    let ch = stringValue[i];
    if (ch === '"') {
      ++nDouble;
    } else if (ch === "'") {
      ++nSingle;
    }
  }
  let delim = nDouble > nSingle ? "'" : '"';
  result += delim;
  for (let i = 0; i < stringValue.length; i++) {
    let ch = stringValue.charAt(i);
    switch (ch) {
      case delim:
        result += "\\" + delim;
        break;
      case "\n":
        result += "\\n";
        break;
      case "\r":
        result += "\\r";
        break;
      case "\\":
        result += "\\\\";
        break;
      case "\u2028":
        result += "\\u2028";
        break;
      case "\u2029":
        result += "\\u2029";
        break;
      default:
        result += ch;
        break;
    }
  }
  result += delim;
  return result;
}

exports.PyCodeGen = PyCodeGen;
