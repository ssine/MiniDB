import { ipcRenderer } from 'electron'
import { plan_info } from '../main/plan'

let data: plan_info;

ipcRenderer.on('plot_plan', (plan: plan_info) => {
  data = plan;
  // console.log(plan);
});

export { data }
