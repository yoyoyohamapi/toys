const STATUS_PENDING = 'pending'
const STATUS_FULFILLED = 'fulfilled'
const STATUS_REJECTED = 'rejected'

const isFunction = obj => typeof obj === 'function'

const isThenable = obj => obj.hasOwnProperty('then') && isFunction(obj.then)

const isPromise = obj => obj instanceof Promise

const isObject = obj => typeof obj === 'object'

const identity = value => value

const Promise = function (executor) {
  // promise 的三个状态，默认状态为 pending
  this.status = STATUS_PENDING
  // promise 被拒绝的原因
  this.reason = null
  // promise 的值
  this.value = null

  // 允许一个 promise 对象多次调用 then 或者 catch
  // const promise = new Promise()
  // promise.then(cb1)
  // promise.then(cb2)
  // promise.then(cb3)
  this.onFulfilledCallbacks = []
  this.onRejectedCallbacks = []

  const resolve = value => {
    setTimeout(() => {
      if (this.status === STATUS_PENDING) {
        this.status = STATUS_FULFILLED
        this.value = value
        this.onFulfilledCallbacks.forEach(cb => cb(value))
      }
    }, 0)
  }

  const reject = reason => {
    setTimeout(() => {
      if (this.status === STATUS_PENDING) {
        this.status = STATUS_REJECTED
        this.reason = reason
        this.onRejectedCallbacks.forEach(cb => cb(reason))
      }
    }, 0)
  }

  try {
    executor(resolve, reject)
  } catch (reason) {
    reject(reason)
  }
}

const resolvePromise = (promise, x, resolve, reject) => {
  if (promise === x) {
    return reject(new TypeError('Chaining cycle detected for promise!'))
  } else {
    if (isPromise(x)) {
      // 如果 x 是一个没有被 resolve 的值，那么它可能被 thennable 决定最终的值
      if (x.status === STATUS_PENDING) {
        return x.then(value => resolvePromise(promise, value, resolve, reject), reject)
      } else {
        return x.then(resolve, reject)
      }
    } else if (x && (isObject(x) || isFunction(x))) {
      let then
      // retrive then
      try {
        then = x.then
      } catch (e) {
        reject(e)
      }
      // 尝试调用 then
      if (isFunction(then)) {
        let resolveCalled = false
        try {
          then.call(x, y => {
            if (resolveCalled) return
            resolveCalled = true
            return resolvePromise(promise, y, resolve, reject)
          }, r => {
            if (resolveCalled) return
            resolveCalled = true
            return reject(r)
          })
        } catch (e) {
          if (resolveCalled) return
          resolveCalled = true
          reject(e)
        }

      } else {
        return resolve(x)
      }
    } else {
      return resolve(x)
    }
  }
}

Promise.prototype.then = function (onFulfilled, onRejected) {
  onFulfilled = isFunction(onFulfilled) ? onFulfilled : identity
  onRejected = isFunction(onRejected) ? onRejected : function (r) {
    throw r
  }
  let promise2
  if (this.status === STATUS_FULFILLED) {
    return promise2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const x = onFulfilled(this.value)
          resolvePromise(2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }, 0)
    })
  } else if (this.status === STATUS_REJECTED) {
    return promise2 = new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const x = onRejected(this.reason)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      }, 0)
    })
  } else if (this.status === STATUS_PENDING) {
    return promise2 = new Promise((resolve, reject) => {
      // 由于不知道状态，需要同时注册兑现和拒绝时的回调
      this.onFulfilledCallbacks.push(value => {
        try {
          const x = onFulfilled(value)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })

      this.onRejectedCallbacks.push(reason => {
        try {
          const x = onRejected(reason)
          resolvePromise(promise2, x, resolve, reject)
        } catch (e) {
          reject(e)
        }
      })
    })
  }
}

Promise.prototype.catch = function (onRejected) {
  return this.then(null, onRejected)
}

Promise.all = function (promises) {
  return new Promise((resolve, reject) => {
    const results = []
    const length = promises.length
    let completed = 0
    try {
      promises.forEach((promise, index) => {
        if (!isPromise(promise)) {
          results[index] = promise
          if (++completed === length) {
            resolve(results)
          }
        } else {
          promise.then(value => {
            results[index] = value
            if (++completed === length) {
              console.log(completed)
              resolve(results)
            } 
          })
        }
      })
    } catch (e) {
      reject(e)
    }
  })
}

Promise.race = function (promises) {
  let resolved = false
  return new Promise((resolve, reject) => {
    try {
      promises.forEach(promise => {
        promise.then(value => {
          if (!resolved) {
            resolved = true
            resolve(value)
          }
        })
      })
    } catch (e) {
      reject(e)
    }
  })
}

Promise.deferred = Promise.defer = function () {
  const dfd = {}
  dfd.promise = new Promise((resolve, reject) => {
    dfd.resolve = resolve
    dfd.reject = reject
  })
  return dfd
}

module.exports = Promise