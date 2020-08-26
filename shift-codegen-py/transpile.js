const { transpile }  = require('./src');
console.log(transpile(process.argv[2], {
  topLevelComment: true,
}));
