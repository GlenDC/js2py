const { parseScript: parseJS } = require('shift-parser');

exports.transpile = function(script) {
    if (typeof script === 'string' || script instanceof String) {
        script = parseJS(script);
    }
    return script;
}
