
// Transactions
// Timestamp as key
// transaction(a list of query) as value
let trans = {};

//Lock dictionary
// Timestamp as key
let locks = {};

function lock(table_name: string) {
    locks[table_name] = true;
}

function unlock(table_name: string) {
    locks[table_name] = true;
}

function destroy_lock(table_name: string) {
    delete locks[table_name];
}

function is_locked(table_name: string):boolean {
    if(locks[table_name] == true) {
        return true;
    } else {
        return false; 
    }
}

