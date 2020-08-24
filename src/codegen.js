const { TokenStream } = require("./token-stream");

// some polyfill stuff
if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, "flat", {
    value: function (depth = 1, stack = []) {
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

class RawToken extends Token {
  constructor(str) {
    super();
    this.str = str;
  }

  emit(ts) {
    ts.put(this.str);
  }
}

class Identifier extends RawToken {}

class None extends RawToken {
  constructor() {
    super("None");
  }
}

class LiteralBoolean extends RawToken {
  constructor(value) {
    super(value ? "True" : "False");
  }
}

class LiteralNumeric extends Token {
  constructor(x) {
    super();
    this.x = x;
  }

  emit(ts) {
    ts.putNumber(this.x);
  }
}

class LiteralString extends Token {
  constructor(str, delim) {
    super();
    this.str = str;
    this.delim = delim || `'`;
  }

  emit(ts) {
    ts.put(`${this.delim}${this.str}${this.delim}`);
  }
}

class RawTuple extends Token {
  constructor(...expressions) {
    super();
    this.expressions = (expressions || []).flat();
  }

  emit(ts) {
    ts.put("(");
    if (this.expressions.length > 0) {
      for (let i = 0; i < this.expressions.length - 1; i++) {
        this.expressions[i].emit(ts);
        ts.put(", ");
      }
      this.expressions[this.expressions.length - 1].emit(ts);
    }
    ts.put(")");
  }
}

class Line extends Token {
  constructor(...statements) {
    super();
    this.statements = (statements || []).flat();
  }

  emit(ts) {
    this.statements.forEach((x) => x.emit(ts));
    ts.putEOL();
  }
}

class Block extends Token {
  // TODO:
  // - scoping
  // - indention
  constructor(...lines) {
    super();
    this.lines = (lines || []).flat();
  }

  emit(ts) {
    this.forEach((x) => x.emit(ts));
  }

  forEach(f) {
    this.lines.forEach((x) => x.forEach(f));
  }
}

class TemplateExpression extends Token {
  constructor(...children) {
    super();
    this.children = (children || []).flat();
  }

  emit(ts) {
    if (this.children.some((child) => child instanceof Identifier)) {
      ts.put("f");
    }
    ts.put(`"`);
    this.children.forEach((child) => {
      if (child instanceof Identifier) {
        ts.put("{");
        child.emit(ts);
        ts.put("}");
      } else {
        child.emit(ts);
      }
    });
    ts.put(`"`);
  }
}

class CallExpression extends Token {
  constructor(callee, ...args) {
    super();
    this.callee = callee;
    this.arguments = new RawTuple(...args);
  }

  emit(ts) {
    this.callee.emit(ts);
    this.arguments.emit(ts);
  }
}

class PropertyGetterExpression extends Token {
  constructor(obj, id) {
    super();
    this.obj = obj;
    this.id = id;
  }

  emit(ts) {
    this.obj.emit(ts);
    ts.put(".");
    this.id.emit(ts);
  }
}

class PrefixOperation extends Token {
  constructor(operator, expression) {
    super();
    this.operator = toPythonPrefixOp(operator);
    this.expression = expression;
  }

  emit(ts) {
    ts.put(this.operator);
    // parentheses aren't always required,
    // but they are always accepted in Python,
    // so better safe than sorry
    ts.put("(");
    this.expression.emit(ts);
    ts.put(")");
  }
}

class InfixOperation extends Token {
  constructor(operator, left, right) {
    super();
    this.operator = toPythonOp(operator);
    this.left = left;
    this.right = right;
  }

  emit(ts) {
    this.left.emit(ts);
    if (this.operator !== ",") {
      ts.put(" ");
    }
    ts.put(`${this.operator} `);
    this.right.emit(ts);
  }
}

class Assignment extends InfixOperation {
  constructor(left, right) {
    super("=", left, right);
  }
}

class Comment extends Token {
  constructor(str) {
    super();
    this.str = str;
  }

  emit(ts) {
    ts.put(`# ${this.str}`);
  }
}

class ImportStatement extends Token {
  constructor(moduleName, { alias, children } = {}) {
    super();
    this.moduleName = moduleName;
    if (children && alias) {
      throw 'cannot use alias when using children';
    }
    this.children = children;
    this.alias = alias;
  }

  emit(ts) {
    if (this.children) {
      ts.put(`from ${this.moduleName} import ${this.children.join(", ")}`);
      return;
    }
    ts.put(`import ${this.moduleName}`);
    if (this.alias) {
      ts.put(` as ${this.alias}`);
    }
  }
}

class TODO extends Token {
  constructor(element, reduceFunc) {
    super();
    this.element = element;
    this.reduceFunc = reduceFunc;
  }

  emit(ts) {
    ts.put(
      `raise Exception("TODO: support token '${this.element.result}' via '${this.reduceFunc}'")\n`
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

class PyCodeGen {
  constructor({ ignoreConsoleCalls } = {}) {
    this.ignoreConsoleCalls = ignoreConsoleCalls ? true : false;
    this.importedModules = new Set();
    this.polyfillExpressions = new Set();
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
    if (this.ignoreConsoleCalls && (callee.str == "console" || (callee.obj && callee.obj.str === "console"))) {
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
    return new LiteralString(node.rawValue, delim); // TODO: does this need a Line?
  }

  reduceDoWhileStatement(node, elements) {
    return new TODO(node, "reduceDoWhileStatement");
  }

  reduceEmptyStatement(node, elements) {
    return new TODO(node, "reduceEmptyStatement");
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
    return new Line(expression);
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

  reduceForStatement(node, elements) {
    return new TODO(node, "reduceForStatement");
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
      return new None();
    }
    if (node.name === "Infinity") {
      return pyInf;
    }
    if (node.name === "NaN") {
      return pyNaN;
    }
    return new Identifier(node.name);
  }

  reduceIfStatement(node, elements) {
    return new TODO(node, "reduceIfStatement");
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
    return new None();
  }

  reduceLiteralNumericExpression(node) {
    return new LiteralNumeric(node.value);
  }

  reduceLiteralRegExpExpression(node, elements) {
    // TOOD: for this we need to support import statements, as we'll need to `import re`...
    // we'll also need to support support method calls, to do whatever need to be able to do
    return new TODO(node, "reduceLiteralRegExpExpression");
  }

  reduceLiteralStringExpression(node, elements) {
    return new TODO(node, "reduceLiteralRegExpExpression");
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
    let importStatements = [];
    this.importedModules.forEach(importedModule => {
      importStatements.push(new Line(new ImportStatement(importedModule)));
    });
    if (importStatements.length > 0) {
      importStatements.push(new Line());  // as to make it a bit more Pythonic
    }
    return new Block(...importStatements, ...directives, ...statements);
  }

  reduceSetter(node, elements) {
    return new TODO(node, "reduceSetter");
  }

  reduceShorthandProperty(node, elements) {
    return new TODO(node, "reduceShorthandProperty");
  }

  reduceSpreadElement(node, { expression }) {
    // easy solution for now, we can make this more complicated if needed
    return new PrefixOperation('*', expression);
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
    if (!node.isPrefix) {
      throw "TODO: postfix update expressions are not yet supported";
    }
    switch (node.operator) {
      case "++":
        return new Assignment(
          operand,
          new InfixOperation("+", operand, new LiteralNumeric(1))
        );
      case "--":
        return new Assignment(
          operand,
          new InfixOperation("-", operand, new LiteralNumeric(1))
        );
      default:
        throw `invalid update expression operator '${node.operator}'`;
    }
    // TODO: still not exactly correct as we should also be able to use the value immediately
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
      init = new None();
    }
    // ---------------
    // as to emulate JS's behaviour of this silly comma-abuse, poor little comma
    function flatten(element) {
        let elements = [];
        let startElement = element;
        while (startElement instanceof RawTuple && startElement.expressions.length === 1) {
          startElement = startElement.expressions[0];
        }
        if (startElement instanceof InfixOperation && startElement.operator === ',') {
          // handle left element(s)
          let innerElement = startElement.left;
          while (innerElement instanceof InfixOperation && innerElement.operator == ",") {
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
    elements = elements.flat(Infinity);
    // ------------
    elements.push(new Assignment(binding, initToBind));
    return elements;
  }

  reduceWhileStatement(node, elements) {
    return new TODO(node, "reduceWhileStatement");
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
