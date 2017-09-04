import { Observable } from 'rxjs'
import 'rxjs/operator/merge'
import editorActions from '../actions/editor'
import sqlFormatter from 'sql-formatter'

export default Observable.merge(
  editorActions.setCode$.map(code => state => ({ ...state, code })),
  editorActions.formatCode$.map(() => state => ({ ...state, code: sqlFormatter.format(state.code) }))
)
