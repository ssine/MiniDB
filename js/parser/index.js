"use strict";
exports.__esModule = true;
var parser_1 = require("./parser");
exports.parser = parser_1.parser;
parser_1.parser.yy.extend = function () {
    var length = arguments.length;
    var target = arguments[0] || {};
    if (typeof target != "object" && typeof target != "function") {
        target = {};
    }
    if (length == 1) {
        target = this;
        i--;
    }
    for (var i = 1; i < length; i++) {
        var source = arguments[i];
        for (var key in source) {
            // 使用for in会遍历数组所有的可枚举属性，包括原型。
            if (Object.prototype.hasOwnProperty.call(source, key)) {
                target[key] = source[key];
            }
        }
    }
    return target;
};
//# sourceMappingURL=index.js.map