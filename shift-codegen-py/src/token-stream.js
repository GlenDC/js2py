class TokenStream {
  constructor() {
    this.result = "";
    this.indentionStr = "    "; // TODO: make it configurable later
    this.newLineStr = "\n"; // TODO: make it configurable later
  }

  put(tokenStr, opts = {}) {
    if (opts.escape) {
      opts.escape.forEach((pair) => {
        const [oldStr, newStr] = pair;
        tokenStr = tokenStr.replace(oldStr, newStr);
      });
    }
    this.result += tokenStr;
  }

  putIndention(opts = {}) {
    const { lineIndention } = opts;
    if (lineIndention && lineIndention > 0) {
      this.put(this.indentionStr.repeat(lineIndention), opts);
    }
  }

  putEOL(opts) {
    this.put(this.newLineStr, opts);
  }
}

module.exports = {
  TokenStream,
};
