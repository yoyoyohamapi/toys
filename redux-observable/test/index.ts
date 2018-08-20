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
  it('should update state$ after an action goes through reducers', () => {
    const actions = []
    const reducer = (state = 0, action) => {
      actions.push(action)

      if (action.type === 'PING') {
        return state + 1
      } else {
        return state
      }
    }

    const epic = (action$, state$) => {
      return merge(
        action$.pipe(
          ofType('PING'),
          mapTo({
            type: 'PONG'
          })
        ),
        state$.pipe(
          map(state => ({
            type: 'STATE',
            state: 0
          }))
        )
      )
    }

    const epicMiddleware = createEpicMiddleware(epic)
    const store = createStore(reducer, applyMiddleware(epicMiddleware))

    store.dispatch({ type: 'PING' })
    store.dispatch({ type: 'PING' })

    expect(store.getState()).to.equal(2)

    actions.shift()
    expect(actions).to.deep.equal([
      {
        type: 'STATE',
        state: 0
      },
      {
        type: 'PING'
      },
      {
        type: 'STATE',
        state: 1
      },
      {
        type: 'PONG'
      },
      {
        type: 'PING'
      },
      {
        type: 'STATE',
        state: 2
      },
      {
        type: 'PONG'
      },
      {
        type: 'STATE',
        state: 2
      }
    ])
  })
})