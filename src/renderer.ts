// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { Term } from './terminal'
import { ipcRenderer } from 'electron'

let term = new Term(document.getElementById('terminal-container'));

term.listener = (input: string): string => {
  return ipcRenderer.sendSync('command-line', input);
}
