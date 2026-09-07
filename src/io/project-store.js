import { validateProject, createProject } from '../core/project.js';
const KEY='kitchen-cad-project-v1';
export function decodeProject(text){
  if(typeof text!=='string'||text.length>1_000_000) throw new Error('Файл слишком большой (максимум 1 МБ)');
  return validateProject(JSON.parse(text));
}
export function loadProject(){
  let text;
  try {text=localStorage.getItem(KEY);} catch {return {project:createProject(),warning:'Автосохранение в этом окне недоступно. Скачивайте JSON через «Сохранить».'};}
  try {return {project:text?decodeProject(text):createProject(),warning:null};}
  catch {return {project:createProject(),warning:'Не удалось прочитать сохранение. Старые данные не перезаписываются до изменения проекта.'};}
}
export function saveProject(project){
  validateProject(project);
  try {localStorage.setItem(KEY,JSON.stringify(project));return true;}catch{return false;}
}
export function download(text,name,type='application/json'){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');
  a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),30000);
}
