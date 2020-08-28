#!/usr/bin/env node

const arg = require("arg");
const repl = require("repl");
const os = require("os");
const path = require("path");
const fs = require("fs");

// TODO: define pkg decently so it is linked to the actual library,
// while still being able to use the local sibling files while developing
const { transpile } = require("../../shift-codegen-py/src");
const { exit } = require("process");

const { REPL } = require("./repl");

const {
  bugs: packageInfoBugs,
  version: packageInfoVersion,
} = require("../package.json");

const args = arg(
  {
    "--tl-comment": Boolean,
    "--verbose": Boolean,
    "--history": String,

    // Aliases
    "-v": "--verbose",
  },
  {
    argv: process.argv.slice(2),
  }
);

// CLI can be used by passing in code directly as a string
if (args._.length > 0) {
  console.log(
    transpile(args._, {
      topLevelComment: !!args["--tl-comment"],
    })
  );
  exit(0);
}

// Print the versions and other info
console.log(
  `Hello ${
    os.userInfo().username
  } on ${os.type()}-${os.release()}-${os.arch()} :)`
);
console.log(`Versions > py2js v${packageInfoVersion}`);
console.log(
  `Please report any bugs you encounter in full detail on: ${packageInfoBugs.url}`
);

historyFP = args["--history"] || path.join(os.userInfo().homedir, ".js2py_repl_history");

// Start the CLI in REPL mode
const js2pyREPL = new REPL({
  verbose: !!args["--verbose"],
});
const js2pyREPLRunner = repl.start({
  prompt: ">>> ",
  eval: function (...args) {
    js2pyREPL.eval(...args);
  },
  writer: function (...args) {
    return js2pyREPL.write(...args);
  },
  ignoreUndefined: true,
  preview: false,
});

js2pyREPLRunner.on("close", () => {
  js2pyREPL.close();
  // write commands used in current session to file
  fs.appendFileSync(historyFP, js2pyREPLRunner.lines.join('\n') + '\n')
});

try {
  // synchronous methods are fine, here. you don't want to run a REPL on any middleware that
  // handles user requests, anyway.
  fs.statSync(historyFP)

  // load command history from a file called .node_repl history in the current directory
  fs.readFileSync(historyFP)
    .toString()
    .split('\n')
    .reverse()
    .filter(line => line.trim())
    .map(line => js2pyREPLRunner.history.push(line));
} catch (err) {
  if (err.code !== 'ENOENT') {
    throw err;
  }
}
