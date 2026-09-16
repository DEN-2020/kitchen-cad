import test from 'node:test';
import assert from 'node:assert/strict';
import {cinematicCameraPose} from '../src/core/showroom-path.js';

const modules=[
 {id:'base',type:'base',x:0,y:140,z:0,width:1800,height:720,depth:560,rotationY:0},
 {id:'wall',type:'wall',x:0,y:1500,z:0,width:1800,height:720,depth:320,rotationY:0},
];

test('cinematic path always remains in front of the averaged facade plane',()=>{
 for(let step=0;step<24;step++){
  const pose=cinematicCameraPose({modules,room:{width:3000,depth:2500,height:2700},phase:step/24,aspect:.45});
  const dx=pose.position.x-pose.target.x,dz=pose.position.z-pose.target.z;
  assert.ok(dx*pose.front.x+dz*pose.front.z>0,`phase ${step}`);
 }
});

test('cinematic path performs distinct upper/lower and near/far passes',()=>{
 const poses=Array.from({length:16},(_,step)=>cinematicCameraPose({modules,room:{width:3000,depth:2500,height:2700},phase:step/16,aspect:.45}));
 assert.ok(Math.max(...poses.map(p=>p.target.y))-Math.min(...poses.map(p=>p.target.y))>300);
 const distances=poses.map(p=>Math.hypot(p.position.x-p.target.x,p.position.z-p.target.z));
 assert.ok(Math.max(...distances)-Math.min(...distances)>300);
});
