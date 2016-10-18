# otpl-node  [![NPM version][npm-image]][npm-url] [![License][license-image]][license-url] [![Build Status][travis-image]][travis-url]

OTPL for Nodejs (Typescript). 


## Documentation

- [OTPL Spec](https://github.com/diosay/open-tpl)
- [Developer Doc](https://github.com/diosay/otpl-node/blob/master/src/README.md)

## Installation

```bash
$ npm install opentpl --save
```

## Usage
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
    this.otpl('index',{foo:'bar'}) //template file: /views/index.otpl.html
})

app.listen(3000,function(err){
	console.log('serve on port: 3000');
});

```

## License

[Apache-2.0][license-url]


[downloads-image]: https://img.shields.io/npm/dm/otpl.svg

[license-url]: https://opensource.org/licenses/Apache-2.0
[license-image]: https://img.shields.io/badge/license-Apache2.0-blue.svg

[npm-url]: https://www.npmjs.com/package/otpl
[npm-image]: https://img.shields.io/npm/v/otpl.svg

[travis-url]: https://travis-ci.org/opentpl/otpl-node
[travis-image]: https://img.shields.io/travis/opentpl/otpl-node.svg

[coveralls-url]: https://coveralls.io/r/opentpl/otpl-node
[coveralls-image]: https://img.shields.io/coveralls/opentpl/otpl-node/master.svg

[gitter-url]: https://gitter.im/opentpl/otpl-node
[gitter-image]: https://badges.gitter.im/opentpl/otpl-node.png