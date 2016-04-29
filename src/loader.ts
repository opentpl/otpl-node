/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import Env from "./env"
import {Compiler} from "./compiler"
import * as fs from 'fs';
import * as utils from './utils';
import * as opc from './opcodes';

/**
 * Context
 */
export default class Loader {
    private fd: number
    private pos: number = 0;
    private buf = new Buffer(9)
    private _src: string

    version: number
    encoding: utils.Encoding
    mtime: number
    endHeaderPtr: number
    constructor(fd: number, env: Env) {
        this.fd = fd;
    }
    get src(): string {
        return this._src;
    }
    close() {
        try {
            fs.closeSync(this.fd);
        } catch (err) {

        }
    }

    fail(msg: string) {
        throw new Error(msg);
    }

    isValid(): boolean {
        return true;
    }

    read(buf: Buffer, offset: number, length: number): number {
        let bytesReaad = fs.readSync(this.fd, buf, offset, length, this.pos);
        if (bytesReaad < 0) {
            this.fail("read 0 byte");
        }
        this.pos += bytesReaad;
        return bytesReaad;
    }

    /**
     * 读取协议行头 9 字节
     */
    readHead() {
        if (this.read(this.buf, 0, 9) !== 9) {
            this.fail('Failed to read OTPL-IL head.');
        }
        return this.buf;
    }

    readByte() {
        if (this.read(this.buf, 0, 1) !== 1) {
            this.fail('Failed to read byte.');
        }
        return this.buf.readUInt8(0);
    }

    readInt() {
        if (this.read(this.buf, 0, 4) !== 4) {
            this.fail('Failed to read integer.');
        }
        return this.buf.readInt32BE(0);
    }
    readLong() {
        if (this.read(this.buf, 0, 8) !== 8) {
            this.fail('Failed to read long.');
        }
        return this.buf.readIntBE(0, 8, true);
    }
    readFloat() {
        if (this.read(this.buf, 0, 8) !== 8) {
            this.fail('Failed to read float.');
        }
        return this.buf.readDoubleBE(0, true);//0-8
    }

    readString(encoding?: utils.Encoding) {
        encoding = encoding || this.encoding;

        var length = this.readInt();
        if (length > 0) {
            var buf = new Buffer(length);
            var count = this.read(buf, 0, length);
            if (count !== length) {
                this.fail('Failed to read string, count ' + length + '/' + count);
            }
            return buf.toString(encoding.name, 0, count);
        }
        return '';
    }

    readBool() {
        let b = this.readByte();
        if (b === 0x0) {
            return false;
        }
        return true;
    }
    private _isLoadedHeader = false;
    /**
     * 获取文件头
     */
    loadHeader() {
        if (this._isLoadedHeader) {
            return;
        }
        this._isLoadedHeader = true;
        let buf = this.readHead();
        let productName = buf.toString(utils.Encoding.ASCII.name, 0, 7);    //otpl-il
        this.version = buf.readUInt8(7); 		                            //02
        this.encoding = utils.Encoding.valueOf(buf.readUInt8(8));           //utf8
        this._src = this.readString(utils.Encoding.UTF8);                    //路径统一为utf8
        this.mtime = this.readLong();                                       //获取生成时间
        this.endHeaderPtr = this.readInt();                                 //获取头结束地址

    }

    codes: Map<number, opc.Opcode> = new Map();
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

    static open(file: string, env: Env): Loader {
        try {
            let loader = new Loader(fs.openSync(file, 'r'), env);
            loader.loadHeader();
            return loader;
        } catch (err) {
            if (env.debug) {
                throw err;
            }
        }

        return null;
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

        for (var id in loader.blocks) {
            this.blocks.set(id, loader.blocks.get(id));
        }
        loader.blocks = this.blocks;

    }

}