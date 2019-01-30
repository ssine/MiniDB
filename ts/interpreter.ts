/* Execute Data Definition Language from parse tree directly
 * Input: a parse tree
 * Output: execution result
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
      if (tree.database) db = tree.database
      data.dbs[db].addTable(new Table(tree.table, tree.column_defs));
      return 'new table created.';
    }
    default:
      break;
  }
}
