# otpl-node

[![NPM version][npm-image]][npm-url] [![Downloads][downloads-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Coveralls Status][coveralls-image]][coveralls-url]

OTPL for Nodejs (Typescript). 



## OTPL规范/文档

[OTPL Spec](https://github.com/diosay/open-tpl).

[Developer Doc](https://github.com/diosay/otpl-node/blob/master/src/README.md).

## 安装

```bash
$ npm install --save otpl
```

## 用例
```js
const otpl = require('opentpl')

otpl.config(__dirname,{
    debug:true,
    ...
})

//使用 koa 框架为例
const app = require('koa')();

//注册中间件
app.use(function *(next){
	this.otpl = function* (view, data) {
        let ctx = this
        yield new Promise((resolve, reject) => {
            let callback = function (err, rendered) {
                if (err) {
                    rendered = err.message;
                    console.log('render error:', err)
                }
				this.type = 'text/html;charset=UTF-8'
                ctx.body = rendered
                resolve(rendered)
            }
            otpl.render(view, data, callback)
        })
    }
	yield next;
});

app.use(function *(next){
    this.otpl('index',{foo:'bar'}) // /views/index.otpl.html
})

app.listen(3000,function(err){
	console.log('serve on port: 3000');
});

```


[downloads-image]: https://img.shields.io/npm/dm/otpl.svg

[npm-url]: https://www.npmjs.com/package/otpl
[npm-image]: https://img.shields.io/npm/v/otpl.svg

[travis-url]: https://travis-ci.org/diosay/otpl-node
[travis-image]: https://img.shields.io/travis/diosay/otpl-node.svg

[coveralls-url]: https://coveralls.io/r/diosay/otpl-node
[coveralls-image]: https://img.shields.io/coveralls/diosay/otpl-node/master.svg

[gitter-url]: https://gitter.im/diosay/otpl-node
[gitter-image]: https://badges.gitter.im/diosay/otpl-node.png