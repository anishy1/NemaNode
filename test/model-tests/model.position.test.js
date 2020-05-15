/* global beforeAll, afterAll, test, expect */
require('regenerator-runtime');

const ini = require('ini');
const fs = require('fs');
const path = require('path');

const db = require('../../src/server/db');

const queryNematodeCells = require('../../src/server/db/nematode-cells');
const queryNematodeDatasets = require('../../src/server/db/nematode-datasets');


const DB_INI_FILE = '../../test_database_config.ini';
const dbIni = ini.parse(fs.readFileSync(path.join(__dirname, DB_INI_FILE), 'utf-8'));
const TEST_DB_OPTS = dbIni.mysql;

let connection;
let Model = require('../../src/client/js/model');
let DataService = require('../../src/client/js/data-service');

beforeAll(() => {
  return db.connect(TEST_DB_OPTS).then( c => {
    connection = c;
    return connection;
  }).then( connection => {
    return Promise.all([
      queryNematodeCells( connection ),
      queryNematodeDatasets( connection )
    ]).then( data => {
      let [ cells, datasets ] = data;
      DataService.load( cells, datasets );
    });
  });
});

afterAll(() => {
   return connection.end();
});


test('remove all positions when no ids specified', function(){
  let m = new Model();

  m.setPositions({
    ASE: { x: 0, y: 0 },
    ASER: { x: 10, y: 10 }
  });

  m.removePositions();
  expect( m.getPositions() ).toEqual( {} );
});


test('remove position by id', function(){
  let m = new Model();

  m.setPositions({
    ASE: { x: 0, y: 0 },
    ASER: { x: 10, y: 10 }
  });

  m.removePositions(['ASE']);
  expect( m.getPositions() ).toEqual( {ASER: { x: 10, y: 10}} );
});

test('removed positions also updates locked positions', function(){
  let m = new Model();

  m.lockPositions({
    ASE: { x: 0, y: 0 },
    ASER: { x: 10, y: 10 }
  });

  m.removePositions(['ASE']);

  expect( m.getPositions() ).toEqual( {ASER: { x: 10, y: 10}} );
  expect( m.getLockedPositions() ).toEqual( ['ASER'] );

});

test('group members are added to locked positions when locking the position of a group', function(){
  let m = new Model();

  m.setPositions({
    ASE: { x: 0, y: 0 }
  });

  let g0 = m.createGroup();
  m.addMembersToGroup( g0, ['ASE'] );

  m.lockPositions({[g0]: { x: 1, y: 1} });

  expect( m.getLockedPositions() ).toEqual( [ g0, 'ASE' ] );
});


test('group position is locked when locking the position of a group member', function(){
  let m = new Model();

  m.setPositions({
    ASE: { x: 0, y: 0 }
  });

  let g0 = m.createGroup();
  m.addMembersToGroup( g0, ['ASE'] );
  m.lockPositions({ASE: { x: 1, y: 1} });

  expect( m.getLockedPositions() ).toEqual( [ 'ASE', g0 ] );
});