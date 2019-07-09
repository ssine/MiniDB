import { app, BrowserWindow, ipcMain, Menu } from "electron";
import * as path from "path";
import * as bodyParser from "body-parser"
import * as express from "express"

let mainWindow: Electron.BrowserWindow;

function createWindow() {
  // Create the browser window.
  // Menu.setApplicationMenu(null);
  mainWindow = new BrowserWindow({
    height: 400,
    width: 711,
    webPreferences: {
      nodeIntegration: true
    }
  });

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../pages/index.html"));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  // Emitted when the window is closed.
  mainWindow.on("closed", () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", () => {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it"s common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app"s specific main process
// code. You can also put them in separate files and require them here.

import { parser, Trees, Tree } from '../parser'
import { SystemData } from './data'
import * as fs from 'fs'
import { load_data, save_data, get_help, new_window, init_locks } from './utls'
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
import { TransactionClass } from "./transactions"
import { request } from "https";
import {recoverByLog} from './log'

// Load the persisted data, 
let sys_data: SystemData = load_data();

// Init locks
init_locks(sys_data);
// When a command line input arrives, process it and return the result.
// ipcMain.on('command-line', (event, arg) => {
//   event.returnValue = process_input(arg);
// });

// Use http instead of ipc
let webapp = express()
webapp.use(bodyParser.urlencoded({ extended: false }));  
webapp.post('/', function(request, response) {
  // console.log('recieve sql');
  let arg: string = request.body.content;
  // console.log(arg);
  let process_res = process_input(arg, response);
  // console.log('***result: '+process_res);
  if(process_res != 'do not send') {
    response.send(process_res);
  }
})
webapp.listen('8081', function() {
    console.log('server starting');
})

function process_input(input: string, response): string {

  // Timer start
  // let timer = new Date().valueOf();

  input = input.trim();

  let res = '';

  if (input[0] == '.') {
    // system commands
    input = input.substr(1);
    let cmd = input.split(' ', 1)[0];
    switch (cmd) {
      case 'new_window':
        new_window();
        res = '';
        break;
      case 'savedata':
        save_data(sys_data);
        res = '';
        break;
      case 'recover':
        recoverByLog(sys_data);
        res = 'recovered';
        break;
      case 'exit':
        // Save data and quit the app.
        save_data(sys_data);
        app.quit();
        res = '';
        break;
      case 'file':
        // Use the file as input SQL.
        let filename = input.substr(4).trim();
        try {
          input = fs.readFileSync(path.resolve(__dirname, filename)).toString();
          res = run_sql(input, response);
        } catch (err) {
          res = err.toString();
        }
        break;
      case 'debug_on':
        sys_data.debug = true;
        break;
      case 'debug_off':
        sys_data.debug = false;
        break;
      case 'createdb':
        res = create_database(sys_data, input.split(' ')[1]);
        break;
      case 'dropdb':
        res = drop_database(sys_data, input.split(' ')[1]);
        break;
      case 'usedb':
        res = use_database(sys_data, input.split(' ')[1]);
        break;
      case 'showdb':
        res = show_database(sys_data);
        break;
      case 'showtb':
        res = show_table(sys_data);
        break;
      case 'planon':
        res = set_plan_drawing(sys_data, true);
        break;
      case 'planoff':
        res = set_plan_drawing(sys_data, false);
        break;
      case 'showpanel':
        res = set_panel_on(sys_data);
        break;
      case 'rawdata':
        res = JSON.stringify(sys_data);
        break;
      case 'help':
        res = get_help();
        break;
    }
    return res;
  } else {
    // sql statements
    res = run_sql(input, response);
  }

  // Timer stop
  // let interval = (new Date().valueOf() - timer) / 1000;
  // res = res.trim() + '\r\nquery finished in ' + interval.toString() + ' seconds.';

  return res;
}


function run_sql(input: string, response): string {

  if (sys_data.cur_db === '') {
    // console.log('not using db');
    return 'not using any database!';
  }
    

  let trees: Trees;

  try {
    trees = parser.parse(input);
  } catch (err) {
    console.log(err);
    return 'parse error.';
  }

  let res = '';

  // Semantic checking results.
  let check_res: boolean, check_err: string;

  trees.forEach(tree => {
    // Process all the SQL parse trees.

    if (!tree) return '';

    // Perform semantic checking.
    // [check_res, check_err] = ql_check(sys_data, tree);
    // if (!check_res) {
    //   res += check_err + '\r\nsemantic check failed!\r\n';
    //   return res;
    // } 

    switch (tree.statement) {
      case 'CREATE TABLE':
        new TransactionClass([tree], response, sys_data);
        break;
      case 'DROP TABLE':
        new TransactionClass([tree], response, sys_data);
        break;
      // case 'CREATE INDEX':
      // case 'DROP INDEX':
      case 'SELECT':
        new TransactionClass([tree], response, sys_data);
        break;
      case 'INSERT':
        new TransactionClass([tree], response, sys_data);
        break;
      case 'DELETE':
        new TransactionClass([tree], response, sys_data);
        break;
      case 'UPDATE':
        new TransactionClass([tree], response, sys_data);
        break;
      case 'TRANSACTION':
        new TransactionClass(tree.contents, response, sys_data);
        // ql_transaction(sys_data, tree, response);
        break;
      default:
        res += 'Action not yet implemented.\r\n';
        break;
    }
  });

  return 'do not send';
}
