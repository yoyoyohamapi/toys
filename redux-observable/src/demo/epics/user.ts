import { Observable, interval, from, of } from 'rxjs'
import {
  map,
  distinctUntilChanged,
  combineLatest,
  switchMap,
  takeUntil,
  startWith,
  catchError,
  filter
} from 'rxjs/operators'
import { isEqual } from 'lodash/fp'
import { AxiosError } from 'axios'

import {
  LISTEN_POLLING_START,
  POLLING_STOP,
  POLLING_START,
  FETCH_SUCCESS,
  FETCH_START,
  FETCH_ERROR,
  SEARCH
} from '@constants/actionTypes/user'
import { fetch } from '@apis/user'
import { ISearchParam, IState, ISearchResp } from '../types/user'
import { EOrder } from '../types/common'

const pollingEpic = (action$, state$) => {
  const stopPolling$ = action$.pipe(
    filter(({type}) => [POLLING_STOP].indexOf(type) > -1)
  )
  const params$: Observable<ISearchParam> = state$.pipe(
    map(({user}: {user: IState}) => {
      const { pagination, sort, query } = user
      return {
        q: `${query ? query + ' ' : ''}language:javascript`,
        language: 'javascript',
        page: pagination.page,
        per_page: pagination.pageSize,
        sort,
        order: EOrder.Desc
      }
    }),
    distinctUntilChanged(isEqual)
  )

  return action$.pipe(
    filter(({type}) => [LISTEN_POLLING_START, SEARCH].indexOf(type) > -1 ),
    combineLatest(params$, (action, params) => params),
    switchMap((params: ISearchParam) => {
      const polling$ = interval(15 * 1000).pipe(
        takeUntil(stopPolling$),
        startWith(null),
        switchMap(() => from(fetch(params)).pipe(
          map(({data}: ISearchResp) => ({
            type: FETCH_SUCCESS,
            payload: {
              total: data.total_count,
              list: data.items
            }
          })),
          startWith({
            type: FETCH_START,
            payload: {}
          }),
          catchError((error: AxiosError) => of({
            type: FETCH_ERROR,
            payload: {
              error: error.response.statusText
            }
          }))
        )),
        startWith({
          type: POLLING_START,
          payload: {}
        })
      )
      return polling$
    })
  )
}

export default pollingEpic
