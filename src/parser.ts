/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

import * as opc from './opc';
import * as ast from './ast';
import * as lexer from './lexer';
import Tags from './builtin-tags'

interface Options {
    file: string
    mtime: number
    viewExt:string
    viewPath:string
}
/**
 * 表示一个断点
 */
interface Break {
    keep: boolean
    tags: string[]
}

/**
 * Parser
 */
export class Parser {
    private breaks: Break[] = Array()
    private inCode: boolean = false
    private _peeked: lexer.Token[] = Array()

    tagParsers: Map<string, (tok: lexer.Token, parser: Parser) => ast.Node> = new Map()

    constructor(private tokenizer: lexer.Tokenizer, public options: Options) {

    }

    fail(msg: string, line: number, col: number) {
        throw new Error(msg + "  line:" + line + " col:" + col);
    }

    /**
     * 选取下一个
     */
    get peek() {
        if (this._peeked.length > 0) {
            return this._peeked[0];
        }
        var tok = this.tokenizer.next();
        if (tok) {
            this._peeked.push(tok);
        }
        return tok;
    }

    /**
     * 获取并向前移动
     */
    get next() {
        var tok = this._peeked.shift();
        if (!tok) {
            tok = this.tokenizer.next();
        }
        return tok;
    }

    /**
     * 跳过空白
     */
    skipWhitespace() {
        let tok = this.peek;
        while (this.peek && this.peek.type === lexer.TOKEN_WHITESPACE) {
            tok = this.next;
        }
        return tok;
    }

    /**
     * 跳过注释
     */
    skipComments() {
        let tok = this.peek;
        while (this.peek && this.peek.type === lexer.TOKEN_COMMENT) {
            tok = this.next;
        }
        return tok;
    }
    /**
     * 跳过指定符号的标记
     */
    skipSymbol(symols: string[]) {
        if (this.peek && this.peek.type === lexer.TOKEN_SYMBOL) {
            if (symols.indexOf(this.peek.value) > -1) {
                return this.next;
            }
        }

        return null;
    }

    expectValue(value: string, prefix?: string, tag?: lexer.Token) {
        var tok = this.peek;
        if (!tok || tok.value !== value) {
            tok = (tok || tag) || { type: '', value: 'null', line: -1, column: -1 };
            this.fail((prefix || '') + 'expected ' + value + ', got ' + tok.value, tok.line, tok.column);
        }
        return this.next;
    }

    expectType(type: string, prefix?: string, tag?: lexer.Token) {
        var tok = this.peek;
        if (!tok || tok.type !== type) {
            tok = (tok || tag) || { value: '', type: 'null', line: -1, column: -1 };
            this.fail((prefix || '') + 'expected ' + type + ', got ' + tok.type, tok.line, tok.column);
        }
        return this.next;
    }

    /**
     * 解析一个语句边界
     */
    parseBoundary() {
        if (!this.inCode) {
            return true;
        }
        this.skipWhitespace();
        if (this.peek) {
            if (this.peek.type === lexer.TOKEN_END) {
                this.next;
                this.inCode = false;
            }
            else if (this.peek.type === lexer.TOKEN_SYMBOL && this.peek.value === ';') {
                this.next;
            }
            else {
                return false;
            }
        }
        return true;
    }

    /**
     * 检查标签的边界
     */
    checkBoundary(node: { line: number, column: number }, msg: string) {
        if (!this.parseBoundary()) {
            this.fail(name + ': 未结束的标签.', node.line, node.column);
        }
    }

    /**
     * 判断结构断点
     */
    isBreak(breaks: Break[]) {
        if (!this.inCode) {
            return false;
        }
        else if (!breaks || breaks.length < 1) {
            return false;
        }

        let tok: lexer.Token;
        let found = false;
        for (let item of breaks) {
            if (!item || !item.tags || item.tags.length < 1) {
                continue;
            }
            let stack: lexer.Token[] = [];
            found = true;
            for (let tag of item.tags) {
                if (this.peek && this.peek.value === tag) {
                    stack.push(this.next);
                }
                else {
                    found = false;
                    break;
                }
            }

            if (!found || item.keep) {
                for (let i = stack.length - 1; i >= 0; i--) {
                    if (stack[i]) {
                        this._peeked.unshift(stack[i]);
                    }
                }
            }

            if (found) {
                return true;
            }
        }
        return false;
    }

    // parseOr(){
    //     let tok:lexer.Token;
    // 	let node = this.parseAnd();
    // 	while((tok=this.skipSymbol('||'))){
    // 		node = new ast.Binary(tok.line,tok.column,
    // 			node,this.parseAnd(),'or');
    // 	}
    // 	return node;
    // }
    // parseAnd(){
    //     let tok:lexer.Token;
    // 	let node = this.parseCompare();
    // 	while((tok=this.skipSymbol('&&'))){
    // 		node = new ast.Binary(tok.line,tok.column,
    // 			node,this.parseCompare(),'and');
    // 	}
    // 	return node;
    // }

    /**
     * 解析三目运算
     */
    parseTernary() {
        let tok: lexer.Token;
        let node = this.parseLogic();

        while ((tok = this.skipSymbol(['?']))) {
            let line = tok.line, col = tok.column;
            let left = this.parseExpression();
            tok = this.expectValue(':', 'parseTernary:', tok);
            let right = this.parseExpression();
            node = new ast.Ternary(line, col, node, left, right);
        }
        return node;
    }

    /**
     * 解析逻辑运算
     */
    parseLogic() {
        let tok: lexer.Token;
        let node = this.parseCompare();
        while ((tok = this.skipSymbol(['??', '||', '&&']))) {
            node = new ast.Binary(tok.line, tok.column,
                node, this.parseCompare(), tok.value);
        }
        return node;
    }
    /**
     * 解析比较运算
     */
    parseCompare() {
        let tok: lexer.Token;
        let node = this.parseBinaryAS();
        while ((tok = this.skipSymbol(['==', '!=', '<', '>', '<=', '>=']))) {
            node = new ast.Binary(tok.line, tok.column,
                node, this.parseBinaryAS(), tok.value);
        }
        return node;
    }
    /**
     * 解析加减运算
     */
    parseBinaryAS() {
        let tok: lexer.Token;
        let node = this.parseBinaryMDM();
        while ((tok = this.skipSymbol(['+', '-']))) {
            node = new ast.Binary(tok.line, tok.column,
                node, this.parseBinaryMDM(), tok.value);
        }
        return node;
    }
    /**
     * 解析乘除运算
     */
    parseBinaryMDM() {
        let tok: lexer.Token;
        let node = this.parseUnary();
        while ((tok = this.skipSymbol(['*', '/', '%']))) {
            node = new ast.Binary(tok.line, tok.column,
                node, this.parseUnary(), tok.value);
        }
        return node;
    }

    /**
     * 解析一元运算
     */
    parseUnary() {

        let tok: lexer.Token;
        let node: ast.Node;
        if ((tok = this.skipSymbol(['-']))) {
            node = new ast.Unary(tok.line, tok.column,
                this.parseMemberAccess(), 'neg');
        }
        else if ((tok = this.skipSymbol(['+']))) {
            node = new ast.Unary(tok.line, tok.column,
                this.parseMemberAccess(), 'pos');
        }
        else {
            node = this.parseMemberAccess();
        }
        return node;
    }
    /**
     * 解析成员访问
     */
    parseMemberAccess(): ast.Node {

        let tok: lexer.Token;
        let node = this.parsePrimary();

        while (true) {
            if ((tok = this.skipSymbol(['.']))) {
                tok = this.skipWhitespace();
                if (this.peek && this.peek.type === lexer.TOKEN_ID) {
                    tok = this.next;
                    node = new ast.Property(tok.line, tok.column, node, new ast.NodeList([new ast.String(tok.value)]));
                }
                else {
                    this.fail('非法字符', tok.line, tok.column);
                }
            }
            else if ((tok = this.skipSymbol(['[']))) {
                node = new ast.Property(tok.line, tok.column, node, this.parseGroup(']'));
            }
            else if ((tok = this.skipSymbol(['(']))) {
                node = new ast.Method(tok.line, tok.column, node, this.parseGroup(')'));
            }
            else {
                break;
            }
        }
        // this.fail('##############################')
        return node;
    }

    /**
     * 解析表达式的独立主体部分
     */
    parsePrimary() {
        if (!this.inCode) {
            return null;
        }
        this.skipWhitespace();
        var tok = this.next;
        if (!tok) {
            return null;//TODO:报错？
        }
        let node: ast.Node;
        if (tok.type === lexer.TOKEN_ID) {
            node = new ast.Identifier(tok.line, tok.column, tok.value);
        }
        else if (tok.type === lexer.TOKEN_STRING) {
            node = new ast.String(tok.value);
        }
        else if (tok.type === lexer.TOKEN_BOOLEAN) {
            node = new ast.Boolean(tok.value);
        }
        else if (tok.type === lexer.TOKEN_NONE) {
            node = new ast.None();
        }
        else if (tok.type === lexer.TOKEN_INT) {
            if (this.skipSymbol(['.'])) {
                var peek = this.peek;
                if (peek.type !== lexer.TOKEN_INT) {
                    this.fail('parsePrimary: unexpected token:' + peek.value, peek.line, peek.column);
                }
                peek = this.next;
                node = new ast.Float(tok.value + '.' + peek.value);
            }
            else {
                node = new ast.Integer(tok.value);
            }
        }
        else if (tok.type === lexer.TOKEN_END) {
            this.inCode = false;
            return null;
        }

        if (!node) {
            this.fail('unexpected token: ' + tok.value,
                tok.line,
                tok.column);
        }
        else {
            this.skipWhitespace();
        }
        return node;

    }

    /**
     * 解析一个表达式
     */
    parseExpression(): ast.Node {
        var node = this.parseTernary();
        return node;
    }

    /**
     * 解析一个块调用
     */
    parseBlockCall(tag: lexer.Token): ast.Node {
        let tok = this.expectType(lexer.TOKEN_ID, 'parseBlockCall:', tag)

        var node = new ast.BlockCall(tok.line, tok.column, tok.value, this.parseDict());

        this.checkBoundary(node, 'parseBlockCall:');

        return node;
    }


    /**
     * 解析到指定断点处。
     */
    parseUntil(dst: ast.NodeList, breaks: Break[]) {
        if (!breaks || breaks.length == 0) {
            throw "断点不能为空";
        }
        var keep = this.breaks;
        this.breaks = breaks;
        var buf = this.parse();
        for (let n of buf) {
            dst.append(n);
        }
        this.breaks = keep;
        return dst;
    }
    /**
     * 解析一个组
     */
    parseGroup(tag: string): ast.NodeList {
        let node = new ast.NodeList();
        let t = this.skipWhitespace();
        while (this.inCode && this.peek) {
            if (this.skipSymbol([tag])) {
                return node;
            }
            let expr = this.parseExpression();
            node.append(expr);
            if (this.skipSymbol([tag])) {
                return node;
            }

            this.expectValue(',', 'parseGroup:', t)
            t = this.skipWhitespace();
        }

        this.fail('未结束的括号', t.line, t.column);
    }
    /**
     * 解析一个字典类型参数
     */
    parseDict() {
        let tok: lexer.Token;
        let name: string;
        let value: ast.Node;
        let dict = new ast.NodeList();
        while (true) {
            if (this.parseBoundary()) {
                break;
            }
            tok = this.expectType(lexer.TOKEN_ID, 'parseDict:', tok);

            name = tok.value;
            tok = this.skipWhitespace();
            tok = this.expectValue('=', 'parseDict:', tok);

            value = this.parseExpression();
            dict.append(new ast.Set(tok.line, tok.column, name, value));
        }
        return dict;
    }
    /**
     * 解析过滤器
     */
    parseFilter(): ast.Filter {
        let tag = this.skipWhitespace();

        if (!this.peek || this.peek.type !== lexer.TOKEN_ID) {
            this.fail('parseFilter: filter name is required.', 0, 0);
        }

        let tok = this.next;
        let parameters: ast.NodeList;

        tag = this.skipWhitespace();

        this.expectValue('=', 'parseFilter:', tag);

        this.skipWhitespace();
        if (this.skipSymbol(['('])) {
            parameters = this.parseGroup(')');
        }
        else {
            parameters = new ast.NodeList();
            parameters.append(this.parseExpression());
        }

        return new ast.Filter(tok.line, tok.column, tok.value, parameters);
    }

    /**
     * 解析一个语句
     */
    parseStatement(): ast.Node {

        this.skipWhitespace();
        this.skipComments();
        this.skipWhitespace();

        if (this.isBreak(this.breaks)) {
            return new ast.Skip(true);//如果直接就是一个断点
        }

        var tok = this.peek;

        //TODO:如果是一个边界
        if (this.parseBoundary()) {
            return new ast.Skip(false);
        }

        var raw = false;
        var unRaw = function () { };

        if (tok.value === '#') {
            return this.parseBlockCall(this.next);
        }
        else if (tok.value === '!') {
            raw = true;
            unRaw = function () {
                if (raw) {
                    this.fail('unexpected token:!', tok.line, tok.column);
                }
            }
        }

        let node: ast.Node;
        let handler = this.tagParsers.get(tok.value);
        if (handler) {
            unRaw();
            node = handler(this.next, this);
        }
        else {
            //TODO: extends

            let primary = this.parseExpression(); //TODO: 单独拿出来解析 
            let filters: ast.Filter[] = [];

            this.skipWhitespace();
            while (this.skipSymbol(['|'])) {
                filters.push(this.parseFilter());
                this.skipWhitespace();
            }
            node = new ast.Print(tok.line, tok.column, primary, raw, filters);

            this.checkBoundary(node, 'parseStatement->print');
        }

        return node;
    }

    parseLiteral(tok: lexer.Token): ast.Node {
        let tag = tok;
        let buf: lexer.Token[] = [];
        while ((tok = this.next)) {
            if (tok.type === lexer.TOKEN_LITERAL_END) {

                var value = '';

                for (var t of buf) {
                    value += t.value;
                }
                return new ast.Data(tok.line, tok.column, value);
            }
            else if (tok.type === lexer.TOKEN_LITERAL_START) {
                this.fail('parseLiteral: 非法的开始标签', tok.line, tok.column);
            }
            else {
                buf.push(tok);
            }
        }

        this.fail('parseLiteral: 未结束的标签', tag.line, tag.column);
        return null;
    }

    /**
     * 解析模板数据
     */
    parseData(tok: lexer.Token) {
        let value = tok.value;
        while (this.peek && this.peek.type === lexer.TOKEN_DATA) {
            value += this.next.value;
        }

        return new ast.Data(tok.line, tok.column, value);
    }

    parse() {
        let buf = new Array<ast.Node>();

        let tok: lexer.Token;
        let node: ast.Node;

        while ((tok = this.peek)) {
            if (tok.type === lexer.TOKEN_START || this.inCode) {
                if (!this.inCode) {
                    this.inCode = true;
                    tok = this.next;
                }
                node = this.parseStatement();
                if (node) {
                    if (node instanceof ast.Skip) {
                        let skip = <ast.Skip>node;
                        if (skip.isBreak) {
                            break;
                        }
                    }
                    else {
                        buf.push(node);
                    }
                }
            }
            else if (tok.type === lexer.TOKEN_LITERAL_START) {
                tok = this.next;
                node = this.parseLiteral(tok);
                if (node) {
                    buf.push(node);
                }
            }
            else if (tok.type === lexer.TOKEN_COMMENT) {
                tok = this.next;
                this.skipComments();
            }
            else if (tok.type === lexer.TOKEN_DATA) {
                tok = this.next;
                let node = this.parseData(tok);
                if (node) {
                    //TODO: 优化去掉空白行
                    let tmp = (node.value || '').replace('\r\n', '').replace('\n', '').replace('\r', '').replace('\t', '').replace(' ', '');
                    if (tmp != '') {
                        buf.push(new ast.Print(node.line, node.column, node, false, []));
                    }
                }
            }
            else {
                tok = this.next;
                console.log('未定义类型：' + this.inCode, tok);
            }
        }

        //buf = this.checkAndJust(buf);

        return buf;

    }

    parseRoot(): ast.Root {
        let node = new ast.Root(this.options.file, this.options.mtime);
        var buf = this.parse();
        for (let n of buf) {
            node.append(n);
        }
        return node;
    }


    // checkAndJust(buf: ast.Node[]) {
    //     let result: ast.Node[] = [];
    //     let node: ast.Node;
    //     while ((node = buf.shift())) {
    //         if (node instanceof ast.If) {
    //             let ifnode = <ast.If>node;

    //             while (true) {
    //                 if (buf.length > 0 && buf[0] && buf[0] instanceof ast.Elif) {
    //                     ifnode.items.push(buf.shift());
    //                 }
    //                 else {
    //                     break;
    //                 }
    //             }

    //             if (buf.length > 0 && buf[0] && buf[0] instanceof ast.Else) {
    //                 ifnode.items.push(buf.shift());
    //             }
    //             result.push(ifnode);
    //         }
    //         else if (node instanceof ast.For) {
    //             let fornode = <ast.For>node;
    //             if (buf.length > 0 && buf[0] && buf[0] instanceof ast.Else) {
    //                 fornode.elseBlock = buf.shift();
    //             }
    //             result.push(fornode);
    //         }
    //         else if (node instanceof ast.Elif || node instanceof ast.Else) {
    //             this.fail('语法错误', node.line, node.column);
    //         }
    //         else {
    //             result.push(node);
    //         }
    //     }

    //     return result;

    // }


}











export function parse(tpl: string, options: Options): ast.Root {

    let parser = new Parser(lexer.lex(tpl, options), options);
    //TODO:用户扩展的Tags?
    for (let name in Tags) {
        parser.tagParsers.set(name, (<any>Tags)[name]); //Fuck, 实在不知道在TS中怎么来从获取对象成员，只好绕过它！！！
    }

    return parser.parseRoot();
}