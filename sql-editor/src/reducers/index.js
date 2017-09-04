import { Observable } from 'rxjs'
import 'rxjs/operator/merge'

import editorReducer$ from './editor'
export default Observable.merge(
  editorReducer$
)
