/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/index.d.ts" />

import * as fs from 'fs'
import * as path from 'path'
import * as utils from './utils'
import * as ops from './opc'
import * as parser from './parser'
import Env from './env'
import Loader from './loader'
import Writer from './writer'

/**
 * Compiler
 */
export class Compiler {
    constructor(public env: Env) {

    }

    // /**
    //  * 编译一个文件
    //  */
    // compile2(src: string, dst: string) {

    //     try {
    //         fs.unlinkSync(dst);
    //     } catch (err) { }
    //     fs.writeFileSync(dst, new Buffer(0));
    //     let filename = path.join(this.env.root, src);
    //     let tpl = fs.readFileSync(filename, utils.Encoding.UTF8).toString().replace(/^\uFEFF/, '');//移除所有 UTF-8 BOM 

    //     let buf = new Array<ops.Opcode>();
    //     let ptr = 1;
    //     let writer: Writer = null;
    //     try {
    //         writer = new Writer(fs.openSync(dst, 'w'));

    //         parser.parse(tpl, { file: src, mtime: fs.statSync(filename).mtime.getTime(), viewPath: this.env.viewPath, viewExt: this.env.viewExt }).compile(buf);

    //         for (let op of buf) {
    //             op.updatePtr(ptr++);
    //         }

    //         for (let op of buf) {
    //             op.gen(writer, 0);
    //         }

    //         writer.close();

    //     } catch (err) {
    //         if (writer) {
    //             writer.close();
    //         }

    //         try {
    //             fs.unlinkSync(dst);
    //         } catch (e) { }

    //         throw err;
    //     }
    // }

    compile(src: { file: string, ext: string, root: string }, srcStats: fs.Stats,target:string, callback: (err: NodeJS.ErrnoException, target: string) => void) {
        let file = path.join(src.root, src.file + src.ext)
        fs.readFile(file, utils.Encoding.UTF8, (err, data) => {
            if (err) {
                return callback(err, null)
            }
            let tpl = data.toString().replace(/^\uFEFF/, '')
            let buf: ops.Opcode[] = []
            let ptr = 1
            try{
                parser.parse(tpl, { file: src.file + src.ext, mtime: srcStats.mtime.getTime() }).compile(buf)
            }
            catch(e){
                return callback(e,target)
            }
            

            for (let op of buf) {
                op.updatePtr(ptr++)
            }

            let call: Function
            let pipe = function* () {
                for (let op of buf) {
                    yield op
                }
            } ()
            let writer = new Writer()
            call = () => {
                let next = pipe.next()
                if (!next.done) {
                    next.value.gen(writer, 0)
                    call()
                }
                else {
                    //let target = path.join(this.env.targetPath, utils.md5(src.file) + ".otc")
                    writer.finish(target, err => {
                        writer = null
                        if (err) {
                            fs.unlink(target, erri => {
                                callback(err, null)
                            })
                        }
                        else {
                            callback(err, target)
                        }
                    })
                }
            }
            call()
        })
    }

}