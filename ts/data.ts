class Table {
  name: string;
  column_names: string[];
  data: any[][];

  constructor(name: string, col_names: string[]) {
    this.name = name;
    this.column_names = col_names;
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
}

export { Table, Database };