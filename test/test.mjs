/* global describe:false, should:false */
import { chai } from '@environment-safe/chai';
import { it } from '@open-automaton/moka';
import { 
    map,
    //legacy
    forAllEmissions,
    forAllEmissionsInPool
} from '../src/index.mjs';
import {
    callbackHandlerIdentityTest,
    asyncIteratorIdentityTest
} from './src/test-util.mjs';
globalThis.should = chai.should();

const testData = {
    test1 : ['a', 'b', 'c', 'd'],
    test2 : [1, 2, 3, 4, 5, 6, 7, 8, 9, 0],
    test3 : [{foo:'bar'}, {baz:'qux'}, {quux: 'corge'}],
    test4 : [[1], [2], [3], [4]],
    test5 : {foo:'bar', baz:'qux', quux: 'corge'},
};
const identityTestOptions = {
    'default options':{},
    'wide open':{ autoincrement: true,  pool: -1 },
    'autoincrement and pool=5':{ autoincrement: true,  pool: 5 },
};
const identityTests = {
    'async + it': {
        description : 'works using async/await + iterators',
        fn : asyncIteratorIdentityTest
    },
    'cb + fn': {
        description : 'works using callbacks + handler fns',
        fn : callbackHandlerIdentityTest
    }
};

const tests = Object.keys(testData);
const identityOptions = Object.keys(identityTestOptions);
const identities = Object.keys(identityTests);

describe('@environment-safe/async-iterators', ()=>{
    
    for(let idNum=0; idNum< identities.length; idNum++){
        for(let opt=0; opt< identityOptions.length; opt++){
            describe(
                identityTests[identities[idNum]].description+' '+identityOptions[opt], 
                ()=>{
                    const options = identityOptions[opt];
                    for(let lcv=0; lcv< tests.length; lcv++){
                        it(
                            `${tests[lcv]} - ${testData[tests[lcv]].toString()} ${identities[idNum]} opts ${opt}`, 
                            async ()=>{
                                await identityTests[identities[idNum]].fn(
                                    map, options, testData[tests[lcv]]
                                );
                            }
                        );
                    }
                }
            );
        }
    }
    
    describe('compatibility tests', ()=>{
        describe('uses forAllEmissions', function(){
            
            it('to perform all actions in parallel', function(complete){
                var count = 0;
                forAllEmissions(['a', 'b', 'c', 'd', 'e'], function(item, index, done){
                    count.should.equal(index);
                    count++;
                    setTimeout(function(){
                        count--;
                        count.should.equal(5-(index+1));
                        done(item);
                    }, 50);
                }, function(){
                    count.should.equal(0);
                    complete();
                });
            });
            
            it('can doubly nest iterations', function(complete){
                var rtrn;
                forAllEmissions(['a', 'b', 'c', 'd', 'e'], function(item, index, done){
                    forAllEmissions(['f', 'g', 'h', 'i', 'j'], function(item, index, finish){
                        finish();
                    }, function(){
                        done();
                    });
                }, function(){
                    should.not.exist(rtrn);
                    rtrn = setTimeout(function(){
                        complete();
                    }, 500);
                });
            });
        
        });
        
        describe('uses forAllEmissionsInPool', function(){
            
            it('to perform N actions in parallel', function(complete){
                var count = 0;
                forAllEmissionsInPool(['a', 'b', 'c', 'd', 'e'], 3, function(item, index, done){
                    count++;
                    setTimeout(function(){
                        count.should.not.be.above(3);
                        count--;
                        done();
                    }, 300);
                }, function(){
                    count.should.equal(0);
                    complete();
                });
            });
        
        });
    });
    
});

