export const callbackHandlerIdentityTest = async (fn, options, test)=>{
    should.exist(fn);
    await new Promise((resolve, reject)=>{
        fn(test, options, (item, index, done)=>{
            try{
                if(typeof index === 'string'){
                    should.exist(item);
                    should.exist(test[index]);
                    test[index].should.equal(item);
                    (typeof index).should.equal('string');
                }else{
                    should.exist(item);
                    test.should.contain(item);
                    (typeof index).should.equal('number');
                    test.indexOf(item).should.equal(index);
                }
                done(item);
            }catch(ex){
                reject(ex);
            }
        }, ()=>{
            resolve();
        })
    });
};

export const asyncIteratorIdentityTest = async (fn, options, test)=>{
    should.exist(fn);
    let result = fn(test, options);
    let item = await result.next();
    while(!item.done){
        await item.return(item.value);
        item = await result.next();
    }
    const final = await result;
    final.should.deep.equal(test);
};