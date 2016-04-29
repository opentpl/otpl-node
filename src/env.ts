/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/
 
 /**
  * 定义的环境变量
  */
 interface Env {
    root: string
    debug:boolean
    strictMode: boolean
    viewExt: string
    viewPath: string
    dataPath: string
    targetPath:string
}

export default Env;