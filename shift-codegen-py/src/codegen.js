const os = require("os");

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
  WhileExpression, // Used for For Do-While loops as well
  ForExpression,
  // Expression Types
  PrefixOperation, // AKA Unary Operations
  InfixOperation, // AKA binary operations
  InPlaceOperation, // also binary ops, but in-place variant
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
  PyEmpty,
  // Other Types
  Comment,
  MultiLineComment,
  ImportStatement,
  Line,
  RawTuple,
  // Temporary
  TODO,

  // Python Types for Special Purposes
  PythonString,
  PythonFunctionDef,
  PythonList,

  // Token Utilities
  GetPrecedence,
  StringToken,
} = require("./token");

const { default: codeGen, FormattedCodeGen } = require("shift-codegen");

const {
  version: projectVersion,
  bugs: projectBugs,
} = require("../package.json");

class PyCodeGen {
  constructor({ topLevelComment, includeImports, scopedScript, disableDebugger } = {}) {
    // a top level comment to indicate we generated it,
    // and including the original javascript code (or at least the one generated
    // from the AST that we used)
    this.topLevelComment = !!topLevelComment;

    // used for top-level std imports (e.g. re)
    // TODO: delete, should no longer be needed
    this.importedModules = new Set();

    // used to generate the script as a main function,
    // rather than in the global namespace of the module
    this.scopedScript = !!scopedScript;

    // used to generate the import statements
    this.includeImports = !!includeImports;

    // used to disable debug code
    this.disableDebugger = !!disableDebugger;
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
    // NOTE: strictly speaking this is an identifier,
    // but for our codegen purposes this is really just a string
    return new PythonString(node.name);
  }

  reduceAssignmentTargetPropertyIdentifier(node, { binding }) {
    return binding;
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
    // NOTE: strictly speaking this is an identifier,
    // but for our codegen purposes this is really just a string
    return new PythonString(node.name);
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
    return new CallExpression(callee, args);
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
    return new InPlaceOperation(
      node.operator.slice(0, -1),
      binding,
      expression
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
    if (this.disableDebugger) {
      return new Comment("breakpoint()");
    }
    return new CallExpression(new StringToken('breakpoint'));
  }

  reduceDirective(node) {
    const delim = node.rawValue.match(/(^|[^\\])(\\\\)*"/) ? "'" : '"';
    return new LiteralString(node.rawValue, { delim });
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
    return new ForExpression(init, test, update, body);
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

  reduceIdentifierExpression(node) {
    // NOTE: specials such as NaN, Infinity, etc...
    // are all handled by the python runtime polyfill code
    return new Identifier(node.name);
  }

  reduceIfStatement(node, { test, consequent, alternate }) {
    return new IfExpression(test, consequent, alternate);
  }

  reduceImport(node, elements) {
    throw new EvalError("import statements and related aren't supported by JS2PY, single-file code only");
  }

  reduceImportNamespace(node, elements) {
    throw new EvalError("import statements and related aren't supported by JS2PY, single-file code only");
  }

  reduceImportSpecifier(node, elements) {
    throw new EvalError("import statements and related aren't supported by JS2PY, single-file code only");
  }

  reduceLabeledStatement(node, elements) {
    return new TODO(node, "reduceLabeledStatement");
  }

  reduceLiteralBooleanExpression(node) {
    return new LiteralBoolean(node.value);
  }

  reduceLiteralInfinityExpression() {
    return new Identifier("Infinity");
  }

  reduceLiteralNullExpression() {
    return new Identifier("null");
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
    return new LiteralString(node.value, { delim });
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

  reduceObjectAssignmentTarget(node, { properties }) {
    return new PythonList(properties);
  }

  reduceObjectBinding(node, elements) {
    // NOTE: this relies on the rest of the code in knowing what to do with this
    const listElements = node.properties.map(p => new PythonString(p.binding.name));
    return new PythonList(listElements);
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
          `DO NOT EDIT: Code generated on ${new Date(
            new Date()
          ).toISOString()}`,
          `by js2py v${projectVersion} using runtime NodeJS ${
            process.version
          } on ${os.type()}-${os.release()}-${os.arch()}.`,
          "",
          "Please report any issues with the transpiled code in this file at:",
          projectBugs.url,
          "",
          "input script:",
          "```javascript",
          programSource,
          "```"
        )
      );
    }

    const importStatements = [];

    if (this.includeImports) {
      importStatements.push(
        new ImportStatement("shift_codegen_py.polyfill", {
          children: ["*"],
        })
      );
    }

    this.importedModules.forEach((importedModule) => {
      importStatements.push(new ImportStatement(importedModule));
    });

    if (this.scopedScript) {
      // TODO: do we need a return value if we use this? Or should it always work via exports??
      //  ... and how would exports work?
      const block = new Block(
        ...commentStatements,
        ...importStatements,
        new Block(
          new PythonFunctionDef(
            "main",
            new Block(...directives, ...statements),
            {
              args: ["scope"],
            }
          )
        )
      );
      block.isTopLevel = true;
      return block;
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
      declarator.kind = node.kind;  // default was set to var up to this point
      elements.push(new Line(declarator));
    });
    return elements; // NOTE: need to be flattened somewhere in callee
  }

  reduceVariableDeclarationStatement(node, { declaration }) {
    return declaration;
  }

  reduceVariableDeclarator(node, { binding, init }) {
    if (init === null) {
      init = new Identifier("undefined");
    }
    return new Assignment(binding, init);
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
