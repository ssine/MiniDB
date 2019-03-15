class Table {
  name: string;
  col_name: string[];
  col_id: string[];
  types: ('number'|'string'|'date')[];
  data: any[][];
}

class Database {
  name: string;
  tables: {[tb_name: string]: Table};
}

class SystemData {
  dbs: {[db_name: string]: Database};
  cur_db: string;
}

export { Table, Database, SystemData };