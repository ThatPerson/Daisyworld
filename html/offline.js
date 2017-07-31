fs = require('fs')
var code;
fs.readFile('./settings.js', 'utf8', function (err,data) {
  if (err) {
    return console.log(err);
  }
  code = data;
  eval(code);
  run(100);

});

/* This allows the script to be run offline using NodeJS - for the frontend it's pretty irrelevant.
