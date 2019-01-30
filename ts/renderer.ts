// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { parser } from './parser'
import { Term } from './terminal'
import { remote } from 'electron'
import { SystemData } from './data'
import { interpret } from './interpreter'

let sys_data = new SystemData();

let term = new Term(document.getElementById('terminal-container'));

term.listener = (input: string): string => {
  let cmd = input.trim().toLowerCase().substr(0, 4);
  if (cmd == 'exit') {
    remote.getCurrentWindow().close();
    return '';
  } else if (cmd == 'file') {
    // open the file and return
    return '';
  }
  
  let trees = parser.parse(input);
  let res: string = '';
  trees.forEach(tree => {
    console.log(tree);
    switch (tree.statement) {
      case 'CREATE TABLE':
      case 'CREATE DATABASE':
        res = interpret(tree, sys_data);
        console.log('create triggered', sys_data);
        break;
      case 'SELECT':
        break;
    }
  });
  return res;
}
