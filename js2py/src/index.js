#!/usr/bin/env node

const arg = require("arg");
const repl = require('repl');
const os = require('os');

// TODO: define pkg decently so it is linked to the actual library,
// while still being able to use the local sibling files while developing
const { transpile } = require("../../shift-codegen-py/src");
const { exit } = require("process");

const { REPL } = require("./repl");

const { bugs: packageInfoBugs, version: packageInfoVersion } = require("../package.json");

const args = arg(
  {
    "--tl-comment": Boolean,
  },
  {
    argv: process.argv.slice(2),
  }
);

// CLI can be used by passing in code directly as a string
if (args._.length > 0) {
  console.log(
    transpile(args._, {
      topLevelComment: args["--tl-comment"] || false,
    })
  );
  exit(0);
}

// Print the versions and other info
console.log(`Hello ${os.userInfo().username} on ${os.type()}-${os.release()}-${os.arch()} :)`);
console.log(`Versions > py2js v${packageInfoVersion}`)
console.log(`Please report any bugs you encounter in full detail on: ${packageInfoBugs.url}`);

// Start the CLI in REPL mode
const js2pyREPL = new REPL();
const js2pyREPLRunner = repl.start({
  prompt: '>>> ',
  eval: function(...args) {
    js2pyREPL.eval(...args);
  },
  writer: function(...args) {
    return js2pyREPL.write(...args);
  },
  ignoreUndefined: true,
  preview: false,
});
