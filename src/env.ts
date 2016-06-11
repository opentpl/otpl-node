/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/**
 * 定义的环境变量
 */
interface Env {
    /**
     * 根目录
     */
    root: string
    /**
     * 是否是调试模式
     */
    debug: boolean
    /**
     * 是否是使用严格执行模式
     */
    strictMode: boolean
    /**
     * 支持的扩展名
     */
    extensions: string[]
    /**
     * 源路径
     */
    soruceDir: string
    /**
     * 编译的目标路径
     */
    targetDir: string
    /**
     * 扩展函数
     */
    functions: any
}

export default Env