
import * as bodyParser from "body-parser"
import * as express from "express"
import { Table, Database, SystemData } from "./data";
import { Trees, Tree } from "../parser";
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
    ql_check,
    get_table
} from './query'
import {
    BeginTxLog,
    CommitTxLog,
    writeLog
} from './log'
import { emitter } from './emitter'
import { getType } from "mime";
import { readlink } from "fs";

class TransactionClass 
{
    content: Trees;
    cur_query_index: number;
    res: string;
    response;
    sys_data: SystemData;
    txID: number;
    r_locks: Table[];
    w_locks: Table[];
    constructor(content: Trees, response, sys_data: SystemData) {
        this.content = content;
        this.response = response;
        this.sys_data = sys_data;
        this.cur_query_index = 0;
        this.res = '';
        this.txID = sys_data.tx_cnt++;
        this.r_locks = [];
        this.w_locks = [];
        console.log('Transaction ' + this.txID + ' Init')
        if(this.check_semantic()) {
            console.log('Transaction ' + this.txID + ' Start requiring locks')
            setTimeout(this.require_locks.bind(this), 0);
        }
    }
    check_semantic() {
        let check_res: boolean, check_err: string;
        let stmt_tree: Tree;
        let tree_i;
        // Process all the SQL parse trees.
        for(tree_i in this.content) {
            stmt_tree = this.content[tree_i];
            if (!stmt_tree) {
                this.response.send('');
                return false;
            }
            // Perform semantic checking.
            [check_res, check_err] = ql_check(this.sys_data, stmt_tree);
            if (!check_res) {
                this.response.send(check_err + '\r\nsemantic check failed!\r\n');
                return false;
            } 
        }
        return true;
    }
    require_locks() {
        let stmt_tree: Tree;
        let tree_i;
        for(tree_i in this.content) {
            stmt_tree = this.content[tree_i];
            switch (stmt_tree.statement) {
                case 'SELECT':  
                    let i;
                    for(i in stmt_tree.selects[0].from) {
                        let tb = get_table(this.sys_data, stmt_tree.selects[0].from[i]);
                        // If write lock has been required by other tx,
                        // clear lock_queue and restart requiring locks
                        if(tb.w_lock_owner != this.txID && tb.w_lock_owner >= 0) {
                            this.clear_lock_queue();
                            setTimeout(this.require_locks.bind(this), 0);
                            return;
                        } else {
                            this.r_locks.push(tb);
                        }
                    }
                    break;
                default:
                    let tb = get_table(this.sys_data, stmt_tree);
                    // If write or read lock has been required by other tx,
                    // clear lock_queue and restart requiring locks
                    if((tb.w_lock_owner != this.txID && tb.w_lock_owner >= 0)
                        || (tb.r_lock_owner != this.txID && tb.r_lock_owner >= 0)) {
                        this.clear_lock_queue();
                        setTimeout(this.require_locks.bind(this), 0);
                        return;
                    } else {
                        this.w_locks.push(tb);
                    }
                    break;
            }
        }
        let tb_i;
        for(tb_i in this.r_locks) {
            this.r_locks[tb_i].r_lock_owner = this.txID;
        }
        for(tb_i in this.w_locks) {
            this.w_locks[tb_i].w_lock_owner = this.txID;
        }
        this.start()
    }
    start() {
        //write ahead log
        console.log('Transaction ' + this.txID + ' Locks required')        
        let beginTxLog = new BeginTxLog(this.txID);
        writeLog(beginTxLog);
        setTimeout(this.process_query.bind(this), this.sys_data.debug?5000:0);
        this.sys_data.runningTxs.push(this.txID);
        emitter.emit('data-modified');
    }
    clear_lock_queue() {
        this.r_locks = []
        this.w_locks = []
    }
    release_locks() {
        let tb_i;
        for(tb_i in this.r_locks) {
            this.r_locks[tb_i].r_lock_owner = -1;
        }
        for(tb_i in this.w_locks) {
            this.w_locks[tb_i].w_lock_owner = -1;
        }
        this.clear_lock_queue()
    }
    process_query() {
        let stmt_tree = this.content[this.cur_query_index];
        let query_res: string = '';
    
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
        // commit
        if(this.cur_query_index == this.content.length) {
            console.log('Transaction ' + this.txID + ' Committed')
            // write ahead log
            let commitTxLog = new CommitTxLog(this.txID);
            writeLog(commitTxLog);
            this.response.send(this.res);
            
            let idx = this.sys_data.runningTxs.indexOf(this.txID);
            this.sys_data.runningTxs.splice(idx,1);
            emitter.emit('data-modified');
            this.release_locks();
        } else {
            // next query
            setTimeout(this.process_query.bind(this), this.sys_data.debug?5000:0);       
        }
    }
    
}
export { TransactionClass };

