const repl = require("repl");
const path = require("path");
const fs = require("fs");
const os = require("os");
const socket = require("socket.io-client");
const url = require('url');

const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

const { PyCodeGen } = require("../../shift-codegen-py/src/codegen");
const { TokenStream } = require("../../shift-codegen-py/src/token-stream");
const { ENGINE_METHOD_DIGESTS } = require("constants");

function createSocketClient(serverAddress) {
  // TODO: handle connection failure better,
  // seems that if we cannot connect (e.g. due to bad http call),
  // that we also do not fail anywhere, but that emitting won't do anything
  // and in that case (of conn failure) we will also need CTRL+C after exiting to actually exit
  let client = socket.connect(serverAddress, {reconnect: true});
  client.on('connect', () => {});
  client.on('disconnect', () => {});
  return client;
}

class REPL {
  constructor({ evalPython, evalPythonServer } = {}) {
    this._generator = new PyCodeGen({
      topLevelComment: false,
    });
    this._evalPython = evalPython || evalPythonServer; // only possible when server defined for now
    this._evalPythonServer = evalPythonServer;
    const polyfillPythonDir = path.join(__dirname, "..", "..", "polyfill");

    // TODO: Future: allow server to also be created and managed by this process
    if (this._evalPython) {
      this._PythonClient = createSocketClient(evalPythonServer);
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
      this._PythonClient.emit('eval', {cmd: ts.result}, evalOutput => {
        if (!evalOutput) {
          callback(null, ts.result);
          return;
        }
        callback(null, `${ts.result}# Outputs:${os.EOL}${evalOutput.trim().split('\r\n').map(v => `# ${v}`).join(os.EOL)}`);
      });
    } else {
      callback(null, ts.result);
    }
  }

  _canJSErrorBeRecovered(error) {
    return error.description === "Unexpected end of input";
  }

  write(output) {
    if (!output) {
      return "";
    }
    return output.trim ? output.trim() : output;
  }

  close() {
    if (this._evalPython) {
      this._PythonClient.disconnect();
    }
  }
}

module.exports = {
  REPL,
};
