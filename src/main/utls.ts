import * as fs from 'fs'
import { SystemData } from './data'
import { plan_info } from './plan'
import { BrowserWindow } from 'electron'
import * as path from "path";
import { emitter } from './emitter'
import {CheckPoint, writeLog} from './log'

let data_path = './data.json';

/**
 * load system data from pre-set path, create an empty one if not exist.
 */
function load_data(): SystemData {
  try {
    let data = fs.readFileSync(data_path).toString();
    console.log('Data exists, loading...');
    return JSON.parse(data.toString());
  } catch(error) {
    console.log('Data not exists, will be saved after exit.');
    let dt = new SystemData();
    dt.dbs = {};
    dt.debug = false;
    dt.tx_cnt = 0;
    dt.runningTxs = [];
    return dt;
  }
}

function init_locks(data: SystemData) {
  let db_i;
  for(db_i in data.dbs) {
    let tb_i;
    for(tb_i in data.dbs[db_i].tables) {
      data.dbs[db_i].tables[tb_i].w_lock_owner = -1;
      data.dbs[db_i].tables[tb_i].r_lock_owner = -1;
    }
  }
}
/**
 * Save system data to the given path.
 */
function save_data(data: SystemData): boolean {
  fs.writeFileSync(data_path, JSON.stringify(data));
  let checkpoint = new CheckPoint(data.runningTxs);
  writeLog(checkpoint);
  console.log('Data file saved.');
  return true;
}

/**
 * Plot the give physics plan in a new window.
 */
function plot_plan(plan: plan_info) {
  let window = new BrowserWindow({
    height: 500,
    width: 450
  });

  window.loadFile(path.join(__dirname, "../pages/plot.html"));

  // window.webContents.openDevTools();

  window.webContents.on('did-finish-load', () => {
    window.webContents.send('plot_plan', plan);
  })

  window.on('closed', () => {
    window = null;
  });
}

/**
 * Show a panel that displays all the information
 */
function show_panel(data: SystemData) {
  let window = new BrowserWindow({
    height: 600,
    width: 900
  });

  window.loadFile(path.join(__dirname, "../pages/panel.html"));

  // window.webContents.openDevTools();

  window.webContents.on('did-finish-load', () => {
    window.webContents.send('panel_update', data);
  });
  
  emitter.on('data-modified', () => {
    window.webContents.send('panel_update', data);
  });

  window.on('closed', () => {
    window = null;
  });
}

function new_window() {
  let window = new BrowserWindow({
    height: 400,
    width: 711,
    webPreferences: {
      nodeIntegration: true
    }
  });

  window.loadFile(path.join(__dirname, "../pages/index.html"));

  window.on('closed', () => {
    window = null;
  });
}

function get_help() {
  return `.help                    | 显示此帮助\r
.new_window              | 新建一个终端\r
.savedata                | 保存数据\r
.recover                 | 根据日志进行恢复\r
.exit                    | 保存数据并退出\r
.file filename           | 将文件内容作为输入\r
.createdb database_name  | 创建数据库\r
.dropdb database_name    | 删除数据库\r
.usedb database_name     | 使用数据库\r
.showdb                  | 显示所有数据库\r
.showtb                  | 显示当前数据库所有表\r
.planon                  | 显示 SELECT 语句执行计划\r
.planoff                 | 不显示 SELECT 语句执行计划\r
.showpanel               | 显示对数据库内容的可视化\r
.rawdata                 | 返回系统数据\r
.debug_on                | 执行事务时每个 query 添加延迟\r
.debug_off               | 取消 .debug_on`;
}

export { init_locks, load_data, save_data, plot_plan, show_panel, new_window, get_help };
