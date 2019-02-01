/* Execute Data Definition Language from parse tree directly
 * Input: a parse tree
 * Output: execution result
 *
 * Well, some DMLs are also implemented here for simplicity
 */
import { Table, Database, SystemData } from './data'
import { tableJoin, tableFilter, tableMask } from './executer'

function getTable(data: SystemData, clause: any): Table {
  let db = clause.database ? clause.database : data.cur_db;
  return data.dbs[db].tables[clause.table];
}

function charRepeat(c: string, n: number): string {
  return Array(n + 1).join(c);
}

function outputTable(tb: Table): string {
  let res = '';
  let lens = new Array(tb.col_names.length);
  for (let i = 0; i < lens.length; i++) {
    let max = 0;
    max = Math.max(max, tb.col_names[i].length);
    for (let j = 0; j < tb.data.length; j++)
      max = Math.max(max, tb.data[j][i].toString().length);
    lens[i] = max;
  }

  function printHR() {
    res += '+'
    lens.forEach(n => res += charRepeat('-', n+2) + '+');
    res += '\r\n';
  }

  printHR();

  res += '|'
  tb.col_names.forEach((col, idx) => {
    res += ' ';
    res += charRepeat(' ', lens[idx] - col.length);
    res += col + ' |';
  })
  res += '\r\n';

  printHR();

  tb.data.forEach(row => {
    res += '|'
    row.forEach((col, idx) => {
      res += ' ';
      res += charRepeat(' ', lens[idx] - col.toString().length);
      res += col.toString() + ' |';
    })
    res += '\r\n';
  })

  printHR();

  return res;
}

function interpret(tree: any, data: SystemData): string {
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
      for (let i = 1; i < sel.from.length; i++) {
        from_table = tableJoin(from_table,
                               getTable(data, sel.from[i]),
                               sel.from[i].join_type.toLowerCase(),
                               sel.from[i].on);
      }

      if (sel.where)
        from_table = tableFilter(from_table, sel.where);
      
      if (!sel.star)
        from_table = tableMask(from_table, sel.result_columns);
      console.log(from_table);
      console.log('from_table');
      // let tb = from_table.data;
      // let idx1 = from_table.col_names.indexOf(sel);

      return outputTable(from_table);
    }
    default:
      return 'action not implemented';
  }
}

export { outputTable, interpret };