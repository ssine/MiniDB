/* Execute Data Definition Language from parse tree directly
 * Input: a parse tree
 * Output: execution result
 * 
 * Well, some DMLs are also implemented here for simplicity
 */
import { Table, Database, SystemData } from './data'

function getTable(data: SystemData, clause: any): Table {
  let db = clause.database ? clause.database : data.cur_db;
  return data.dbs[db].tables[clause.table];
}

function outputTable(tb: Table): string {
  let res = '';
  let lens = new Array(tb.num_cols);
  for (let i = 0; i < lens.length; i++) {
    let max = 0;
    max = Math.max(max, tb.col_names[i].length);
    for (let j = 0; j < tb.data.length; j++)
      max = Math.max(max, tb.data[j][i].toString().length);
    lens[i] = max;
  }

  tb.col_names.forEach((col, idx) => {
    res += ' ';
    res += Array(lens[idx] - col.length + 1).join(' ');
    res += col + '  ';
  })
  res += '\r\n';

  res += Array(res.length).join('-');
  res += '\r\n';
  
  tb.data.forEach(row => {
    row.forEach((col, idx) => {
      res += ' ';
      res += Array(lens[idx] - col.toString().length + 1).join(' ');
      res += col.toString() + '  ';
    })
    res += '\r\n';
  })
  
  return res;
}

export function interpret(tree: any, data: SystemData): string {
  switch (tree.statement) {
    case 'CREATE DATABASE': {
      let db = new Database(tree.database);
      data.dbs[tree.database] = db;
      return 'new database created.';
    }
    case 'CREATE TABLE': {
      let db = data.cur_db;
      if (tree.database) db = tree.database;
      data.dbs[db].addTable(new Table(tree.table, tree.column_defs));
      return 'new table created.';
    }
    case 'INSERT': {
      let db = data.cur_db;
      if (tree.database) db = tree.database;
      let tb = tree.table;
      if (tree.columns)
        data.dbs[db].tables[tb].insert_partial(tree.columns, tree.values);
      else
        data.dbs[db].tables[tb].insert(tree.values);
      return 'values inserted.';
    }
    case 'SELECT': {
      let sel = tree.selects[0];
      let from_table = getTable(data, sel.from[0]);

      // let tb = from_table.data;
      // let idx1 = from_table.col_names.indexOf(sel);

      return outputTable(from_table);
    }
    default:
      return 'action not implemented';
  }
}
