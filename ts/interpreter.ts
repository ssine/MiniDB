/* Execute Data Definition Language from parse tree directly
 * Input: a parse tree
 * Output: execution result
 * 
 * Well, some DMLs are also implemented here for simplicity
 */
import { Table, Database, SystemData } from './data'

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
      if (tree.columns) data.dbs[db].tables[tb].insert_partial(tree.columns, tree.values);
      else data.dbs[db].tables[tb].insert(tree.values);
      return 'values inserted.';
    }
    default:
      break;
  }
}
