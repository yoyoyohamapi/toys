/**
 * store
 * @author yoyoyohamapi
 * @ignore created 2018-08-19
 */
import { createStore, applyMiddleware, Store, combineReducers } from 'redux'
import { composeWithDevTools } from 'redux-devtools-extension'
import userReducer from './reducers/user'
import userEpic from './epics/user'
import { createEpicMiddleware } from './middlewares/redux-observable'

export default function configureStore(): Store {
  const store = createStore(
    combineReducers({
      user: userReducer
    }),
    composeWithDevTools(applyMiddleware(createEpicMiddleware(userEpic)))
  )

  return store
}
