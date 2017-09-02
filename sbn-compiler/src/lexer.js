import R from 'ramda';
import { isNotEmpty, trace } from './internal.js';
import { Either } from 'ramda-fantasy';

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
    Either.Right,
    R.map(genToken),
    R.split(/[\t\f\v ]+/),
    R.replace(/\}/g, ' *ccb* '),
    R.replace(/\{/g, ' *ocb* '),
    R.replace(/\]/g, ' *cb* '),
    R.replace(/\[/g, ' *ob* '),
    R.replace(/[\n\r]/g, ' *nl* ')
);

export default lexer;
