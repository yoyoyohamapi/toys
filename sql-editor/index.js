import React from 'react'
import ReactDOM from 'react-dom'
import Editor from './src/components/Editor'
import { Provider, createState } from './src/store'
import reducer$ from './src/reducers'
import { Observable } from 'rxjs'

const initState$ = Observable.of({
  code: ''
})

ReactDOM.render(
  <Provider state$={createState(reducer$, initState$)}>
    <Editor />
  </Provider>,
  document.getElementById('app')
)
