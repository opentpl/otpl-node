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

/**
 * 计算一个值的长度
 */
export function len(value:any) {
    if (Array.isArray(value) || typeof value == 'string') {
        return value.length;
    }
    else if (value) {
        let count=1;
        for(let tmp of value){
            count++;
        }
        return count;
    }
    return -1;
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