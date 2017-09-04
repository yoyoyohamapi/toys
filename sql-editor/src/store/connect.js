import React from 'react'
import PropTypes from 'prop-types'

export default function connect(selector = state => state, actions) {
  return function wrapWithConnect(WrappedComponent) {
    return class Connect extends React.Component {
      constructor(props) {
        super(props)
      }

      componentDidMount() {
        this.subscription = this.context.state$
          .map(selector)
          .subscribe(this.setState.bind(this))
      }

      componentWillUnmount() {
        this.subscription.unscribe()
      }

      static contextTypes = {
        state$: PropTypes.object.isRequired
      }

      render() {
        return <WrappedComponent {...this.state} {...this.props} {...actions}/>
      }
    }
  }
}
