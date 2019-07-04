%lex

%options case-insensitive

%%

(['](\\.|[^']|\\\')*?['])+                      return 'STRING'

"--"(.*?)($|\r\n|\r|\n)                         /* skip -- comments */

\s+                                             /* skip whitespace */

'CREATE'                                        return 'CREATE'
'TABLE'                                         return 'TABLE'
'DATABASE'                                      return 'DATABASE'
'DELETE'                                        return 'DELETE'
'INSERT'                                        return 'INSERT'
'UPDATE'                                        return 'UPDATE'
'SET'                                           return 'SET'
'DROP'                                          return 'DROP'
'INTO'                                          return 'INTO'
'VALUES'                                        return 'VALUES'
'SELECT'                                        return 'SELECT'
'AS'                                            return 'AS'
'FROM'                                          return 'FROM'
'JOIN'                                          return 'JOIN'
'INNER'                                         return 'INNER'
'OUTER'                                         return 'OUTER'
'CROSS'                                         return 'CROSS'
'ON'                                            return 'ON'
'WHERE'                                         return 'WHERE'
'AND'                                           return 'AND'
'OR'                                            return 'OR'
'BEGIN'                                         return 'BEGIN'
'COMMIT'                                        return 'COMMIT'

[-]?(\d*[.])?\d+[eE]\d+                         return 'NUMBER'
[-]?(\d*[.])?\d+                                return 'NUMBER'

'+'                                             return 'PLUS'
'-'                                             return 'MINUS'
'*'                                             return 'STAR'
'/'                                             return 'SLASH'
'%'                                             return 'REM'
'>>'                                            return 'RSHIFT'
'<<'                                            return 'LSHIFT'
'<>'                                            return 'NE'
'!='                                            return 'NE'
'>='                                            return 'GE'
'>'                                             return 'GT'
'<='                                            return 'LE'
'<'                                             return 'LT'
'='                                             return 'EQ'
'&'                                             return 'BITAND'
'|'                                             return 'BITOR'

'('                                             return 'LPAR'
')'                                             return 'RPAR'

'.'                                             return 'DOT'
','                                             return 'COMMA'
':'                                             return 'COLON'
';'                                             return 'SEMICOLON'
'$'                                             return 'DOLLAR'
'?'                                             return 'QUESTION'
'^'                                             return 'CARET'

[a-zA-Z_][a-zA-Z_0-9]*                          return 'LITERAL'

<<EOF>>                                         return 'EOF'
.                                               return 'INVALID'

/lex

/* %left unary_operator binary_operator  */

%left OR
%left BETWEEN
%left AND
%right NOT
%left IS MATCH LIKE IN ISNULL NOTNULL NE EQ
%left ESCAPE
%left GT LE LT GE
%left BITAND BITOR LSHIFT RSHIFT
%left PLUS MINUS
%left STAR SLASH REM
%left CONCAT
%left COLLATE
%right BITNOT


%start main

%%

main
    : sql_stmt_list EOF
        {
            $$ = $1;
            return $$;
        }
    ;

sql_stmt_list
    : sql_stmt_list SEMICOLON sql_stmt
        { $$ = $1; if($3) $$.push($3); }
    | sql_stmt
        { $$ = [$1]; }
    ;

sql_stmt
    :
        { $$ = undefined; }
    ;

sql_stmt
    : create_table_stmt
    | drop_table_stmt
    | insert_stmt
    | select_stmt
    | delete_stmt
    | update_stmt
    | transaction_stmt
    ;

create_table_stmt
    : CREATE TABLE database_table_name LPAR column_defs RPAR
        {
            $$ = {
                statement: 'CREATE TABLE',
                column_defs: $5
            };
            yy.extend($$, $3);
        }
    ;

database_table_name
    : name DOT name
        { $$ = {database:$1, table:$3}; }
    | name
        { $$ = {table:$1}; }
    ;

name
    : LITERAL
        { $$ = $1; }
    ;

column_defs
    : column_defs COMMA column_def
        { $$ = $1; $$.push($3); }
    | column_def
        { $$ = [$1]; }
    ;

column_def
    : name type_name
        { $$ = {column:$1}; yy.extend($$, $2); }
    ;

type_name
    : name
        { $$ = {type: $1.toUpperCase()}; }
    ;

drop_table_stmt
    : DROP TABLE database_table_name
        { 
            $$ = {statement: 'DROP TABLE'}; 
            yy.extend($$,$3);
        }
    ;

insert_stmt
    : INSERT INTO database_table_name columns_par insert_values
        {
            $$ = {statement: 'INSERT'};
            yy.extend($$, $3, $4, $5);
        }
    ;

columns_par
    :
        { $$ = undefined; }
    | LPAR columns RPAR
        { $$ = {columns: $2}}
    ;

columns
    : columns COMMA name
        { $$ = $1; $$.push($3); }
    | name
        { $$ = [$1]; }
    ;

insert_values
    : VALUES values
        { $$ = {values: $2}; }
    ;

values
    : values COMMA value
        { $$ = $1; $$.push($3); }
    | value
        { $$ = [$1]; }
    ;

value
    : LPAR subvalues RPAR
        { $$ = $2; }
    ;

subvalues
    : subvalues COMMA expr
        { $$ = $1; $$.push($3); }
    | expr
        { $$ = [$1]; }
    ;

expr
    : literal_value
        { $$ = $1; }
    | name
        { $$ = {column: $1}; }
    | name DOT name
        { $$ = {table: $1, column: $3}; }
    | name DOT name DOT name
        { $$ = {database: $1, table: $3, column: $5}; }

    | expr EQ expr
        { $$ = {op: 'EQ', left: $1, right: $3}; }
    | expr NE expr
        { $$ = {op: 'NE', left: $1, right: $3}; }
    | expr GT expr
        { $$ = {op: 'GT', left: $1, right: $3}; }
    | expr GE expr
        { $$ = {op: 'GE', left: $1, right: $3}; }
    | expr LT expr
        { $$ = {op: 'LT', left: $1, right: $3}; }
    | expr LE expr
        { $$ = {op: 'LE', left: $1, right: $3}; }

    | expr AND expr
        { $$ = {op: 'AND', left: $1, right: $3}; }
    | expr OR expr
        { $$ = {op: 'OR', left: $1, right: $3}; }
    ;

literal_value
    : NUMBER
        { $$ = {type:'number', data: parseFloat($1)}; }
    | STRING
        { $$ = {type:'string', data: $1.substring(1, $1.length - 1)}}
    ;

select_stmt
    : compound_selects
        {
            $$ = {statement: 'SELECT', selects: $1};
        }
    ;

compound_selects
    : select
        { $$ = [$1]; }
    ;

select
    : SELECT result_columns from where
        {
            $$ = {};
            yy.extend($$, $2, $3, $4);
        }
    ;

result_columns
    : column_list
        { $$ = {star: false, result_columns: $1}; }
    | STAR
        { $$ = {star: true}; }
    ;

column_list
    : column_list COMMA name
        { $$ = $1; $$.push($3); }
    | name
        { $$ = [$1]; }
    ;

alias
    :
        { $$ = undefined;}
    | name
        { $$ = {alias: $1};}
    | AS name
        { $$ = {alias: $2};}
    ;

from
    : FROM join_clause
        { $$ = {from: $2}; }
    ;

join_clause
    : table_or_subquery
        { $$ = [$1]; }
    | join_clause join_operator table_or_subquery join_constraint
        {
            yy.extend($3, $2, $4);
            $$.push($3);
        }
    ;

table_or_subquery
    : database_table_name alias
        { $$ = $1; yy.extend($$, $2); }
    ;

join_operator
    : COMMA
        { $$ = {join_type: 'CROSS'}; }
    | join_type JOIN
        { $$ = $1; }
    ;

join_type
    :
        { $$ = {join_type: 'INNER'}; }
    | INNER
        { $$ = {join_type: 'INNER'}; }
    | CROSS
        { $$ = {join_type: 'CROSS'}; }
    ;

join_constraint
    :
        { $$ = undefined; }
    | ON expr
        { $$ = {on: $2}; }
    ;

where
    : WHERE expr
        { $$ = {where: $2}; }
    |
    ;

delete_stmt
    : DELETE FROM database_table_name where
        { 
            $$ = {statement:'DELETE'};
            yy.extend($$,$3);
            yy.extend($$,$4);
        }
    ;

update_stmt
    : UPDATE database_table_name SET column_expr_list where
        { 
            $$ = {statement: 'UPDATE', set: $4};
            yy.extend($$,$2);
            yy.extend($$,$5);
        }
    ;

column_expr_list
    : column_expr_list COMMA column_expr
        { $$ = $1; $$.push($3); }
    | column_expr
        { $$ = [$1]; }
    ;

column_expr
    : name EQ expr
        { $$ = {column:$1, expr: $3}; }
    ;

transaction_stmt
    : BEGIN SEMICOLON sql_stmt_list COMMIT SEMICOLON
        {
            $$ = {statement: 'TRANSACTION', contents: $3}
        }
    ;