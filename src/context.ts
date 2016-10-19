/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/index.d.ts" />

import Env from './env';
import Loader from './loader';
import {Compiler} from './compiler';
import Interpreter from './interpreter';
import GetBuiltinFunc from './builtin-func';
import * as fs from "fs"
import * as path from "path"
import * as utils from './utils';

/**
 * ContextScope
 */
class ContextScope {
    private stack: Array<any> = new Array()
    private locals: Map<string, any> = new Map()
    constructor(data: any, parent: ContextScope) {
        if (parent) {
            for (let item of parent.locals) {
                this.locals.set(item[0], item[1]);
            }
        }
        else {
            for (let key in data) {
                this.locals.set((key + '').toLowerCase(), data[key]);
            }
        }
    }
    pop() {
        return this.stack.pop();
    }
    push(value: any) {
        this.stack.push(value === undefined ? null : value);
    }
    get(name: string) {
        return this.locals.get(name);
    }
    set(name: string, value: any) {
        this.locals.set(name, value === undefined ? null : value);
    }
}


/**
 * 表示一个运行时上下文
 */
export default class Context {

    env: Env
    compiler: Compiler
    interpreter: Interpreter
    data: any
    private output: string
    private loaders: Map<string, Loader> = new Map()
    private scopes: ContextScope[] = []
    private current: ContextScope

    constructor(env: Env, compiler: Compiler, interpreter: Interpreter, data: any) {
        this.env = env;
        this.compiler = compiler;
        this.interpreter = interpreter;
        this.data = data;
        this.scope(); //初始化作用域
    }

    /**
     * 从栈中弹出一个元素
     */
    pop(): any {
        return this.current.pop();
    }
    /**
     * 向栈中压入一个元素
     */
    push(value: any) {
        this.current.push(value);
    }

    /**
     * 设置本地变量
     */
    setLocal(name: string, value: any) {
        this.current.set((name + '').trim().toLowerCase(), value);
    }

    /**
     * 获取本地变量
     */
    getLocal(name: string): any {
        name = (name + '').trim().toLowerCase();
        if (name == 'viewdata') {
            return this.data;
        }
        //TODO: 在严格模式下未设置变量应该报错
        return this.current.get(name);
    }

    /**
     * 创建一个新的作用域
     */
    scope(): Context {
        if (this.current) {
            this.scopes.push(this.current);
        }

        this.current = new ContextScope(this.data, this.current);
        return this;
    }
    /**
     * 移除一个作用域
     */
    unscope(): Context {
        this.current = this.scopes.pop();
        return this;
    }

    // /**
    //  * 获取一个载入器
    //  */
    // getLoader(src: string, ref: string): Loader {
    //     var id = src + (ref || '');
    //     var loader = this.loaders.get(id);
    //     if (loader) {
    //         return loader;
    //     }

    //     var uid = utils.md5(src);
    //     var dst = path.join(this.env.targetPath, uid + '.otc');
    //     if (this.env.debug) {//如果是调试模式，则始终重新编译
    //         //this.compiler.compile(src, dst);
    //     }
    //     loader = Loader.open(dst, this.env);
    //     if (!loader || (loader && !loader.isValid())) {
    //         if (loader) {
    //             loader.close();
    //         }
    //         //this.compiler.compile(src, dst);
    //         loader = Loader.open(dst, this.env);
    //     }
    //     if (loader) {
    //         this.loaders.set(id, loader);
    //     }
    //     return loader;
    // }

    /**
     * 将一个结果打印到输出。
     */
    print(value: any, escape: boolean) {
        value = (value === undefined || value === null ? '' : value) + ''; //转换成字符串
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
        this.compiler = null;
        this.interpreter = null;
        this.env = null;
        this.data = null;
        this.scopes = null;
        this.current = null;
        // for (var entry of this.loaders) {
        //     if (entry[1]) {
        //         entry[1].close();
        //     }
        // }
        this.loaders.clear();
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

    exist(file: string, exts: string[]) {
        for (let ext of exts) {
            if (file.endsWith(ext)) {
                return ext;
            }
        }
    }

    /**
     * 编译一个视图 TODO:需要实现未更改不编译
     */
    compile(viewName: string, ref: string, callback: (err: NodeJS.ErrnoException, target: string) => void) {
        let normal = this.normalize(viewName, ref, this.env.extensions)
        //console.log(normal)
        let id = utils.md5(normal.name)
        let target = path.join(this.env.targetDir, id + ".otil")
        this.resolve(normal.name, normal.ext, (err, src, stats) => {
            if (err) {
                return callback(err, target)
            }
            this.compiler.compile(src, stats, target, (err, target) => {
                if (err) {
                    return callback(err, target)
                }
                callback(null,target)
            })
        })
    }

    /**
     * 执行
     */
    exec(file: string, callback: (err: NodeJS.ErrnoException, rendered: string) => void) {

        this.load(file, "", (err, loader) => {
            if (err) {
                return callback(err, null)
            }
            this.interpreter.exec(loader, this, 0, (err) => {
                if (err) {
                    return callback(err, null)
                }
                callback(err, this.output)
            })
        })

    }

    /**
     * 发现原文件
     */
    resolve(file: string, ext: string, callback: (err: NodeJS.ErrnoException, result: { file: string, ext: string, root: string }, stats: fs.Stats) => void) {
        let me = this
        let urls = function* () {
            if (ext && ext != "") {
                yield { file: file, ext: ext, root: me.env.soruceDir }
            }
            else {
                for (let ext of me.env.extensions) {
                    yield { file: file, ext: ext, root: me.env.soruceDir }
                }
            }
        }

        let itor = urls()
        let next: Function
        next = () => {
            let stat = itor.next()
            if (!stat.done) {
                fs.stat(path.join(stat.value.root, stat.value.file + stat.value.ext), (err, stats) => {
                    if (err) {
                        // console.log(stat.value)
                        // console.log(err)
                        next()
                        return
                    }
                    else if (!stats.isFile()) {
                        next()
                        return
                    }
                    callback(null, stat.value, stats)
                })
            }
            else {
                callback(new Error("未找到视图:" + file+" 源目录:"+me.env.soruceDir), null, null)
            }
        }
        next()
    }

    /**
     * 根据路径载入
     */
    load(name: string, ref: string, callback: (err: NodeJS.ErrnoException, loader: Loader) => void) {
        let normal = this.normalize(name, ref, this.env.extensions)

        let id = utils.md5(normal.name)
        let loader = this.loaders.get(id)
        if (loader) {
            return callback(null, loader)
        }

        let compile = () => {
            this.resolve(normal.name, normal.ext, (err, src, stats) => {
                if (err) {
                    return callback(err, null)
                }
                this.compiler.compile(src, stats, target, (err, target) => {
                    if (err) {
                        return callback(err, null)
                    }
                    Loader.open(target, this.env, (err, loader) => {
                        if (err) {
                            return callback(err, null)
                        }
                        this.loaders.set(id, loader)
                        callback(err, loader)
                    })
                })
            })
        }
        let target = path.join(this.env.targetDir, id + ".otil")
        Loader.open(target, this.env, (err, loader) => {
            if (err || this.env.debug) {
                compile()
            }
            else {
                fs.stat(path.join(this.env.soruceDir, loader.src), (err, stats) => {
                    if (err || loader.mtime == stats.mtime.getTime()) {
                        this.loaders.set(id, loader)
                        return callback(null, loader)
                    }
                    compile()
                })
            }
        })

    }

    flatPath(path:string){
        while(path.indexOf('\\')>-1){
            path=path.replace('\\', '/')
        }
        return path
    }

    /**
     * 规范路径
     */
    normalize(name: string, ref: string, exts: string[]) {

        ref = this.flatPath(path.normalize(ref||'/'))
        // console.log(ref)
        if(ref.startsWith('/')){
            //TODO: 跟踪其它引用路径是否包含文件名的bug
            ref='/'
        }

        let ext = this.exist(name, exts)
        name = this.flatPath(path.normalize(path.join(ref, name)))

        let result = { name: ext ? name.substr(0, name.length - ext.length) : name, ext: ext }
        if (!result.name.startsWith('/')) {
            result.name = '/' + result.name
        }
        if (result.name.endsWith('.') || result.name.endsWith('/')) {
            result.name = result.name.substr(0,result.name.length-1)
        }
        return result
    }

}