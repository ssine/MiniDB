/**
 * @file Provide functions that manages the system and executes DDL.
 */
import { Database, SystemData, Table } from './data'
import { Create } from '../parser'
import { show_panel } from './utls'

/************ System Commands ************/

/**
 * Create a new database in the system with given database name.
 */
function create_database(data: SystemData, name: string): string {
  let db = new Database();
  db.name = name;
  db.tables = {};
  data.dbs[name] = db;
  return 'new database created.';
}

/**
 * Drop a database in the system with given name.
 */
function drop_database(data: SystemData, name: string): string {
  delete data.dbs[name];
  if (data.cur_db == name) 
    data.cur_db = '';
  return 'database destroyed.';
}

/**
 * Set active database (default database when SQL is executed).
 */
function use_database(data: SystemData, name: string): string {
  if (data.dbs[name]) {
    data.cur_db = name;
    return 'using database ' + name + '.';
  } else {
    return name + ' is not a database!';
  }
}

/**
 * Show all the databases in the system.
 * The active one is marked with '*'.
 */
function show_database(data: SystemData): string {
  let dbs = Object.keys(data.dbs);
  let cur = data.cur_db;
  let res = '';
  dbs.forEach(n => {
    res += '\r\n' + (n == cur ? '* ' : '  ') + n;
  });
  res = 'Databases: ' + res;
  return res;
}

/**
 * Show all the tables in the active database.
 */
function show_table(data: SystemData): string {
  if (data.cur_db) {
    return Object.keys(data.dbs[data.cur_db].tables).join('\r\n');
  } else {
    return 'not using any database!';
  }
}

/**
 * Draw physics plans when a SELECT statement is executed.
 */
function set_plan_drawing(data: SystemData, state: boolean): string {
  data.show_plan = state;
  if (state) return 'plan drawing on.';
  else return 'plan drawing off.';
}

/**
 * Draw physics plans when a SELECT statement is executed.
 */
function set_panel_on(data: SystemData): string {
  data.panel_on = true;
  show_panel(data);
  return 'panel opened.';
}

/************ Data Definition Language ************/

/**
 * Create a table in active database with given SQL parse tree.
 */
function create_table(data: SystemData, tree: Create): string {
  let dbn = data.cur_db;
  if (tree.database) dbn = tree.database;

  let tb = new Table();

  tb.name = tree.table;
  tb.col_name = [];
  tb.col_id = [];
  tb.types = [];
  tb.data = [];
  if (tree.column_defs) {
    tree.column_defs.forEach(col => {
      tb.col_name.push(col.column);
      tb.col_id.push(tb.name + '.' + col.column);
      tb.types.push(col.type);
    });
  }

  data.dbs[dbn].tables[tree.table] = tb;
  
  return 'new table created.';
}

/**
 * Drop a table in active database with given SQL parse tree.
 */
function drop_table(data: SystemData, tree: any): string {
  delete data.dbs[data.cur_db].tables[tree.table];
  return 'table destroyed.';
}


export {
  create_database,
  drop_database,
  use_database,
  show_database,
  show_table,
  set_plan_drawing,
  set_panel_on,
  create_table,
  drop_table
};
