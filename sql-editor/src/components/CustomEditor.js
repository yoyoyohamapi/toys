import React, { Component } from 'react'
import { Observable, Subject } from 'rxjs'
import createLexer from '../libs/lexer'
import highlight from '../libs/highlight'
import sqlConfig from '../libs/sqlConfig'

const lexer = createLexer(sqlConfig)

const textareaStyle = {
  wdith: '1000px',
  position: 'absolute',
  bottom: '-1em',
  height: '1em',
  outline: 'none',
  padiding: 0
}

const initialState = {
  code: '',
  text: '',
  cursor: {
    x: 0,
    y: 0
  },
  cursorVisible: false,
  lines: [''],
  highlightedCode: [],
  fontSize: null
}

class Editor extends Component {
  constructor(props) {
    super(props)
    this.state = initialState
    // actions
    this.proxy$ = new Subject()
    this.proxy$.subscribe(state => this.setState(state))
    this.actions = this.intent()
    this.reducer$ = this.model(this.actions)
  }

  componentDidMount() {
    this.subscription = Observable.of(initialState)
      .merge(this.reducer$)
      .scan((state, reducer) => reducer(state))
      .subscribe(state => this.proxy$.next(state))
    const { fontSize } = this.state
    if (fontSize === null) {
      const size = window.getComputedStyle(this.refs.code).fontSize
      this.setFontSize(parseInt(size.replace('px', ''), 10))
    }
  }

  componentWillUnmount() {
    this.subscription.unsubscribe()
  }

  intent() {
    const state$ = this.proxy$
    const mouseDown$ = new Subject()
    const keyUp$ = new Subject()
    const text$ = new Subject()
    const textKeyUp$ = new Subject()
    const fontSize$ = new Subject()
    const enterKeyUp$ = keyUp$.filter(e => e.keyCode === 'ENTER') // 回车流
    const backspaceKeyUp$ = keyUp$.filter(e => e.keyCode === 'BACKSPACE') // 退格流
    const upKeyUp$ = keyUp$.filter(e => e.keyCode === 'UP') // 向上移动
    const downKeyUp$ = keyUp$.filter(e => e.keyCode === 'DOWN') // 向下移动
    const leftKeyUp$ = keyUp$.filter(e => e.keyCode === 'LEFT') // 向左移动
    const rightKeyUp$ = keyUp$.filter(e => e.keyCode === 'RIGHT') // 向右移动

    // 移动光标
    const move$ = Observable.merge(
      textKeyUp$.mapTo({ x: +1, y: 0 }),
      backspaceKeyUp$.mapTo({ x: -1, y: 0 }),
      upKeyUp$.mapTo({ x: 0, y: -1 }),
      downKeyUp$.mapTo({ x: 0, y: +1 }),
      leftKeyUp$.mapTo({ x: -1, y: 0 }),
      rightKeyUp$.mapTo({ x: +1, y: 0 })
    )

    // 光标位置
    const cursor$ = Observable.merge(
      mouseDown$.withLatestFrom(state$).map(([{ offsetX, offsetY }, { fontSize }]) => ({
        x: Math.floor(offsetX / fontSize) * fontSize, // 当前应当处于的位置
        y: Math.floor(offsetY / fontSize) * fontSize
      })),
      // 回车移到下一行
      enterKeyUp$.withLatestFrom(state$).map(([_, { cursor }]) => ({
        x: 0,
        y: cursor.y + 1
      })),
      move$.withLatestFrom(state$).do(v => console.log('cursor', v)).map(([{ x, y }, { cursor }]) => ({
        x: cursor.x + x,
        y: cursor.y + y
      }))
    )

    // 当前代码
    const code$ = text$.withLatestFrom(state$).map(([text, { cursor, code, lines }]) => {
      // 行扫描获得光标前的 code
      const beforeCursorCount = lines.slice(0, cursor.y).reduce((sum, line) => sum + line.length, 0) + cursor.x
      const beforeCursor = code.substring(0, beforeCursorCount)
      // 获得光标后的
      const afterCursor = code.substring(beforeCursorCount)
      return `${beforeCursor}${text}${afterCursor}`
    })

    // 词法解析
    const tokens$ = code$.map(lexer)

    // 高亮
    const highlight$ = tokens$.map(highlight)

    // 光标闪烁流
    const blink$ = cursor$
      .withLatestFrom(state$)
      .switchMap(
        ([_, { cursorVisible }]) => Observable.interval(500).mapTo(!cursorVisible)
      )

      // 行流
    const lines$ = code$
      .map(code => code.split('\n'))

    return {
      mouseDown$,
      keyUp$,
      textKeyUp$,
      cursor$,
      highlight$,
      blink$,
      lines$,
      code$,
      text$,
      fontSize$
    }
  }

  model(actions) {
    return Observable.merge(
      actions.cursor$.map(cursor => state => ({ ...state, cursor: { ...cursor } })),
      actions.lines$.map(lines => state => ({ ...state, lines: [...lines] })),
      // actions.blink$.map(cursorVisible => state => ({ ...state, cursorVisible })),
      actions.code$.map(code => state => ({ ...state, code: code })),
      actions.highlight$.map(highlightedCode => state => ({ ...state, highlightedCode })),
      actions.text$.map(text => state => ({ ...state, text })),
      actions.fontSize$.map(fontSize => state => ({ ...state, fontSize }))
    )
  }

  handleMouseDown(e) {
    this.actions.mouseDown$.next(e.nativeEvent)
  }

  handleKeyUp(e) {
    this.actions.keyUp$.next(e.nativeEvent)
  }

  handleTextKeyUp(e) {
    this.actions.textKeyUp$.next(null)
  }

  setFontSize(fontSize) {
    this.actions.fontSize$.next(fontSize)
  }

  setText(e) {
    this.actions.text$.next(e.target.value)
  }

  renderLines() {
    const { lines } = this.state
    return lines.map((line, index) => <div key={index} className="item">{index}</div>)
  }

  renderCode() {
    const { highlightedCode } = this.state
    return highlightedCode.map(token => <span className={token.type}>token.value</span>)
  }

  renderInput() {
    const { text, fontSize, cursor } = this.state
    const style = {
      ...textareaStyle,
      left: cursor.x * fontSize,
      top: cursor.y * fontSize
    }
    return <textarea value={text} onChange={this.setText.bind(this)} onKeyUp={this.handleTextKeyUp.bind(this)} style={style} />
  }

  renderCursor() {
    return <div>|</div>
  }

  render() {
    return (
      <div className="code-editor">
        <div className="line">{this.renderLines()}</div>
        <div ref="code" className="code" onMouseDown={this.handleMouseDown.bind(this)}>{this.renderCode()}</div>
        <div className="input">{this.renderInput()}</div>
      </div>
    )
  }
}

export default Editor
