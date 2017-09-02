import R from 'ramda';

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
 * empty function
 * * -> ()
 */
const nil = () => {};

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

export {
  isNotEmpty,
  trace,
  nil,
  isError,
  isNotError,
  CommandNotValidError,
  ShouldFollowedNumberError
};