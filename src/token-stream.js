class TokenStream {
  constructor() {
    this.result = "";
  }

  put(tokenStr) {
    this.result += tokenStr;
  }
}

exports.TokenStream = TokenStream;
