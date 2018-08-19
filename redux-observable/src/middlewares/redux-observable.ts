import { Action } from 'redux'
import { Subject, merge } from 'rxjs'
import { Middleware } from 'redux'

export const createEpicMiddleware = (...epics) => {
  const action$ = new Subject()
  const state$ = new Subject()
  const newAction$ = merge(...epics.map(epic => epic(action$, state$)))
  let unsubscribe
  const middleware: Middleware = store => next => action => {
    if (!unsubscribe) {
      unsubscribe = newAction$.subscribe((action: Action) => {
        next(action)
      })
    }
    action$.next(action)
    next(action)
    state$.next(store.getState())
  }

  return middleware
}