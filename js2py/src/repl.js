const repl = require("repl");
const path = require("path");
const fs = require("fs");
const os = require("os");
const socket = require("socket.io-client");
const url = require("url");
const gaze = require("gaze");

const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

// TODO: load this correctly as `shift-codegen-py`,
// being able to use a linked version if used (with hot reloading still working)
const js2pyImportPath = "../../shift-codegen-py/src";
let js2py = require(js2pyImportPath);

function createSocketClient(serverAddress) {
  // TODO: handle connection failure better,
  // seems that if we cannot connect (e.g. due to bad http call),
  // that we also do not fail anywhere, but that emitting won't do anything
  // and in that case (of conn failure) we will also need CTRL+C after exiting to actually exit
  let client = socket.connect(serverAddress, { reconnect: true });
  client.on("connect", () => {});
  client.on("disconnect", () => {});
  return client;
}

class REPL {
  constructor({ evalPython, evalPythonServer } = {}) {
    this._generator = new js2py.PyCodeGen({
      topLevelComment: false,
    });
    this._evalPython = evalPython || evalPythonServer; // only possible when server defined for now
    this._evalPythonServer = evalPythonServer;

    // TODO: Future: allow server to also be created and managed by this process
    if (this._evalPython) {
      this._PythonClient = createSocketClient(evalPythonServer);
    }

    let self = this;
    this._fsWatchers = [];
    if (process.env.JS2PY_HOT_RELOAD) {
      gaze(
        `${path.dirname(require.resolve(js2pyImportPath))}/**/*.js`,
        (err, watcher) => {
          watcher.on("all", (filepath) => {
            Object.keys(require.cache).forEach((k) => {
              if (k.match(/shift-codegen-py\/src/i)) {
                delete require.cache[k];
              }
            });
            self._reload();
          });
          this._fsWatchers.push(watcher);
        }
      );
    }
  }

  // used to support hot reloading
  _reload() {
    js2py = require("../../shift-codegen-py/src");
    this._generator = new js2py.PyCodeGen({
      topLevelComment: false,
    });
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
    const ts = new js2py.TokenStream();
    rep.emit(ts);

    if (this._evalPython) {
      this._PythonClient.emit("eval", { cmd: ts.result }, (evalOutput) => {
        if (!evalOutput) {
          callback(null, ts.result);
          return;
        }
        callback(
          null,
          `${ts.result}# Outputs:${os.EOL}${evalOutput
            .trim()
            .split("\r\n")
            .map((v) => `# ${v}`)
            .join(os.EOL)}`
        );
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
    // close FS watchers
    this._fsWatchers.forEach((watcher) => watcher.close());
  }
}

module.exports = {
  REPL,
};
