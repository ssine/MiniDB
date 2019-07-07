import * as fs from 'fs'

class Log {
    timestamp: string;
    operation: string;
    database: string;
    table: string;

    constructor(operation: string, database: string, table: string) {
        this.timestamp = (new Date()).toLocaleString();
        this.operation = operation;
        this.database = database;
        this.table = table;
    }
}

class InsertLog extends Log {
    value: any[];

    constructor(database: string, table: string, value: any[]) {
        super('INSERT', database, table);
        this.value = value;
    }
}

class DeleteLog extends Log {
    row: number;
    value: any[];

    constructor(database: string, table: string, row:number, value: any[]) {
        super('DELETE', database, table);
        this.row = row;
        this.value = value;
    }
}

class UpdateLog extends Log {
    row: number;
    column: string;
    updateFrom: any;
    updateTo: any;

    constructor(database: string, table: string, row:number, column: string, updateFrom: any, updateTo: any) {
        super('UPDATE', database, table);
        this.row = row;
        this.column = column;
        this.updateFrom = updateFrom;
        this.updateTo = updateTo;
    }
}

let logPath = './log.json';

function writeLog(log: Log) {
    fs.appendFileSync(logPath, JSON.stringify(log) + '\n');
}

export {
    InsertLog,
    DeleteLog,
    UpdateLog,
    writeLog
}