/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/index.d.ts" />

import Env from './env';
import Context from './context';
import Loader from './loader';
import * as opc from './opc';

export default class Interpreter {
    constructor() {

    }

    exec(loader: Loader, context: Context, start: number,callback:(err: NodeJS.ErrnoException)=>void) {
		// var ptr = start || loader.endHeaderPtr;
		// var code: opc.Opcode;
		// while (ptr > 0) {

		// 	code = loader.load(ptr);
		// 	if (!code) {
		// 		console.log('err , null ptr', ptr);
		// 		break;//debug
		// 	}
		// 	ptr = code.exec(context);
		// }
		// ptr = loader.getStartPtr(start)
		let fn: (err: NodeJS.ErrnoException, next: number) => void
		fn = function (err: NodeJS.ErrnoException, next: number) {
			if (err) {
				return callback(err)
			}
			else if (next <= 0) {
				return callback(err)
			}

			let code = loader.load(next)

			code.run(context, fn)

		}
		fn(null, loader.getStartPtr(start))
	}

}