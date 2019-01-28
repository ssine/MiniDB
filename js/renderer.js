"use strict";
exports.__esModule = true;
// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
var parser_1 = require("./parser");
var xterm_1 = require("xterm");
var term = new xterm_1.Terminal();
term.open(document.getElementById('terminal'));
var input = '';
term.on('key', function (key, ev) {
    var printable = !ev.altKey && !ev.ctrlKey && !ev.metaKey;
    if (ev.keyCode === 13) {
        term.write('\r\n$ ');
        console.log(input);
        console.log(parser_1.parser.parse(input));
        input = '';
    }
    else if (ev.keyCode === 8) {
        // Do not delete the prompt
        if (input.length > 0) {
            term.write('\b \b');
            input = input.substr(0, input.length - 1);
        }
    }
    else if (printable) {
        term.write(key);
        input += key;
    }
});
term.write('$ ');
//# sourceMappingURL=renderer.js.map