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
  outline: 'none',
  padiding: 0,
  fontSize: 'inherit',
  height: '20px',
  lineHeight: '20px',
  padding: 0,
  margin: 0,
  border: 'none'
}

const initialState = {
  // 当前输入内容
  text: '',
  // 游标相对位置
  cursor: {
    x: 0,
    y: 0
  },
  // 游标绝对位置
  computedCursorLeft: 15,
  computedCursorTop: 0,
  // 控制游标闪烁
  cursorVisible: true,
  // 正在编辑的行
  inEditingLine: 0,
  // 缓存的内容
  cachedBefore: '',
  cachedAfter: '',
  // 所有行
  lines: [''],
  lineHeight: 20,
  // 高亮后的行
  highlightedLines: []
}

const computeCursorLeft = ($ruler, text, offset) => {
  $ruler.textContent = text
  const left = $ruler.offsetWidth
  $ruler.textContent = ''
  return left + offset
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
    this.bindFunctions()
  }

  componentDidMount() {
    this.subscription = Observable.of(initialState)
      .merge(this.reducer$)
      .scan((state, reducer) => reducer(state))
      .do(state => console.log('[STATE]', state))
      .subscribe(state => this.proxy$.next(state))
  }

  componentWillUnmount() {
    this.subscription.unsubscribe()
  }

  bindFunctions() {
    this.handleMouseDown = this.handleMouseDown.bind(this)
    this.handleTextChange = this.handleTextChange.bind(this)
    this.handleTextFocus = this.handleTextFocus.bind(this)
    this.handleTextInput = this.handleTextInput.bind(this)
    this.handleTextKeyUp = this.handleTextKeyUp.bind(this)
    this.getRuler = this.getRuler.bind(this)
  }

  intent(state$) {
    const self = this
    const mouseDown$ = new Subject()
    const textKeyUp$ = new Subject()
    const textFocus$ = new Subject()
    const textInput$ = new Subject()
    const text$ = new Subject().do(v => console.log('[STATE text]', v))
    const moveInText$ = textKeyUp$.filter(e => !e.isComposing) // 非输入法状态时判定为移动
    const enterKeyUp$ = moveInText$.filter(e => e.key === 'Enter') // 回车流
    const backspaceKeyUp$ = moveInText$.filter(e => e.key === 'Backspace') // 退格流
    const upKeyUp$ = moveInText$.filter(e => e.key === 'ArrowUp') // 向上移动
    const downKeyUp$ = moveInText$.filter(e => e.key === 'ArrowDown') // 向下移动
    const leftKeyUp$ = moveInText$.filter(e => e.key === 'ArrowLeft') // 向左移动
    const rightKeyUp$ = moveInText$.filter(e => e.key === 'ArrowRight') // 向右移动

    // 顶部退格
    const backspaceInStart$ = backspaceKeyUp$.filter(() => {
      // 只响应顶部退格
      const { cursor } = self.state
      return cursor.x === 0 && cursor.y > 0
    })

    // 一般退格删除
    const backspaceDel$ = backspaceKeyUp$.filter(() => {
      const { cursor } = self.state
      return cursor.x !== 0
    })

    // 移动光标
    const move$ = Observable.merge(
      backspaceDel$.mapTo({ x: -1, y: 0 }),
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

    // 回车进行的光标移动
    const enterMove$ = enterKeyUp$.map(() => {
      const { cursor } = self.state
      return {
        x: 0,
        y: cursor.y + 1
      }
    })

    // 鼠标定位进行的光标移动
    const mouseMove$ = mouseDown$.map(({ offsetX, offsetY }) => {
      const { fontSize } = self.state
      return {
        x: Math.floor(offsetX / fontSize) * fontSize, // 当前应当处于的位置
        y: Math.floor(offsetY / fontSize) * fontSize
      }
    })

    // 方向键控制的移动
    const arrowMove$ = move$.map(({ x, y }) => {
      const { cursor } = self.state
      const toX = cursor.x + x
      const toY = cursor.y + y
      return {
        x: toX,
        y: toY
      }
    })

    // 顶部退格进行的
    const backspaceInStartMove$ = backspaceInStart$.map(() => {
      const { cursor, lines } = self.state
      const line = lines[cursor.y - 1]
      return {
        x: line.length,
        y: cursor.y - 1
      }
    })

    // 光标位置
    const cursor$ = Observable.merge(
      mouseMove$,
      arrowMove$
    ).filter(cursor => {
      // x 坐标矫正
      const { cachedBefore, text } = self.state
      return cursor.x >= 0 && cursor.x <= `${cachedBefore}${text}`.length
    }).filter(cursor => {
      // y 坐标矫正
      const { lines } = self.state
      return cursor.y >= 0 && cursor.y <= lines.length
    }).merge(
      textInput$.map(() => {
        const { cursor } = self.state
        return {
          x: cursor.x + 1,
          y: cursor.y
        }
      }),
      backspaceInStartMove$,
      enterMove$
    ).do(v => console.log('[STATE cursor]', v))

    // 当前编辑行变化
    const inEditingLine$ = cursor$
      .filter(cursor => cursor.y !== self.state.cursor.y)
      .map(cursor => cursor.y)
      .do(v => console.log('[STATE inEditingLine]', v))

    // 删除元素
    const cachedBefore$ = backspaceDel$.filter(() => self.state.text.length === 0)
      .map(() => self.state.cachedBefore.slice(0, -1))

    // 行变换
    // 1. 换行
    // 2. 顶部退格
    const lines$ = Observable
      .merge(
        enterKeyUp$,
        backspaceInStart$
      )
      .map(({ key }) => {
        const { lines, cursor, text, cachedBefore, cachedAfter } = self.state
        const { y } = cursor
        // 当前文本框的内容并入
        const before = `${cachedBefore}${text}`
        const after = cachedAfter
        const beforeLines = lines.slice(0, y)
        const afterLines = lines.slice(y + 1, 0)
        if (key === 'Enter') {
          // 回车划分游标左右的行
          const split = [before, after]
          return [...beforeLines, ...split, ...afterLines]
        } else if (key === 'Backspace') {
          // 顶部退格时，将当前行内容并入上一行
          const afterLines = lines.slice(y + 1)
          const prevLine = lines[y - 1]
          const merged = `${prevLine}${after}`
          return [...beforeLines.slice(0, -1), merged, ...afterLines]
        }
      }).do(v => console.log('[STATE lines]', v))

    // 重置输入框
    const resetText$ = Observable.merge(
      lines$
    ).do(() => console.log('[STATE resetText]'))

    // 计算光标顶部位置
    const computedCursorTop$ = inEditingLine$.map(inEditingLine => {
      return inEditingLine * self.state.lineHeight
    })

    // 计算光标左侧位置
    const computedCursorLeft$ = Observable.merge(
      // 当前行的光标处理
      cursor$.filter(cursor => self.state.cursor.y === cursor.y)
        .withLatestFrom(textInput$)
        .map(([cursor, char]) => {
          const { cachedBefore, text, cachedAfter } = self.state
          return `${cachedBefore}${text}${char}${cachedAfter}`.substring(0, cursor.x)
        }),
      // 顶部退格时的光标处理
      backspaceInStart$.map(() => {
        const { lines, cursor } = self.state
        const prevLine = lines[cursor.y - 1]
        return prevLine
      }),
      // 换行
      enterKeyUp$.map(() => {
        return ''
      })
    ).map(beforeCursorText => {
      return computeCursorLeft(this.$ruler, beforeCursorText, 10)
    })
      .do(v => console.log('[STATE computedCursorLeft]', v))

    // 词法解析
    // const tokens$ = code$.map(lexer)

    // 高亮
    // const highlight$ = tokens$.map(highlight)
    // 光标闪烁流
    const blink$ = cursor$
      .switchMapTo(Observable.interval(500).mapTo(null))

    return {
      mouseDown$,
      textKeyUp$,
      textFocus$,
      textInput$,
      cursor$,
      inEditingLine$,
      // highlight$,
      beginInput$,
      blink$,
      lines$,
      text$,
      resetText$,
      computedCursorLeft$,
      computedCursorTop$,
      cachedBefore$
    }
  }

  model(actions) {
    return Observable.merge(
      actions.cursor$.map(cursor => state => ({ ...state, cursor: { ...cursor } })).do(() => console.log('[REDUCER cursor]')),
      actions.lines$.map(lines => state => ({ ...state, lines: [...lines] })).do(() => console.log('[REDUCER lines]')),
      // actions.blink$.map(cursorVisible => state => ({ ...state, cursorVisible: !state.cursorVisible })),
      // actions.code$.map(code => state => ({ ...state, code: code })),
      // actions.highlight$.map(highlightedCode => state => ({ ...state, highlightedCode })),
      actions.text$.map(text => state => ({ ...state, text })),
      actions.cachedBefore$.map(cachedBefore => state => ({ ...state, cachedBefore })),
      // actions.inChangingLine$.map(inChangingLine => state => ({ ...state, inChangingLine })).do(() => console.log('[REDUCER inChangingLine]')),
      actions.resetText$.mapTo(state => ({ ...state, text: '' })),
      actions.computedCursorLeft$.map(computedCursorLeft => state => ({ ...state, computedCursorLeft })),
      actions.computedCursorTop$.map(computedCursorTop => state => ({ ...state, computedCursorTop })),
      actions.inEditingLine$.map(row => state => {
        const { lines, cursor } = state
        const line = lines[row]
        const cachedBefore = line.substring(0, cursor.x)
        const cachedAfter = line.substring(cursor.x)
        return {
          ...state,
          inEditingLine: row,
          cachedBefore,
          cachedAfter
        }
      })

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
    const { lines, inEditingLine, text, cachedBefore, cachedAfter } = this.state
    return lines.map((line, index) => {
      if (inEditingLine === index) {
        return (
          <div key={index} className="item">
            <span className="no active">{index + 1}</span>
            {`${cachedBefore}${text}${cachedAfter}`}
          </div>
        )
      } else {
        return (<div key={index} className="item"><span className="no">{index + 1}</span>{line}</div>)
      }
    })
  }

  renderCode() {
    return <div />
  }

  renderInput() {
    const { text, computedCursorLeft, computedCursorTop } = this.state
    const style = {
      ...textareaStyle,
      left: `${computedCursorLeft}px`,
      top: `${computedCursorTop}px`
    }
    return (
      <textarea
        value={text}
        onInput={this.handleTextInput}
        onKeyUp={this.handleTextKeyUp}
        onFocus={this.handleTextFocus}
        onChange={this.handleTextChange}
        style={style} />
    )
  }

  renderCursor() {
    const { computedCursorLeft, computedCursorTop, cursorVisible } = this.state
    const style = {
      left: `${computedCursorLeft}px`,
      top: `${computedCursorTop}px`,
      visibility: cursorVisible ? '' : 'hidden'
    }
    return <div className="cursor" style={style}/>
  }

  getRuler($ruler) {
    this.$ruler = $ruler
  }

  getInChangingLine($line) {
    this.$inChangingLine = $line
  }

  render() {
    return (
      <div className="code-editor">
        <span ref={this.getRuler} style={{ visibility: 'hidden', whiteSpace: 'pre' }}/>
        <div className="lines">{this.renderLines()}</div>
        <div className="code" onMouseDown={this.handleMouseDown}>{this.renderCode()}</div>
        <div className="input">{this.renderInput()}</div>
        {this.renderCursor()}
      </div>
    )
  }
}

export default Editor
