import { Observable } from 'rxjs'
import 'rxjs/add/observable/of'
import 'rxjs/add/operator/merge'
import 'rxjs/add/operator/scan'
import 'rxjs/add/operator/shareReplay'

export default function createState(reducer$, initialState$ = Observable.of({})) {
  return initialState$
    .merge(reducer$)
    .scan((state, reducer) => reducer(state))
    .shareReplay(1)
    .do(state => console.log('state: ', state))
}
