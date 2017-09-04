import { Observable } from 'rxjs'
import 'rxjs/operator/merge'
import editorActions from '../actions/editor'

export default Observable.merge(
  editorActions.setCode$.map(code => state => ({ ...state, code }))
)
