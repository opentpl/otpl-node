/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import Env from "./env"
// import {Compiler} from "./compiler"
import * as fs from 'fs'
import * as utils from './utils'
import * as opc from './opc'

/**
 * Loader
 */
export default class Loader {
    private offset = 0
    src: string
    encoding: utils.Encoding
    version: number
    mtime: number
    endHeaderPtr: number
    constructor(private buf: Buffer) {
    }

    private fail(msg: string) {
        throw new Error(msg)
    }

    read(length: number, msg?: string): Buffer {

        if (this.offset + length > this.buf.length) {
            this.fail(!msg ? "read buffer error." : msg)
        }

        let buf = this.buf.slice(this.offset, this.offset + length)
        this.offset += length
        return buf
    }

    /**
     * 读取协议行头 6 字节
     */
    readHead() {
        return this.read(6);
    }

    readByte() {
        return this.read(1, "Failed to read byte.").readUInt8(0);
    }

    readInt() {
        return this.read(4, "Failed to read integer.").readInt32BE(0);
    }

    readPtr() {
        return this.read(2, "Failed to read ptr.").readUInt16BE(0);
    }

    readLong():number {
        //解决nodejs不能存储64位数值的问题
        return <number><any>this.readString();

        //return this.read(8, "Failed to read long.").readIntBE(0, 8, true);//TODO:类型
    }
    readFloat():number {
        //解决nodejs不能存储64位数值的问题
        return <number><any>this.readString();
        //return this.read(8, "Failed to read float.").readDoubleBE(0, true);//0-8
    }

    readString(encoding?: utils.Encoding) {
        encoding = encoding || this.encoding;

        var length = this.readInt();
        if (length > 0) {
            return this.read(length, 'Failed to read string, count ' + length).toString(encoding.name, 0, length);
        }
        return '';
    }

    readBool() {
        let b = this.readByte();
        if (b === 0) {
            return false;
        }
        return true;
    }

    private loadHeader() {
        let buf =  this.read(12)
        let productName = buf.toString(utils.Encoding.ASCII.name, 0, 4)    //OTIL
        this.version = buf.readUInt16BE(4) 		                           //02
        this.encoding = utils.Encoding.valueOf(buf.readUInt8(6))           //UTF8
        //3位保留
        this.endHeaderPtr = buf.readUInt16BE(10)                           //获取头结束地址
        this.mtime = this.readLong()                                       //获取生成时间
        this.src = this.readString(utils.Encoding.UTF8)                    //路径统一为utf8
        
    }



    static open(target: string, env: Env, callback: (err: NodeJS.ErrnoException, loader: Loader) => void) {
        fs.readFile(target, (err, data) => {
            if (err) {
                return callback(err, null)
            }
            let loader = new Loader(data)
            try {
                loader.loadHeader()

                

            } catch (err) {
                return callback(err, null)
            }
            return callback(null, loader)
        })
    }

    private codes: Map<number, opc.Opcode> = new Map();
    next() {
        let buf = this.readHead();
        let code = opc.load(this, buf);
        if (code) {
            this.codes.set(code.ptr, code);
        }
        return code;
    }

    load(ptr: number) {
        if (this.codes.has(ptr)) {
            return this.codes.get(ptr);
        }
        else {
            while (true) {
                let code = this.next();
                if (code && code.ptr == ptr) {
                    return code;
                }
                else if (!code) {
                    break;
                }
            }
        }
        return this.codes.get(ptr);
    }


    getStartPtr(start?: number) {
        start = start || this.endHeaderPtr
        return start
    }

    blocks: Map<string, opc.Block> = new Map()
    bodyPtr: number
    bodyLoader: Loader
    setBlock(id: string, block: opc.Block) {
        this.blocks.set(id, block);
    }
    getBlock(id: string): opc.Block {
        return this.blocks.get(id);
    }
    /**
     * 设置子模板的加载器和开始地址
     */
    setBody(loader: Loader, ptr: number) {

        this.bodyLoader = loader;
        this.bodyPtr = ptr;

        for (let id in this.blocks) {
            loader.blocks.set(id, this.blocks.get(id));
        }
        this.blocks = loader.blocks;

    }

}