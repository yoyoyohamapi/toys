import { Action, Middleware } from 'redux'
import { Subject, merge, pipe } from 'rxjs'
import { filter } from 'rxjs/operators'

export const createEpicMiddleware = (...epics) => {
  const action$ = new Subject()
  const state$ = new Subject()
  const newAction$ = merge(...epics.map((epic) => epic(action$, state$)))
  let unsubscribe
  const middleware: Middleware = (store) => {
    return (next) => (action) => {
      console.log('action', action)
      if (!unsubscribe) {
        unsubscribe = newAction$.subscribe((action: Action) => {
          next(action)
        })
      }
      action$.next(action)
      next(action)
      state$.next(store.getState())
    }
  }

  return middleware
}

export const ofType = (type: string) => pipe(
  filter((action: Action) => type === action.type)
)
