import React, { Component } from 'react'
import CodeMirror from 'react-codemirror'
import 'codemirror/lib/codemirror.css'
import 'codemirror/mode/sql/sql'
import { connect } from '../store'
import editorActions from '../actions/editor'

const codeOptions = {
  mode: {
    name: 'text/x-sql'
  },
  lineNumbers: true
}

class Editor extends Component {
  render() {
    const { code, setCode } = this.props
    return (<CodeMirror
      value={code}
      onChange={setCode}
      options={codeOptions}/>)
  }
}

export default connect(state => state, {
  setCode: code => editorActions.setCode$.next(code)
})(Editor)
