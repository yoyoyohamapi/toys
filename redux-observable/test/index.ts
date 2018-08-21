/**
 * test redux-observable
 * @author yoyoyohamapi
 * @ignore created 2018-08-20 20:41:54
 */
import { expect } from 'chai'
import { mapTo, distinctUntilChanged } from 'rxjs/operators'
import { createStore, applyMiddleware } from 'redux'
import { createEpicMiddleware, ofType } from '../src'

describe("our redux-observable", () => {
  it('should epic map success', () => {
    const reducer = (state = 0, action) => {
      if (action.type === 'PONG') {
        return state + 1
      } else {
        return state
      } 
    }

    const epic = (action$, state$) => {
      return action$.pipe(
        ofType('PING'),
        mapTo(({type: 'PONG'}))
      )
   }

    const epicMiddleware = createEpicMiddleware(epic)
    const store = createStore(reducer, applyMiddleware(epicMiddleware))
    store.dispatch({type: 'PING'})
    expect(store.getState()).to.equal(1)
  })

  it('should observe initial state', () => {
    const actions = []
    const reducer = (state = 0, action) => {
      actions.push(action)
      if (action.type === 'PONG') {
        return state + 1
      } else {
        return state
      } 
    }

    const epic = (action$, state$) => {
      return state$.pipe(
        distinctUntilChanged(),
        mapTo(({type: 'STATE'}))
      )
   }

    const epicMiddleware = createEpicMiddleware(epic)
    createStore(reducer, applyMiddleware(epicMiddleware))
    epicMiddleware.run()
    // store.dispatch({type: 'IGNORE_THIS_ACTION'})
    actions.shift()
    expect(actions).to.be.deep.equal([
      {type: '@@IGNORE_THIS_ACTION'},
      {type: 'STATE'}
    ])
  })
})