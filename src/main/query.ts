import { 
  Tree, 
  Select, 
  Update, 
  TableName,
  Delete,
  Insert,
  Transaction,
  Expression,
  ColumnName,
  Literal
} from '../parser'
import { Table, Database, SystemData } from "./data";
import {
  table_insert,
  table_delete,
  table_update,
  table_scan,
  nested_loop_join,
  Scanner,
  table_filter,
  table_project
} from './plan'
import {create_table, drop_table} from "./manager"
import { plot_plan } from './utls'
import { emitter } from './emitter'

function get_table(data: SystemData, clause: TableName): Table {
  let db = clause.database ? clause.database : data.cur_db;
  return data.dbs[db].tables[clause.table];
}

function ql_insert(data: SystemData, tree: Insert): string {
  let tb = get_table(data, tree);

  let val: (string|number)[][] = [];
  tree.values.forEach(row => {
    val.push(row.map(el => el.data));
  });

  let dbName = tree.database ? tree.database : data.cur_db;
  let iter = new table_insert(dbName, tb, val);
  let cnt = 0;

  while (iter.get_next()) cnt++;

  emitter.emit('data-modified');
  return cnt + ' tuples inserted.';
}

function ql_delete(data: SystemData, tree: Delete): string {
  let tb = get_table(data, tree);

  let dbName = tree.database ? tree.database : data.cur_db;
  let iter = new table_delete(dbName, tb, tree.where);
  let cnt = 0;

  while (iter.get_next()) cnt++;

  emitter.emit('data-modified');
  return cnt + ' tuples deleted.';
}

function ql_update(data: SystemData, tree: Update): string {
  let tb = get_table(data, tree);

  let cols:string[] = [], set_to = [];
  tree.set.forEach(el => {cols.push(el.column); set_to.push(el.expr.data)});

  let dbName = tree.database ? tree.database : data.cur_db;
  let iter = new table_update(dbName, tb, cols, set_to, tree.where);
  let cnt = 0;

  while (iter.get_next()) cnt++;

  emitter.emit('data-modified');
  return cnt + ' tuples updated.';
}

function ql_select(data: SystemData, tree: Select): string {
  let res = '';

  let sel = tree.selects[0];

  let tb = get_table(data, sel.from[0]);

  // console.log('first table: ' + tb.name);
  let iter: Scanner = new table_scan(tb);
  for (let i = 1; i < sel.from.length; i++) {
    let right_tb = new table_scan(get_table(data, sel.from[i]));
    // console.log('next table: ' + get_table(data, sel.from[i]).name + ', looping...');
    iter = new nested_loop_join(
      iter, 
      right_tb, 
      sel.from[i].join_type.toLowerCase(), 
      sel.from[i].on
    );
    // console.log('loop finished.');
  }
  
  iter = new table_filter(iter, sel.where);
  // console.log('filter constructed.');
  
  if (!sel.star) {
    iter = new table_project(iter, sel.result_columns);
    // console.log('projector constructed.');
  }

  if (data.show_plan) plot_plan(iter.get_info());

  return scanner_to_string(iter);
}

function ql_transaction(sys_data: SystemData, tree: Transaction): string {
  let res = '';
  let check_res: boolean, check_err: string;
  tree.contents.forEach(stmt_tree => {
    // Process all the SQL parse trees.

    if (!stmt_tree) return '';

    // Perform semantic checking.
    [check_res, check_err] = ql_check(sys_data, stmt_tree);
    if (!check_res) {
      res += check_err + '\r\nsemantic check failed!\r\n';
      return;
    }

    switch (stmt_tree.statement) {
      case 'CREATE TABLE':
        res += create_table(sys_data, stmt_tree);
        break;
      case 'DROP TABLE':
        res += drop_table(sys_data, stmt_tree);
        break;
      // case 'CREATE INDEX':
      // case 'DROP INDEX':
      case 'SELECT':
        res += ql_select(sys_data, stmt_tree);
        break;
      case 'INSERT':
        res += ql_insert(sys_data, stmt_tree);
        break;
      case 'DELETE':
        res += ql_delete(sys_data, stmt_tree);
        break;
      case 'UPDATE':
        res += ql_update(sys_data, stmt_tree);
        break;
      case 'TRANSACTION':
        res += ql_transaction(sys_data, stmt_tree);
        break;
      default:
        res += 'Action not yet implemented.\r\n';
        break;
    }
  })
  return res;
}

function scanner_to_string(sc: Scanner): string {
  function char_repeat(c: string, n: number): string {
    return Array(n + 1).join(c);
  }

  function have_repeat(l: string[]): boolean {
    for (let i = 0; i < l.length; i++) {
      for (let j = i + 1; j < l.length; j++) {
        if (l[i] == l[j]) return true;
      }
    }
    return false;
  }

  // column names to print
  let col_id = sc.get_col_id();
  let col_name = col_id.map(val => val.split('.')[1]);
  if (!have_repeat(col_name)) {
    col_id = col_name;
  }

  // get all the data
  let rows = [];
  let row: any;
  // console.log('retriving rows...');
  while (row = sc.get_next())
    rows.push(row);
  // console.log('rows: ', rows.toString());
  
  let res = '';

  // get lengths of each column
  let lens = new Array(col_id.length);
  for (let i = 0; i < lens.length; i++) {
    let max = 0;
    max = Math.max(max, col_id[i].length);
    for (let j = 0; j < rows.length; j++)
      max = Math.max(max, rows[j][i].toString().length);
    lens[i] = max;
  }

  function print_hr() {
    res += '+'
    lens.forEach(n => res += char_repeat('-', n+2) + '+');
    res += '\r\n';
  }

  print_hr();

  res += '|'
  col_id.forEach((col, idx) => {
    res += ' ';
    res += char_repeat(' ', lens[idx] - col.length);
    res += col + ' |';
  });
  res += '\r\n';

  print_hr();

  rows.forEach(row => {
    res += '|'
    row.forEach((col, idx) => {
      res += ' ';
      res += char_repeat(' ', lens[idx] - col.toString().length);
      res += col.toString() + ' |';
    })
    res += '\r\n';
  })

  print_hr();

  return res + rows.length + ' tuples.\r\n';
}


function col_check_complete(col_id: string[], expr: Expression): boolean {
  // console.log('col_check_complete');
  function check_col(col: ColumnName|Literal): boolean {
    if ((<Literal>col).data) return true;
    col = col as ColumnName;
    if (!col.table) {
      // console.log(col.column + ', no table name specificed...')
      for (let i = col_id.length-1; i >= 0; i--) {
        if (col.column === col_id[i].split('.')[1]) {
          col.column = col_id[i];
          return true;
        }
      }
      return false;
    } else {
      // console.log('with table: ' + col.table + '.' + col.column + ', idx: ' + col_id.indexOf(col.table + '.' + col.column));
      // console.log('col_id: ' + col_id.toString());
      col.column = col.table + '.' + col.column;
      return col_id.indexOf(col.column) != -1;
    }
  }

  // console.log('col_check_complete1');

  if (!expr)
    return true;
  // console.log('col_check_complete2');
  
  if (['AND', 'OR'].indexOf(expr.op) != -1)
    return col_check_complete(col_id, <Expression>expr.left) && col_check_complete(col_id, <Expression>expr.right);
  // console.log(expr.op);  
  if (['EQ', 'NE', 'GT', 'GE', 'LT', 'LE'].indexOf(expr.op) != -1) {
    return check_col(<ColumnName>expr.left) && check_col(<ColumnName>expr.right);
  }
}

// semantic check and complete column name to id
function ql_check(data: SystemData, tree: Tree): [boolean, string] {
  switch (tree.statement) {
    case 'CREATE TABLE': {
      if (get_table(data, tree))
        return [false, 'table exists!'];
      return [true, ''];
    }
    case 'DELETE': {
      // column in where exists in table
      let tb = get_table(data, tree);
      if (!tb)
        return [false, 'table not exists!'];
      if (col_check_complete(tb.col_id, tree.where))
        return [true, ''];
      else 
        return [false, 'semantic check failed!'];
    }
    case 'DROP TABLE': {
      // table exists
      if (!get_table(data, tree))
        return [false, 'table not exists!'];
      return [true, ''];
    }
    case 'SELECT': {
      // columns in where exist in tables in from clause 
      // result columns are the same
      let sel = tree.selects[0];
      let col: string[] = [];
      for (let i = 0; i < sel.from.length; i++) {
        let cur = sel.from[i];
        if (!get_table(data, cur)) return [false, 'table not exist.']
        col = col.concat(get_table(data, cur).col_id);
        if (cur.on) {
          if (!col_check_complete(col, cur.on))
            return [false, 'semantic of "on" condition wrong!'];
        }
      }
      if (sel.result_columns) {
        // console.log('result columns semantic checking...');
        for (let i = 0; i < sel.result_columns.length; i++) {
          let cur = sel.result_columns[i];
          if (cur.indexOf('.') == -1) {
            let find: boolean = false;
            for (let j = col.length-1; j >= 0; j--) {
              if (cur === col[j].split('.')[1]) {
                // console.log(cur + ' changed to ' + col[j]);
                cur = col[j];
                sel.result_columns[i] = cur;
                find = true;
                break;
              }
            }
            if (!find) return [false, 'result column ' + cur + ' not found!'];
          } else {
            if (col.indexOf(cur) == -1) return [false, 'result column ' + cur + ' not found!'];
          }
        }
      }
      if (sel.where) {
        if (!col_check_complete(col, sel.where))
          return [false, 'where condition wrong!'];
      }
      return [true, ''];
    }
    case 'UPDATE': {
      // set_to literal type check, columns in where exist in table 
      let tb = get_table(data, tree);
      if (!tb)
        return [false, 'table not exists!'];
      if (col_check_complete(tb.col_id, tree.where))
        return [true, ''];
      else 
        return [false, 'semantic check failed!'];
    }
    case 'INSERT': {
      let tb = get_table(data, tree);
      if (!tb)
        return [false, 'table not exists!'];
      for(let i = 0; i < tree.values.length; i++) {
        if(tree.values[i].length != tb.col_name.length)
          return [false, 'invalid insert values!'];
      }
      return [true, ''];
    }
    case 'TRANSACTION': {
      return [true, ''];
    }
  }
  return [false, 'unknown statement!'];
}

export {
  ql_insert,
  ql_delete,
  ql_update,
  ql_select,
  ql_transaction,
  ql_check
};