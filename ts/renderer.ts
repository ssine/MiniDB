// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.
import { parser, Trees } from './parser'
import { Term } from './terminal'
import { remote } from 'electron'
import { SystemData } from './data'
import * as fs from 'fs'
import { load_data, save_data } from './utls'
import {
  create_database,
  drop_database,
  use_database,
  show_database,
  show_table,
  create_table,
  drop_table
} from './manager'
import {
  ql_insert,
  ql_delete,
  ql_update,
  ql_select,
  ql_check
} from './query'

let data_path = './data.json';

let sys_data: SystemData = load_data(data_path);

let term = new Term(document.getElementById('terminal-container'));

term.listener = (input: string): string => {

  let timer = new Date().valueOf();

  input = input.trim();

  let res = '';

  if (input[0] == '.') {
    // system commands
    input = input.substr(1);
    let cmd = input.split(' ', 1)[0];
    switch (cmd) {
      case 'exit':
        save_data(data_path, sys_data);
        remote.getCurrentWindow().close();
        return '';
      case 'file':
        let path = input.substr(4).trim();
        input = fs.readFileSync(path).toString();
        res = run_sql(input);
        break;
      case 'createdb':
        res = create_database(sys_data, input.split(' ')[1]);
        break;
      case 'dropdb':
        res = drop_database(sys_data, input.split(' ')[1]);
        break;
      case 'usedb':
        res = use_database(sys_data, input.split(' ')[1]);
        break;
      case 'showdb':
        res = show_database(sys_data);
        break;
      case 'showtb':
        res = show_table(sys_data);
        break;
    }
  } else {
    // sql statements
    res = run_sql(input);
  }
  
  let interval = (new Date().valueOf() - timer) / 1000;

  // res = res.trim() + '\r\nquery finished in ' + interval.toString() + ' seconds.';
  return res;
}

function run_sql(input: string): string {

  if (sys_data.cur_db === '')
    return 'not using any database!';

  let trees: Trees = parser.parse(input);

  let res = '';
  let check_res: boolean, check_err: string;
  trees.forEach(tree => {
    [check_res, check_err] = ql_check(sys_data, tree);
    if (!check_res) {
      res += check_err + '\r\nsemantic check failed!\r\n';
      return;
    }
    console.log(tree);
    switch (tree.statement) {
      case 'CREATE TABLE':
        res += create_table(sys_data, tree);
        break;
      case 'DROP TABLE':
        res += drop_table(sys_data, tree);
        break;
      // case 'CREATE INDEX':
      // case 'DROP INDEX':
      case 'SELECT':
        res += ql_select(sys_data, tree);
        break;
      case 'INSERT':
        res += ql_insert(sys_data, tree);
        break;
      case 'DELETE':
        res += ql_delete(sys_data, tree);
        break;
      case 'UPDATE':
        res += ql_update(sys_data, tree);
        break;
      default:
        res += 'Action not yet implemented.\r\n';
        break;
    }
  });

  return res;
}
