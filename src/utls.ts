import * as fs from 'fs'
import { SystemData } from './data'

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

export { load_data, save_data };
