import React from 'react'
import PropTypes from 'prop-types'

export default class Provider extends React.Component {
  static propTypes = {
    state$: PropTypes.object.isRequired,
    children: PropTypes.element.isRequired
  }

  getChildContext() {
    return { state$: this.props.state$ }
  }

  static childContextTypes = {
    state$: PropTypes.object.isRequired
  }

  render() {
    return this.props.children
  }
}

