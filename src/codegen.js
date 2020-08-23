class Token {
  constructor() {}

  forEach(f) {
    f(this);
  }
}

class EOL extends Token {
  constructor() {
    super();
  }

  emit(ts) {
    ts.put("\n");
  }
}

class RawTuple extends Token {
  constructor(expression) {
    super();
    this.expression = expression;
  }

  emit(ts) {
    ts.put("(");
    this.expression.emit(ts);
    ts.put(")");
  }

  forEach(f) {
    f(this);
    this.expression.forEach(f);
  }
}

class Sequence extends Token {
  constructor(children) {
    super();
    this.children = children || [];
  }

  emit(ts, noIn) {
    this.children.forEach((cr) => cr.emit(ts, noIn));
  }

  forEach(f) {
    f(this);
    this.children.forEach((x) => x.forEach(f));
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

class PyCodeGen {
  constructor(opts) {
    this.opts = opts || {};
  }

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

  reduceAssignmentExpression(node, elements) {
    return new TODO(node, "reduceAssignmentExpression");
  }

  reduceAssignmentTargetIdentifier(node, elements) {
    return new TODO(node, "reduceAssignmentTargetIdentifier");
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

  reduceBinaryExpression(node, elements) {
    return new TODO(node, "reduceBinaryExpression");
  }

  reduceBindingIdentifier(node, elements) {
    return new TODO(node, "reduceBindingIdentifier");
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

  reduceBlock(node, elements) {
    return new TODO(node, "reduceBlock");
  }

  reduceBlockStatement(node, elements) {
    return new TODO(node, "reduceBlockStatement");
  }

  reduceBreakStatement(node, elements) {
    return new TODO(node, "reduceBreakStatement");
  }

  reduceCallExpression(node, elements) {
    return new TODO(node, "reduceCallExpression");
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

  reduceCompoundAssignmentExpression(node, elements) {
    return new TODO(node, "reduceCompoundAssignmentExpression");
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

  reduceDirective(node, elements) {
    return new TODO(node, "reduceDirective");
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
    const needsParens =
      expression.startsWithCurly ||
      expression.startsWithLetSquareBracket ||
      expression.startsWithFunctionOrClass;
    return new Sequence(needsParens ? new RawTuple(expression) : expression, new EOL());
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
    return new TODO(node, "reduceIdentifierExpression");
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

  reduceLiteralBooleanExpression(node, elements) {
    return new TODO(node, "reduceLiteralBooleanExpression");
  }

  reduceLiteralInfinityExpression(node, elements) {
    return new TODO(node, "reduceLiteralInfinityExpression");
  }

  reduceLiteralNullExpression(node, elements) {
    return new TODO(node, "reduceLiteralNullExpression");
  }

  reduceLiteralNumericExpression(node, elements) {
    return new TODO(node, "reduceLiteralNumericExpression");
  }

  reduceLiteralRegExpExpression(node, elements) {
    return new TODO(node, "reduceLiteralRegExpExpression");
  }

  reduceLiteralStringExpression(node, elements) {
    return new TODO(node, "reduceLiteralStringExpression");
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
    return new Sequence(...directives, ...statements);
  }

  reduceSetter(node, elements) {
    return new TODO(node, "reduceSetter");
  }

  reduceShorthandProperty(node, elements) {
    return new TODO(node, "reduceShorthandProperty");
  }

  reduceSpreadElement(node, elements) {
    return new TODO(node, "reduceSpreadElement");
  }

  reduceSpreadProperty(node, elements) {
    return new TODO(node, "reduceSpreadProperty");
  }

  reduceStaticMemberAssignmentTarget(node, elements) {
    return new TODO(node, "reduceStaticMemberAssignmentTarget");
  }

  reduceStaticMemberExpression(node, elements) {
    return new TODO(node, "reduceStaticMemberExpression");
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
    return new TODO(node, "reduceTemplateElement");
  }

  reduceTemplateExpression(node, elements) {
    return new TODO(node, "reduceTemplateExpression");
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

  reduceUnaryExpression(node, elements) {
    return new TODO(node, "reduceUnaryExpression");
  }

  reduceUpdateExpression(node, elements) {
    return new TODO(node, "reduceUpdateExpression");
  }

  reduceVariableDeclaration(node, elements) {
    return new TODO(node, "reduceVariableDeclaration");
  }

  reduceVariableDeclarationStatement(node, elements) {
    return new TODO(node, "reduceVariableDeclarationStatement");
  }

  reduceVariableDeclarator(node, elements) {
    return new TODO(node, "reduceVariableDeclarator");
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

exports.PyCodeGen = PyCodeGen;
