import { Action, Middleware } from 'redux'
import { Subject, merge, pipe } from 'rxjs'
import { filter } from 'rxjs/operators'

export const createEpicMiddleware = (...epics) => {
  const action$ = new Subject()
  const state$ = new Subject()
  const newAction$ = merge(...epics.map((epic) => epic(action$, state$)))
  const middleware: Middleware = (store) => {
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

  return middleware
}

export const ofType = (type: string) => pipe(
  filter((action: Action) => type === action.type)
)
