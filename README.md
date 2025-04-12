@environment-safe/async-iterators
=================================

This is a buildless ESM port of [async-arrays](https://www.npmjs.com/package/async-arrays) and [async-objects](https://www.npmjs.com/package/async-objects) which no longer maintains stack cohesion in callbacks or supports extending prototypes (If you need those features please use an older version), but now supports usage with async/await keywords and iterators in addition to the older callback syntax for porting convenience.

It supports parallel iteration, pooled iteration or synchronous iteration in all modes. It also offers `IteratorPool`: a generic class for pooling requests from iterators or fetching in parallel.

(Does not currently support .require()/.cjs)

Usage
-----

Documentation is only provided for async/await and iterator usage, consult the [tests](test/test.mjs) if you need something different. The main functions return a promise that is also an iterable, upon successful iteration the promise will resolve to the values returned.

### `.map(Iterable[, options[, handlerFn, callbackFn]])`

An example of an identity mapping:

```js
    import { map } from 'async-iterators';
    const result = map(iterable);
    let item = await result.next();
    while(!item.done){
        item.return(item.value); //required if !options.autoincrement
        item = await result.next();
    }
    const finalValue = await result;
    // finalValue deep equals test
```

### `.forEach(Iterable[, handlerFn, callbackFn])`

 Iterate over all items in `iterable`

```js
    import { forEach } from 'async-iterators';
    const result = forEach(iterable);
    let item = await result.next();
    while(!item.done){
        item = await result.next();
    }
```

### `.forAll(Iterable[, handlerFn, callbackFn])`

 Iterate over all items in `iterable` at once, then buffer in the iterator

```js
    import { forAll } from 'async-iterators';
    const result = forAll(iterable);
    let item = await result.next();
    while(!item.done){
        item = await result.next();
    }
    //this will unwind all 
```

### `.forEachBatch(Iterable[, handler, callback])`

Iterate over some items in `iterable` at once, then buffer in the iterator with a maximum limit(in this case `8`) to the number of items being fetched at any given time.

```js
    import { forEachBatch } from 'async-iterators';
    const result = forEachBatch(iterable, 8);
    let item = await result.next();
    while(!item.done){
        item = await result.next();
    }
```

Testing
-------

Run the es module tests to test the root modules
```bash
npm run import-test
```
to run the same test inside the browser:

```bash
npm run browser-test
```
to run the same test headless in chrome:
```bash
npm run headless-browser-test
```

to run the same test inside docker:
```bash
npm run container-test
```

Run the commonjs tests against the `/dist` commonjs source (generated with the `build-commonjs` target).
```bash
npm run require-test
```

Development
-----------
All work is done in the .mjs files and will be transpiled on commit to commonjs and tested.

If the above tests pass, then attempt a commit which will generate .d.ts files alongside the `src` files and commonjs classes in `dist`

