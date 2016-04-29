/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />


import * as fs from 'fs';
import * as path from 'path';
import * as utils from './utils';
import Env from './env';
import Context from './context';
import Interpreter from './interpreter';
import {Runtime} from './runtime';
import {Compiler} from './compiler';

/**
 * 编译器实例
 */
let compiler: Compiler = null;
let interpreter: Interpreter = null;
/**
 * 全局环境变量
 */
export let env: Env = {
    root: null,
    debug: true,
    strictMode: false,
    viewExt: null,
    viewPath: null,
    dataPath: null,
    targetPath: null
}



/**
 * 初始化 OTPL
 */
export function init(rootDir: string, _env: Env) {
    env = (_env || env);

    var stat = fs.statSync(rootDir);
    if (!stat.isDirectory()) {
        throw "rootDir must be a Directory.";
    }

    env.root = rootDir;
    env.debug = env.debug === true ? true : false;
    env.strictMode = env.strictMode === true ? true : false;
    env.viewExt = env.viewExt || '.html';
    env.viewPath = env.viewPath || './view';
    env.dataPath = env.dataPath || './data';

    env.targetPath = path.join(env.root, env.dataPath, '.c');

    //检查并创建目标路径
    var data = path.join(env.root, env.dataPath);
    try {
        stat = fs.statSync(data);
        if (!stat.isDirectory()) {
            fs.mkdirSync(data);
            stat = fs.statSync(data); // 再檢查一次
        }
    } catch (e) {
        fs.mkdirSync(data);
        stat = fs.statSync(data); // 再檢查一次
    }

    try {
        stat = fs.statSync(env.targetPath);
        if (!stat.isDirectory()) {
            fs.mkdirSync(env.targetPath);
            stat = fs.statSync(env.targetPath); // 再檢查一次
        }
    } catch (e) {
        fs.mkdirSync(env.targetPath);
        stat = fs.statSync(env.targetPath); // 再檢查一次
    }

    compiler = new Compiler(env);
    interpreter = new Interpreter();

    return this;
}

export function compile() {
    console.log(this)
}

/**
 * 渲染一个模板
 */
export function render(url: string, data: any, callback: Function) {
    let ctx = new Context(env, compiler, interpreter, data);
    try {
        let loader = ctx.getLoader(utils.canonicalViewPath(url, env.viewPath, env.viewExt), '');

        loader.loadHeader();
        interpreter.exec(loader, ctx, loader.endHeaderPtr);
        callback(null, ctx.result);
    } catch (err) {
        callback(err, null);
    }
    finally {
        ctx.destory();
    }

}