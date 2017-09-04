import React, { Component } from 'react'
import CodeMirror from 'react-codemirror2'
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
  constructor(props) {
    super(props)
  }

  render() {
    const { code, setCode, formatCode } = this.props
    return (
      <div>
        <div onClick={formatCode}>格式化</div>
        <CodeMirror value={code} onChange={setCode} options={codeOptions} autoSave/>
      </div>
    )
  }
}

export default connect(state => state, {
  setCode: (editor, meta, code) => editorActions.setCode$.next(code),
  formatCode: () => editorActions.formatCode$.next(null)
})(Editor)
