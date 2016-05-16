/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

var fs = require('fs')

function unlink(file) {
    
    console.log('deleting file/directory:',file)
    
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

function clean(path){
    console.log('deleting directory:',path)
    try {
        var files = fs.readdirSync(path)
        
        for (var i in files) {
            
            unlink(path + '/' + files[i])
        }
        
    }
    catch (err) {
        //ignored
    }
}


clean(__dirname + '/../lib')

clean(__dirname + '/../typings')

console.log('clean completed!')