import { Action, Middleware, Store } from 'redux'
import { Subject, merge, pipe, queueScheduler, asapScheduler } from 'rxjs'
import { filter, subscribeOn, observeOn } from 'rxjs/operators'

interface IEpicMiddleware extends Middleware {
  run?: () => void
}

export const createEpicMiddleware = (...epics) => {
  const action$ = new Subject().pipe(observeOn(queueScheduler)) as Subject<Action>
  const state$ = new Subject()
  const newAction$ = merge(...epics.map((epic) => epic(action$, state$)))

  let cachedStore
  const middleware: IEpicMiddleware = (store) => {
    cachedStore = store

    return (next) => (action) => {
      // 先让 action 到达 reducer
      const result = next(action)
      // 获得 reducer 处理后的状态
      state$.next(store.getState())
      // 进入 action 转换管道
      action$.next(action)
      return result
    }
  }

  middleware.run = () => {
    newAction$.subscribe(cachedStore.dispatch)
    state$.next(cachedStore.getState())
  }
  return middleware
}

export const ofType = (...types: string[]) => pipe(
  filter((action: Action) => types.indexOf(action.type) > -1)
)
