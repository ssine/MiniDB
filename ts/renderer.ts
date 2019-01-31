// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { parser } from './parser'
import { Term } from './terminal'
import { remote } from 'electron'
import { SystemData } from './data'
import { interpret } from './interpreter'
import * as fs from 'fs'

let sys_data = new SystemData();

let term = new Term(document.getElementById('terminal-container'));

term.listener = (input: string): string => {
  input = input.trim();
  let cmd = input.toLowerCase().substr(0, 4);
  if (cmd == 'exit') {
    sys_data.save();
    remote.getCurrentWindow().close();
    return '';
  }
  
  if (cmd == 'file') {
    // open the file as input
    let path = input.substring(4, input.length - 1).trim();
    input = fs.readFileSync(path).toString();
  }
  
  let trees = parser.parse(input);
  let res: string = '';
  trees.forEach(tree => {
    console.log(tree);
    switch (tree.statement) {
      case 'CREATE TABLE':
      case 'CREATE DATABASE':
      case 'INSERT':
      case 'SELECT':
        res = interpret(tree, sys_data);
        console.log(sys_data);
        break;
      default:
        res = 'Action not yet implemented.';
        break;
    }
  });
  return res;
}
