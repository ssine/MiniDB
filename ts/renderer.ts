// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { parser } from './parser'
import { Term } from './terminal'
import { remote } from 'electron'
import { Table, Database } from './data'

let term = new Term(document.getElementById('terminal-container'));

function getInput(input: string): string {
  let cmd = input.trim().toLowerCase().substr(0, 4);
  if (cmd == 'exit') {
    remote.getCurrentWindow().close();
    return '';
  } else if (cmd == 'file') {
    // open the file and return
    return '';
  }
  
  let tree = parser.parse(input);
  return JSON.stringify(tree);
}

term.listener = getInput;

let dbs = {
  'test': new Database('test')
}
