import R from 'ramda';
import lexer from './lexer';
import parser from './parser';
import transformer from './transformer';
import generator from './generator';
import { nil, isError, trace } from './internal';
import { Either } from 'ramda-fantasy';

var SBN = {};

SBN.VERSION = '0.5.6'
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
}) => content => Either.Right(content)
        .chain(lexer)
        .map(R.tap(options.inspectLexer))
        .chain(parser)
        .map(R.tap(options.inspectParser))
        .chain(transformer)
        .map(R.tap(options.inspectTransformer))
        .chain(generator)
        .map(options.inspectGenerator)
        .either(options.inspectError, R.identity);

export default SBN;
