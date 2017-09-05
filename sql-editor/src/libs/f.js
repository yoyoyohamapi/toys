/**
 * 工具函数库
 * @author surejinwu
 * @ignore created in 2017-08-07
 */

/**
 * 占位符
 */
export const _ = Symbol('@@placeholder')

/**
 * Curry 化
 * @author surejinwu
 * @param {Function} f
 * @param {...*} arr
 * @ignore created 2017-08-07
 */
export const curry = (f, arr = []) => {
  return (...args) => {
    let j = 0
    const arrCopy = [...arr]
    // 跳过占位符
    for (let i = 0; i < arrCopy.length; i++) {
      if (arrCopy[i] === _) {
        arrCopy[i] = args[j++]
      }
    }
    const combined = j < args.length ? [...arrCopy, ...args.slice(j)] : [...arrCopy]
    const validArgs = combined.filter(arg => arg !== _)
    return validArgs.length >= f.length ? f(...combined) : curry(f, combined)
  }
}

/**
 * Partial
 * @author surejinwu
 * @param {Function} func
 * @param {...*} args
 * @ignore created 2017-08-07
 */
export const partial = (...args) => {
  const func = args.shift()
  return (...a) => {
    const len = args.length
    let j = 0
    for (let i = 0; i < len; i++) {
      if (args[i] === _) {
        args[i] = a[j++]
      }
    }
    if (j < a.length) {
      args = [...args, ...a]
    }
    return func(...args)
  }
}

/**
 * 函数组合
 * @author surejinwu
 * @param {...Function} funcs
 * @ignore created 2017-08-07 
 */
export const compose = (...funcs) => x => funcs.reduceRight((input, func) => func(input), x)

/**
 * Map
 * @param {Function} fn
 * @param {Array} array
 */
export const map = curry((fn, array) => array.map(fn))

/**
 * 判断序列 `list` 是否含有元素 item
 * @author surejinwu
 * @param {*} item
 * @param {Array} list
 * @ignore created 2017-08-07
 */
export const contains = curry((item, list) => list.indexOf(item) > -1)

/**
 * 判断 `obj` 是否通过所有的中值检测函数 `predicates`
 * @param {Array} predicates
 * @param {*} obj 
*/ 
export const allPass = curry((predicates, obj) => {
  // 提前阻断
  const length = predicates.length
  for (let i = 0; i < length; i++) {
    const flag = predicates[i](obj)
    if (flag === false) {return flag}
  }
  return true
})

/**
 * 打印 data
 * @param {String} tag
 * @param {*} data
 */
export const tap = curry((tag, data) => {
  console.log(tag || '', data)
  return data
})

export const isPlainObject = obj =>
  typeof obj === 'object' && Reflect.getPrototypeOf(obj) === Object.prototype

/**
 * 判断对象是否为空
 * @param {*} obj
 * @ignore created 2017-09-05 
 */
export const isEmpty = obj => {
  // String or Array
  if (Array.isArray(obj) || typeof obj === 'string' || typeof obj.splice === 'function') {
    return !obj.length
  }
  // null
  if (obj === null || obj === undefined) {
    return true
  }
  // Bool
  if (typeof obj === 'boolean') {
    return true
  }
  // Plain Object
  if (isPlainObject(obj)) {
    return !(Object.keys(obj).length)
  }
  return false
}

/**
 * join
 * @param {String} seperator
 * @param {Array} array
 * @ignore created 2017-09-05
 */
export const join = curry((seperator, array) => array.join(seperator))

/**
 * replace
 * @param {Regex} regex
 * @param {String} replaced
 * @param {String} str
 * @ignore created 2017-09-05
 */
export const replace = curry((regex, dest, str) => str.replace(regex, dest))

/**
 * slice
 * @param {Int} begin
 * @param {Int} end
 * @param {Array} array
 * @ignore created 2017-09-05
 */
export const slice = curry((begin, end, array) => array.slice(begin, end))

/**
 * escapeRgeExp
 * @param {String} str
 * @ignore created 2017-09-05
 */
export const escapeRegExp = replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')

/**
 * ifElse
 * @param {Function} predicate 
 * @param {Function} trueFn 
 * @param {Function} falseFn 
 * @param {*} data
 * @ignore 2017-09-05
 */
export const ifElse = curry((predicates, trueFn, falseFn, data) => {
  if (predicates(data)) {
    return trueFn(data)
  } else {
    return falseFn(data)
  }
})
