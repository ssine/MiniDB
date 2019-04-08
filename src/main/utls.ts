import * as fs from 'fs'
import { SystemData } from './data'
import { plan_info } from './plan'
import { BrowserWindow } from 'electron'
import * as path from "path";


function load_data(path: string): SystemData {
  try {
    let data = fs.readFileSync(path).toString();
    console.log('Data exists, loading...');
    return JSON.parse(data.toString());
  } catch(error) {
    console.log('Data not exists, will be saved after exit.');
    let dt = new SystemData();
    dt.dbs = {};
    return dt;
  }
}

function save_data(path: string, data: SystemData): boolean {
  fs.writeFileSync(path, JSON.stringify(data));
  console.log('Data file saved.');
  return true;
}

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

export { load_data, save_data, plot_plan };
