const { parseScript } = require("shift-parser");
const { reduce } = require("shift-reducer");

const { PyCodeGen } = require("./codegen");
const { TokenStream } = require("./token-stream");

function transpile(script, opts) {
  let t = script;
  if (typeof t === "string" || t instanceof String || t === undefined) {
    t = parseScript(t || "");
  }

  const generator = new PyCodeGen(opts);
  const rep = reduce(generator, t);
  const ts = new TokenStream();
  rep.emit(ts);
  return ts.result;
}

module.exports = {
  transpile,
};
