/**
 * physical plans to be implemented:
 * 
 * compute_scalar
 * table_filter
 * 
 * hash_join
 * merge_join
 * nested_loop_join
 * 
 * aggregate
 * 
 * table_project
 * 
 * table_insert
 * index_insert
 * clustered_index_insert
 * 
 * table_delete
 * index_delete
 * clustered_index_delete
 * 
 * table_update
 * index_update
 * clustered_index_update
 * 
 * table_scan
 * index_scan
 * clustered_index_scan
 * 
 * ref: https://docs.microsoft.com/en-us/sql/relational-databases/showplan-logical-and-physical-operators-reference?view=sql-server-2017
 * 
 * helper functions:
 * 
 * eval_valu_expr
 * eval_cond_expr
 */

import { Table } from './data';
import { Expression, ColumnName, Literal } from '../parser'
import { emitter } from './emitter'

class table_insert {
  table: Table;
  rows: any[][];
  pos: number;

  constructor(table: Table, rows: any[][]) {
    this.table = table;
    this.rows = rows;
    this.pos = 0;
  }

  get_next():boolean {
    if (this.pos < this.rows.length) {
      this.table.data.push(this.rows[this.pos++]);

      emitter.emit('data-modified', {
        type: 'insert',
        table: this.table.name,
        row: this.rows[this.pos-1]
      });

      return true;
    } else {
      return false;
    }
  }
}

class table_delete {
  table: Table;
  where: (pos: number) => boolean;
  pos: number;

  constructor(table: Table, where?: Expression) {
    this.table = table;
    this.pos = 0;
    if (where) this.where = pos =>
      eval_cond_expr(this.table.data[pos], this.table.col_id, where);
    else this.where = _ => true;
  }

  get_next(): boolean {
    while (this.pos < this.table.data.length) {
      if (this.where(this.pos)) {
        this.table.data.splice(this.pos, 1);
        return true;
      } else {
        this.pos ++;
      }
    }
    return false;
  }
}

class table_update {
  table: Table;
  cols: string[];
  set_to: any;
  where: (pos: number) => boolean;
  pos: number;

  constructor(table: Table, cols: string[], set_to: (number|string)[], where?: Expression) {
    this.table = table;
    this.cols = cols;
    this.set_to = set_to;
    this.pos = 0;
    if (where) this.where = pos =>
      eval_cond_expr(this.table.data[pos], this.table.col_id, where);
    else this.where = _ => true;
  }

  get_next(): boolean {
    while (this.pos < this.table.data.length) {
      if (this.where(this.pos)) {
        this.cols.forEach((col, idx) => {
          this.table.data[this.pos][this.table.col_name.indexOf(col)] = this.set_to[idx];
        });
        this.pos++;
        return true;
      } else {
        this.pos ++;
      }
    }
    return false;
  }
}

interface Scanner {
  /**
   * Get the next valid record of the Scanner
   */
  get_next: () => any[] | false;

  /**
   * Get the id of the columns.
   */
  get_col_id: () => string[];

  /**
   * Get Scanner infomation (name, children) for visualization.
   */
  get_info: () => plan_info;
}

class table_scan implements Scanner {
  table: Table;
  where: (pos: number) => boolean;
  pos: number;

  constructor(table: Table, where?: Expression) {
    this.table = table;
    this.pos = 0;
    if (where) this.where = pos =>
      eval_cond_expr(this.table.data[pos], this.table.col_id, where);
    else this.where = _ => true;
  }

  get_next(): any[] | false {
    while (this.pos < this.table.data.length) {
      if (this.where(this.pos)) {
        return this.table.data[this.pos++];
      } else {
        this.pos ++;
      }
    }
    return false;
  }

  get_col_id(): string[] {
    return this.table.col_id;
  }

  get_info(): plan_info {
    return {
      name: 'table_scan: ' + this.table.name,
      children: []
    }
  }
}

class nested_loop_join implements Scanner {
  sc1: Scanner;
  sc2: Scanner;
  col_id: string[];
  data1: any[][];
  data2: any[][];
  pos1: number;
  pos2: number;
  on: (row: any[]) => boolean;

  constructor(sc1: Scanner, sc2: Scanner, type: string, on?: Expression) {
    this.sc1 = sc1;
    this.sc2 = sc2;
    this.col_id = sc1.get_col_id().concat(sc2.get_col_id());
    this.data1 = [];
    this.data2 = [];
    let row;
    while (row = this.sc1.get_next())
      this.data1.push(row);
    while (row = this.sc2.get_next())
      this.data2.push(row);
    this.pos1 = this.pos2 = 0;
    if (on) this.on = row => eval_cond_expr(row, this.col_id, on);
    else this.on = _ => true;
  }

  get_next(): any {
    
    while (true) {
      if (this.pos2 >= this.data2.length) {
        this.pos2 = 0;
        this.pos1++;
      }
      if (this.pos1 >= this.data1.length)
        return false;
        
      let row = this.data1[this.pos1].concat(this.data2[this.pos2++]);
      
      if (this.on(row))
        return row;
    }

  }

  get_col_id() {
    return this.col_id;
  }

  get_info(): plan_info {
    return {
      name: 'nested_loop_join',
      children: [this.sc1.get_info(), this.sc2.get_info()]
    }
  }
}

class table_filter implements Scanner {
  sc: Scanner;
  col_id: string[];
  where: (row: any[]) => boolean;

  constructor(sc: Scanner, where?: Expression) {
    this.sc = sc;
    this.col_id = sc.get_col_id();
    if (where) this.where = row =>
      eval_cond_expr(row, this.col_id, where);
    else this.where = _ => true;
  }

  get_next(): any[] | false {
    let row = this.sc.get_next();
    while (row) {
      if (this.where(row)) {
        return row;
      }
      row = this.sc.get_next();
    }
    return false;
  }

  get_col_id(): string[] {
    return this.col_id;
  }

  get_info(): plan_info {
    return {
      name: 'table_filter',
      children: [this.sc.get_info()]
    }
  }
}

class table_project implements Scanner {
  sc: Scanner;
  col_id: string[];
  idx_map: number[];

  constructor(sc: Scanner, cols: string[]) {
    this.sc = sc;
    this.col_id = cols;
    let old_col_id = sc.get_col_id();

    this.idx_map = cols.map(c => old_col_id.indexOf(c));

    // console.log('new: ' + this.col_id.toString());
    // console.log('old: ' + old_col_id.toString());
    // console.log('mask: ' + this.idx_map.toString());
  }

  get_next(): any[] | false {
    let row = this.sc.get_next();
    if (row) {
      let res = [];
      this.idx_map.forEach(idx => {
        res.push(row[idx]);
      });
      return res;
    }
    return false;
  }

  get_col_id(): string[] {
    return this.col_id;
  }

  get_info(): plan_info {
    return {
      name: 'table_project',
      children: [this.sc.get_info()]
    }
  }
}

class plan_info {
  name: string;
  children: plan_info[];
}

export { 
  table_delete,
  table_insert,
  Scanner,
  table_scan,
  table_update,
  nested_loop_join,
  table_filter,
  table_project,
  plan_info
}

function eval_valu_expr(row: any[], col_id: string[], tree: ColumnName|Literal): (number | string | Date) {
  if((<any>tree).op) throw 'not a value expression!';
  if ((<ColumnName>tree).column) {
    // console.log('col value: ' + row[col_id.indexOf((<ColumnName>tree).column)]);
    return row[col_id.indexOf((<ColumnName>tree).column)];
  } else if((<Literal>tree).data) {
    // console.log('literal value: ' + (<Literal>tree).data);
    return (<Literal>tree).data;
  }
  throw 'not a valid value expression';
}

function eval_cond_expr(row: any[], col_id: string[], tree: Expression): boolean {
  if (!tree.op) throw 'not a conditional expression!';

  // console.log('evaluating ' + tree.op + '.');
  // console.log('row: ' + row.toString());
  // console.log('col: ' + col_id.toString());

  switch (tree.op) {
    case 'AND':
      return eval_cond_expr(row, col_id, <Expression>tree.left) && eval_cond_expr(row, col_id, <Expression>tree.right);
    case 'OR':
      return eval_cond_expr(row, col_id, <Expression>tree.left) || eval_cond_expr(row, col_id, <Expression>tree.right);
  }

  switch (tree.op) {
    case 'EQ':
      return eval_valu_expr(row, col_id, <ColumnName|Literal>tree.left) == eval_valu_expr(row, col_id, <ColumnName|Literal>tree.right);
    case 'NE':
      return eval_valu_expr(row, col_id, <ColumnName|Literal>tree.left) != eval_valu_expr(row, col_id, <ColumnName|Literal>tree.right);
    case 'GT':
      return eval_valu_expr(row, col_id, <ColumnName|Literal>tree.left) > eval_valu_expr(row, col_id, <ColumnName|Literal>tree.right);
    case 'GE':
      return eval_valu_expr(row, col_id, <ColumnName|Literal>tree.left) >= eval_valu_expr(row, col_id, <ColumnName|Literal>tree.right);
    case 'LT':
      return eval_valu_expr(row, col_id, <ColumnName|Literal>tree.left) < eval_valu_expr(row, col_id, <ColumnName|Literal>tree.right);
    case 'LE':
      return eval_valu_expr(row, col_id, <ColumnName|Literal>tree.left) <= eval_valu_expr(row, col_id, <ColumnName|Literal>tree.right);
  }
  throw 'not a valid conditional expression!';
}
