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

  putNumber(number, opts) {
    const tokenStr = renderNumber(number);
    this.put(tokenStr, opts);
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

function renderNumber(n) {
  let s;
  if (n >= 1e3 && n % 10 === 0) {
    s = n.toString(10);
    if (/[eE]/.test(s)) {
      return s.replace(/[eE]\+/, "e");
    }
    return n.toString(10).replace(/0{3,}$/, (match) => {
      return "e" + match.length;
    });
  } else if (n % 1 === 0) {
    if (n > 1e15 && n < 1e20) {
      return "0x" + n.toString(16).toUpperCase();
    }
    return n.toString(10).replace(/[eE]\+/, "e");
  }
  return n
    .toString(10)
    .replace(/^0\./, ".")
    .replace(/[eE]\+/, "e");
}

module.exports = {
  TokenStream,
};
