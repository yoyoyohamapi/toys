/**
 * store
 * @author yoyoyohamapi
 * @ignore created 2018-08-19
 */
import { createStore, applyMiddleware, Store, combineReducers } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import userReducer from './reducers/user'
import userEpic from './epics/user'
import { createEpicMiddleware } from '../'

export default function configureStore(): Store {
  const epicMiddleware = createEpicMiddleware(userEpic)
  const store = createStore(
    combineReducers({
      user: userReducer
    }),
    composeWithDevTools(applyMiddleware(epicMiddleware))
  )

  epicMiddleware.run()

  return store
}
