import { app, BrowserWindow, ipcMain } from "electron";
import * as path from "path";

let mainWindow: Electron.BrowserWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    height: 400,
    width: 800,
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

import { parser, Trees } from '../parser'
import { SystemData } from './data'
import * as fs from 'fs'
import { load_data, save_data } from './utls'
import {
  create_database,
  drop_database,
  use_database,
  show_database,
  show_table,
  set_plan_drawing,
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

let data_path = './data.json';

let sys_data: SystemData = load_data(data_path);

ipcMain.on('command-line', (event, arg) => {
  event.returnValue = process_input(arg);
});

function process_input(input: string): string {

  let timer = new Date().valueOf();

  input = input.trim();

  let res = '';

  if (input[0] == '.') {
    // system commands
    input = input.substr(1);
    let cmd = input.split(' ', 1)[0];
    switch (cmd) {
      case 'exit':
        save_data(data_path, sys_data);
        app.quit();
        return '';
      case 'file':
        let filename = input.substr(4).trim();
        try {
          // console.log(path.join(__dirname, filename));
          input = fs.readFileSync(path.join(__dirname, filename)).toString();
          res = run_sql(input);
        } catch (err) {
          res = 'file not exists.';
        }
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
    }
  } else {
    // sql statements
    res = run_sql(input);
  }
  
  let interval = (new Date().valueOf() - timer) / 1000;

  // res = res.trim() + '\r\nquery finished in ' + interval.toString() + ' seconds.';
  return res;
}

function run_sql(input: string): string {

  if (sys_data.cur_db === '')
    return 'not using any database!';

  let trees: Trees;

  try {
    trees = parser.parse(input);
  } catch (err) {
    return 'parse error.';
  }

  let res = '';
  let check_res: boolean, check_err: string;
  trees.forEach(tree => {
    [check_res, check_err] = ql_check(sys_data, tree);
    if (!check_res) {
      res += check_err + '\r\nsemantic check failed!\r\n';
      return;
    }
    // console.log(tree);
    switch (tree.statement) {
      case 'CREATE TABLE':
        res += create_table(sys_data, tree);
        break;
      case 'DROP TABLE':
        res += drop_table(sys_data, tree);
        break;
      // case 'CREATE INDEX':
      // case 'DROP INDEX':
      case 'SELECT':
        res += ql_select(sys_data, tree);
        break;
      case 'INSERT':
        res += ql_insert(sys_data, tree);
        break;
      case 'DELETE':
        res += ql_delete(sys_data, tree);
        break;
      case 'UPDATE':
        res += ql_update(sys_data, tree);
        break;
      default:
        res += 'Action not yet implemented.\r\n';
        break;
    }
  });

  return res;
}
