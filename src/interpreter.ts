/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/
 
/// <reference path="../typings/main.d.ts" />

import Env from './env';
import Context from './context';
import Loader from './loader';
import * as opc from './opcodes';

export default class Interpreter {
    constructor() {
        
    }
    
    exec(loader:Loader,context:Context,start:number){
		var ptr = start || loader.endHeaderPtr;
		var code:opc.Opcode;
		while(ptr>0){

			code = loader.load(ptr);
			if(!code){
				console.log('err , null ptr',ptr);
				break;//debug
			}
			ptr = code.exec(context);
			context = context.current;
		}
	}
    
}