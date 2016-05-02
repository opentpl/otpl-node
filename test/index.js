"use strict";
const otpl = require("../dst/index");

const env={
    debug:true,
    viewExt:'.otpl.html'
}


otpl.config(__dirname,env)


const data={
    header:'Hello OTPL!',
    items: [
        {
            current: true,
            name: 'James'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        },
        {
            name: 'Foo',
            url: 'http://example.com'
        }
    ]
}


function testDev() {
    otpl.render('index',data,(err,result)=>{
        if(err){
            throw err
        }
        console.log(result)
    })
}

function testCase() {
    otpl.render('case',data,(err,result)=>{
        if(err){
            throw err
        }
        console.log(result)
    })
}

let args = process.argv.splice(2);
if(args.indexOf('--dev')>-1){
    testDev();
}
else{
    testCase();
}
console.log('end')