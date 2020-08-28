const repl = require('repl');
const path = require('path');
const fs = require('fs');
const { spawn: spawnProcess } = require('child_process');

const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

const { PyCodeGen } = require("../../shift-codegen-py/src/codegen");
const { TokenStream } = require("../../shift-codegen-py/src/token-stream");
const { time } = require('console');

class REPL {
  constructor({ verbose } = {}) {
    this._generator = new PyCodeGen({
      topLevelComment: false,
    });
    this._verbose = verbose;
    

    // TODO: Future: somehow make a virtual-env workspace on user machine,
    // (or use perhaps existing one if it exists) and make sure our shift_codegen_py module
    // is installed there such that we can just run it as such
    const polyfillPythonDir = path.join(__dirname, '..', '..', 'polyfill');
    // TODO: Now: do this via a socket so we can have a clean request-response flow instead of this subproces stdin/stdout hack
    // TODO: Now: display the generated python nicely with each line prefixed with `>`, need to check that new lines break correctly (and not for example when in string)
    this._pythonCmd = spawnProcess('python', ['repl.py'], {
      cwd: polyfillPythonDir,
      stdio: ['pipe', process.stdout, process.stderr],
    });
    this._pythonCmd.stdin.setEncoding('utf-8');
  }

  eval(cmd, context, filename, callback) {
    let tree;
    try {
      tree = parseScript(cmd); // this can fail if incomplete for example
    } catch (e) {
      if (this._canJSErrorBeRecovered(e)) {
        return callback(new repl.Recoverable(e))
      }
    }
    const rep = reduce(this._generator, tree);
    const ts = new TokenStream();
    rep.emit(ts);

    this._pythonCmd.stdin.write(ts.result);
    callback(null, this._verbose ? ts.result : null);
  }

  _canJSErrorBeRecovered(error) {
    return error.description === 'Unexpected end of input';
  }

  write(output) {
    return output ? output.trim() : '';
  }

  close() {
    this._pythonCmd.stdin.end();
  }
}

module.exports = {
  REPL,
};
