class TokenStream {
  constructor() {
    this.result = "";
  }

  put(tokenStr) {
    this.result += tokenStr;
  }

  putNumber(number) {
    const tokenStr = renderNumber(number);
    this.put(tokenStr);
  }

  putEOL() {
    this.put('\n');
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

exports.TokenStream = TokenStream;
