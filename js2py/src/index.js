#!/usr/bin/env node

const arg = require("arg");

// TODO: define pkg decently so it is linked to the actual library,
// while still being able to use the local sibling files while developing
const { transpile } = require("../../shift-codegen-py/src");

const args = arg(
  {
    "--tl-comment": Boolean,
  },
  {
    argv: process.argv.slice(2),
  }
);

console.log(
  transpile(args._, {
    topLevelComment: args["--tlt-comment"] || false,
  })
);
