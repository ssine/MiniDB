class Table {
  name: string;
  col_names: string[];
  types: ('number'|'string'|'date')[];
  data: any[][];

  constructor(name: string, col_defs: {column: string, type: ('number'|'string'|'date')}[]) {
    this.name = name;
    this.col_names = [];
    this.types = [];
    col_defs.forEach(col => {
      this.col_names.push(col.column);
      this.types.push(col.type);
    });
  }

  addRow(row: any[]) {
    this.data.push(row);
  }
}

class Database {
  name: string;
  tables: Table[];

  constructor(name: string) {
    this.name = name;
    this.tables = [];
  }

  addTable(table: Table) {
    this.tables.push(table);
  }
}

class SystemData {
  dbs: object;
  cur_db: string;

  constructor() {
    this.dbs = {'test': new Database('test')};
    this.cur_db = 'test';
  }
}

export { Table, Database, SystemData };