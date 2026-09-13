import test from 'node:test';import assert from 'node:assert/strict';
import {normalizeRotation,rotatedFootprint,wallSnapPose,clampPoseToRoom} from '../src/core/placement.js';

test('rotation is normalized to right angles',()=>{assert.equal(normalizeRotation(91),90);assert.equal(normalizeRotation(-90),270);assert.equal(normalizeRotation(450),90)});
test('90 degree rotation swaps floor footprint',()=>{assert.deepEqual(rotatedFootprint(600,560,90),{width:560,depth:600});assert.deepEqual(rotatedFootprint(600,560,270),{width:560,depth:600});assert.deepEqual(rotatedFootprint(600,560,180),{width:600,depth:560})});
test('wall snap chooses back wall and rotation 0',()=>{const p=wallSnapPose({roomWidth:3000,roomDepth:2500,moduleWidth:600,moduleDepth:560,centerX:1000,centerZ:250,threshold:200});assert.equal(p.wall,'back');assert.equal(p.rotationY,0);assert.equal(p.centerZ,280)});
test('wall snap chooses front wall and rotation 180',()=>{const p=wallSnapPose({roomWidth:3000,roomDepth:2500,moduleWidth:600,moduleDepth:560,centerX:1200,centerZ:2280,threshold:250});assert.equal(p.wall,'front');assert.equal(p.rotationY,180);assert.equal(p.centerZ,2220)});
test('wall snap chooses left wall and rotation 90',()=>{const p=wallSnapPose({roomWidth:3000,roomDepth:2500,moduleWidth:600,moduleDepth:560,centerX:250,centerZ:1200,threshold:200});assert.equal(p.wall,'left');assert.equal(p.rotationY,90);assert.equal(p.centerX,280)});
test('wall snap chooses right wall and rotation 270',()=>{const p=wallSnapPose({roomWidth:3000,roomDepth:2500,moduleWidth:600,moduleDepth:560,centerX:2780,centerZ:1300,threshold:250});assert.equal(p.wall,'right');assert.equal(p.rotationY,270);assert.equal(p.centerX,2720)});
test('manual rotated pose is clamped inside room',()=>{const p=clampPoseToRoom({roomWidth:3000,roomDepth:2500,moduleWidth:600,moduleDepth:560,rotationY:90,centerX:50,centerZ:2450,grid:1});assert.equal(p.centerX,280);assert.equal(p.centerZ,2200);assert.equal(p.rotationY,90)});
