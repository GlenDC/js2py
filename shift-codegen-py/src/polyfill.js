// some polyfill stuff
if (!Array.prototype.flat) {
  Object.defineProperty(Array.prototype, "flat", {
    value: function (depth = 8192, stack = []) {
      for (let item of this) {
        if (item instanceof Array && depth > 0) {
          item.flat(depth - 1, stack);
        } else {
          stack.push(item);
        }
      }

      return stack;
    },
  });
}
