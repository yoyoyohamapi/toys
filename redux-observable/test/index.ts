/**
 * test redux-observable
 * @author yoyoyohamapi
 * @ignore created 2018-08-20 20:41:54
 */
import { expect } from 'chai'
import { merge } from 'rxjs'
import { mapTo, map } from 'rxjs/operators'
import { createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware, ofType } from '../src'

describe("our redux-observable", () => {
  it('should get initial state', () => {
    const reducer = (state = 0, action) => {
      if (action.type === 'PING') {
        return state + 1
      } else {
        return state
      } 
    }

    const epic = (action$, state$) => {
      return state$.pipe(
        mapTo({
          type: 'PING'
        })
      )
    }

    const epicMiddleware = createEpicMiddleware(epic)
    const store = createStore(reducer, applyMiddleware(epicMiddleware))
    store.dispatch({type: 'THIS_IS_INIT_ACTION'})
    expect(store.getState()).to.equal(1)
  })
})