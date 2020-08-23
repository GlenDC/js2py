const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

const { PyCodeGen } = require("./codegen");
const { TokenStream } = require("./token-stream");

// class PyCodeGen {
//     constructor(opts) {
//         this.opts = opts || {};
//     }
// }

exports.transpile = function (script) {
  let t = script;
  if (typeof t === "string" || t instanceof String) {
    t = parseScript(t);
  }

  const generator = new PyCodeGen();
  const rep = reduce(generator, t);
  const ts = new TokenStream();
  rep.emit(ts);
  return ts.result;
};
