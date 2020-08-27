const repl = require('repl');

const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

const { PyCodeGen } = require("../../shift-codegen-py/src/codegen");
const { TokenStream } = require("../../shift-codegen-py/src/token-stream");

class REPL {
  constructor() {
    this._generator = new PyCodeGen({
      topLevelComment: false,
    });
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
    callback(null, ts.result);
  }

  _canJSErrorBeRecovered(error) {
    return error.description === 'Unexpected end of input';
  }

  write(output) {
    return output.trim();
  }
}

module.exports = {
  REPL,
};
