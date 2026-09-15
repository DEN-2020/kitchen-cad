import test from 'node:test';
import assert from 'node:assert/strict';
import {createProject} from '../src/core/project.js';
import {decodeProject} from '../src/io/project-store.js';

test('project decoder accepts a valid current project',()=>{
  const source=createProject();
  const decoded=decodeProject(JSON.stringify(source));
  assert.equal(decoded.schemaVersion,source.schemaVersion);
  assert.equal(decoded.modules.length,source.modules.length);
});

test('project decoder rejects incomplete and unsupported saves',()=>{
  assert.throws(()=>decodeProject('{}'),/Неподдерживаемая версия проекта/);
  assert.throws(()=>decodeProject('{broken'),SyntaxError);
});

test('project decoder rejects files larger than one megabyte',()=>{
  assert.throws(()=>decodeProject('x'.repeat(1_000_001)),/Файл слишком большой/);
});
