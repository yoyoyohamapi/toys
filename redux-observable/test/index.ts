/**
 * test redux-observable
 * @author yoyoyohamapi
 * @ignore created 2018-08-20 20:41:54
 */
import { expect } from 'chai'
import { merge, of } from 'rxjs'
import { mapTo, distinctUntilChanged, mergeMap } from 'rxjs/operators'
import { createStore, applyMiddleware, Reducer } from 'redux'
import { createEpicMiddleware, ofType } from '../src'

describe('our redux-observable', () => {
  it('should run epic success', () => {
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
    epicMiddleware.run()
    store.dispatch({type: 'PING'})
    expect(store.getState()).to.equal(1)
  })

  it('should observe state', () => {
    const actions = []
    const reducer: Reducer = (state = 0, action) => {
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
    actions.shift()
    expect(actions).to.be.deep.equal([
      {type: 'STATE'}
    ])
  })

  it('should queue actions', () => {
    const actions = []
    const reducer: Reducer = (state = 0, action) => {
      actions.push(action)
      if (action.type === 'PONG') {
        return state + 1
      } else {
        return state
      }
    }

    const epic = (action$, state$) => {
      return merge(
        action$.pipe(
          ofType('PING'),
          mapTo(({type: 'PONG'}))
        ),
        state$.pipe(
          distinctUntilChanged(),
          mapTo(({type: 'STATE'}))
        )
      )
   }

    const epicMiddleware = createEpicMiddleware(epic)
    const store = createStore(reducer, applyMiddleware(epicMiddleware))
    epicMiddleware.run()
    store.dispatch({type: 'PING'})

    actions.shift()

    expect(actions).to.be.deep.equal([
      {type: 'STATE'},
      {type: 'PING'},
      {type: 'PONG'},
      {type: 'STATE'}
    ])
  })

  it('should queue synchronous actions', () => {
    const reducer = (state = [], action) => state.concat(action)
    const epic1 = (action$, state$) => action$.pipe(
      ofType('FIRST'),
      mergeMap(() => of({ type: 'SECOND' }, { type: 'THIRD'}))
    )
    const epic2 = (action$, state$) => action$.pipe(
      ofType('SECOND'),
      mapTo({type: 'FORTH'})
    )

    const epicMiddleware = createEpicMiddleware(epic1, epic2)
    const store = createStore(reducer, applyMiddleware(epicMiddleware))
    epicMiddleware.run()

    store.dispatch({type: 'FIRST'})
    const actions = store.getState()
    actions.shift()
    expect(actions).to.deep.equal([
      { type: 'FIRST' },
      { type: 'SECOND' },
      { type: 'THIRD' },
      { type: 'FORTH' }
    ])
  })
})
