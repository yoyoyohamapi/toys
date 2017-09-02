(function (global, factory) {
	typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory(require('ramda'), require('ramda-fantasy')) :
	typeof define === 'function' && define.amd ? define(['ramda', 'ramda-fantasy'], factory) :
	(global.sbn = factory(global.R,global.ramdaFantasy));
}(this, (function (R,ramdaFantasy) { 'use strict';

R = 'default' in R ? R['default'] : R;

/**
 * is not empty
 * a -> Bool
 */
const isNotEmpty = R.compose(
  R.not,
  R.isEmpty
);

/**
 * trace
 * a -> a
 */
const trace = R.curry((tag, obj) => {
  console.log(`${tag}\n`, JSON.stringify(obj, null, 4));
  console.log('\n');
  return obj;
});

/**
 * if a obj is an error
 * {k:v} -> Boolean
 */
const isError = R.compose(R.equals(true), R.prop('error'));

/**
 * if a obj is not an error
 * {k:v} -> Boolean
 */
const isNotError = R.compose(R.not, isError);

/**
 * create an error
 * String -> String -> {k:v}
 */
const createError = (type, message) => ({
  error: true,
  type,
  message
});

/**
 * command not valid error
 * String -> {k:v}
 */
const CommandNotValidError = command =>
  createError('CommandNotValid', `${command} is not a valid command.`);

const ShouldFollowedNumberError = command =>
  createError('ShouldFollowedNumber', `${command} should followed by number.`);

/**
 * is word
 * String -> Bool
 */
const isWord = R.and(isNotEmpty, isNaN);

/**
 * generate token
 * String -> Object
 */
const genToken = R.cond([
    [R.equals('*nl*'), R.always({ type: 'newline' })],
    [R.equals('*ccb*'), R.always({ type: 'ccb' })],
    [R.equals('*ob*'), R.always({ type: 'ob' })],
    [R.equals('*cb*'), R.always({ type: 'cb' })],
    [R.equals('*ocb*'), R.always({ type: 'ocb' })],
    [isWord, code => ({ type: 'word', value: code })],
    [R.T, code => ({ type: 'number', value: code })]
]);

/**
 * lexical analysis
 * String -> [a]
 */
const lexer = R.compose(
    ramdaFantasy.Either.Right,
    R.map(genToken),
    R.split(/[\t\f\v ]+/),
    R.replace(/\}/g, ' *ccb* '),
    R.replace(/\{/g, ' *ocb* '),
    R.replace(/\]/g, ' *cb* '),
    R.replace(/\[/g, ' *ob* '),
    R.replace(/[\n\r]/g, ' *nl* ')
);

/**
 * generate expression
 * String -> Object -> Object
 */
const genExpression = (type, obj) => R.merge({ type }, obj);

/**
 * generate a CallExpression
 * Object -> Object
 */
const genCallExpression = (name, args) => genExpression('CallExpression', {
    name,
    arguments: args
});

/**
 * generate a CommentExpression
 * Object -> Object
 */
const genCommentExpression = value => genExpression('CommentExpression', { value });

/**
 * if a token describes a command
 * {k:v} -> Boolean
 */
const isCommand = token => {
    return token.type === 'word' && R.has(token.value, parsers);
};

/**
 * if a token describes a number
 * {k:v} -> Boolean
 */
const isNumber = token => token.type === 'number';

/**
 * if a token describes a marker
 * {k:v} -> Boolean
 */
const isMarker = token => R.contains(token.type, [
    'newline',
    'ccb',
    'ocb',
    'ob',
    'cb'
]);

/**
 * command followed by numbers
 * String -> Number -> (([a]) -> ({k:v} |{ ShouldFollowedNumberError }))
 */
const followedNumber = (command, index) => R.cond([
    [R.all(isNumber), numbers => ({
        index: index + R.length(numbers) + 1,
        expression: genCallExpression(command, numbers.map(n => ({
            type: 'NumberLiteral',
            value: parseInt(n.value)
        })))
    })],
    [R.T, R.always(ShouldFollowedNumberError(command))]
]);

/**
 * command followed by comments
 * String -> Number -> ( ([a]) -> {k:v} )
 */
const followedComment = R.curry((command, index, comments) => ({
    index: index + R.length(comments) + 1,
    expression: genCommentExpression(R.map(R.prop('value'), comments).join(' '))
}));

/**
 * parsers
 * @type {Object}
 */
const parsers = {
    'Paper': (token, index, rest) =>
        followedNumber('Paper', index)([R.head(rest)]),
    'Pen': (token, index, rest) =>
        followedNumber('Pen', index)([R.head(rest)]),
    'Line': (token, index, rest) =>
        followedNumber('Line', index)(R.take(4, rest)),
    '//': (token, index, rest) =>
        followedComment('//', index)(R.takeWhile(
            (token) => token.type !== 'newline',
            R.slice(0, -1, rest)
        )),
    '{': () => ({
        type: 'Block Start'
    }),
    '}': () => ({
        type: 'Block End'
    })
};


/**
 * parse a token
 * [a] -> ( ([a], {k:v}, Number) -> ([b] | Undefined) )
 */
const parseToken = (tokens, index = 0) => {
    const len = R.length(tokens);
    return expressions => {
        const token = R.nth(index, tokens);
        return token ? R.cond([
            [
                expressions => isCommand(token),
                expressions => {
                    const rest = R.slice(index + 1, Infinity, tokens);
                    const res = parsers[token.value](token, index, rest);
                    index = R.has('index', res) ? res.index : index + 1;
                    return isError(res) ? res : R.concat(expressions, [res.expression]);
                }
            ],
            [
                expressions => isNumber(token) || isMarker(token),
                expressions => { index += 1; return expressions;}
            ],
            [R.T, expressions => CommandNotValidError(token.value)]
        ])(expressions) : expressions;
    }
};

/**
 * parse tokens to ast
 * [a] -> Object
 */
const parser = tokens => {
    const body = R.reduceWhile(isNotError, parseToken(tokens), [], tokens);
    return isError(body) ? ramdaFantasy.Either.Left(ramdaFantasy.Either.Left(R.merge(body, {phase: 'parse'}))) : ramdaFantasy.Either.Right({
        type: 'Drawing',
        body
    });
};

/**
 * convert level to a rgb color
 * String -> String
 */
const makeColor = level => {
    const validLevel = level || 100;
    const flipped = 100 - parseInt(level, 10);
    return `rgb(${flipped}%, ${flipped}%, ${flipped}%)`;
};

/**
 * generate a html tag
 * String -> Object -> Object
 */
const generateTag = (tag, attr, body) => ({
    tag,
    attr,
    body: body || []
});

/**
 * if an obj is an tag
 * {k:v} -> Boolean
 */
const isTag = R.has('tag');

/**
 * get arguments of expression
 * {k:v} -> [a]
 */
const getArguments = R.compose(
    R.map(R.prop('value')),
    R.prop('arguments')
);

const transformers = {
    'Paper': expression => {
        const [level] = getArguments(expression);
        const color = makeColor(level);
        return generateTag('rect', {
            x: 0,
            y: 0,
            width: 100,
            height: 100,
            fill: color
        });
    },
    'Pen': (expression, variables) => {
        const [level] = getArguments(expression);
        const pen = makeColor(level);
        return R.merge(variables, { pen });
    },
    'Line': (expression, variables) => {
        const [x1, y1, x2, y2] = getArguments(expression);
        return generateTag('line', {
            x1: x1,
            y1: 100 - y1,
            x2: x2,
            y2: 100 - y2,
            stroke: variables.pen,
            'stroke-linecap': 'round'
        })
    }
};


/**
 * if a command need to be transformed to a tag
 * String -> Boolean
 */
const needTransform = R.has(R.__, transformers);

/**
 * if an ast node is a CommentExpression
 * {k:v} -> Boolean
 */
const isComment = R.compose(R.equals('CommentExpression'), R.prop('type'));

/**
 * transform expression to svgAST node
 * {k:v} -> {k:v} -> {k:v}
 */
const transform = R.cond([
    [(res, expression) => needTransform(expression.name), (res, expression) => {
        const { variables, nodes } = res;
        const item = transformers[expression.name](expression, variables);
        return isTag(item) ? {
            variables: variables,
            nodes: R.concat(nodes, [item])
        }:{
            nodes: nodes,
            variables: item
        };
    }],
    [(res, expression) => isComment(expression), R.identity],
    [R.T, (res, expression) => CommandNotValidError(expression.name)]
]);

/**
 * transform ast to svg_ast
 * Object -> Object
 */
const transformer = ast => {
    const res = R.reduceWhile(isNotError, transform, {
        variables: {},
        nodes: []
    }, ast.body);
    return isError(res) ? ramdaFantasy.Either.Left(R.merge(res, {phase: 'transform'})) :
        ramdaFantasy.Either.Right(generateTag(
            'svg', {
                width: 100,
                height: 100,
                viewBox: '0 0 100 100',
                xmlns: 'http://www.w3.org/2000/svg',
                version: '1.1'
            },
            res.nodes));
};

const createAttrString = R.compose(
    R.join(' '),
    R.values,
    R.map(pair => `${pair[0]}="${pair[1]}"`),
    R.toPairs
);

/**
 * generate svg from svgAst
 * {k:v} -> {k:v}
 */
const traverseSvgAst = (obj) => {
    const attrText = createAttrString(obj.attr);
    const elements = R.map(node => traverseSvgAst(node), obj.body).join('\n\t');
    return `<${obj.tag} ${attrText}}>${elements}</${obj.tag}>`;
};

const generator =  R.compose(
    ramdaFantasy.Either.Right,
    traverseSvgAst
);

var SBN = {};

SBN.VERSION = '0.5.6';
SBN.lexer = lexer;
SBN.parser = parser;
SBN.transformer = transformer;
SBN.generator = generator;

SBN.compile = (options = {
    inspectLexer: trace('lexer'),
    inspectParser: trace('parser'),
    inspectTransformer: trace('transformer'),
    inspectGenerator: trace('generator'),
    inspectError: trace('error')
}) => content => ramdaFantasy.Either.Right(content)
        .chain(lexer)
        .map(R.tap(options.inspectLexer))
        .chain(parser)
        .map(R.tap(options.inspectParser))
        .chain(transformer)
        .map(R.tap(options.inspectTransformer))
        .chain(generator)
        .map(options.inspectGenerator)
        .either(options.inspectError, R.identity);

return SBN;

})));
