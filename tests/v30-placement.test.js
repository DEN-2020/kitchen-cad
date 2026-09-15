import test from 'node:test';
import assert from 'node:assert/strict';
import { wallSnapPose,rotatedFootprint } from '../src/core/placement.js';

function assertInside(pose,width,depth,roomWidth=3000,roomDepth=2500){
 const fp=rotatedFootprint(width,depth,pose.rotationY);
 assert.ok(pose.centerX-fp.width/2>=0);
 assert.ok(pose.centerX+fp.width/2<=roomWidth);
 assert.ok(pose.centerZ-fp.depth/2>=0);
 assert.ok(pose.centerZ+fp.depth/2<=roomDepth);
}

test('left-wall snap keeps a 1200x600 rotated module inside room',()=>{
 const pose=wallSnapPose({roomWidth:3000,roomDepth:2500,moduleWidth:1200,moduleDepth:600,centerX:250,centerZ:300,threshold:300,grid:50});
 assert.equal(pose?.rotationY,90);
 assertInside(pose,1200,600);
});

test('right-wall snap keeps a 1200x600 rotated module inside room',()=>{
 const pose=wallSnapPose({roomWidth:3000,roomDepth:2500,moduleWidth:1200,moduleDepth:600,centerX:2750,centerZ:2200,threshold:300,grid:50});
 assert.equal(pose?.rotationY,270);
 assertInside(pose,1200,600);
});
