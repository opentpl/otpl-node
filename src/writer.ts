/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import * as fs from 'fs';
import * as utils from './utils';

export default class Writer {
    private offset: number
    private length: number
    private capacity: number
    private buf: Buffer
    private encoding: utils.Encoding = utils.Encoding.UTF8
	constructor(private fd: number) {
		this.offset = 0;
		this.length = 0;
		this.capacity = 255;
		this.buf = new Buffer(this.capacity);
	}

	flush() {

		if (this.length > 0) {
			this.writeToFile(this.buf, this.length);
		}

		this.length = 0;
		this.offset = 0;
	}
	autoFlush(length: number) {
		if (this.capacity < this.offset + length) {
			this.flush();
		}

	}
	writeToFile(buf: Buffer, length: number) {
		if (length > buf.length) {
			throw new Error(`写入长度必须小于buf长度.${length}/${buf.length}`);
		}
		else if (length < 1) {
			return;
		}
		fs.writeSync(this.fd, buf, 0, length);
	}

    writeBool(val: boolean) {
        if (!val) {
            this.writeByte(0x0);
        }
        else {
            this.writeByte(0x1);
        }
    }

	writeByte(val: number) {
		var bit = 1;
		this.autoFlush(bit);
		this.buf.writeUInt8(val, this.offset);
		this.offset += bit;
		this.length += bit;
	}
	writeShort(val: number) {
		this.writeNumber(val, 2);
	}
	writeInt(val: number) {
		this.writeNumber(val, 4);
	}
	writeLong(val: number) {
		return this.writeNumber(val, 8);
	}
	writeFloat(val: number) {
		return this.writeNumber(val, 8, 'float');
	}

	writeBytes(buf: Buffer, offset: number, length: number) {
		this.autoFlush(length);
		var end = offset + length;
		for (; offset < end; offset++) {
			this.buf[this.offset++] = buf[offset];
		}
		this.length += length;
	}

	writeNumber(num: number, bit: number, ty?: string) {
        this.autoFlush(bit);
		if (!ty || ty === 'int') {
			this.buf.writeIntBE(num, this.offset, bit, true);//后面突出多余位数
			this.offset += bit;
			this.length += bit;
		}
		else if (ty === 'float') {
			this.buf.writeDoubleBE(num, this.offset);//后面突出多余位数
			this.offset += bit;
			this.length += bit;
		}
	}
    /**
     * 只定入字符串，不写入长度。
     */
	writeStringOnly(val: string, encoding?: string) {
		this.flush();
		let buf = new Buffer(val, encoding || this.encoding.name);
		this.writeToFile(buf, buf.length);
	}

	writeString(val: string, encoding?: string) {
		let buf = new Buffer(val, encoding || this.encoding.name);
		this.writeInt(buf.length);
		this.flush();
		this.writeToFile(buf, buf.length);
	}

	close() {
		this.flush();
		fs.closeSync(this.fd);
	}

}