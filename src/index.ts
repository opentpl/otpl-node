/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />


import * as fs from 'fs'
import * as path from 'path'
import * as utils from './utils'
import Env from './env'
import Context from './context'
import Interpreter from './interpreter'
import {Compiler} from './compiler'

/**
 * 编译器实例
 */
let compiler: Compiler = null
let interpreter: Interpreter = null
/**
 * 全局环境变量
 */
export let env: Env = {
    root: null,
    debug: true,
    strictMode: false,
    extensions: null,
    soruceDir: null,
    targetDir: null,
    functions: null
}



/**
 * 配置并初始化 OTPL
 */
export function config(rootDir: string, _env: Env) {
    env = (_env || env)

    var stat = fs.statSync(rootDir)
    if (!stat.isDirectory()) {
        throw "rootDir must be a Directory."
    }

    env.root = rootDir

    env.debug = env.debug === true ? true : false
    env.strictMode = env.strictMode === true ? true : false
    env.extensions = env.extensions || ['.otpl.html', '.otpl.json', '.html','.otpl', '.json']
    env.soruceDir = env.soruceDir || './views'
    env.targetDir = env.targetDir || './.otpl'
    env.functions = env.functions || {}

    if (env.soruceDir.startsWith('./')) {
        env.soruceDir = path.normalize(path.join(env.root, env.soruceDir))
    }
    if (env.targetDir.startsWith('./')) {
        env.targetDir = path.normalize(path.join(env.root, env.targetDir))
    }

    // 检查并创建目标路径
    try {
        stat = fs.statSync(env.targetDir)
        if (!stat.isDirectory()) {
            fs.mkdirSync(env.targetDir)
            stat = fs.statSync(env.targetDir) // 再檢查一次
        }
    } catch (e) {
        fs.mkdirSync(env.targetDir)
        stat = fs.statSync(env.targetDir) // 再檢查一次
    }

    compiler = new Compiler(env)
    interpreter = new Interpreter()

    return this
}

/**
 * 编译文件
 */
export function compile(viewName:string, callback: Function) {
    let ctx = new Context(env, compiler, interpreter, {})
    ctx.compile(viewName,'',(err,target)=>{
        callback(err,target)
    });
}

/**
 * 渲染一个模板
 */
export function render(url: string, data: any, callback: Function) {
    let ctx = new Context(env, compiler, interpreter, data)
    ctx.exec(url, (err, result) => {
        ctx.destory()
        callback(err, result)
    })
}