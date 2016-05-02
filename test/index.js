const otpl = require("../dst/index");

var env={
    debug:true
}


otpl.init(__dirname,env)

otpl.render('index',{},(err,result)=>{
    if(err){
        throw err
    }
    console.log(result)
})

// const op = require("../dst/opcodes");

// var code =op.load()
// console.log(code)