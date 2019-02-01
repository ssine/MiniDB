import { Table, Database, SystemData } from './data'

function get_table(data: SystemData, tree: any): Table {
  let db = data.cur_db;
  if (tree.database) db = tree.database;
  if (!tree.table) throw 'must specify a table name!';
  let tb = tree.table;
  return data.dbs[db].tables[tb];
}

function eval_valu_expr(tb: Table, tree: any, pos: number): (number | string | Date) {
  if (tree.op) throw 'not a valid value expression';
  if (tree.column) {
    return tb.data[pos][tb.col_names.indexOf(tree.column)];
  } else if(tree.data) {
    return tree.data;
  }
  throw 'not a valid value expression';
}

function eval_cond_expr(tb1: Table, tb2: Table, tree: any, i: number, j: number): boolean {
  if (!tree.op) throw 'not conditional expression!';
  switch (tree.op) {
    case 'AND':
      return eval_cond_expr(tb1, tb2, tree.left, i, j) && eval_cond_expr(tb1, tb2, tree.right, i, j);
    case 'OR':
      return eval_cond_expr(tb1, tb2, tree.left, i, j) || eval_cond_expr(tb1, tb2, tree.right, i, j);
  }
  let lt = tb1, rt = tb2;
  let lp = i, rp = j;
  if (tree.left.table) {
    if (tree.left.table == tb2.name) {
      lt = tb2;
      lp = j;
    }
  }
  if (tree.right.table) {
    if (tree.right.table == tb1.name) {
      rt = tb1;
      rp = i;
    }
  }
  switch (tree.op) {
    case 'EQ':
      return eval_valu_expr(lt, tree.left, lp) == eval_valu_expr(rt, tree.right, rp);
    case 'NE':
      return eval_valu_expr(lt, tree.left, lp) != eval_valu_expr(rt, tree.right, rp);
    case 'GT':
      return eval_valu_expr(lt, tree.left, lp) > eval_valu_expr(rt, tree.right, rp);
    case 'GE':
      return eval_valu_expr(lt, tree.left, lp) >= eval_valu_expr(rt, tree.right, rp);
    case 'LT':
      return eval_valu_expr(lt, tree.left, lp) < eval_valu_expr(rt, tree.right, rp);
    case 'LE':
      return eval_valu_expr(lt, tree.left, lp) <= eval_valu_expr(rt, tree.right, rp);
  }
  throw 'not a valid conditional expression!';
}

function eval_where_expr(tb: Table, tree: any, pos: number): boolean {
  if (!tree.op) throw 'not conditional expression!';
  switch (tree.op) {
    case 'AND':
      return eval_where_expr(tb, tree.left, pos) && eval_where_expr(tb, tree.right, pos);
    case 'OR':
      return eval_where_expr(tb, tree.left, pos) || eval_where_expr(tb, tree.right, pos);
  }

  switch (tree.op) {
    case 'EQ':
      return eval_valu_expr(tb, tree.left, pos) == eval_valu_expr(tb, tree.right, pos);
    case 'NE':
      return eval_valu_expr(tb, tree.left, pos) != eval_valu_expr(tb, tree.right, pos);
    case 'GT':
      return eval_valu_expr(tb, tree.left, pos) > eval_valu_expr(tb, tree.right, pos);
    case 'GE':
      return eval_valu_expr(tb, tree.left, pos) >= eval_valu_expr(tb, tree.right, pos);
    case 'LT':
      return eval_valu_expr(tb, tree.left, pos) < eval_valu_expr(tb, tree.right, pos);
    case 'LE':
      return eval_valu_expr(tb, tree.left, pos) <= eval_valu_expr(tb, tree.right, pos);
  }
  throw 'not a valid conditional expression!';
}

function tableJoin(tb1: Table, tb2: Table, type: ('inner'|'cross'), on?: any): Table {
  let tb = new Table(tb2.name);
  tb.col_names = tb1.col_names.concat(tb2.col_names);
  tb.types = tb1.types.concat(tb2.types);

  if (type == 'cross') {

    for (let i = 0; i < tb1.data.length; i++) {
      for (let j = 0; j < tb2.data.length; j++) {
        // console.log(tb1.data[i].concat(tb2.data[j]));
        tb.data.push(tb1.data[i].concat(tb2.data[j]));
      }
    }
    
  } else if (type == 'inner') {
    if (on == undefined) throw "inner join must have a condition!";
    
    for (let i = 0; i < tb1.data.length; i++) {
      for (let j = 0; j < tb2.data.length; j++) {
        if (eval_cond_expr(tb1, tb2, on, i, j))
          tb.data.push(tb1.data[i].concat(tb2.data[j]));
      }
    }
    
  }
  console.log(tb);
  return tb;
}

function tableFilter(tb: Table, cond: any): Table {
  for (let i = tb.data.length - 1; i >= 0; i--) {
    if (!eval_where_expr(tb, cond, i))
      tb.data.splice(i, 1);
  }
  return tb;
}

function tableMask(tb: Table, cols: string[]): Table {
  let idx_map = new Int32Array(cols.length);
  for (let i = 0; i < idx_map.length; i++) {
    idx_map[i] = tb.col_names.indexOf(cols[i]);
  }
  tb.col_names = cols;
  for (let i = 0; i < tb.data.length; i++) {
    let cur = [];
    for (let j = 0; j < idx_map.length; j++) {
      cur.push(tb.data[i][idx_map[j]]);
    }
    tb.data[i] = cur;
  }
  return tb;
}

export { tableJoin, tableFilter, tableMask };