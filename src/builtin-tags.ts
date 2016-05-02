/*---------------------------------------------------------
 * Copyright 2016 otpl-node Author. All rights reserved.
 *--------------------------------------------------------*/

/// <reference path="../typings/main.d.ts" />

import * as path from 'path';

import * as ast from './ast';
import * as lexer from './lexer';
import * as utils from './utils';
import {Parser} from './parser';


function mbk(tags: string[], keep?: boolean) {
    return { keep: keep || false, tags: tags };
}

const TAGS = {
    'layout': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectType(lexer.TOKEN_STRING, 'parseLayout:', tok);

        let src = tok.value;
        if (src.charAt(0) !== '/') {
            src = path.join(path.dirname(parser.options.file), src);
        }
        src = utils.canonicalViewPath(src, parser.options.viewPath, parser.options.viewExt);

        let node = new ast.Layout(tok.line, tok.column, src);

        parser.checkBoundary(node, 'parseLayout:');


        return node;
    },
    'include': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectType(lexer.TOKEN_STRING, 'parseInclude:', tok);

        let src = tok.value;
        if (src.charAt(0) !== '/') {
            src = path.join(path.dirname(parser.options.file), src);
        }
        src = utils.canonicalViewPath(src, parser.options.viewPath, parser.options.viewExt);

        let node = new ast.Include(tok.line, tok.column, src);

        parser.checkBoundary(node, 'parseInclude:');


        return node;
    },


    'block': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectType(lexer.TOKEN_ID, 'parseBlock:', tok)
        let id = tok.value;
        parser.checkBoundary(tok, 'parseInclude:');

        var node = new ast.Block(tok.line, tok.column, id);
        parser.parseUntil(node, [mbk(['/', 'block'])])
        return node;
    },
    'set': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectType(lexer.TOKEN_ID, 'parseSet:', tok)
        let id = tok.value;
        if (parser.skipSymbol(['='])) {
            var node = new ast.Set(tok.line, tok.column,
                id, parser.parseExpression());
            if (parser.parseBoundary()) {
                return node;
            }
        }
        parser.fail('parseSet: 语法错误:' + tok.value, tok.line, tok.column);
    },

    'if': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectValue('(', 'parseIf: ', tok)


        let condition = parser.parseExpression();
        //console.log(node.cond.children[0]);
        tok = parser.expectValue(')', 'parseIf: ', tok)
        parser.checkBoundary(tok, 'parseIf:');
        var node = new ast.If(tok.line, tok.column, condition);
        parser.parseUntil(node, [mbk(['elif'], true), mbk(['else'], true), mbk(['/', 'if'])]);

        switch (parser.peek ? parser.peek.value : '') {
            case 'elif': {
                node.items.push(TAGS['if'](parser.next, parser));
            }
            case 'else': {
                node.items.push(TAGS['_else'](parser.next, parser, 'if'));
                break;
            }
            default:
                break;
        }


        return node;
    },
    '_elif': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectValue('(', 'parseElif: ', tok)


        let condition = parser.parseExpression();
        //console.log(node.cond.children[0]);
        tok = parser.expectValue(')', 'parseElif: ', tok)
        parser.checkBoundary(tok, 'parseElif:');
        var node = new ast.Elif(tok.line, tok.column, condition);
        parser.parseUntil(node, [mbk(['elif'], true), mbk(['else'], true), mbk(['/', 'if'])]);
        return node;
    },
    '_else': (tok: lexer.Token, parser: Parser, tag: string) => {
        tok = parser.skipWhitespace();
        parser.checkBoundary(tok, 'parseElse:');
        var node = new ast.Else(tok.line, tok.column);
        parser.parseUntil(node, [mbk(['/', tag])]);
        return node;
    },
    'for': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        tok = parser.expectType(lexer.TOKEN_ID, 'parseFor:', tok)
        let key = ''
        let val = tok.value;
        tok = parser.skipWhitespace();
        if ((tok = parser.skipSymbol([',']))) {
            tok = parser.expectType(lexer.TOKEN_ID, 'parseFor:', tok);
            key = val;
            val = tok.value;
        }
        tok = parser.expectValue(':', 'parseFor:', tok)

        let it = parser.parseExpression();//迭代表达式
        parser.checkBoundary(tok, 'parseElse:');
        let node = new ast.For(tok.line, tok.column, key, val, it);
        parser.parseUntil(node, [mbk(['else'], true), mbk(['/', 'for'])]);
        if (parser.peek && parser.peek.value === 'else') {
            node.elseBlock = TAGS['_else'](parser.next, parser, 'for');
        }
        return node;
    },
    'break': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        parser.checkBoundary(tok, 'parseElse:');
        return new ast.Break(tok.line, tok.column, true);
    },
    'continue': (tok: lexer.Token, parser: Parser) => {
        tok = parser.skipWhitespace();
        parser.checkBoundary(tok, 'parseContinue:');
        return new ast.Break(tok.line, tok.column, false);
    }
}

export default TAGS;