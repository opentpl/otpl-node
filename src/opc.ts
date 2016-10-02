/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

import * as utils from './utils'
import Loader from './loader'
import Writer from './writer'
import Context from './context'

/**
 * 数据类型
 */
export enum DataType {
    /**
     * 空
     */
    NULL = 0x00,
    /**
     * 字符串
     */
    STR = 0x01,
    /**
     * 整数
     */
    INT = 0x02,
    /**
     * 长整数
     */
    LONG = 0x03,
    /**
     * 浮点数
     */
    FLOAT = 0x04,
    /**
     * 真
     */
    TRUE = 0x05,
    /**
     * 假
     */
    FALSE = 0x06
}

//https://msdn.microsoft.com/zh-cn/library/6a71f45d(v=vs.140).aspx

/**
 * 运算符
 */
export enum Operator {
    /**
     * 相加
     */
    Add = 0x01,
    /**
     * 相减
     */
    Sub = 0x02,
    /**
     * 相乘
     */
    Mul = 0x03,
    /**
     * 相除
     */
    Div = 0x04,
    /**
     * 取模
     */
    Mod = 0x05,
    /**
     * 取负
     */
    Neg = 0x06,
    /**
     * 取正
     */
    Pos = 0x07,
    /**
     * 逻辑等于
     */
    Eq = 0x08,
    /**
     * 逻辑不等于
     */
    Ne = 0x09,
    /**
     * 逻辑大于
     */
    Gt = 0x0A,
    /**
     * 逻辑大于等于
     */
    Ge = 0x0B,
    /**
     * 逻辑小于
     */
    Lt = 0x0C,
    /**
     * 逻辑小于等于
     */
    Le = 0x0D,
    //Leg = 0x014,
    /**
     * 逻辑与
     */
    And = 0x0E,
    /**
     * 逻辑或
     */
    Or = 0x0F

}

var rnd_seed_1 = 0
var rnd_seed_2 = 0
/**
 * 获取一个临时变量名
 */
export function randomName() {
    let name = ''
    if (rnd_seed_2 > 9007199254740990) {
        rnd_seed_1++
        rnd_seed_2 = 0
    }
    else {
        rnd_seed_2++
    }
    return `$__rnd${rnd_seed_1}_${rnd_seed_2}`
}

/**
 * 表示一个 OTPL-IL 操作码
 */
export class Opcode {
    loader: Loader
    private _ptr: number = 0
    flag: number = 0
    constructor(public line?: number, public column?: number) {

    }

    /**
     * 获取当前操作码的地址
     */
    get ptr(): number {
        return this._ptr
    }

    /**
     * 更新地址。
     */
    updatePtr(value: number) {
        if (this._ptr > 0) {
            throw new Error('can not change this ptr')
        }
        else if (value <= 0) {
            throw new Error('ptr value must be > 0')
        }
        this._ptr = value
    }

    /**
     * 序列化操作码
     */
    gen(out: Writer, code: number) {
        if (this.ptr <= 0 || this.ptr >= 65535) {
            throw new Error('指令地址必须大于0且小于65535：' + this.ptr)
        }
        if (code <= 0 || code >= 255) {
            throw new Error('指令类型代码必须大于0且小于255：' + code)
        }
        out.writePtr(this.ptr)
        out.writeByte(code)
        out.writeShort(this.line || 0)
        out.writeByte(this.flag || 0)
    }

    /**
     * 反序列化
     */
    load(loader: Loader): Opcode {
        return this
    }

    /**
     * 执行该操作码
     */
    exec(context: Context): number {
        throw new Error('Not Implements')
    }

    run(context: Context, callback: (err: NodeJS.ErrnoException, next: number) => void) {
        let ptr = 0
        try {
            ptr = this.exec(context)
            callback(null, ptr)
        } catch (err) {
            callback(err, -1)
        }
    }

}

/**
 * 根据指定编码从载入器载入一个操作码。
 */
export function load(loader: Loader, buf: Buffer): Opcode {
    let ptr = buf.readUInt16BE(0)
    let code = buf.readUInt8(2)
    let line = buf.readUInt16BE(3)
    let flag = buf.readUInt8(5)

    for (var name in this) {
        let clazz = this[name]
        if (clazz && typeof clazz === 'function' && clazz.code === code) {
            let op = <Opcode>(new clazz())
            op.loader = loader
            op.updatePtr(ptr)

            op.line = line
            op.flag = flag

            return op.load(loader)
        }
    }
    throw new Error('opcode 未定义：' + code)

}

/**
 * 表示一个文档
 */
export class Document extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }

    filename: string
    mtime: number
    endHeader: Opcode

    static get code(): number {
        return 0x01
    }

    gen(out: Writer) {
        const VERSION = 2
        out.writeStringOnly('OTIL', utils.Encoding.ASCII.name)  //头固定格式
        out.writeShort(VERSION)				                    //版本2
        out.writeByte(utils.Encoding.UTF8.value)	            //字符编码值
        out.writeByte(0)                                        //保留3位
        out.writeByte(0)
        out.writeByte(0)

        out.writePtr(this.endHeader.ptr)                           //头结束地址
        out.writeLong(this.mtime)                                  //源文件最后更新时间
        out.writeString(this.filename, utils.Encoding.UTF8.name)   //路径始终使用UTF8编码

    }

    exec(context: Context): number {
        return this.ptr + 1
    }

}

/**
 * 表示一个占位，不作任何额外操作。
 */
export class Nop extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    static get code(): number {
        return 0x02
    }
    gen(out: Writer) {
        super.gen(out, Nop.code)
    }
    exec(context: Context): number {
        return this.ptr + 1
    }
}

/**
 * 表示一个地址跳转
 */
export class Jump extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }

    target: Opcode
    private targetPtr: number
    static get code() {
        return 0x03
    }
    static get EXIT() {
        return 0x01
    }
    /**
     * 始终跳转
     */
    static get NEVER() {
        return 0x02
    }
    /**
     * 从栈顶弹出一个元素，如果值为true则跳转
     */
    static get TRUE() {
        return 0x03
    }
    /**
     * 从栈顶弹出一个元素，如果值为false则跳转
     */
    static get FALSE() {
        return 0x04
    }

    gen(out: Writer) {
        super.gen(out, Jump.code)

        if (this.flag != Jump.EXIT) {
            out.writePtr(this.target.ptr)
        }

    }

    load(loader: Loader): Opcode {
        if (this.flag == 2 || this.flag == 3 || this.flag == 4) {
            this.targetPtr = loader.readPtr()
        }

        return this
    }

    exec(context: Context): number {
        switch (this.flag) {
            case Jump.EXIT:
                return -1;
            case Jump.NEVER:
                return this.targetPtr;
            case Jump.TRUE: {
                let val = context.pop() || false
                if (val) {
                    return this.targetPtr;
                }
                break;
            }
            case Jump.FALSE: {
                let val = context.pop() || false
                if (!val) {
                    return this.targetPtr;
                }
                break;
            }
            default:
                throw new Error('类型未定义：' + this.flag)

        }
        return this.ptr + 1
    }
}

/**
 * 表示载入一个常量并压入到栈顶
 */
export class LoadConst extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    value: any

    static get code(): number {
        return 0x04
    }
    get datatype() {
        return this.flag
    }
    set datatype(v: number) {
        this.flag = v
    }

    gen(out: Writer) {
        super.gen(out, LoadConst.code)

        switch (this.datatype) {
            case DataType.FALSE:
            case DataType.TRUE:
            case DataType.NULL:
                break
            case DataType.FLOAT:
                out.writeFloat(this.value)
                break
            case DataType.INT:
                out.writeInt(this.value)
                break
            case DataType.LONG:
                out.writeLong(this.value)
                break
            case DataType.STR:
                out.writeString(this.value)
                break
            default:
                throw "常量类型未定义：" + this.datatype
        }
    }

    load(loader: Loader): Opcode {

        switch (this.datatype) {
            case DataType.FALSE:
                this.value = false
                break
            case DataType.TRUE:
                this.value = true
                break
            case DataType.NULL:
                this.value = null
                break
            case DataType.FLOAT:
                this.value = loader.readFloat()
                break
            case DataType.INT:
                this.value = loader.readInt()
                break
            case DataType.LONG:
                this.value = loader.readLong()
                break
            case DataType.STR:
                this.value = loader.readString()
                break
            default:
                throw "常量类型未定义：" + this.datatype
        }
        return this
    }

    exec(context: Context): number {
        context.push(this.value)
        return this.ptr + 1
    }

}


/**
 * 表示载入一个变量并压入到栈顶
 */
export class LoadVariable extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    name: string
    static get code(): number {
        return 0x05
    }

    gen(out: Writer) {
        super.gen(out, LoadVariable.code)
        out.writeString(this.name)
    }

    load(loader: Loader): Opcode {
        this.name = loader.readString()
        return this
    }

    exec(context: Context): number {
        context.push(context.getLocal(this.name))
        return this.ptr + 1
    }

}

/**
 * 表示从栈顶弹出一个元素并并设置到变量。
 */
export class SetVariable extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    name: string
    static get code(): number {
        return 0x06
    }

    gen(out: Writer) {
        super.gen(out, SetVariable.code)
        out.writeString(this.name)
    }

    load(loader: Loader): Opcode {
        this.name = loader.readString()
        return this
    }

    exec(context: Context): number {
        context.setLocal(this.name, context.pop())
        return this.ptr + 1
    }

}

/**
 * 表示调用一个函数。
 */
export class Call extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }

    static get code(): number {
        return 0x07
    }

    get parameters() {
        return this.flag
    }
    set parameters(v: number) {
        this.flag = v
    }

    gen(out: Writer) {
        super.gen(out, Call.code)
    }
    load(loader: Loader): Opcode {
        return this
    }
    exec(context: Context): number {
        let method = context.pop()
        let obj: any = null
        let args: any[] = []
        let caller: Function

        if (typeof method === 'string') {
            caller = context.GetFunc(method)
            if (!caller) {
                caller = context.getLocal(method);//从变量从获取
            }
            if (!caller || typeof caller != 'function') {
                throw new Error('Function is undefined :' + method)
            }
            //内置函数不需要引用对象
        }
        else {
            caller = <Function>method
            obj = context.pop()
        }

        for (let i = 0; i < this.parameters; i++) {
            args.push(context.pop())
        }
        args.reverse()

        // console.log('method:',method)
        // console.log('arg:',args)
        if (!caller || typeof caller != 'function') {
            context.push(null) //TODO:处理未找到函数的
        }
        else {
            var result = caller.apply(obj, args)
            context.push(result)
            // console.log('fun result',result)
        }
        return this.ptr + 1
    }
}


/**
 * 表示从栈顶弹出一个元素并打印到输出。
 */
export class Print extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }

    static get code(): number {
        return 0x08
    }

    get escape() {
        return this.flag==0x00 ? false : true
    }
    set escape(v: boolean) {
        this.flag = v ? 0x01 : 0x00
    }

    gen(out: Writer) {
        super.gen(out, Print.code)
    }
    load(loader: Loader): Opcode {
        return this
    }
    exec(context: Context): number {
        context.print(context.pop(), this.escape)
        return this.ptr + 1
    }
}

/**
 * 表示一个根据操作符进行的计算并将结果压入栈顶。
 */
export class Operation extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    static get code(): number {
        return 0x09
    }

    /**
     * 运算符
     */
    get operator() {
        return this.flag
    }
    set operator(v: Operator) {
        this.flag
    }

    gen(out: Writer) {
        super.gen(out, Operation.code)
    }
    load(loader: Loader): Opcode {
        return this
    }
    exec(context: Context): number {
        let left: any
        let right: any
        switch (this.operator) {
            case Operator.Add:
                right = context.pop()
                left = context.pop()
                context.push(left + right)
                break
            case Operator.And:
                right = context.pop()
                left = context.pop()
                context.push(left && right)
                break
            case Operator.Div:
                right = context.pop()
                left = context.pop()
                context.push(left / right)
                break
            case Operator.Eq:
                right = context.pop()
                left = context.pop()
                context.push(left == right)
                break
            case Operator.Ge:
                right = context.pop()
                left = context.pop()
                context.push(left >= right)
                break
            case Operator.Gt:
                right = context.pop()
                left = context.pop()
                context.push(left > right)
                break
            case Operator.Le:
                right = context.pop()
                left = context.pop()
                context.push(left <= right)
                break
            case Operator.Lt:
                right = context.pop()
                left = context.pop()
                context.push(left < right)
                break
            case Operator.Mod:
                right = context.pop()
                left = context.pop()
                context.push(left % right)
                break
            case Operator.Mul:
                right = context.pop()
                left = context.pop()
                context.push(left * right)
                break
            case Operator.Ne:
                right = context.pop()
                left = context.pop()
                context.push(left != right)
                break
            case Operator.Neg:
                left = context.pop()
                context.push(-left)
                break
            case Operator.Or:
                right = context.pop()
                left = context.pop()
                context.push(left || right)
                break
            case Operator.Pos:
                left = context.pop()
                context.push(+left)
                break
            case Operator.Sub:
                right = context.pop()
                left = context.pop()
                context.push(left - right)
                break
            default:
                throw "指定运算符未定义：" + this.operator
        }
        return this.ptr + 1
    }
}



/**
 * 表示一个地址跳转
 */
export class LoadMember extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    static get code() {
        return 0x0A
    }

    get parameters() {
        return this.flag
    }
    set parameters(v: number) {
        this.flag = v
    }

    gen(out: Writer) {
        super.gen(out, LoadMember.code)
    }

    load(loader: Loader): Opcode {
        return this
    }

    exec(context: Context): number {
        let obj = context.pop()
        let args: any[] = []

        for (let i = 0; i < this.parameters; i++) {
            args.push(context.pop())
        }
        args.reverse()

        if (!obj || this.parameters <= 0) {
            context.push(null)//TODO:根据模式报错
            return this.ptr + 1
        }

        if (this.parameters > 1) {
            let caller = obj['get']
            if (caller && typeof caller == 'function') {
                context.push(caller.apply(obj, args))
            }
            else {
                throw "对象不是一个有效果索引器（未实现 get 方法）：" + obj
            }
        }
        else {
            context.push(obj[args[0]])
        }

        return this.ptr + 1
    }
}

/**
 * 表示定义作用域
 */
export class Scope extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }

    static get code() {
        return 0x0B
    }

    get scoping() {
        return this.flag==0x00 ? false : true
    }
    set scoping(v: boolean) {
        this.flag = v ? 0x01 : 0x00
    }

    gen(out: Writer) {
        super.gen(out, Scope.code)
    }

    load(loader: Loader): Opcode {
        return this
    }

    exec(context: Context): number {

        if (!this.scoping) {
            context.unscope()
        }
        else {
            context.scope()
        }

        return this.ptr + 1
    }
}

export class Block extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    id: string
    static get code() {
        return 0x0C
    }

    gen(out: Writer) {
        super.gen(out, Block.code)
        out.writeString(this.id)
    }

    load(loader: Loader): Opcode {
        this.id = loader.readString()

        loader.setBlock(this.id, this)
        return this
    }

    // exec(context: Context): number {
    //     context.interpreter.exec(this.loader, context, this.ptr + 1)
    //     return -1
    // }
    run(context: Context, callback: (err: NodeJS.ErrnoException, next: number) => void) {
        context.interpreter.exec(this.loader, context, this.ptr + 1, (err) => {
            callback(err, -1)
        })
    }
}

export class BlockCall extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    id: string
    static get code() {
        return 0x0D
    }

    get parameters() {
        return this.flag
    }
    set parameters(v: number) {
        this.flag = v
    }

    gen(out: Writer) {
        super.gen(out, BlockCall.code)
        out.writeString(this.id)		//块名称
    }

    load(loader: Loader): Opcode {
        this.id = loader.readString()
        return this
    }

    run(context: Context, callback: (err: NodeJS.ErrnoException, next: number) => void) {
        if (this.id === 'body') {
            context.interpreter.exec(this.loader.bodyLoader, context, this.loader.bodyPtr, (err) => {
                if (err) {
                    return callback(err, -1)
                }
                callback(err, this.ptr + 1)
                // //TODO: 为什么需要这样才能渲染后面部分？
                // context.interpreter.exec(this.loader, context, this.ptr + 1, (err) => {
                //     callback(err, this.ptr + 1)
                // })
            })
        }
        else {
            let block = this.loader.getBlock(this.id)
            if (block) {
                block.run(context, (err, next) => {
                    if (err) {
                        return callback(err, -1)
                    }
                    return callback(err, this.ptr + 1)
                })
            }
            else {
                console.log('warning: Block not found:%s', this.id)
                callback(null, this.ptr + 1)
            }
        }
    }
}

export class Reference extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    src: string

    static get code() {
        return 0x0E
    }

    static get INCLUDE() {
        return 0x01;
    }

    static get REQUIRE() {
        return 0x02;
    }

    static get LAYOUT() {
        return 0x03;
    }

    get refType() {
        return this.flag
    }
    set refType(v: number) {
        this.flag = v
    }

    gen(out: Writer) {
        super.gen(out, Reference.code)
        out.writeString(this.src)

    }

    load(loader: Loader): Opcode {
        this.src = loader.readString()

        return this
    }


    run(context: Context, callback: (err: NodeJS.ErrnoException, next: number) => void) {
        context.load(this.src, this.loader.src, (err, loader) => {
            if (err) {
                return callback(err, -1)
            }

            // TODO:
            if (this.refType == Reference.LAYOUT) {

                loader.setBody(this.loader, this.ptr + 1) //设置子模板的加载器和开始地址
                context.interpreter.exec(loader, context, loader.getStartPtr(), (err) => {
                    callback(err, -1)
                })

            }
            else {
                context.interpreter.exec(loader, context, loader.getStartPtr(), (err) => {
                    callback(err, this.ptr + 1)
                })
            }

        })
    }
}

//迭代器帮助类
class Iterator {
    private iter: IterableIterator<any>
    private result: IteratorResult<any>
    private index = -1
    private keys: string[]
    constructor(private context: Context) {
        let obj = context.pop() || {}
        this.keys = !obj[Symbol.iterator] && typeof obj === 'object' ? Object.keys(obj).sort() : null
        this.iter = obj[Symbol.iterator] ? obj[Symbol.iterator]() : (function* (me: Iterator) {
            if (me.keys) {
                for (let i = 0; i < me.keys.length; i++) {
                    yield obj[me.keys[i]]
                }
            }
        })(this)
        this.next()
    }

    hasNext() {
        return !this.result.done
    }

    next() {
        this.index++
        this.result = this.iter.next()
    }

    setVariables(keyName: string, valueName: string) {
        if (keyName) {
            this.context.setLocal(keyName, this.keys ? this.keys[this.index] : this.index)
        }
        if (valueName) {
            this.context.setLocal(valueName, this.result.value)
        }
    }
}

export class CastToIterator extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column)
    }
    static get code() {
        return 0x0F
    }

    gen(out: Writer) {
        super.gen(out, CastToIterator.code)
    }

    load(loader: Loader): Opcode {
        return this
    }

    exec(context: Context): number {
        context.push(new Iterator(context))
        return this.ptr + 1
    }
}

