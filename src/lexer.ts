/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

const whitespaceChars = ' \n\t\r\u00A0';
// const delimChars = '()[]{}%*-+~/#@,:|.<>=!';
const intChars = '0123456789';
const id_pattern = /[\w_\$]+/;

export const TOKEN_START = 'token-start';
export const TOKEN_END = 'token-end';

export const TOKEN_STRING = 'string';
export const TOKEN_WHITESPACE = 'whitespace';
export const TOKEN_DATA = 'data';
export const TOKEN_COMMENT = 'comment';
export const TOKEN_LITERAL = 'literal';
export const TOKEN_ID = 'id';
export const TOKEN_INT = 'int';

export const TOKEN_SYMBOL = 'symbol';				//符号
export const TOKEN_BOOLEAN = 'boolean';			//TRUE,FALSE

export const TOKEN_DOT = 'dot';				//.
export const TOKEN_SEMICOLON = 'semicolon';			//;
export const TOKEN_COMMA = 'comma';				//;
export const TOKEN_COLON = 'colno';				//:
export const TOKEN_TILDE = 'tilde';				//~
export const TOKEN_PIPE = 'pipe';				//|
export const TOKEN_EXCLAMATION = 'exclamation';		//!
export const TOKEN_LEFT_CURLY = 'left-curly';			//{
export const TOKEN_RIGHT_CURLY = 'right-curly';		//}
export const TOKEN_LEFT_BRACKET = 'left-bracket';		//[
export const TOKEN_RIGHT_BRACKET = 'right-bracket';		//]
export const TOKEN_LEFT_PAREN = 'left-paren';			//(
export const TOKEN_RIGHT_PAREN = 'right-paren';		//)

export const TOKEN_LITERAL_START = 'literal-start';
export const TOKEN_LITERAL_END = 'literal-end';

export const TOKEN_NONE = 'none';


export interface Token {
    type: string
    value: string
    line: number
    column: number
}


//构造 token 
function token(type: string, value: string, line: number, col: number): Token {
    return {
        type: type,		//类型
        value: value,	//值
        line: line,		//行号
        column: col 		//列号
    }
}

//SyntaxError
// function TemplateError(message, line, col, filename) {
//     this.name = 'TemplateError';
//     this.message = message;
//     //(unknown path)
//     this.lineno = line;
//     this.colno = col;
//     Error.captureStackTrace(this, TemplateError);

//     if (filename) {
//         this.message += ' (' + filename + ':';
//     } else {
//         this.message += ' (unknown path:';
//     }
//     this.message += line + ':' + col + ')';
// }


export class Tokenizer {
    index: number = 0
    length: number
    source: string
    line: number = 1
    col: number = 1
    inComment: boolean = false
    inCode: boolean = false
    inLiteral: boolean = false

    blockStart: string = '{{'
    blockEnd: string = '}}'

    constructor(source: string, options: any) {
        this.source = source;
        this.length = source.length;
        this.line = 1;
        this.col = 1;
        this.inComment = false;
        this.inCode = false;
        this.inLiteral = false;

    }
    // SyntaxError: Unexpected token


    //抛出异常
    fail(msg: string, line: number, col: number) {
        throw `TemplateError:${msg} line:${line},col:${col}`;//new TemplateError(msg, line, col);
    }

    eof() {
        return this.index >= this.length;
    }

    /**
     * 获取当前字符
     */
    current() {
        return this.source.charAt(this.index);
    }

    /**
     * 获取上个字符
     */
    previous() {
        return this.source.charAt(this.index - 1);
    }

    /**
     * 前进一个字符
     */
    forward() {
        this.index++;
        if (this.previous() === '\n') {
            this.line++;
            this.col = 1;
        }
        else {

            this.col++;
        }
    }

    /**
     * 前进 n 字符
     */
    forwardN(n: number) {
        for (var i = 0; i < n; i++) {
            this.forward();
        }
    }

    /**
     * 后退一个字符
     */
    back() {
        this.index--;

        if (this.current() === '\n') {
            this.line--;

            var idx = this.source.lastIndexOf('\n', this.index - 1);
            if (idx === -1) {
                this.col = this.index;
            }
            else {
                this.col = this.index - idx;
            }
        }
        else {
            this.col--;
        }
    }

    /**
     * 后退 n 个字符
     */
    backN(n: number) {
        for (var i = 0; i < n; i++) {
            this.back();
        }
    }

    //匹配给定字符串
    match(str: string) {
        if (this.index + str.length > this.length) {
            return false;
        }

        //TODO：第一个字符先比较提高性能
        return str === this.source.slice(this.index, this.index + str.length);
    }

    //提取给定字符串
    extractString(str: string) {
        if (this.match(str)) {
            this.forwardN(str.length);
            return str;
        }
        return null;
    }

    // matchReg(pattern:RegExp) {

    //     var matches = pattern.match(this.source, this.index);

    // }

    /**
     * 移除空白字符
     */
    stripWhitespace() {
        for (; ;) {
            if (this.eof()) {
                return;
            }
            let c = this.current();
            if (!(c === '\t' || c === ' ' || c === '\r' || c === '\n')) {
                return;
            }
            this.forward();
        }
    }

    //解析字符串
    parseString(delimiter: string) {
        this.forward();
        var found = false;
        var str = '';
        while (!this.eof() && !(this.current() === '\r' || this.current() === '\n')) {
            if (this.current() === delimiter) {
                found = true;
                break;
            }
            if (this.current() === '\\') {

                this.forward();
                switch (this.current()) {
                    case 'n': str += '\n'; break;
                    case 't': str += '\t'; break;
                    case 'r': str += '\r'; break;
                    default:
                        str += this.current();
                }

            }
            else {
                str += this.current();
            }
            this.forward();
        }

        if (!found) {
            return null; //字符串未结束
        }
        else {
            this.forward();
        }
        return str;
    }

	/**
	 * 获取下一个 token
	 * public
	 */
    next() {
        let val = '',
            tok = '',
            line = this.line,
            col = this.col

        if (this.eof()) {
            return null;
        }

        if (this.inCode) {


            let c = this.current();

            if (this.inComment) {
                //处理多行注释
                val = '';
                //var cur;
                var endChar = this.blockEnd.charAt(this.blockEnd.length - 1);
                while (!this.eof()) {
                    if (this.current() === '*' && (tok = this.extractString('*/'))) {
                        this.inComment = false;
                        val += tok;
                        break;
                    }
                    else if (this.current() === endChar && this.match(this.blockEnd)) {
                        this.inCode = false;
                        break;
                    }
                    val += this.current();
                    this.forward();
                }
                return token(TOKEN_COMMENT, val, line, col);
            }
            else if (this.inLiteral) {
                //处理保持原样
                val = '';
                //var cur;
                var endChar = this.blockEnd.charAt(this.blockEnd.length - 1);
                while (!this.eof()) {
                    if (this.current() === endChar && this.match(this.blockEnd)) {
                        this.inCode = false;
                        break;
                    }
                    else if (this.current() === '/' && (tok = this.extractString('/literal'))) {
                        //this.fail('test')
                        if (/\w/.test(this.current())) {
                            this.backN(tok.length);
                            break;
                        }
                        else {
                            this.inLiteral = false;
                            break;
                        }
                    }
                    val += this.current();
                    this.forward();
                }
                return token(this.inLiteral ? TOKEN_LITERAL : TOKEN_LITERAL_END, val, line, col);
            }
            else if (c === '"' || c === '\'') {
                //处理字符串
                val = this.parseString(c);
                if (val===undefined || val===null) {
                    this.fail('字符串未结束', line, col);
                }
                return token(TOKEN_STRING, val, line, col);
            }
            else if ((val = this.extractString('//'))) {
                //处理单行注释
                while (!this.eof() && this.current() !== '\n' && this.current() !== '}') {
                    val += this.current();
                    this.forward();
                }
                //this.forward();
                return token(TOKEN_COMMENT, val, line, col);
            }
            else if ((val = this.extractString('/*'))) {
                //开始多行注释
                this.inComment = true;
                return token(TOKEN_COMMENT, val, line, col);
            }
            else if ((val = this.extractString(this.blockEnd))) {
                //代码结束
                this.inCode = false;
                return token(TOKEN_END, val, line, col);
            }
			/*else if((val = this.extractString('literal',true))){
				//处理原样输出
				tok = null;
				while(!this.eof() && !(tok=this.extractString('/literal'))){
					val += this.current();
					this.forward();
				}
				if(!tok){
					this.fail('多行注释未找到结束标签',line,col);
				}
				return token(TOKEN_LITERAL,val+tok,line,col);
			}*/
            else {


                let type: string = null;

                switch (this.current()) {
                    case '+':
                        if (!(val = this.extractString('++'))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '-':
                        if (!(val = this.extractString('--'))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '=':
                        if (!(val = this.extractString('=='))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '!':
                        if (!(val = this.extractString('!='))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '>':
                        if (!(val = this.extractString('>='))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '<':
                        if (!(val = this.extractString('<='))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '|':
                        if (!(val = this.extractString('||'))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '&':
                        if (!(val = this.extractString('&&'))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '?':
                        if (!(val = this.extractString('??'))) {
                            val = this.current();
                            this.forward();
                        }
                        type = TOKEN_SYMBOL;
                        break;
                    case '*':
                    case '/':
                    case '.':
                    case ':':
                    case ',':
                    case ';':
                    case '@':
                    case '[':
                    case ']':
                    case '(':
                    case ')':
                        type = TOKEN_SYMBOL;
                        val = this.current();
                        this.forward();
                        break;
                }
                if (type) {
                    return token(type, val, line, col);
                }
                else if (whitespaceChars.indexOf(this.current()) > -1) {
                    this.stripWhitespace();
                    return token(TOKEN_WHITESPACE, c, line, col);
                }
                else if (intChars.indexOf(this.current()) > -1) {
                    val = '';
                    while (!this.eof() && intChars.indexOf(this.current()) > -1) {
                        val += this.current();
                        this.forward();
                    }
                    return token(TOKEN_INT, val, line, col);
                }
                else if (id_pattern.test(this.current())) {
                    // console.log('move col',this.col);
                    val = '';
                    while (!this.eof() && id_pattern.test(this.current())) {
                        val += this.current();
                        this.forward();
                    }
                    // this.stripWhitespace();
                    // if(val == 'literal'){
                    // 	if((tok = this.extractString(this.tags.blockEnd))){
                    // 		this.inLiteral = true;
                    // 		return token(TOKEN_LITERAL_START,val,line,col);
                    // 	}
                    // 	else{
                    // 		this.fail('literal标签必须是独立的。',line,col);
                    // 	}
                    // }
                    if (/TRUE|FALSE/i.test(val)) {
                        return token(TOKEN_BOOLEAN, val, line, col);
                    }
                    return token(TOKEN_ID, val, line, col);
                }


                this.fail('非法字符，在或者 "' + this.current() + '" 附近。', line, col);

            }
        }
        else if ((val = this.extractString(this.blockStart))) {
            //代码开始
            this.inCode = true;
            //移除空白字符,为下次处理注释、原样输出等做预处理 ?


            //独立标签
            var old = this.index;
            this.stripWhitespace();
            if (this.inLiteral && (tok = this.extractString('/literal'))) {
                this.stripWhitespace();
                if ((tok = this.extractString(this.blockEnd))) {
                    this.inLiteral = false;
                    this.inCode = false;
                    return token(TOKEN_LITERAL_END, val, line, col);
                }
            }
            else if (!this.inLiteral && (tok = this.extractString('literal')) && !/\w/.test(this.current())) {
                this.stripWhitespace();
                if ((tok = this.extractString(this.blockEnd))) {
                    this.inLiteral = true;
                    this.inCode = false;
                    return token(TOKEN_LITERAL_START, val, line, col);
                }
                this.fail('literal标签必须是独立的。', line, col);
            }
            else if (this.inLiteral) {
                this.inCode = false;
            }

            this.index = old;

            return token(this.inComment ? TOKEN_COMMENT : (this.inLiteral ? TOKEN_LITERAL : TOKEN_START), val, line, col);
        }
        else {
            val = '';
            let beginChar = this.blockStart.charAt(0);
            while (!this.eof()) {
                if (beginChar === this.current() && this.match(this.blockStart)) {
                    break;
                }
                val += this.current();
                this.forward();
            }
            return token(this.inComment ? TOKEN_COMMENT : (this.inLiteral ? TOKEN_LITERAL : TOKEN_DATA), val, line, col);
        }
    }


}

/**
 * 
 */
export function lex(source: string, options: any) {
    return new Tokenizer(source, options);
}