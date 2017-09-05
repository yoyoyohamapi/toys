/**
 * @module lexer SQL语句 词法分析
 * @author surejinwu
 * @reference https://github.com/zeroturnaround/sql-formatter
 */
import * as F from './f'

const TOKEN_TYPES = {
  WHITESPACE: "whitespace",
  WORD: "word",
  STRING: "string",
  RESERVED: "reserved",
  RESERVED_TOPLEVEL: "reserved-toplevel",
  RESERVED_NEWLINE: "reserved-newline",
  OPERATOR: "operator",
  OPEN_PAREN: "open-paren",
  CLOSE_PAREN: "close-paren",
  LINE_COMMENT: "line-comment",
  BLOCK_COMMENT: "block-comment",
  NUMBER: "number",
  PLACEHOLDER: "placeholder"
}

const WHITESPACE_REGEX = /^(\s+)/
const NUMBER_REGEX = /^((-\s*)?[0-9]+(\.[0-9]+)?|0x[0-9a-fA-F]+|0b[01]+)\b/
const OPERATOR_REGEX = /^(!=|<>|==|<=|>=|!<|!>|\|\||::|->>|->|.)/
const BLOCK_COMMENT_REGEX = /^(\/\*[^]*?(?:\*\/|$))/

const STRING_PATTERNS = {
  "``": "((`[^`]*($|`))+)",
  "[]": "((\\[[^\\]]*($|\\]))(\\][^\\]]*($|\\]))*)",
  "\"\"": "((\"[^\"\\\\]*(?:\\\\.[^\"\\\\]*)*(\"|$))+)",
  "''": "(('[^'\\\\]*(?:\\\\.[^'\\\\]*)*('|$))+)",
  "N''": "((N'[^N'\\\\]*(?:\\\\.[^N'\\\\]*)*('|$))+)"
}

const createRegex = F.curry((config, pattern) => new RegExp(pattern, config))

const createReservedWordRegex = F.compose(
  createRegex('i'),
  pattern => `^(${pattern})\\b`,
  F.replace(/ /g, '\\s+'),
  F.join('|')
)

const createLineCommentRegex = F.compose(
  createRegex(''),
  pattern => `^((?:${pattern}).*?(?:\n|$))`,
  F.join('|'),
  F.map(F.escapeRegExp)
)

const createWordRegex = F.compose(
  createRegex(''),
  pattern => `^([\\w${pattern}]+)`,
  F.join('')
)

const createStringPattern = F.compose(
  F.join('|'),
  F.map(t => STRING_PATTERNS[t])
)

const createStringRegex = F.compose(
  createRegex(''),
  pattern => `^(${pattern})`,
  createStringPattern
)

const createParenRegex = F.compose(
  createRegex(''),
  pattern => `$(${pattern})`,
  F.join('|'),
  F.map(F.escapeRegExp)
)

const createPlaceholderRegex = (types, pattern) => F.ifElse(
  F.isEmpty,
  () => false,
  F.compose(
    createRegex(''),
    typesPattern => `^((?:${typesPattern})(?:${pattern}))`,
    F.join('|'),
    F.map(F.escapeRegExp)
  )
)(types)

/**
 * 获得第一个匹配的 token
 * @param {String} type
 * @param {Regex} regx
 * @param {String} input
 */
const getToken = F.curry((type, regex, input) => {
  const matches = input.match(regex)

  if (matches) {
    return {
      type,
      value: matches[1]
    }
  }
})

const getPlaceholderTokenWithKey = F.curry((regex, parseKey, input) => {
  const token = getToken(TOKEN_TYPES.PLACEHOLDER, regex, input)
  if (token) {
    token.key = parseKey(token.value)
  }
  return token
})

const getEscapedPlaceholderKey = (key, quoteChar) => 
  F.repalce(new RegExp(`${F.escapeRegExp("\\")}${quoteChar}`, "g"), quoteChar)(key)

export default function createLexer(config) {
  const LINE_COMMENT_REGEX = createLineCommentRegex(config.lineCommentTypes)
  const RESERVED_TOPLEVEL_REGEX = createReservedWordRegex(config.reservedToplevelWords)
  const RESERVED_NEWLINE_REGEX = createReservedWordRegex(config.reservedNewlineWords)
  const RESERVED_PLAIN_REGEX = createReservedWordRegex(config.reservedWords)

  const WORD_REGEX = createWordRegex(config.specialWordChars || [])
  const STRING_REGEX = createStringRegex(config.stringTypes)

  const OPEN_PAREN_REGEX = createParenRegex(config.openParens)
  const CLOSE_PAREN_REGEX = createParenRegex(config.closeParens)

  const INDEXED_PLACEHOLDER_REGEX = createPlaceholderRegex(config.indexedPlaceholderTypes, "[0-9]*")
  const IDENT_NAMED_PLACEHOLDER_REGEX = createPlaceholderRegex(config.namedPlaceholderTypes, "[a-zA-Z0-9._$]+")
  const STRING_NAMED_PLACEHOLDER_REGEX = createPlaceholderRegex(config.namedPlaceholderTypes, createStringPattern(config.stringTypes))

  const getWhitespaceToken = getToken(TOKEN_TYPES.WHITESPACE, WHITESPACE_REGEX)
  const getLineCommentToken = getToken(TOKEN_TYPES.LINE_COMMENT, LINE_COMMENT_REGEX)
  const getBlockCommentToken = getToken(TOKEN_TYPES.BLOCK_COMMENT, BLOCK_COMMENT_REGEX)
  const getCommentToken = input => getLineCommentToken(input) || getBlockCommentToken(input)
  const getStringToken = getToken(TOKEN_TYPES.STRING, STRING_REGEX)
  const getOpenParenToken = getToken(TOKEN_TYPES.OPEN_PAREN, OPEN_PAREN_REGEX)
  const getCloseParenToken = getToken(TOKEN_TYPES.CLOSE_PAREN, CLOSE_PAREN_REGEX)
  const getIdentNamedPlaceholderToken = getPlaceholderTokenWithKey(IDENT_NAMED_PLACEHOLDER_REGEX, F.slice(1, Infinity))
  const getStringNamedPlaceholderToken = getPlaceholderTokenWithKey(STRING_NAMED_PLACEHOLDER_REGEX, v => {
    const key = F.slice(2, -1)(v)
    const quoteChar = F.slice(-1)(v)
    return getEscapedPlaceholderKey(key, quoteChar)
  })
  const getIndexedPlaceholderToken = getPlaceholderTokenWithKey(INDEXED_PLACEHOLDER_REGEX, F.slice(1, Infinity))
  const getPlaceholderToken = input =>
    getIdentNamedPlaceholderToken(input) ||
    getStringNamedPlaceholderToken(input) ||
    getIndexedPlaceholderToken(input)

  const getNumberToken = getToken(TOKEN_TYPES.NUMBER, NUMBER_REGEX)
  const getOperatorToken = getToken(TOKEN_TYPES.OPERATOR, OPERATOR_REGEX)
  const getToplevelReservedToken = getToken(TOKEN_TYPES.RESERVED_TOPLEVEL, RESERVED_TOPLEVEL_REGEX)
  const getNewlineReservedToken = getToken(TOKEN_TYPES.RESERVED_NEWLINE_REGEX, RESERVED_NEWLINE_REGEX)
  const getPlainReservedToken = getToken(TOKEN_TYPES.RESERVED, RESERVED_PLAIN_REGEX)
  const getReservedWordToken = (input, previousToken) => {
    // A reserved word cannot be preceded by a "." this makes it so in
    // "mytable.from", "from" is not considered a reserved word
    if (previousToken && previousToken.value && previousToken.value === ".") {
      return
    }
    return getToplevelReservedToken(input) || getNewlineReservedToken(input) || getPlainReservedToken(input)
  }
  const getWordToken = getToken(TOKEN_TYPES.WORD, WORD_REGEX)

  const getNextToken = (input, previousToken) =>
    getWhitespaceToken(input) ||
    getCommentToken(input) ||
    getStringToken(input) ||
    getOpenParenToken(input) ||
    getCloseParenToken(input) ||
    getPlaceholderToken(input) ||
    getNumberToken(input) ||
    getReservedWordToken(input, previousToken) ||
    getWordToken(input) ||
    getOperatorToken(input)

  return function lexer(input) {
    const tokens = []
    let token

    // Keep processing the string until it is empty
    while (input.length) {
      // Get the next token and the token type
      token = getNextToken(input, token)
      // Advance the string
      input = input.substring(token.value.length)
      tokens.push(token)
    }
    return tokens
  }
}
