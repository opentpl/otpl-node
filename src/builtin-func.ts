/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/**
 * 函数导出方法
 */
export default function (funcName: string) : Function {
    let fn = this[funcName];
    if (fn && typeof fn == 'function') {
        return fn;
    }
    return null;
}

/**
 * 字符串转换或连接
 */
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

/**
 * range 迭代器
 */
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

/**
 * 时间格式化
 * @see https://en.wikipedia.org/wiki/Unix_time
 */
export function time(timestamp:number,format:string) {
    var dt = new Date(timestamp)

    var o:any = {
        "M+": dt.getMonth() + 1, //月份 
        "d+": dt.getDate(), //日 
        "h+": dt.getHours(), //小时 
        "m+": dt.getMinutes(), //分 
        "s+": dt.getSeconds(), //秒 
        "q+": Math.floor((dt.getMonth() + 3) / 3), //季度 
        "S": dt.getMilliseconds() //毫秒 
    };
    if (/(y+)/.test(format)){
        format = format.replace(RegExp.$1, (dt.getFullYear() + "").substr(4 - RegExp.$1.length));
    }
    for (var k in o)
        if (new RegExp("(" + k + ")").test(format)) format = format.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
    return format;
}

