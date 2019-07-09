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
    return dt;
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

export { load_data, save_data, plot_plan, show_panel, new_window };
