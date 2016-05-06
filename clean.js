/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

var fs = require('fs')

var root = __dirname + '/dst'

function unlink(file) {
    
    console.log('delete file:',file)
    
    var stat;
    try {
        stat = fs.statSync(file)
    }
    catch (err) {
        console.log(err)
        return
    }
    
    if (stat.isDirectory()) {
        try {
            var files = fs.readdirSync(file)
            for (var i in files) {
                unlink(file + '/' + files[i])
            }
            try {
                fs.rmdirSync(file)
            }
            catch (err) {
                console.error(err)
            }
        }
        catch (err) {
            console.error(err)
        }

    }
    else if (stat.isFile()) {
        try {
            fs.unlinkSync(file)
        }
        catch (err) {
            console.error(err)
        }
    }

}

console.log('clean directory:',root)
try {
    var files = fs.readdirSync(root)
    
    for (var i in files) {
        
        unlink(root + '/' + files[i])
    }
    
}
catch (err) {
    //ignored
}
console.log('clean completed!')