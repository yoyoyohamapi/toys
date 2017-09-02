import R from 'ramda';
import { nil, isError, isNotError, CommandNotValidError } from './internal';
import { Either } from 'ramda-fantasy';

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
    return isError(res) ? Either.Left(R.merge(res, {phase: 'transform'})) :
        Either.Right(generateTag(
            'svg', {
                width: 100,
                height: 100,
                viewBox: '0 0 100 100',
                xmlns: 'http://www.w3.org/2000/svg',
                version: '1.1'
            },
            res.nodes));
};

export default transformer;
