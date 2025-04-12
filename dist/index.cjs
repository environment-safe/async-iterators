"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.setLogger = exports.map = exports.forEachEmission = exports.forEachBatch = exports.forEach = exports.forAllEmissionsInPool = exports.forAllEmissions = exports.forAll = exports.IteratorPool = void 0;
var _logger = require("@environment-safe/logger");
//import * as sift from 'sift';

let defaultLogger = new _logger.Logger({
  level: 0
});
defaultLogger.registerChannel((0, _logger.makeConsoleChannel)(console));
const Iterable = {
  from: (item, options = {}) => {
    const logger = options.logger || defaultLogger;
    if (Array.isArray(item)) {
      logger.log('converted to array iterator', _logger.Logger.INFO);
      let index = 0;
      const results = [];
      return (() => {
        //let thisIndex = null;
        const res = {
          next() {
            //thisIndex = index;
            const i = index;
            let result = null;
            if (index < item.length) {
              result = {
                value: item[i],
                results: () => results,
                last: item.length - 1,
                count: item.length,
                current: index,
                done: false
              };
            } else {
              result = {
                value: undefined,
                last: item.length - 1,
                count: item.length,
                current: i,
                results: () => results,
                done: true
              };
            }
            result.return = ob => {
              if (result.current !== undefined) {
                results[result.current] = ob;
              }
              if (!options.autoincrement) index++;
            };
            if (options.autoincrement) index++;
            logger.log(`next value: ${result.value}`, _logger.Logger.INFO);
            return result;
          },
          autoincrement: options.autoincrement,
          last: item.length - 1,
          count: item.length,
          current: index,
          results: () => results
          /*return: (ob)=>{
              results[ob.current] = ob.value;
              console.log('???', results, ob);
              if(!options.autoincrement) index++;
          }*/
        };
        return res;
      })();
    }
    if (typeof item === 'object') {
      logger.log('converted to object iterator', _logger.Logger.INFO);
      let index = 0;
      const keys = Object.keys(item);
      const results = {};
      return (() => {
        //let thisIndex = null;
        return {
          next() {
            let result = null;
            const i = index;
            if (index <= keys.length) {
              //thisIndex = index;
              if (options.autoincrement) index++;
              result = {
                value: item[keys[i]],
                current: keys[i],
                last: keys[keys.length - 1],
                count: keys.length,
                results: () => results,
                done: false
              };
            } else {
              result = {
                value: undefined,
                current: keys[i],
                last: keys[keys.length - 1],
                count: keys.length,
                results: () => results,
                done: true
              };
            }
            result.return = ob => {
              if (result.current) {
                results[result.current] = ob;
              }
              if (!options.autoincrement) index++;
            };
            logger.log(`next value: ${result.value}`, _logger.Logger.INFO);
            return result;
          },
          autoincrement: options.autoincrement,
          current: keys[index],
          last: keys[keys.length - 1],
          count: keys.length,
          results: () => results,
          return(ob) {
            if (ob.key) {
              results[ob.key] = ob.value;
            }
            if (!options.autoincrement) index++;
          }
        };
      })();
    }
  }
  /*concat:(next, last)=>{
      let previous = last;
      process.exit();
      if(next.key !== undefined){ //it's an object
          const ob = (last || {});
          ob[next.key] = next.value;
          return ob;
      }
      // else it's an array
      return (last || []).concat([ next ])
  }*/
};
class IteratorPool {
  constructor(iterator, options = {
    pool: 1
  }) {
    if (!iterator.autoincrement) {
      throw new Error('IteratorPool requires an autoincrementing iterator');
    }
    this.pool = new Array(options.pool || 1);
    this.logger = options.logger || defaultLogger;
    this.iterator = iterator;
    this.options = options;
    this.done = false;
    this.cached = [];
    this.index = 0;
    this.cacheIndex = 0;
    this.fill();
  }
  async fill() {
    if (!this.done) {
      for (let poolIndex = 0; poolIndex < this.pool.length; poolIndex++) {
        if (this.pool[poolIndex] && this.pool[poolIndex].finished || !this.pool[poolIndex]) {
          this.pool[poolIndex] = this.iterator.next();
          this.logger.log(`initiated action ${this.index} / ? in pool lane ${poolIndex}`, _logger.Logger.INFO);
          (async () => {
            const thisPoolIndex = poolIndex;
            const thisIndex = this.index;
            const next = await this.pool[thisPoolIndex];
            this.pool[poolIndex].finished = true;
            if (next) this.cached[thisIndex] = next;
            if (next.done) {
              this.done = true;
            } else this.fill();
          })();
          this.index++;
        }
      }
      return Promise.all(this.pool);
    }
  }
  async next() {
    const index = this.cacheIndex;
    if (this.done && this.cached.length === index) return {
      done: true,
      results: () => this.iterator.results()
    };
    while (!this.cached[index]) {
      //cache until we have the right index
      await this.fill();
      if (this.cached[index] && this.cached[index].done || this.done && this.cached.length === index) return {
        done: true,
        results: () => this.iterator.results()
      };
    }
    this.cacheIndex++;
    return this.cached[index];
  }
  return(v) {
    return this.iterator.return(v);
  }
}
exports.IteratorPool = IteratorPool;
const map = (object, options = {}, callback, complete) => {
  const logger = options.logger || defaultLogger;
  const id = Math.floor(Math.random() * 1000000).toString(16);
  let iterable = Iterable.from(object, options);
  if (options.pool) {
    iterable = new IteratorPool(iterable, {
      autoincrement: options.autoincrement,
      pool: options.pool
    });
  }
  let allFinished = null;
  const promise = new Promise((resolve, reject) => {
    allFinished = resolve;
  });
  promise.next = async () => {
    const result = await iterable.next();
    logger.log(`Iteration ${result.current}/${result.count} on ${id} complete`, _logger.Logger.INFO);
    if (result.done) allFinished(result.results());
    return result;
  };
  /*promise.return = async (value)=>{
      throw new Error('DONT CALL ME')
      const result = await iterable.return(value);
      return result;
  }*/
  if (callback && complete) {
    (async () => {
      //detach and autorun
      let item = await promise.next();
      let transformedItem = null;
      const allDones = [];
      while (!item.done) {
        let rtrned = false;
        let holdForDone = null;
        const doneCalled = new Promise(resolve => {
          holdForDone = resolve;
        });
        if (item.value !== undefined && item.current !== undefined) {
          transformedItem = await callback(item.value, item.current, async value => {
            if (rtrned) throw new Error('Cannot call done() after returning value');
            const copy = Object.assign({}, item);
            copy.value = value;
            await item.return(copy);
            if (holdForDone) holdForDone();
          });
        } else {
          //flush if we got an empty row
          await item.return({});
          if (holdForDone) holdForDone();
        }
        if (transformedItem) {
          rtrned = true;
          const copy = Object.assign({}, item);
          copy.value = transformedItem;
          await promise.return(copy);
        } else {
          allDones.push(doneCalled);
          if (options.holdForDone) await doneCalled;
        }
        item = await promise.next();
      }
      await Promise.all(allDones);
      await promise;
      complete(null, item.results());
    })();
  }
  return promise;
};

//BACKWARDS COMPATIBLE SUGAR FNs
exports.map = map;
const forEach = (iterable, callback, complete) => {
  return map(iterable, {
    autoincrement: true
  }, callback, complete);
};
exports.forEach = forEach;
const forAll = (iterable, callback, complete) => {
  return map(iterable, {
    autoincrement: true
  }, callback, complete);
};
exports.forAll = forAll;
const forEachBatch = (iterable, batchSize, callback, complete) => {
  return map(iterable, {
    autoincrement: true,
    holdForDone: true,
    pool: batchSize
  }, callback, complete);
};

//LEGACY FNs
exports.forEachBatch = forEachBatch;
const forEachEmission = exports.forEachEmission = forEach;
const forAllEmissions = exports.forAllEmissions = forAll;
const forAllEmissionsInPool = exports.forAllEmissionsInPool = forEachBatch;
const setLogger = logger => {
  defaultLogger = logger;
};
exports.setLogger = setLogger;