/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"

const encodings = new Map<string, Encoding>()

/**
 * 表示一个字符编码
 */
export class Encoding {
    constructor(private _name: string, private _value: number) {
    }

    /**
     * 获取编码名称
     */
    get name(): string {
        return this._name;
    }
    /**
     * 获取编码的值
     */
    get value(): number {
        return this._value;
    }

    toString() {
        return this.name;
    }

    static nameOf(name: string) {

        if (encodings.has(name)) {
            return encodings.get(name);
        }

        throw new Error('encoding name not defined:' + name);

    }

    static valueOf(value: number) {

        for (var encoding of encodings) {
            if (encoding[1].value === value) {
                return encoding[1];
            }
        }

        throw new Error('encoding value not defined:' + value);

    }

    /**
     * 获取 UTF8 编码常量
     */
    static get UTF8() {
        return encodings.get('utf8');
    }
    /**
     * 获取 ASCII 编码常量
     */
    static get ASCII() {
        return encodings.get('ascii');
    }
}

encodings.set('utf8', new Encoding('utf8', 0x0000));
encodings.set('ascii', new Encoding('ascii', 0x0001));

/**
 * 获取一个字符串的MD5值
 */
export function md5(src: string, type?: string): string {
    type = type || 'MD532';//TODO:未实现
    var hash = crypto.createHash('md5');
    hash.update(src);
    return hash.digest('hex');
}

/**
 * 获取标准的视图模板路径
 */
export function canonicalViewPath(filename: string, base: string, extname: string): string {
    filename = filename.replace('\\', '/');
    if (filename.charAt(0) !== '/') {
        filename = path.join(base, filename);
    }
    if (extname && filename.indexOf(".")<0) {//TODO:需要改成默认后缀
        filename += extname;
    }
    if (filename.charAt(0) !== '/') {
        filename = '/' + filename;
    }
    filename = filename.replace('\\', '/');
    return filename;
}

class Sor{
    
    
}