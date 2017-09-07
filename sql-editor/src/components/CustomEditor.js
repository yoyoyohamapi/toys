import React, { Component } from 'react'
import { Observable, Subject } from 'rxjs'
import createLexer from '../libs/lexer'
import highlight from '../libs/highlight'
import sqlConfig from '../libs/sqlConfig'
import '../assets/editor.css'

const lexer = createLexer(sqlConfig)

const textareaStyle = {
  width: '1000px',
  position: 'absolute',
  bottom: '-1em',
  height: '1em',
  outline: 'none',
  padiding: 0
}

const initialState = {
  // 当前输入内容
  text: '',
  // 当前游标位置
  cursor: {
    x: 0,
    y: 0
  },
  // 控制游标闪烁
  cursorVisible: false,
  // 正在发生变化的行
  inChangingLine: {
    idx: 0,
    before: '',
    after: ''
  },
  lines: [''],
  // 高亮后的行
  highlightedLines: [],
  fontSize: null
}

class Editor extends Component {
  constructor(props) {
    super(props)
    this.state = initialState
    // actions
    this.proxy$ = new Subject()
    this.proxy$.subscribe(state => this.setState(state))
    this.actions = this.intent(this.proxy$)
    this.reducer$ = this.model(this.actions)
  }

  componentDidMount() {
    this.subscription = Observable.of(initialState)
      .merge(this.reducer$)
      .scan((state, reducer) => reducer(state))
      .do(state => console.log('[STATE]', state))
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

  intent(state$) {
    const self = this
    const mouseDown$ = new Subject()
    const textKeyUp$ = new Subject()
    const textFocus$ = new Subject()
    const textInput$ = new Subject()
    const text$ = new Subject()
    const fontSize$ = new Subject()
    const moveInText$ = textKeyUp$.filter(e => !e.isComposing) // 非输入法状态时判定为移动
    const enterKeyUp$ = moveInText$.filter(e => e.key === 'Enter') // 回车流
    const backspaceKeyUp$ = moveInText$.filter(e => e.key === 'Backspace') // 退格流
    const upKeyUp$ = moveInText$.filter(e => e.key === 'ArrowUp') // 向上移动
    const downKeyUp$ = moveInText$.filter(e => e.key === 'ArrowDown') // 向下移动
    const leftKeyUp$ = moveInText$.filter(e => e.key === 'ArrowLeft') // 向左移动
    const rightKeyUp$ = moveInText$.filter(e => e.key === 'ArrowRight') // 向右移动

    // 移动光标
    const move$ = Observable.merge(
      textInput$.mapTo({ x: +1, y: 0 }),
      backspaceKeyUp$.mapTo({ x: -1, y: 0 }),
      upKeyUp$.mapTo({ x: 0, y: -1 }),
      downKeyUp$.mapTo({ x: 0, y: +1 }),
      leftKeyUp$.mapTo({ x: -1, y: 0 }),
      rightKeyUp$.mapTo({ x: +1, y: 0 })
    )

    // 输入开始
    const beginInput$ = textFocus$.map(() => {
      const { cursor, lines } = self.state
      const line = lines[cursor.y]
      return {
        idx: cursor.y,
        before: line.substring(0, cursor.x),
        after: line.substring(cursor.x)
      }
    })

    const enterMove$ = enterKeyUp$.map(() => {
      const { cursor } = self.state
      return {
        x: 0,
        y: cursor.y + 1
      }
    })

    const mouseMove$ = mouseDown$.map(({ offsetX, offsetY }) => {
      const { fontSize } = self.state
      return {
        x: Math.floor(offsetX / fontSize) * fontSize, // 当前应当处于的位置
        y: Math.floor(offsetY / fontSize) * fontSize
      }
    })

    const arrowMove$ = move$.map(({ x, y }) => {
      const { cursor, lines } = self.state
      const toX = cursor.x + x
      const toY = cursor.y + y
      const cursorX = toX < 0 ? 0 : toX
      if (toY < 0) {
        return {
          x: cursorX,
          y: 0
        }
      } else if (toY > lines.length - 1) {
        return {
          x: cursorX,
          y: lines.length - 1
        }
      } else {
        return {
          x: cursorX,
          y: toY
        }
      }
    })

    // 光标位置
    const cursor$ = Observable.merge(
      mouseMove$,
      enterMove$,
      arrowMove$
    ).do(v => console.log('[STATE cursor]', v))

    // 当前编辑行：光标发生行变换
    const inChangingLine$ = cursor$
      .filter(cursor => cursor.y !== self.state.inChangingLine.idx)
      .withLatestFrom(textKeyUp$)
      .map(([{ x, y }, { key }]) => {
        const { inChangingLine, lines } = self.state
        const line = lines[y]
        switch (key) {
        case 'Enter':
          // 回车时，将后续内容带入新行
          return {
            idx: y,
            before: '',
            after: inChangingLine.after
          }
        case 'Backspace':
          // 顶部退格时，将后续内容并入上一行，前置内容修改为上一行内容 
          return {
            idx: y,
            before: line[y],
            after: inChangingLine.after
          }
        default:
          return {
            idx: y,
            before: line.substring(0, x),
            after: line.substring(x)
          }
        }
      }).do(v => console.log('[STATE inChangingLine]', v))

    // 行变换
    // 1. 换行
    // 2. 顶部退格
    const lines$ = Observable
      .merge(
        enterKeyUp$,
        backspaceKeyUp$.filter(() => self.state.cursor.x === 0 && self.state.cursor.y > 0)
      )
      .map(({ key }) => {
        const { lines, cursor, text } = self.state
        const { x, y } = cursor
        const line = lines[y]
        const before = `${text}${line.substring(0, x)}`
        const after = line.substring(x)
        const beforeLines = lines.slice(0, y)
        const afterLines = lines.slice(y + 1, 0)
        if (key === 'Enter') {
          // 回车划分游标左右的行
          const split = [before, after]
          return [...beforeLines, ...split, ...afterLines]
        } else if (key === 'Backspace') {
          // 退格合并游标左右的行
          const afterLines = lines.slice(y + 1)
          const prevLine = lines[y - 1]
          const merged = `${prevLine}${line}`
          return [...beforeLines.slice(0, -1), merged, ...afterLines]
        }
      }).do(v => console.log('[STATE lines]', v))

    // 重置输入框
    const resetText$ = Observable.merge(
      lines$
    ).do(() => console.log('[STATE resetText]'))

    // 词法解析
    // const tokens$ = code$.map(lexer)

    // 高亮
    // const highlight$ = tokens$.map(highlight)

    // 光标闪烁流
    const blink$ = cursor$
      .withLatestFrom(state$)
      .switchMap(
        ([_, { cursorVisible }]) => Observable.interval(500).mapTo(!cursorVisible)
      )


    return {
      mouseDown$,
      textKeyUp$,
      textFocus$,
      textInput$,
      cursor$,
      inChangingLine$,
      // highlight$,
      beginInput$,
      blink$,
      lines$,
      text$,
      fontSize$,
      resetText$
    }
  }

  model(actions) {
    return Observable.merge(
      actions.cursor$.map(cursor => state => ({ ...state, cursor: { ...cursor } })).do(() => console.log('[REDUCER cursor]')),
      actions.lines$.map(lines => state => ({ ...state, lines: [...lines] })).do(() => console.log('[REDUCER lines]')),
      // actions.blink$.map(cursorVisible => state => ({ ...state, cursorVisible })),
      // actions.code$.map(code => state => ({ ...state, code: code })),
      // actions.highlight$.map(highlightedCode => state => ({ ...state, highlightedCode })),
      actions.text$.map(text => state => ({ ...state, text })),
      actions.fontSize$.map(fontSize => state => ({ ...state, fontSize })),
      actions.inChangingLine$.map(inChangingLine => state => ({ ...state, inChangingLine })).do(() => console.log('[REDUCER inChangingLine]')),
      actions.resetText$.mapTo(state => ({ ...state, text: '' }))
    )
  }

  handleMouseDown(e) {
    this.actions.mouseDown$.next(e.nativeEvent)
  }

  handleTextKeyUp(e) {
    this.actions.textKeyUp$.next(e.nativeEvent)
  }

  handleTextFocus(e) {
    this.actions.textFocus$.next(null)
  }

  handleTextInput(e) {
    if (e.nativeEvent.inputType === 'insertText') {
      this.actions.textInput$.next(e.nativeEvent.data)
    }
  }

  handleTextChange(e) {
    this.actions.text$.next(e.target.value)
  }

  setFontSize(fontSize) {
    this.actions.fontSize$.next(fontSize)
  }

  renderLines() {
    const { lines, inChangingLine, text } = this.state
    return lines.map((line, index) => {
      if (inChangingLine.idx === index) {
        return (<div key={index} className="item"><span className="no active">{index + 1}</span>{`${inChangingLine.before}${text}${inChangingLine.after}`}</div>)
      } else {
        return (<div key={index} className="item"><span className="no">{index + 1}</span>{line}</div>)
      }
    })
  }

  renderCode() {
    return <div></div>
  }

  renderInput() {
    const { text, fontSize, cursor } = this.state
    const style = {
      ...textareaStyle,
      left: cursor.x * fontSize,
      top: cursor.y * fontSize
    }
    return (
      <textarea
        value={text} 
        onInput={this.handleTextInput.bind(this)} 
        onKeyUp={this.handleTextKeyUp.bind(this)}
        onFocus={this.handleTextFocus.bind(this)}
        onChange={this.handleTextChange.bind(this)}
        style={style} />
    )
  }

  renderCursor() {
    return <div>|</div>
  }

  render() {
    return (
      <div className="code-editor">
        <div className="lines">{this.renderLines()}</div>
        <div ref="code" className="code" onMouseDown={this.handleMouseDown.bind(this)}>{this.renderCode()}</div>
        <div className="input">{this.renderInput()}</div>
      </div>
    )
  }
}

export default Editor
