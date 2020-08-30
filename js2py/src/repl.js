const repl = require("repl");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { spawn: spawnProcess } = require("child_process");

const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

const { PyCodeGen } = require("../../shift-codegen-py/src/codegen");
const { TokenStream } = require("../../shift-codegen-py/src/token-stream");
const { time } = require("console");

class REPL {
  constructor({ evalPython, evalPythonServer } = {}) {
    this._generator = new PyCodeGen({
      topLevelComment: false,
    });
    this._evalPython = evalPython;
    this._evalPythonServer = evalPythonServer;

    // TODO: Future: somehow make a virtual-env workspace on user machine,
    // (or use perhaps existing one if it exists) and make sure our shift_codegen_py module
    // is installed there such that we can just run it as such
    const polyfillPythonDir = path.join(__dirname, "..", "..", "polyfill");

    if (this._eval) {
      // TODO: Now: do this via a socket so we can have a clean request-response flow instead of this subprocess stdin/stdout hack
      // TODO: Now: display the generated python nicely with each line prefixed with `>`, need to check that new lines break correctly (and not for example when in string)
      this._pythonCmd = spawnProcess("python", ["repl.py"], {
        cwd: polyfillPythonDir,
        stdio: ["pipe", process.stdout, process.stderr],
      });
      this._pythonCmd.stdin.setEncoding("utf-8");
    }
  }

  eval(cmd, context, filename, callback) {
    let tree;
    try {
      tree = parseScript(cmd); // this can fail if incomplete for example
    } catch (e) {
      if (this._canJSErrorBeRecovered(e)) {
        callback(new repl.Recoverable(e));
        return;
      }

      // output error in a readable manner
      const errStr = e.toString();
      const [_mStr, lineStr, colStr, errMsg] = errStr.match(
        /Error: \[(\d+):(\d+)]: (.+)/i
      );
      const colNr = Number(colStr);
      const errCmdLine = cmd.split(/\r?\n/)[Number(lineStr) - 1];
      const outputLines = [
        `File "<stdin>", line ${lineStr}`,
        `  ${errCmdLine}`,
      ];
      outputLines.push(`${" ".repeat(Number(colStr) + 1)}^`);
      outputLines.push(`SyntaxError: ${errMsg}`);
      callback(null, outputLines.join(os.EOL));
      return;
    }
    const rep = reduce(this._generator, tree);
    const ts = new TokenStream();
    rep.emit(ts);

    if (this._evalPython) {
      this._pythonCmd.stdin.write(ts.result);
    }
    callback(null, ts.result);
  }

  _canJSErrorBeRecovered(error) {
    return error.description === "Unexpected end of input";
  }

  write(output) {
    return output ? output.trim() : "";
  }

  close() {
    if (this._evalPython) {
      this._pythonCmd.stdin.end();
    }
  }
}

module.exports = {
  REPL,
};
