/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import Env from './env';
import Loader from './loader';
import {Compiler} from './compiler';
import Interpreter from './interpreter';
import GetBuiltinFunc from './builtin-func';
import * as path from 'path';
import * as utils from './utils';

/**
 * 表示一个运行时上下文
 */
export default class Context {

    current: Context
    private output: string

    env: Env
    compiler: Compiler
    interpreter: Interpreter
    data: any
    stack: Array<any> = new Array()
    locals: Map<string, any> = new Map()
    loaders: Map<string, Loader>;
    constructor(env: Env, compiler: Compiler, interpreter: Interpreter, data: any, private parent?: Context) {
        this.env = env;
        this.compiler = compiler;
        this.interpreter = interpreter;
        this.data = data;
        this.current = this;
        this.loaders = parent ? parent.loaders : new Map();
    }
    /**
     * 从栈中弹出一个元素
     */
    pop(): any {
        var result = this.stack.pop();
        if (result !== undefined) {
            return result;
        }
        else if (this.parent) {
            return this.parent.pop();
        }
        return undefined;
    }
    /**
     * 向栈中压入一个元素
     */
    push(value: any) {
        this.stack.push(value === undefined ? null : value);
    }

    /**
     * 设置本地变量
     */
    setLocal(name: string, value: any) {
        this.locals.set((name + '').toLowerCase(), value);
    }
    /**
     * 获取本地变量
     */
    getLocal(name: string): any {
        name = (name + '').toLowerCase();
        if (name == 'viewdata') {
            return this.data;
        }
        if (this.locals.get(name) !== undefined) {
            return this.locals.get(name);
        }
        else if (this.data[name] !== undefined) {
            return this.data[name];
        }
        else if (this.parent) {
            return this.parent.getLocal(name);
        }
        return null;
    }

    /**
     * 创建一个新的作用域
     */
    scope(): Context {
        this.current = new Context(this.env, this.compiler, this.interpreter, this.data, this);
        return this.current;
    }
    /**
     * 移除一个作用域
     */
    unscope(): Context {
        if (this.parent) {
            this.current = this.parent;
            this.destory();
            this.parent = null;
        }
        else {
            this.current = this;
        }
        return this.current;
    }

    // /**
    //  * 设置一个载入器
    //  */
    // setLoader(loader: Loader) {
    //     if (this.parent) {
    //         this.parent.setLoader(loader);
    //     }
    //     else {
    //         this.loaders.set(loader.src, loader);
    //     }
    // }
    /**
     * 获取一个载入器
     */
    getLoader(src: string, ref: string): Loader {
        if (this.parent) {
            return this.parent.getLoader(src, ref);
        }
        let me = this;
        var id = src + (ref || '');
        var loader = this.loaders.get(id);
        if (loader) {
            return loader;
        }

        var uid = utils.md5(src);
        var dst = path.join(this.env.targetPath, uid + '.otc');
        if (this.env.debug) {//如果是调试模式，则始终重新编译
            this.compiler.compile(src, dst);
        }
        loader = Loader.open(dst, this.env);
        if (!loader || (loader && !loader.isValid())) {
            if (loader) {
                loader.close();
            }
            this.compiler.compile(src, dst);
            loader = Loader.open(dst, this.env);
        }
        if (loader) {
            this.loaders.set(id, loader);
        }
        return loader;
    }

    /**
     * 将一个结果打印到输出。
     */
    print(value: any, escape: boolean) {
        value = (value || '') + ''; //转换成字符串
        //TODO:escape
        this.output = this.result + value;
    }

    /**
     * 获取渲染后结果
     */
    get result(): string {
        return this.output || '';
    }

    /**
     * 
     */
    destory() {
        this.locals = null;
        this.compiler = null;
        this.interpreter = null;
        this.env = null;
        this.stack = null;

        if (this.parent) {
            return;
        }
        for (var entry of this.loaders) {
            if (entry[1]) {
                entry[1].close();
            }
        }
        this.loaders.clear()
    }

    /**
     * 获取定义的函数
     */
    GetFunc(fnName: string): Function {
        let fn = GetBuiltinFunc(fnName);
        if (!fn) {
            fn = this.env.functions[fnName];
        }
        return fn;
    }

}