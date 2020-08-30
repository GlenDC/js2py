#!/usr/bin/env node

const arg = require("arg");
const repl = require("repl");
const os = require("os");
const path = require("path");
const fs = require("fs");
const columnify = require("columnify");

// TODO: define pkg decently so it is linked to the actual library,
// while still being able to use the local sibling files while developing
const { transpile } = require("../../shift-codegen-py/src");
const { exit } = require("process");

const { REPL } = require("./repl");

const {
  bugs: packageInfoBugs,
  version: packageInfoVersion,
} = require("../package.json");

const argDefinitions = [
  {
    description: "show this text",
    type: Boolean,
    name: "--help",
    shorthand: "-h",
  },
  {
    description:
      "print the top level comment which includes original JS code (non-REPL only)",
    type: Boolean,
    name: "--tl-comment",
  },
  {
    description: "show the version of your installed js2py version",
    type: Boolean,
    name: "--version",
    shorthand: "-v",
  },
  {
    description:
      "choose a custom path to persist the REPL commands (default: $HOME/.js2py_repl_history)",
    type: String,
    name: "--history",
  },
  {
    description:
      "evaluate the Python code via a Python REPL server (by default one is spawned for you locally when used)",
    type: Boolean,
    name: "--eval",
    shorthand: "-e",
  },
  {
    description:
      "used together with --eval to use a running Python REPL server",
    type: String,
    name: "--eval-server",
  },
];

const args = arg(
  argDefinitions.reduce((flags, argDef) => {
    flags[argDef.name] = argDef.type;
    if (argDef.shorthand) {
      flags[argDef.shorthand] = argDef.name;
    }
    return flags;
  }, {}),
  {
    argv: process.argv.slice(2),
  }
);

// Show version and exit
if (args["--help"]) {
  console.log(`usage: ${process.argv[1]} [option] [jscode...]`);
  console.log(`Transpile JS code passed in as positional arguments directly`);
  console.log(`or start a REPL by not defining any positional argument.`);
  console.log(``);
  console.log("Options:");
  console.log(``);
  console.log(
    columnify(
      argDefinitions.reduce((flags, argDef) => {
        flags.push({
          name: argDef.name,
          shorthand: argDef.shorthand,
          description: argDef.description,
        });
        return flags;
      }, []),
      {
        config: {
          description: { maxWidth: 80 },
        },
      }
    )
  );
  exit(0);
}

// Show version and exit
if (args["--version"]) {
  console.log(`js2py v${packageInfoVersion}`);
  console.log(
    `NodeJS ${process.version} on ${os.type()}-${os.release()}-${os.arch()}`
  );
  console.log(``);
  exit(0);
}

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
  `Hello ${os.userInfo().username} on NodeJS ${
    process.version
  } ${os.type()}-${os.release()}-${os.arch()} :)`
);
console.log(`Versions > js2py v${packageInfoVersion}`);
console.log(
  `Please report any bugs you encounter in full detail on: ${packageInfoBugs.url}`
);

historyFP =
  args["--history"] || path.join(os.userInfo().homedir, ".js2py_repl_history");

// Start the CLI in REPL mode
const js2pyREPL = new REPL({
  evalPython: !!args["--eval"],
  evalPythonServer: args["--eval-server"],
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
  fs.appendFileSync(historyFP, js2pyREPLRunner.lines.join("\n") + "\n");
});

try {
  // synchronous methods are fine, here. you don't want to run a REPL on any middleware that
  // handles user requests, anyway.
  fs.statSync(historyFP);

  // load command history from history file in the current directory
  fs.readFileSync(historyFP)
    .toString()
    .split("\n")
    .reverse()
    .filter((line) => line.trim())
    .map((line) => js2pyREPLRunner.history.push(line));
} catch (err) {
  if (err.code !== "ENOENT") {
    throw err;
  }
}
