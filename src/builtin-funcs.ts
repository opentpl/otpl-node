/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

export function str(/*...args:any[]*/) {
    let args:any[]=[];
    for (let key in arguments) {
        if (arguments[key]) {
            args.push(arguments[key]);
        }
    }
    console.log(args)
    return args.join('');
}

export function* range(start: number, stop: number, step: number) {
    if (stop === undefined && step === undefined) {
        stop = start;
        start = 0;
        step = 1;
    }
    else if (step === undefined) {
        step = 1;
    }

    while (start < stop) {
        yield start;
        start += step;
    }
}


export default function (funcName: string) {
    let fn = this[funcName];
    if (fn && typeof fn == 'function') {
        return fn;
    }
    return null;
}