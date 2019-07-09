
import * as bodyParser from "body-parser"
import * as express from "express"
import { Table, Database, SystemData } from "./data";
import { Trees } from "../parser";
import {
    create_database,
    drop_database,
    use_database,
    show_database,
    show_table,
    set_plan_drawing,
    set_panel_on,
    create_table,
    drop_table
} from './manager'
import {
    ql_insert,
    ql_delete,
    ql_update,
    ql_select,
    ql_check
} from './query'
import {
    BeginTxLog,
    CommitTxLog,
    writeLog
} from './log'
class TransactionClass 
{
    content: Trees;
    cur_query_index: number;
    res: string;
    response;
    sys_data: SystemData;
    txID: number;

    constructor(content: Trees, response, sys_data: SystemData) {
        this.content = content;
        console.log(this.content.length);
        this.response = response;
        this.sys_data = sys_data;
        this.cur_query_index = 0;
        this.res = '';
        this.txID = sys_data.tx_cnt++;
        this.start()
        console.log('Transaction Init')
    }
    start() {
        //write ahead log
        let beginTxLog = new BeginTxLog(this.txID);
        writeLog(beginTxLog);
        setTimeout(this.process_query.bind(this), 0);
        this.sys_data.runningTxs.push(this.txID);
    }
    process_query() {
        console.log(this.content.length);
        let stmt_tree = this.content[this.cur_query_index];
        let check_res: boolean, check_err: string;
        let query_res: string = '';
    
        // Process all the SQL parse trees.
        if (!stmt_tree) return '';
        // Perform semantic checking.
        [check_res, check_err] = ql_check(this.sys_data, stmt_tree);
        if (!check_res) {
            query_res += check_err + '\r\nsemantic check failed!\r\n';
            return query_res;
        }
        switch (stmt_tree.statement) {
        case 'CREATE TABLE':
            query_res += create_table(this.sys_data, stmt_tree);
            break;
        case 'DROP TABLE':
            query_res += drop_table(this.sys_data, stmt_tree);
            break;
        // case 'CREATE INDEX':
        // case 'DROP INDEX':
        case 'SELECT':
            query_res += ql_select(this.sys_data, stmt_tree);
            break;
        case 'INSERT':
            query_res += ql_insert(this.sys_data, stmt_tree, this.txID);
            break;
        case 'DELETE':
            query_res += ql_delete(this.sys_data, stmt_tree, this.txID);
            break;
        case 'UPDATE':
            query_res += ql_update(this.sys_data, stmt_tree, this.txID);
            break;
        default:
            query_res += 'Action not yet implemented.\r\n';
            break;
        }
    
        if(query_res == 'locked') {
            setTimeout(this.process_query, 0); 
            console.log(stmt_tree.statement + " locked");    
            return;     
        }
        this.cur_query_index++;
        this.res += query_res;
        if(this.cur_query_index == this.content.length) {
            //write ahead log
            let commitTxLog = new CommitTxLog(this.txID);
            writeLog(commitTxLog);
            this.response.send(this.res);
            
            let idx = this.sys_data.runningTxs.indexOf(this.txID);
            this.sys_data.runningTxs.splice(idx,1);
        } else {
            setTimeout(this.process_query, 0);       
        }
    }
    
}
export { TransactionClass };


//Lock dictionary
// Table name as key
let read_locks = {};
let write_locks = {};
function lock_r(table_name: string) {
    read_locks[table_name] = true;
}

function unlock_r(table_name: string) {
    read_locks[table_name] = true;
}

function destroy_lock_r(table_name: string) {
    delete read_locks[table_name];
}

function is_locked_r(table_name: string):boolean {
    if(read_locks[table_name] == true) {
        return true;
    } else {
        return false; 
    }
}

function lock_w(table_name: string) {
    write_locks[table_name] = true;
}

function unlock_w(table_name: string) {
    write_locks[table_name] = true;
}

function destroy_lock_w(table_name: string) {
    delete write_locks[table_name];
}

function is_locked_w(table_name: string):boolean {
    if(write_locks[table_name] == true) {
        return true;
    } else {
        return false; 
    }
}

function aquire_r_lock(table_name: string) {
    if(is_locked_w[table_name] == true) {
        return false;
    } else {
        return true;
    }
}

function aquire_w_lock(table_name: string) {
    if(is_locked_w[table_name] == true ||
         is_locked_r[table_name] == true) {
        return true;
    } else {
        return false;
    }
}


