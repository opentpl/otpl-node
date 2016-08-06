/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import * as fs from 'fs'
import * as utils from './utils'

export default class Writer {
    private offset: number
    private length: number
    private capacity: number
    private buf: Buffer
    private encoding: utils.Encoding = utils.Encoding.UTF8
	constructor() {
		this.offset = 0
		this.length = 0
		this.capacity = 1024 * 4
		//Buffer.alloc
		this.buf = new Buffer(this.capacity)
	}

	/**
	 * 结束
	 */
	finish(target: string,callback:(err:NodeJS.ErrnoException)=>void) {
		let s=fs.createWriteStream(target)
		s.on("error",(err:NodeJS.ErrnoException)=>{
			callback(err)
		})
		s.on("finish",()=>{
			callback(null)
		})
		s.end(this.buf)
		this.offset = 0
		this.length = 0
		this.buf=null
		
	}

	/**
	 * 扩容
	 */
	private expand(length: number) {
		if (this.capacity < this.offset + length) {
			let buf = this.buf
			this.buf = new Buffer(this.capacity * 2)
			this.capacity = this.capacity * 2
			buf.copy(this.buf, 0)
		}

	}

    writeBool(val: boolean) {
        if (!val) {
            this.writeByte(0)
        }
        else {
            this.writeByte(1)
        }
    }

	writeByte(val: number) {
		var bit = 1
		this.expand(bit)
		this.buf.writeUInt8(val, this.offset)
		this.offset += bit
		this.length += bit
	}
	writeShort(val: number) {
		this.writeNumber(val, 2)
	}
	writeInt(val: number) {
		this.writeNumber(val, 4)
	}
	writeLong(val: number) {
		return this.writeNumber(val, 8)
	}
	writeFloat(val: number) {
		return this.writeNumber(val, 8, 'float')
	}

	writeBytes(buf: Buffer, offset: number, length: number) {
		this.expand(length)
		buf.copy(this.buf,this.offset,offset,offset + length)
		this.offset += length
		this.length += length

	}

	private writeNumber(num: number, bit: number, ty?: string) {
        this.expand(bit)
		if (!ty || ty === 'int') {
			this.buf.writeIntBE(num, this.offset, bit, true)//后面突出多余位数
			this.offset += bit
			this.length += bit
		}
		else if (ty === 'float') {
			this.buf.writeDoubleBE(num, this.offset, true)//后面突出多余位数
			this.offset += bit
			this.length += bit
		}
	}

    /**
     * 只定入字符串，但不写入长度。
     */
	writeStringOnly(val: string, encoding?: string) {

		let buf = new Buffer(val, encoding || this.encoding.name)
		this.writeBytes(buf,0,buf.length)
	}

	/**
	 * 定入一个字符串。
	 */
	writeString(val: string, encoding?: string) {
		let buf = new Buffer(val, encoding || this.encoding.name)
		this.writeInt(buf.length)
		this.writeBytes(buf,0,buf.length)
	}
	
}