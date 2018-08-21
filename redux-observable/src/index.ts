import { Action, Middleware, Store } from 'redux'
import { Subject, merge, pipe } from 'rxjs'
import { filter } from 'rxjs/operators'

interface IEpicMiddleware extends Middleware {
  run?: () => void
}

export const createEpicMiddleware = (...epics) => {
  const action$ = new Subject()
  const state$ = new Subject()
  const newAction$ = merge(...epics.map((epic) => epic(action$, state$)))
  let cachedStore
  const middleware: IEpicMiddleware = (store) => {
    cachedStore = store
    newAction$.subscribe((action: Action) => {
      store.dispatch(action)
    })
    return (next) => (action) => {
      const result = next(action)
      action$.next(action)
      state$.next(store.getState())
      return result
    }
  }

  middleware.run = () => {
    cachedStore.dispatch({type: '@@IGNORE_THIS_ACTION'})
  }
  return middleware
}

export const ofType = (type: string) => pipe(
  filter((action: Action) => type === action.type)
)
