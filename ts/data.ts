import * as fs from 'fs'

class Table {
  name: string;
  col_names: string[];
  types: ('number'|'string'|'date')[];
  data: any[][];
  num_cols: number;

  constructor(name: string, col_defs?: {column: string, type: ('number'|'string'|'date')}[]) {
    this.name = name;
    this.col_names = [];
    this.types = [];
    this.data = [];
    if (col_defs) {
      col_defs.forEach(col => {
        this.col_names.push(col.column);
        this.types.push(col.type);
      });
    }
    this.num_cols = this.col_names.length;
  }

  load(data: any) {
    // load basic info
    for (let key in data) {
      this[key] = data[key];
    }
  }

  addRow(row: any[]) {
    this.data.push(row);
  }

  insert(values: any[][]) {
    // insert from parse tree node, not raw data!
    values.forEach(row => {
      let cur = [];
      row.forEach(element => {
        cur.push(element.data);
      })
      this.data.push(cur);
    });
  }

  insert_partial(cols: string[], values: any[][]) {
    let idxs = new Int32Array(cols.length);
    for (let i = 0; i < cols.length; i++)
      idxs[i] = this.col_names.indexOf(cols[i]);

    for (let row in values) {
      let cur = Array(...Array(this.num_cols)).map(_ => undefined);
      for (let i = 0; i < cols.length; i++)
        cur[idxs[i]] = row[i];
      this.data.push(cur);
    }
  }
}

class Database {
  name: string;
  tables: object;

  constructor(name: string) {
    this.name = name;
    this.tables = {};
  }

  addTable(table: Table) {
    this.tables[table.name] = table;
  }

  load(data: any) {
    // load basic info
    for (let key in data) {
      if (typeof this[key] != "object") {
        this[key] = data[key];
      }
    }
    // create tables
    for (let tb in data.tables) {
      this.tables[tb] = new Table(tb);
      this.tables[tb].load(data.tables[tb]);
    }
  }

}

class SystemData {
  dbs: object;
  cur_db: string;

  constructor() {
    this.dbs = {'test': new Database('test')};
    this.cur_db = 'test';
    this.load('./data.json');
  }
  
  save() {
    console.log('saving data file.');
    fs.writeFileSync('./data.json', JSON.stringify(this));
  }

  load(path: string) {
    try {
      let data = fs.readFileSync(path).toString();
      console.log('data exists, loading...');
      let dt = JSON.parse(data.toString());
      // load basic info
      for (let key in dt) {
        if (typeof this[key] != "object")
          this[key] = dt[key];
      }

      // create databases
      for (let key in dt.dbs) {
        this.dbs[key] = new Database(key);
        this.dbs[key].load(dt.dbs[key]);
      }
    } catch(error) {
      console.log('data not exists, will be saved after exit.');
    }
  }
}

export { Table, Database, SystemData };