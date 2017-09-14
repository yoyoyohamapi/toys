import React, { Component } from 'react'
import { Observable, Subject } from 'rxjs'
import createLexer from '../libs/lexer'
import sqlConfig from '../libs/sqlConfig'
import shortcuts from '../config/shortcuts'
import keyCodeMap from '../config/keyCodeMap'

import '../assets/editor.css'

const lexer = createLexer(sqlConfig)

const textareaStyle = {
  width: '1000px',
  position: 'absolute',
  // bottom: '-1em',
  outline: 'none',
  padiding: 0,
  fontSize: 'inherit',
  height: '20px',
  lineHeight: '20px',
  padding: 0,
  margin: 0,
  border: 'none',
  backgroundColor: 'rgba(0, 0, 0, 0)',
  color: 'rgba(0, 0, 0, 0)',
  resize: 'none',
  zIndex: -1
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
  // 缓存的内容
  cachedBefore: '',
  cachedAfter: '',
  // 所有行
  lines: [''],
  lineHeight: 20,
  // 高亮后的行
  highlighted: [[{ type: 'word', value: '' }]]
}

/**
 * 计算光标在页面的绝对位置
 * @param {DOM} $ruler
 * @param {String} text 
 * @param {Int} offset 
 */
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
      .subscribe(state => this.proxy$.next(state))
    this.$input.focus()
  }

  componentWillUnmount() {
    this.subscription.unsubscribe()
  }

  bindFunctions() {
    this.handleLineMouseUp = this.handleLineMouseUp.bind(this)
    this.handleTextChange = this.handleTextChange.bind(this)
    this.handleTextFocus = this.handleTextFocus.bind(this)
    this.handleTextInput = this.handleTextInput.bind(this)
    this.handleTextKeyDown = this.handleTextKeyDown.bind(this)
    this.handleTextKeyUp = this.handleTextKeyUp.bind(this)
    this.getRuler = this.getRuler.bind(this)
  }

  intent(state$) {
    const self = this
    const selection$ = new Subject()
    const textKeyDown$ = new Subject()
    const textKeyUp$ = new Subject()
    const textFocus$ = new Subject()
    const textInput$ = new Subject()
    const text$ = new Subject()
    const moveInText$ = textKeyDown$.filter(e => !e.isComposing) // 非输入法状态时判定为移动
    const enterKeyUp$ = textKeyUp$.filter(e => e.key === 'Enter')
    const backspaceKeyDown$ = moveInText$.filter(e => e.key === 'Backspace') // 退格流
    const upKeyDown$ = moveInText$.filter(e => e.key === 'ArrowUp') // 向上移动
    const downKeyDown$ = moveInText$.filter(e => e.key === 'ArrowDown') // 向下移动
    const leftKeyDown$ = moveInText$.filter(e => e.key === 'ArrowLeft') // 向左移动
    const rightKeyDown$ = moveInText$.filter(e => e.key === 'ArrowRight') // 向右移动

    // 按键流
    const keyEvents$ = Observable
      .merge(textKeyDown$, textKeyUp$)
      // .distinctUntilChanged(
      //   (a, b) => a.keyCode === b.keyCode && a.type === b.type
      // )

    // 为每一个按键创建 press(up & down) 流
    const createKeyPressStream = charCode => ({
      char: charCode,
      stream: keyEvents$
        .filter(event => event.keyCode === charCode)
        .pluck('type')
    })

    const createShortcutStream = text => {
      // 'ctrl+z'
      // 数据源                          --- ctrl -----  z
      // 转换为 keycode                  ---  17  ----- 90
      // 为每个按键创建 press 流           ---  17$ ----- 90$ (press)
      //                               ----  17down
      //                               ----  90down --- 90up --- 90down --- 90up
      // 聚合                           ---- (17down 90down) --- (17down 90up) --- (17down 90down) --- (17down 90up) --- 
      // 过滤                           ---- (17down 90down) --------------------- (17down 90down) ---------------------                          
      return Observable
        .from(text.split('+')) // 分割快捷键操作序列 ---Ctrl---z
        .map(char => keyCodeMap[char.toLowerCase()]) // 获得各个按键的code 
        .map(createKeyPressStream)
        .pluck('stream')
        .toArray()
        .mergeMap(arr => {
          return Observable.combineLatest(arr)
        })
        .filter(arr => {
          // 连续的 down 构成快捷键
          let isDown = true
          const len = arr.length
          for (let i = 0; i < len; i++) {
            isDown = isDown && (arr[i] === 'keydown')
          }
          return isDown
        })
        .map(x => text)
    }

    // 撤销
    const undo$ = createShortcutStream('ctrl+z')
    undo$.subscribe(v => console.log('undo', v))

    // 粘贴
    const paste$ = createShortcutStream('ctrl+v')
    paste$.subscribe(v => console.log('paste', v))

    // 顶部退格
    const backspaceInStart$ = backspaceKeyDown$.filter(() => {
      // 只响应顶部退格
      const { cursor } = self.state
      return cursor.x === 0 && cursor.y > 0
    })

    // 一般退格删除
    const backspaceDel$ = backspaceKeyDown$.filter(() => {
      const { cursor } = self.state
      return cursor.x !== 0
    })

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
      const { cursor, cachedBefore } = self.state
      const matched = cachedBefore.match(/^\s+/)
      const headSpaces = matched ? matched[0] : ''
      return {
        x: headSpaces.length,
        y: cursor.y + 1
      }
    })

    // 鼠标定位进行的光标移动
    const mouseMove$ = selection$
      .filter(({ selection }) => selection.rangeCount === 1)
      .map(({ selection, lineIdx, tokenIdx }) => {
        const { highlighted } = self.state
        const { anchorOffset } = selection
        const tokens = highlighted[lineIdx].slice(0, tokenIdx)
        return {
          x: tokens.reduce((sum, token) => sum + token.value.length, anchorOffset),
          y: lineIdx
        }
      }).do(v => console.log('mouse move', v))

    const upMove$ = upKeyDown$.map(() => {
      const { cursor, lines } = self.state
      const lastY = cursor.y - 1
      const prevLine = lines[lastY]
      if (lastY < 0) {
        return cursor
      } else {
        return {
          x: prevLine.length < cursor.x ? prevLine.length : cursor.x,
          y: cursor.y - 1
        }
      }
    })

    const downMove$ = downKeyDown$.map(() => {
      const { cursor, lines } = self.state
      const nextY = cursor.y + 1
      const nextLine = lines[nextY]
      if (nextY >= lines.length) {
        return cursor
      } else {
        return {
          x: nextLine.length < cursor.x ? nextLine.length : cursor.x,
          y: cursor.y + 1
        }
      }
    })

    const leftMove$ = leftKeyDown$.map(() => {
      const { cursor, lines } = self.state
      const lastX = cursor.x - 1
      const lastY = cursor.y - 1
      if (lastX >= 0) {
        return {
          x: lastX,
          y: cursor.y
        }
      } else {
        return {
          x: lastY >= 0 ? lines[lastY].length : cursor.x,
          y: lastY >= 0 ? lastY : cursor.y
        }
      }
    })

    const rightMove$ = rightKeyDown$.map(() => {
      const { cursor, lines, cachedBefore, text, cachedAfter } = self.state
      const nextX = cursor.x + 1
      const nextY = cursor.y + 1
      const line = `${cachedBefore}${text}${cachedAfter}`
      if (nextX <= line.length) {
        return {
          x: nextX,
          y: cursor.y
        }
      } else {
        return {
          x: nextY < lines.length ? 0 : cursor.x,
          y: nextY < lines.length ? nextY : cursor.y
        }
      }
    })
    // 方向键控制的移动
    const arrowMove$ = Observable.merge(
      leftMove$,
      rightMove$,
      upMove$,
      downMove$
    )

    // 顶部退格进行的
    const backspaceInStartMove$ = backspaceInStart$.map(() => {
      const { cursor, lines } = self.state
      const line = lines[cursor.y - 1]
      return {
        x: line.length,
        y: cursor.y - 1
      }
    })

    // 一般退格
    const backspaceMove$ = backspaceDel$.map(() => {
      const { cursor } = self.state
      return {
        x: cursor.x - 1,
        y: cursor.y
      }
    })
    // 光标位置
    const cursor$ = Observable.merge(
      mouseMove$,
      arrowMove$,
      backspaceMove$,
      backspaceInStartMove$,
      enterMove$,
      text$.map(text => {
        const { cursor, cachedBefore } = self.state
        return {
          x: cachedBefore.length + text.length,
          y: cursor.y
        }
      }),
    )

    // 当前编辑行变化
    const moveToLine$ = cursor$
      .filter(cursor => cursor.y !== self.state.cursor.y)
      .map(cursor => cursor.y)

    const changingLine$ = Observable.merge(
      leftMove$,
      rightMove$,
      upMove$,
      downMove$,
      mouseMove$
    ).filter(({ y }) => {
      const { cursor } = self.state
      return cursor.y !== y
    })
    // 刷新行
    const line$ = Observable.merge(
      backspaceDel$.map(() => {
        const { cachedBefore, text, cachedAfter } = self.state
        return {
          cachedBefore: `${cachedBefore}${text}`.slice(0, -1),
          cachedAfter
        }
      }),
      leftMove$.filter(({ y }) => self.state.cursor.y === y).map(() => {
        const { cachedBefore, text, cachedAfter } = self.state
        const beforeCursor = `${cachedBefore}${text}`
        return {
          cachedBefore: beforeCursor.slice(0, -1),
          cachedAfter: `${beforeCursor.slice(-1)}${cachedAfter}`
        }
      }),
      rightMove$.filter(({ y }) => self.state.cursor.y === y).map(() => {
        const { cachedBefore, text, cachedAfter, cursor } = self.state
        const line = `${cachedBefore}${text}${cachedAfter}`
        return {
          cachedBefore: line.slice(0, cursor.x + 1),
          cachedAfter: line.slice(cursor.x + 1)
        }
      }),
      mouseMove$.filter(({ y }) => self.state.cursor.y === y).map(({ x }) => {
        const { cachedBefore, text, cachedAfter } = self.state
        const line = `${cachedBefore}${text}${cachedAfter}`
        return {
          cachedBefore: line.substring(0, x),
          cachedAfter: line.substring(x)
        }
      })
    )

    // 行变换
    const lines$ = Observable
      .merge(
        // 回车
        enterKeyUp$.map(() => {
          const { lines, cursor, cachedBefore, text, cachedAfter, highlighted } = self.state
          const line = `${cachedBefore}${text}`
          const beforeLines = lines.slice(0, cursor.y)
          const beforeHighlighted = highlighted.slice(0, cursor.y)
          const afterLines = lines.slice(cursor.y + 1)
          const afterHighlighted = highlighted.slice(cursor.y + 1)
          // 新行保持与上一行一致的缩进
          const matched = line.match(/^\s+/)
          const headSpaces = matched ? matched[0] : ''
          return {
            highlighted: [...beforeHighlighted, lexer(line), lexer(cachedAfter), ...afterHighlighted],
            cachedBefore: headSpaces,
            cachedAfter,
            lines: [...beforeLines, line, cachedAfter, ...afterLines]
          }
        }),
        // 顶部退格考虑合并行
        backspaceInStart$.map(() => {
          const { lines, cursor, cachedAfter, highlighted } = self.state
          const beforeLines = lines.slice(0, cursor.y)
          const beforeHighlighted = highlighted.slice(0, cursor.y)
          const afterLines = lines.slice(cursor.y + 1)
          const afterHighlighted = highlighted.slice(cursor.y + 1)
          const prevLine = lines[cursor.y - 1].slice(0, -1)
          const merged = `${prevLine}${cachedAfter}`
          return {
            highlighted: [...beforeHighlighted.slice(0, -1), lexer(merged), ...afterHighlighted],
            cachedBefore: prevLine,
            cachedAfter,
            lines: [...beforeLines.slice(0, -1), merged, ...afterLines]
          }
        }),
        // 一般行变化
        changingLine$.map(({ x, y }) => {
          const { cachedBefore, cachedAfter, text, cursor, lines, highlighted } = self.state
          const line = `${cachedBefore}${text}${cachedAfter}`
          const beforeLines = lines.slice(0, cursor.y)
          const beforeHighlighted = highlighted.slice(0, cursor.y)
          const afterLines = lines.slice(cursor.y + 1)
          const afterHighlighted = highlighted.slice(cursor.y + 1)
          const toLine = lines[y]
          return {
            highlighted: [...beforeHighlighted, lexer(line), ...afterHighlighted],
            cachedBefore: toLine.substring(0, x),
            cachedAfter: toLine.substring(x),
            lines: [
              ...beforeLines, line, ...afterLines
            ]
          }
        })
      )

    // 重置输入框
    const resetText$ = Observable.merge(
      lines$
    )

    // 计算光标顶部位置
    const computedCursorTop$ = moveToLine$.map(line => {
      return line * self.state.lineHeight
    })

    // 计算光标左侧位置
    const computedCursorLeft$ = Observable.merge(
      // 当前行移动处理
      line$.map(cached => {
        return cached.cachedBefore
      }),
      // 文本变化
      text$.map(text => {
        const { cachedBefore } = self.state
        return cachedBefore + text
      }),
      // 顶部退格时的光标处理
      backspaceInStart$.map(() => {
        const { lines, cursor } = self.state
        const prevLine = lines[cursor.y - 1]
        return prevLine
      }),
      // 换行
      enterKeyUp$.map(() => {
        const { cachedBefore } = self.state
        // 新行保持与上一行一致的缩进
        const matched = cachedBefore.match(/^\s+/)
        const headSpaces = matched ? matched[0] : ''
        return headSpaces
      }),
      changingLine$.map(cursor => {
        const { lines } = self.state
        return lines[cursor.y].substring(0, cursor.x)
      })
    ).map(beforeCursorText => {
      return computeCursorLeft(this.$ruler, beforeCursorText, 10)
    })

    // 词法解析
    // const tokens$ = code$.map(lexer)

    // 当前行内容变化
    const lineContent$ = Observable.merge(
      text$.map(text => {
        const { cachedBefore, cachedAfter } = self.state
        return `${cachedBefore}${text}${cachedAfter}`
      }),
      backspaceDel$.map(() => {
        const { cachedBefore, text, cachedAfter } = self.state
        return `${cachedBefore}${text}${cachedAfter}`.slice(0, -1)
      })
    ).map(content => {
      const { cursor } = self.state
      return {
        line: cursor.y,
        content
      }
    })

    // 高亮
    const highlight$ = Observable.merge(
      // 当前行变化
      lineContent$.map(({ line, content }) => {
        const { highlighted } = self.state
        const beforeLines = highlighted.slice(0, line)
        const afterLines = highlighted.slice(line + 1)
        return [...beforeLines, lexer(content), ...afterLines]
      })
    )

    // 光标闪烁流
    const blink$ = cursor$
      .startWith(null)
      .switchMapTo(Observable.interval(500).mapTo(null))

    return {
      selection$,
      textKeyDown$,
      textKeyUp$,
      textFocus$,
      textInput$,
      cursor$,
      highlight$,
      beginInput$,
      blink$,
      lines$,
      text$,
      resetText$,
      computedCursorLeft$,
      computedCursorTop$,
      line$
    }
  }

  model(actions) {
    return Observable.merge(
      actions.cursor$.map(cursor => state => ({ ...state, cursor: { ...cursor } })),
      actions.lines$.map(childState => state => ({ ...state, ...childState })),
      actions.blink$.map(cursorVisible => state => ({ ...state, cursorVisible: !state.cursorVisible })),
      actions.highlight$.map(highlighted => state => ({ ...state, highlighted })),
      actions.text$.map(text => state => ({ ...state, text })),
      actions.line$.map(cached => state => ({ ...state, ...cached, text: '' })),
      actions.resetText$.mapTo(state => ({ ...state, text: '' })),
      actions.computedCursorLeft$.map(computedCursorLeft => state => ({ ...state, computedCursorLeft })),
      actions.computedCursorTop$.map(computedCursorTop => state => ({ ...state, computedCursorTop }))
    )
  }

  handleLineMouseUp(e, lineIdx, tokenIdx) {
    let selection
    if (window.getSelection) {
      selection = window.getSelection()
    } else if (document.selection) {
      // For Opera
      selection = document.selection.createRange()
    }
    this.actions.selection$.next({
      lineIdx,
      tokenIdx,
      selection
    })
    this.$input.focus()
  }

  handleTextKeyDown(e) {
    this.actions.textKeyDown$.next(e.nativeEvent)
  }

  handleTextKeyUp(e) {
    this.actions.textKeyUp$.next(e.nativeEvent)
  }

  handleTextFocus(e) {
    this.actions.textFocus$.next(null)
  }

  handleTextInput(e) {
    const { inputType } = e.nativeEvent
    if (inputType === 'insertText' || inputType === 'insertCompositionText') {
      this.actions.textInput$.next(e.nativeEvent)
    }
  }

  handleTextChange(e) {
    this.actions.text$.next(e.target.value)
  }

  setFontSize(fontSize) {
    this.actions.fontSize$.next(fontSize)
  }

  renderLines() {
    const { highlighted, cursor } = this.state
    return highlighted.map((tokens, lineIdx) => {
      const spans = tokens.map((token, tokenIdx) => (
        <span
          key={tokenIdx}
          className={`ce-${token.type}`}
          onMouseUp={e => this.handleLineMouseUp(e, lineIdx, tokenIdx)}>
          {token.value}
        </span>
      ))
      if (cursor.y === lineIdx) {
        return (
          <div key={lineIdx} className="item" >
            <span className="no active">{lineIdx + 1}</span>
            {spans}
          </div>
        )
      } else {
        return (
          <div key={lineIdx} className="item">
            <span className="no">{lineIdx + 1}</span>
            {spans}
          </div>
        )
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
        ref={input => {this.$input = input}}
        autoFocus
        autoCorrect={'off'}
        autoCapitalize={'off'}
        spellCheck={false}
        tabIndex={0}
        onInput={this.handleTextInput}
        onKeyDown={this.handleTextKeyDown}
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
      <div className="code-editor" onMouseUp={() => this.$input.focus()}>
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
