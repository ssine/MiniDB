import { parser } from './parser'

parser.yy.extend = function() {
  let target = arguments[0] || {};
  if (typeof target != "object" && typeof target != "function") {
    target = {};
  }
  for (let i = 1; i < arguments.length; i++) { 
    let source = arguments[i]; 
    for (let key in source) { 
      target[key] = source[key]; 
    } 
  }
  return target; 
}

export { parser }