/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';
import * as ops from './opc';
import * as parser from './parser';
import Env from './env';
import Loader from './loader';
import Writer from './writer';

/**
 * Compiler
 */
export class Compiler {
    constructor(public env: Env) {

    }

    /**
     * 编译一个文件
     */
    compile(src: string, dst: string) {

        try {
            fs.unlinkSync(dst);
        } catch (err) { }
        fs.writeFileSync(dst, new Buffer(0));
        let filename=path.join(this.env.root,src);
        let tpl = fs.readFileSync(filename, utils.Encoding.UTF8).toString().replace(/^\uFEFF/, '');//移除所有 UTF-8 BOM 

        let buf = new Array<ops.Opcode>();
        let ptr = 1;
        let writer: Writer = null;
        try {
            writer = new Writer(fs.openSync(dst, 'w'));
            
            parser.parse(tpl, {file:src,mtime:fs.statSync(filename).mtime.getTime(),viewPath:this.env.viewPath,viewExt:this.env.viewExt}).compile(buf);

            for (let op of buf) {
                op.updatePtr(ptr++);
            }

            for (let op of buf) {
                op.gen(writer,0);
            }

            writer.close();

        } catch (err) {
            if (writer) {
                writer.close();
            }
            
            try {
                fs.unlinkSync(dst);
            } catch (e) { }
            
            throw err;
        }
    }

}