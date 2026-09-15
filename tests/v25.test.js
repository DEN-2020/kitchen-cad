import test from 'node:test';
import assert from 'node:assert/strict';
import { hingeCountForHeight,hingePositionsForHeight } from '../src/core/hinges.js';
import { detectCountertopJoints,jointLinePoints } from '../src/core/countertop-joints.js';

test('standard 720 mm cabinet door uses two hinges',()=>{assert.equal(hingeCountForHeight(716),2);assert.equal(hingePositionsForHeight(716,2).length,2)});
test('taller fronts automatically use more hinges',()=>{assert.equal(hingeCountForHeight(1200),3);assert.equal(hingeCountForHeight(1900),4)});
test('manual hinge count overrides automatic rule',()=>assert.equal(hingeCountForHeight(720,3),3));

const segments=[
 {id:'CT-S01',wall:'back',center:[800,870,310],size:[1600,20,620],elevation:860,thickness:20},
 {id:'CT-S02',wall:'left',center:[310,870,900],size:[620,20,1800],elevation:860,thickness:20},
];
test('perpendicular countertop segments create one joint',()=>{const j=detectCountertopJoints({countertop:{jointType:'butt',jointGap:2}},segments);assert.equal(j.length,1);assert.equal(j[0].type,'butt');assert.equal(j[0].gap,2)});
test('miter joint produces diagonal seam',()=>{const [j]=detectCountertopJoints({countertop:{jointType:'miter45'}},segments),pts=jointLinePoints(j);assert.equal(j.type,'miter45');assert.equal(pts.length,2);assert.notEqual(pts[0][0],pts[1][0]);assert.notEqual(pts[0][2],pts[1][2])});
test('euro joint produces multi-segment schematic seam',()=>{const [j]=detectCountertopJoints({countertop:{jointType:'euro',jointGap:3}},segments),pts=jointLinePoints(j);assert.equal(j.type,'euro');assert.equal(j.gap,3);assert.ok(pts.length>=5)});
