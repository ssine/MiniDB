import { parser } from './parser'

/**
 * Mixin function for the parser.
 */
parser.yy.extend = function() {
  let target = arguments[0] || {};
  if (typeof target != "object" && typeof target != "function") {
    target = {};
  }
  for (let i = 1; i < arguments.length; i++) {
    let source = arguments[i];
    for (let key in source) {
      target[key] = source[key];
    }
  }
  return target;
}

// specifications of the parsing tree

interface TableName {
  table: string,
  database?: string
}

interface ColumnName {
  column: string,
  table?: string,
  database?: string
}

interface Literal {
  type: 'number' | 'string',
  data: number | string
}

interface Expression {
  op: string,
  left: Expression | ColumnName | Literal,
  right: Expression | ColumnName | Literal
}

interface JoinClause {
  table: string,
  database?: string,
  join_type?: string,
  on?: Expression
}

interface Select {
  statement: 'SELECT',
  selects: {
    star: boolean,
    result_columns?: string[],
    from: JoinClause[],
    where: Expression
  }[]
}

interface Insert {
  statement: 'INSERT',
  table: string,
  database?: string,
  columns?: ColumnName[],
  values: Literal[][]
}

interface Create {
  statement: 'CREATE TABLE',
  table: string,
  database?: string,
  column_defs: {column: string, type: ("string"|"number"|"date")}[]
}

interface Drop {
  statement: 'DROP TABLE',
  table: string,
  database?: string,
}

interface Delete {
  statement: 'DELETE',
  table: string,
  database?: string,
  where?: Expression
}

interface Update {
  statement: 'UPDATE',
  table: string,
  database?: string,
  set: {column: string, expr: Literal}[],
  where: Expression
}

type Tree = Select|Insert|Create|Drop|Delete|Update

interface Trees extends Array<Tree> { }

export {
  parser,
  TableName,
  ColumnName,
  Literal,
  Expression,
  Select,
  Insert,
  Create,
  Drop,
  Delete,
  Update,
  Tree,
  Trees
}