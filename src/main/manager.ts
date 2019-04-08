import { Database, SystemData, Table } from './data'

/************ System Commands ************/

function create_database(data: SystemData, name: string): string {
  let db = new Database();
  db.name = name;
  db.tables = {};
  data.dbs[name] = db;
  return 'new database created.';
}

function drop_database(data: SystemData, name: string): string {
  delete data.dbs[name];
  if (data.cur_db == name) 
    data.cur_db = '';
  return 'database destroyed.';
}

function use_database(data: SystemData, name: string): string {
  if (data.dbs[name]) {
    data.cur_db = name;
    return 'using database ' + name + '.';
  } else {
    return name + ' is not a database!';
  }
}

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

function show_table(data: SystemData): string {
  if (data.cur_db) {
    return Object.keys(data.dbs[data.cur_db].tables).join('\r\n');
  } else {
    return 'not using any database!';
  }
}

function set_plan_drawing(data: SystemData, state: boolean): string {
  data.show_plan = state;
  if (state) return 'plan drawing on.'
  else return 'plan drawing off.'
}

/************ Data Definition Language ************/

function create_table(data: SystemData, tree: any): string {
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
  create_table,
  drop_table
};
