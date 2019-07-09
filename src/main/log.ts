import * as fs from 'fs'
import * as reverseLineReader from "reverse-line-reader"
import { SystemData } from './data'
import { emitter } from './emitter'
import {save_data} from './utls'

class OperationLog {
    timestamp: string;
    operation: string;
    transactionID: number;
    database: string;
    table: string;

    constructor(operation: string, txID: number, database: string, table: string) {
        this.timestamp = (new Date()).toLocaleString();
        this.operation = operation;
        this.transactionID = txID;
        this.database = database;
        this.table = table;
    }
}

class TransactionLog {
    timestamp: string;
    operation: string;
    transactionID: number;

    constructor(operation: string, txID: number) {
        this.timestamp = (new Date()).toLocaleString();
        this.operation = operation;
        this.transactionID = txID;
    }
}

class CheckPoint {
    timestamp: string;
    operation: string;
    runningTransactions: number[];

    constructor(runningTxs: number[]) {
        this.timestamp = (new Date()).toLocaleString();
        this.operation = 'CHECKPOINT';
        this.runningTransactions = runningTxs;
    }
}

class InsertLog extends OperationLog {
    value: any[];

    constructor(txID: number, database: string, table: string, value: any[]) {
        super('INSERT', txID, database, table);
        this.value = value;
    }
}

class DeleteLog extends OperationLog {
    row: number;
    value: any[];

    constructor(txID: number, database: string, table: string, row:number, value: any[]) {
        super('DELETE', txID, database, table);
        this.row = row;
        this.value = value;
    }
}

class UpdateLog extends OperationLog {
    row: number;
    column: string;
    updateFrom: any;
    updateTo: any;

    constructor(txID:number, database: string, table: string, row:number, column: string, updateFrom: any, updateTo: any) {
        super('UPDATE', txID, database, table);
        this.row = row;
        this.column = column;
        this.updateFrom = updateFrom;
        this.updateTo = updateTo;
    }
}

class BeginTxLog extends TransactionLog {
    constructor(txID: number) {
        super('BEGIN TRANSACTION', txID);
    }
}

class CommitTxLog extends TransactionLog {
    constructor(txID: number) {
        super('COMMIT TRANSACTION', txID);
    }
}

type Log = OperationLog | TransactionLog | CheckPoint;

let logPath = './log.json';

function writeLog(log: Log | CheckPoint) {
    fs.appendFileSync(logPath, JSON.stringify(log) + '\n');
}

async function recoverByLog(sysData: SystemData) {
    function containsRow(data: any[][], row: any[]): boolean {
        for (let i = 0; i < data.length; i++) {
            if (JSON.stringify(data[i]) === JSON.stringify(row))
                return true;
        }
        return false;
    }

    function undoOperation(sysData: SystemData, opLog: OperationLog) {
        let table = sysData.dbs[opLog.database].tables[opLog.table];
        switch (opLog.operation) {
            case 'INSERT':
                let insertLog = <InsertLog> opLog;
                for(let i = 0; i < table.data.length; i++) {
                    //compare if two array contain same values, genius!
                    if (JSON.stringify(table.data[i]) === JSON.stringify(insertLog.value)) {
                        table.data.splice(i, 1);
                        break;
                    }
                }
                break;
            case 'DELETE':
                let deleteLog = <DeleteLog> opLog;
                if (!containsRow(table.data, deleteLog.value)) {
                    table.data.splice(deleteLog.row, 0, deleteLog.value);
                }
                
                break;
            case 'UPDATE':
                let updateLog = <UpdateLog> opLog;
                let row = updateLog.row;
                let column = table.col_name.indexOf(updateLog.column);
                table.data[row][column] = updateLog.updateFrom;
                break;
            
        }
    }
 
    function redoOperation(sysData: SystemData, opLog: OperationLog) {
        let table = sysData.dbs[opLog.database].tables[opLog.table];
        switch (opLog.operation) {
            case 'INSERT':
                let insertLog = <InsertLog> opLog;
                if (!containsRow(table.data, insertLog.value)) {
                    table.data.splice(table.data.length, 0, insertLog.value);
                }
                break;
            case 'DELETE':
                let deleteLog = <DeleteLog> opLog;
                for(let i = 0; i < table.data.length; i++) {
                    //compare if two array contain same values, genius!
                    if (JSON.stringify(table.data[i]) === JSON.stringify(deleteLog.value)) {
                        table.data.splice(i, 1);
                        break;
                    }
                }
                break;
            case 'UPDATE':
                let updateLog = <UpdateLog> opLog;
                let row = updateLog.row;
                let column = table.col_name.indexOf(updateLog.column);
                table.data[row][column] = updateLog.updateTo;
                break;
            
        }
    }

    async function undoTxs(sysData: SystemData, undoTxSet: Set<number>) {
        await reverseLineReader.eachLine(logPath, (line: string) => {
            if (line === '')    return;
            let log = JSON.parse(line);
            
            if (undoTxSet.has(log.transactionID)) {
                if (log.operation === 'BEGIN TRANSACTION') {
                    undoTxSet.delete(log.transactionID);
                } else if (log.operation === 'COMMIT TRANSACTION') {
                    // do nothing
                } else {
                    undoOperation(sysData, log);
                }
            }
            if (undoTxSet.size === 0) {
                return false; //stop reading log
            }
        });

        console.log("Finished Undo");
    }

    async function redoTxs(sysData: SystemData, redoTxSet: Set<number>) {
        let redoLogs:OperationLog[] = [];
        //get redo logs in order
        await reverseLineReader.eachLine(logPath, (line: string) => {
            if (line === '')    return;
            let log = JSON.parse(line);
            if (redoTxSet.has(log.transactionID)) {
                if (log.operation === 'BEGIN TRANSACTION') {
                    redoTxSet.delete(log.transactionID);
                } else if (log.operation === 'COMMIT TRANSACTION') {
                    // do nothing
                } else {
                    redoLogs.push(log);
                }
            }
            if (redoTxSet.size === 0) {
                redoLogs.reverse();
                return false; //stop reading log
            }
        });

        redoLogs.forEach(log => {
            redoOperation(sysData, log);
        });

        console.log("Finished Redo");
    }

    let undoTxSet: Set<number> = new Set();
    let redoTxSet: Set<number> = new Set();

    //get recocery transaction list
    await reverseLineReader.eachLine(logPath, (line: string) => {
        if (line === '') return;
        let log = JSON.parse(line);
        console.log(line);
        switch (log.operation) {
            case 'BEGIN TRANSACTION':
                undoTxSet.add(log.transactionID);
                break;
            case 'COMMIT TRANSACTION':
                redoTxSet.add(log.transactionID);
                break;
            case 'CHECKPOINT':
                log.runningTransactions.forEach((txID:number) => {
                    undoTxSet.add(txID);
                });
                return false; //stop reading log
        }
    });
    console.log("read txs done!!");
    redoTxSet.forEach(txID => {
        undoTxSet.delete(txID);
    });
    console.log("undo txs: " + undoTxSet.size);
    console.log("redo txs: " + redoTxSet.size);

    await undoTxs(sysData, undoTxSet);
    await redoTxs(sysData, redoTxSet);

    sysData.runningTxs = [];
    emitter.emit('data-modified');
    save_data(sysData);
}

export {
    InsertLog,
    DeleteLog,
    UpdateLog,
    BeginTxLog,
    CommitTxLog,
    CheckPoint,
    writeLog,
    recoverByLog
}