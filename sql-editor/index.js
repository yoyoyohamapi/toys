import React from 'react'
import ReactDOM from 'react-dom'
import Editor from './src/components/CustomEditor'
import { Provider, createState } from './src/store'
import reducer$ from './src/reducers'
import { Observable } from 'rxjs'

const initState$ = Observable.of({
  code: '',
  text: '',
  cursor: {
    x: 0,
    y: 0
  },
  lines: [1],
  highlightedCodes: '',
  fontSize: null
})

ReactDOM.render(
  <Provider state$={createState(reducer$, initState$)}>
    <Editor />
  </Provider>,
  document.getElementById('app')
)
