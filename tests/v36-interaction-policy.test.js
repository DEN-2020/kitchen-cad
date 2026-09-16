import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateProjectCost, DEFAULT_COSTING } from '../src/core/cost.js';
import { MODULE_PLACEMENT, MODULE_TYPES, modulePlacementPolicy } from '../src/catalog/materials.js';
import { resolvePlacementPose, rotatedFootprint } from '../src/core/placement.js';
import { doorHingeFrame, doorOpenAngle, objectInDoorFrame } from '../src/core/door-motion.js';

const front=(gloss)=>({role:'front',u:500,v:700,thickness:18,materialProductId:gloss?'highGlossMdfPvc18':'melamineMdf18',substrate:'mdf',decor:'white',appearance:{color:'#eeeeee',gloss},edges:[0,0,0,0]});

test('matte and gloss fronts use separate sheet stocks and prices',()=>{
 const result=estimateProjectCost({costing:{...DEFAULT_COSTING,wastePercent:0,serviceBase:0,cuttingPerSheet:0}},{parts:[front(false),front(true)]});
 assert.equal(result.front.batches.length,2);
 assert.equal(result.front.matte.sheets,1);
 assert.equal(result.front.gloss.sheets,1);
 assert.equal(result.front.matte.cost,.35*700);
 assert.equal(result.front.gloss.cost,.35*1150);
 assert.equal(result.front.cost,.35*(700+1150));
});

test('changing a front from matte to gloss changes the estimate',()=>{
 const project={costing:{...DEFAULT_COSTING,wastePercent:0,serviceBase:0,cuttingPerSheet:0}};
 const matte=estimateProjectCost(project,{parts:[front(false)]});
 const gloss=estimateProjectCost(project,{parts:[front(true)]});
 assert.ok(Math.abs((gloss.total-matte.total)-.35*(1150-700))<1e-9);
});

test('placement registry covers every catalog module',()=>{
 assert.deepEqual(Object.keys(MODULE_PLACEMENT).sort(),Object.keys(MODULE_TYPES).sort());
 assert.equal(modulePlacementPolicy('wall').layer,'wall');
 assert.equal(modulePlacementPolicy('base').layer,'floor');
});

test('unified placement clamps a rotated module inside the room',()=>{
 const pose=resolvePlacementPose({roomWidth:3000,roomDepth:2500,moduleWidth:1200,moduleDepth:600,rotationY:90,centerX:-500,centerZ:4000,autoRotate:false,grid:50});
 const footprint=rotatedFootprint(1200,600,pose.rotationY);
 assert.ok(pose.centerX-footprint.width/2>=0);
 assert.ok(pose.centerX+footprint.width/2<=3000);
 assert.ok(pose.centerZ-footprint.depth/2>=0);
 assert.ok(pose.centerZ+footprint.depth/2<=2500);
});

test('neighbor snapping only uses modules from the same placement layer',()=>{
 const common={roomWidth:3000,roomDepth:2500,moduleWidth:600,moduleDepth:560,rotationY:0,centerX:1230,centerZ:280,autoRotate:false,grid:50};
 const floor=resolvePlacementPose({...common,layer:'floor',neighbors:[{width:600,depth:560,rotationY:0,centerX:600,centerZ:280,layer:'floor'}]});
 const wall=resolvePlacementPose({...common,layer:'floor',neighbors:[{width:600,depth:560,rotationY:0,centerX:600,centerZ:280,layer:'wall'}]});
 assert.equal(floor.centerX,1200);
 assert.equal(wall.centerX,1250);
});

test('door hinge frame pivots on the chosen edge and keeps attachments with it',()=>{
 const left={hingeSide:'left',size:[600,700,18],localCenter:[300,360,570],rotationY:0};
 const frame=doorHingeFrame(left);
 assert.deepEqual(frame.position,[0,0,570]);
 assert.deepEqual(frame.frontCenter,[300,360,0]);
 assert.ok(doorOpenAngle('left')<0);
 assert.ok(doorOpenAngle('right')>0);
 const handle=objectInDoorFrame({localCenter:[300,600,600],rotationY:0},frame);
 assert.deepEqual(handle.localCenter,[300,600,30]);
});
