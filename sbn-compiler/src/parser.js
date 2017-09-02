import R from 'ramda';
import { isError, isNotError, CommandNotValidError, ShouldFollowedNumberError } from './internal';
import { Either } from 'ramda-fantasy';

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
    return isError(body) ? Either.Left(Either.Left(R.merge(body, {phase: 'parse'}))) : Either.Right({
        type: 'Drawing',
        body
    });
};

export default parser;
