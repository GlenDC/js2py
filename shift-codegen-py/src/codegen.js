require("./polyfill");

const { TokenStream } = require("./token-stream");
const {
  // Base Types
  RawToken,
  // Primitive Types
  LiteralBoolean,
  LiteralNumeric,
  LiteralString,
  LiteralRegexp,
  // Branch Types
  IfExpression,
  // Loop Types
  WhileExpression, // Used for For loops and Do-While loops as well
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
  Line,
  RawTuple,
  // Temporary
  TODO,

  // Token Utilities
  GetPrecedence,
} = require("./token");

const { default: codeGen, FormattedCodeGen } = require("shift-codegen");

const { version: projectVersion } = require("../package.json");

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
    return this._reduceAssignmentStatement(binding, expression);
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

    let isRightAssociative = node.operator === "**";
    if (
      GetPrecedence(node.left) < GetPrecedence(node) ||
      (isRightAssociative &&
        (GetPrecedence(node.left) === GetPrecedence(node) ||
          node.left.type === "UnaryExpression"))
    ) {
      leftCode = new RawTuple(leftCode);
    }
    if (
      GetPrecedence(node.right) < GetPrecedence(node) ||
      (!isRightAssociative && GetPrecedence(node.right) === GetPrecedence(node))
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
    // flatten the args when comma-separated trick is used
    const resultElements = [];
    const flatArgs = [];
    args.forEach((arg) => {
      const [elements, element] = this._flattenCommaSeparatedElements(arg);
      resultElements.push(...elements.flat());
      flatArgs.push(element);
    });

    // TODO: support ignore console calls better,
    // as aliasing and other indirect uses of console will still fail...
    const callExpression = new CallExpression(callee, flatArgs);
    if (
      this.ignoreConsoleCalls &&
      (callee.str == "console" || (callee.obj && callee.obj.str === "console"))
    ) {
      const ts = new TokenStream();
      callExpression.emit(ts);
      return new Comment(`code removed by js2py: ${ts.result}`);
    }
    if (resultElements.length > 0) {
      resultElements.push(callExpression);
      return resultElements;
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
    return PyEmpty;
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
      return PyNone;
    }
    if (node.name === "Infinity") {
      return PyInf;
    }
    if (node.name === "NaN") {
      return PyNaN;
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
    return PyInf;
  }

  reduceLiteralNullExpression() {
    return PyNone;
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

  reduceLiteralStringExpression(node) {
    const delim = node.value.match(/(^|[^\\])(\\\\)*"/) ? "'" : '"';
    return new LiteralString(node.value, delim);
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
      rawTupleIfNeeded(node.object, GetPrecedence(node), object),
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
      init = PyNone;
    }
    return this._reduceAssignmentStatement(binding, init);
  }

  _reduceAssignmentStatement(binding, init) {
    let [elements, initToBind] = this._flattenCommaSeparatedElements(init);
    elements = elements.flat();
    elements.push(new Assignment(binding, initToBind));
    return elements;
  }

  // as to emulate JS's behaviour of this silly comma-abuse, poor little comma
  _flattenCommaSeparatedElements(element) {
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
        const [recElements, recElement] = this._flattenCommaSeparatedElements(
          innerElement.right
        );
        elements.unshift(new Line(recElement));
        if (recElements.length > 0) {
          elements.unshift(recElements);
        }
        innerElement = innerElement.left;
      }
      elements.unshift(new Line(innerElement));
      // handle right element(s)
      let [rightElements, rightElement] = this._flattenCommaSeparatedElements(
        startElement.right
      );
      while (rightElements.length > 0) {
        elements.push(rightElements);
        [rightElements, rightElement] = this._flattenCommaSeparatedElements(
          rightElement
        );
      }
      element = rightElement;
    }
    return [elements, element];
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

function rawTupleIfNeeded(node, precedence, a) {
  return GetPrecedence(node) < precedence ? new RawTuple(a) : a;
}

module.exports = {
  PyCodeGen,
};
