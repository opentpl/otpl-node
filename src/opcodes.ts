/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

import * as utils from './utils';
import Loader from './loader';
import Writer from './writer';
import Context from './context';
import GetFunc from './builtin-funcs';

export enum DataType {
    Null = 0x0000,
    String = 0x0001,
    Integer = 0x0002,
    Long = 0x0003,
    Float = 0x0004,
    True = 0x0005,
    False = 0x0006
};

//https://msdn.microsoft.com/zh-cn/library/6a71f45d(v=vs.140).aspx

/**
 * 运算符
 */
export enum Operator {
    /**
     * 相加
     */
    Add = 0x0001,
    /**
     * 相减
     */
    Sub = 0x0002,
    /**
     * 相乘
     */
    Mul = 0x0003,
    /**
     * 相除
     */
    Div = 0x0004,
    /**
     * 取模
     */
    Mod = 0x0005,
    /**
     * 取负
     */
    Neg = 0x0006,
    /**
     * 取正
     */
    Pos = 0x0007,
    /**
     * 逻辑等于
     */
    Eq = 0x0008,
    /**
     * 逻辑不等于
     */
    Ne = 0x0009,
    /**
     * 逻辑大于
     */
    Gt = 0x000A,
    /**
     * 逻辑大于等于
     */
    Ge = 0x000B,
    /**
     * 逻辑小于
     */
    Lt = 0x000C,
    /**
     * 逻辑小于等于
     */
    Le = 0x000D,
    //Leg = 14,
    /**
     * 逻辑与
     */
    And = 0x000E,
    /**
     * 逻辑或
     */
    Or = 0x000F

};

var rnd_seed_1 = 0
var rnd_seed_2 = 0
/**
 * 获取一个临时变量名
 */
export function randomName() {
    let name = '';
    if (rnd_seed_2 > 9007199254740990) {
        rnd_seed_1++;
        rnd_seed_2 = 0;
    }
    else {
        rnd_seed_2++;
    }
    return `$__rnd${rnd_seed_1}_${rnd_seed_2}`;
}

/**
 * 表示一个 OTPL-IL 操作码
 */
export class Opcode {
    loader: Loader
    private _ptr: number = 0
    constructor(public line?: number, public column?: number) {

    }

    /**
     * 获取当前操作码的地址
     */
    get ptr(): number {
        return this._ptr;
    }

    /**
     * 更新地址。
     */
    updatePtr(value: number) {
        if (this._ptr > 0) {
            throw new Error('can not change this ptr');
        }
        else if (value <= 0) {
            throw new Error('ptr value must be > 0');
        }
        this._ptr = value;
    }

    /**
     * 序列化操作码
     */
    gen(out: Writer, code: number) {
        if (this.ptr <= 0) {
            throw new Error('指令地址必须大于0：' + this.ptr);
        }
        if (code <= 0 || code >= 255) {
            throw new Error('指令类型代码必须大于0且小于255：' + code);
        }
        out.writeInt(this.ptr);
        out.writeInt(this.line || 0);
        out.writeByte(code);
    }

    /**
     * 反序列化
     */
    load(loader: Loader): Opcode {
        return this;
    }

    /**
     * 执行该操作码
     */
    exec(context: Context): number {
        throw new Error('Not Implements');
    }

}

/**
 * 根据指定编码从载入器载入一个操作码。
 */
export function load(loader: Loader, buf: Buffer): Opcode {
    let ptr = buf.readInt32BE(0);
    let line = buf.readInt32BE(4);
    let flag = buf.readUInt8(8);
    for (var name in this) {
        let clazz = this[name];
        if (clazz && typeof clazz === 'function' && clazz.code === flag) {
            let op = <Opcode>(new clazz());
            op.loader = loader;
            op.line = line;
            op.updatePtr(ptr);
            return op.load(loader);
        }
    }
    throw new Error('opcode 未定义：' + flag);

}

/**
 * 表示一个文档
 */
export class Document extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }

    filename: string
    mtime: number
    endHeader: Opcode

    static get code(): number {
        return 0x0001; //1
    }

    gen(out: Writer) {
        out.writeStringOnly('OTPL-IL', utils.Encoding.ASCII.name);  //头固定格式
        out.writeByte(0x0002);				                        //版本2
        out.writeByte(utils.Encoding.UTF8.value);	                //字符编码值

        out.writeString(this.filename, utils.Encoding.UTF8.name);   //路径始终使用UTF8编码
        out.writeLong(this.mtime);                                  //源文件最后更新时间
        out.writeInt(this.endHeader.ptr);
    }
    exec(context: Context): number {
        return this.ptr + 1;
    }

}

/**
 * 表示一个占位，不作任何额外操作。
 */
export class Nop extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    static get code(): number {
        return 0x0002; //2
    }
    gen(out: Writer) {
        super.gen(out, Nop.code);
    }
    exec(context: Context): number {
        return this.ptr + 1;
    }
}

/**
 * 表示终止当前文档的执行。
 */
export class Exit extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    static get code(): number {
        return 0x0003; //3
    }
    gen(out: Writer) {
        super.gen(out, Exit.code);
    }
    exec(context: Context): number {
        return -1;
    }
}

/**
 * 表示载入一个常量并压入到栈顶
 */
export class LoadConst extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    value: any
    datatype: DataType
    static get code(): number {
        return 0x0004; //4
    }

    gen(out: Writer) {
        super.gen(out, LoadConst.code);
        out.writeByte(this.datatype);
        switch (this.datatype) {
            case DataType.False:
            case DataType.True:
            case DataType.Null:
                break;
            case DataType.Float:
                out.writeFloat(this.value);
                break;
            case DataType.Integer:
                out.writeInt(this.value);
                break;
            case DataType.Long:
                out.writeLong(this.value);
                break;
            case DataType.String:
                out.writeString(this.value);
                break;
            default:
                throw "常量类型未定义：" + this.datatype;
        }
    }

    load(loader: Loader): Opcode {

        this.datatype = loader.readByte();
        switch (this.datatype) {
            case DataType.False:
                this.value = false;
                break;
            case DataType.True:
                this.value = false;
                break;
            case DataType.Null:
                this.value = null;
                break;
            case DataType.Float:
                this.value = loader.readFloat();
                break;
            case DataType.Integer:
                this.value = loader.readInt();
                break;
            case DataType.Long:
                this.value = loader.readLong();
                break;
            case DataType.String:
                this.value = loader.readString();
                break;
            default:
                throw "常量类型未定义：" + this.datatype;
        }
        return this;
    }

    exec(context: Context): number {
        context.push(this.value);
        return this.ptr + 1;
    }

}


/**
 * 表示载入一个变量并压入到栈顶
 */
export class LoadVariable extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    name: string
    static get code(): number {
        return 0x0005; //5
    }

    gen(out: Writer) {
        super.gen(out, LoadVariable.code);
        out.writeString(this.name);
    }

    load(loader: Loader): Opcode {
        super.load(loader);
        this.name = loader.readString();
        return this;
    }

    exec(context: Context): number {
        context.push(context.getLocal(this.name));
        return this.ptr + 1;
    }

}

/**
 * 表示从栈顶弹出一个元素并并设置到变量。
 */
export class SetVariable extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    name: string
    static get code(): number {
        return 0x0006; //6
    }

    gen(out: Writer) {
        super.gen(out, SetVariable.code);
        out.writeString(this.name);
    }

    load(loader: Loader): Opcode {
        this.name = loader.readString();
        return this;
    }

    exec(context: Context): number {
        context.setLocal(this.name, context.pop());
        return this.ptr + 1;
    }

}

/**
 * 表示调用一个函数。
 */
export class Call extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    parameters = 0
    static get code(): number {
        return 0x0007; //7
    }
    gen(out: Writer) {
        super.gen(out, Call.code);
        out.writeInt(this.parameters);
    }
    load(loader: Loader): Opcode {
        this.parameters = loader.readInt();
        return this;
    }
    exec(context: Context): number {
        let method = context.pop();
        let obj: any = null;
        let args: any[] = [];
        let caller: Function;

        if (typeof method === 'string') {
            caller = GetFunc(method);
            if (!caller) {
                throw new Error('Function is undefined :' + method);
            }
            //内置函数不需要引用对象
        }
        else {
            caller = <Function>method;
            obj = context.pop();
        }

        for (let i = 0; i < this.parameters; i++) {
            args.push(context.pop());
        }
        args.reverse();

        // console.log('method:',method)
        // console.log('arg:',args)
        if (!caller || typeof caller != 'function') {
            context.push(null) //TODO:处理未找到函数的
        }
        else {
            var result = caller.apply(obj, args);
            context.push(result)
            // console.log('fun result',result)
        }
        return this.ptr + 1;
    }
}


/**
 * 表示从栈顶弹出一个元素并打印到输出。
 */
export class Print extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    escape = true
    static get code(): number {
        return 0x0008; //8
    }
    gen(out: Writer) {
        super.gen(out, Print.code);
        out.writeBool(this.escape);
    }
    load(loader: Loader): Opcode {
        this.escape = loader.readBool();
        return this;
    }
    exec(context: Context): number {
        context.print(context.pop(), this.escape)
        return this.ptr + 1;
    }
}

/**
 * 表示一个根据操作符进行的计算并将结果压入栈顶。
 */
export class Operation extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    /**
     * 运算符
     */
    operator: Operator

    static get code(): number {
        return 0x0009; //9
    }
    gen(out: Writer) {
        super.gen(out, Operation.code);
        out.writeByte(this.operator);
    }
    load(loader: Loader): Opcode {
        this.operator = loader.readByte();
        return this;
    }
    exec(context: Context): number {
        let left: any
        let right: any
        switch (this.operator) {
            case Operator.Add:
                right = context.pop();
                left = context.pop();
                context.push(left + right);
                break;
            case Operator.And:
                right = context.pop();
                left = context.pop();
                context.push(left && right);
                break;
            case Operator.Div:
                right = context.pop();
                left = context.pop();
                context.push(left / right);
                break;
            case Operator.Eq:
                right = context.pop();
                left = context.pop();
                context.push(left == right);
                break;
            case Operator.Ge:
                right = context.pop();
                left = context.pop();
                context.push(left >= right);
                break;
            case Operator.Gt:
                right = context.pop();
                left = context.pop();
                context.push(left > right);
                break;
            case Operator.Le:
                right = context.pop();
                left = context.pop();
                context.push(left <= right);
                break;
            case Operator.Lt:
                right = context.pop();
                left = context.pop();
                context.push(left < right);
                break;
            case Operator.Mod:
                right = context.pop();
                left = context.pop();
                context.push(left % right);
                break;
            case Operator.Mul:
                right = context.pop();
                left = context.pop();
                context.push(left * right);
                break;
            case Operator.Ne:
                right = context.pop();
                left = context.pop();
                context.push(left != right);
                break;
            case Operator.Neg:
                left = context.pop();
                context.push(-left);
                break;
            case Operator.Or:
                right = context.pop();
                left = context.pop();
                context.push(left || right);
                break;
            case Operator.Pos:
                left = context.pop();
                context.push(+left);
                break;
            case Operator.Sub:
                right = context.pop();
                left = context.pop();
                context.push(left - right);
                break;
            default:
                throw "指定运算符未定义：" + this.operator;
        }
        return this.ptr + 1;
    }
}

/**
 * 表示一个地址跳转
 */
export class Goto extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    flag = 0x0000
    target: Opcode
    private targetPtr: number
    static get code() {
        return 0x000A;//10 flag targetPtr
    }
    /**
     * 始终跳转
     */
    static get NEVER() {
        return 0x0000;
    }
    /**
     * 从栈顶弹出一个元素，如果值为true则跳转
     */
    static get TRUE() {
        return 0x0001;
    }
    /**
     * 从栈顶弹出一个元素，如果值为false则跳转
     */
    static get FALSE() {
        return 0x0002;
    }

    gen(out: Writer) {
        super.gen(out, Goto.code);
        out.writeByte(this.flag);
        out.writeInt(this.target.ptr);
    }

    load(loader: Loader): Opcode {
        this.flag = loader.readByte();
        this.targetPtr = loader.readInt();
        return this;
    }

    exec(context: Context): number {
        if (this.flag === 1 || this.flag === 2) {
            let val = context.pop() || false;
            if (this.flag == 1 && val === true) {
                return this.targetPtr;
            }
            else if (this.flag == 2 && val === false) {
                return this.targetPtr;
            }
        }
        else if (this.flag === 0) {
            return this.targetPtr;
        }
        return this.ptr + 1;
    }
}

/**
 * 表示一个地址跳转
 */
export class LoadMember extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    parameters = 0
    static get code() {
        return 0x000B;//11 parameters
    }

    gen(out: Writer) {
        super.gen(out, LoadMember.code);
        out.writeInt(this.parameters);
    }

    load(loader: Loader): Opcode {
        this.parameters = loader.readInt();
        return this;
    }

    exec(context: Context): number {
        let obj = context.pop();
        let args: any[] = [];

        for (let i = 0; i < this.parameters; i++) {
            args.push(context.pop());
        }
        args.reverse();

        if (!obj || this.parameters <= 0) {
            context.push(null);//TODO:根据模式报错
            return this.ptr + 1;
        }

        if (this.parameters > 1) {
            let caller = obj['get'];
            if (caller && typeof caller == 'function') {
                context.push(caller.apply(obj, args));
            }
            else {
                throw "对象不是一个有效果索引器（未实现 get 方法）：" + obj;
            }
        }
        else {
            context.push(obj[args[0]]);
        }

        return this.ptr + 1;
    }
}

/**
 * 表示定义作用域
 */
export class Scope extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    restore = false
    static get code() {
        return 0x000C;//12 restore
    }

    gen(out: Writer) {
        super.gen(out, Scope.code);
        out.writeBool(this.restore);
    }

    load(loader: Loader): Opcode {
        this.restore = loader.readBool();
        return this;
    }

    exec(context: Context): number {

        if (this.restore) {
            context.unscope();
        }
        else {
            context.scope();
        }

        return this.ptr + 1;
    }
}

export class Block extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    id: string
    static get code() {
        return 0x000D;//13 id
    }

    gen(out: Writer) {
        super.gen(out, Block.code);
        out.writeString(this.id);
    }

    load(loader: Loader): Opcode {
        this.id = loader.readString();

        loader.setBlock(this.id, this);
        return this;
    }

    exec(context: Context): number {
        context.interpreter.exec(this.loader, context, this.ptr + 1);
        return -1;
    }
}

export class BlockCall extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    id: string
    parameters: number
    static get code() {
        return 0x000E;//14 id parameters
    }

    gen(out: Writer) {
        super.gen(out, BlockCall.code);
        out.writeString(this.id);			//块名称
        out.writeInt(this.parameters);	//参数数量
    }

    load(loader: Loader): Opcode {
        this.id = loader.readString();
        this.parameters = loader.readInt();
        return this;
    }

    exec(context: Context): number {
        if (this.id === 'body') {
            context.interpreter.exec(this.loader.bodyLoader, context, this.loader.bodyPtr);

            //TODO: 为什么需要这样才能渲染后面部分？
            context.interpreter.exec(this.loader, context, this.ptr + 1);
            return -1;
        }
        else {
            var block = this.loader.getBlock(this.id);
            if (block) {
                block.exec(context);
            }
            else {
                console.log('warning: Block not found:%s', this.id);
            }
        }

        return this.ptr + 1;
    }
}

export class Layout extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    src: string
    static get code() {
        return 0x000F;//15 src
    }

    gen(out: Writer) {
        super.gen(out, Layout.code);
        out.writeString(this.src);
    }

    load(loader: Loader): Opcode {
        this.src = loader.readString();
        return this;
    }

    exec(context: Context): number {
        var layoutLoader = context.getLoader(this.src, this.loader.src);
        if (!layoutLoader) {
            throw 'failed to rendering layout:' + this.src;
        }
        layoutLoader.loadHeader();
        layoutLoader.setBody(this.loader, this.ptr + 1);//设置子模板的加载器和开始地址
        context.interpreter.exec(layoutLoader, context, layoutLoader.endHeaderPtr);

        return -1;
    }
}

export class Include extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    src: string
    static get code() {
        return 0x0010;//16 src
    }

    gen(out: Writer) {
        super.gen(out, Include.code);
        out.writeString(this.src);
    }

    load(loader: Loader): Opcode {
        this.src = loader.readString();
        return this;
    }

    exec(context: Context): number {
        var includeLoader = context.getLoader(this.src, this.loader.src);
        if (!includeLoader) {
            throw 'failed to rendering include:' + this.src;
        }
        includeLoader.loadHeader();
        context.interpreter.exec(includeLoader, context, includeLoader.endHeaderPtr);

        return this.ptr + 1;
    }
}

//迭代器帮助类
class Iterator {
    iter: IterableIterator<any>
    result: IteratorResult<any>
    current: any
    constructor(obj: any) {
        if (obj && obj[Symbol.iterator]) {
            this.iter = obj[Symbol.iterator]();
        }
        else if (obj && typeof obj === 'object') {
            this.iter = (function* () {
                let keys = Object.keys(obj).sort();
                let index = 0;
                yield { value: { key: keys[index], value: obj[keys[index]] }, done: index++ >= keys.length }
            })();
        }
        else {
            this.iter = (function* () { yield { value: 'null', done: true } })();//不支持迭代
        }
        this.next();
    }

    hasNext() {
        return !this.result.done;
    }

    next() {

        this.result = this.iter.next();
        this.current = this.result.value;
        return this.result;
    }
}

export class CastToIterator extends Opcode {
    constructor(line?: number, column?: number) {
        super(line, column);
    }
    static get code() {
        return 0x0011;//17
    }

    gen(out: Writer) {
        super.gen(out, CastToIterator.code);
    }

    load(loader: Loader): Opcode {
        return this;
    }

    exec(context: Context): number {
        context.push(new Iterator(context.pop()));
        return this.ptr + 1;
    }
}

