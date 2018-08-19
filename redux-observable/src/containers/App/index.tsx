import * as React from 'react'
import { Layout } from 'antd'
import User from '@containers/User'

const { Header, Content, Footer } = Layout

class App extends React.Component {
  render() {
    return (
      <Layout>
        <Header>
          Github Top Users
        </Header>
        <Content style={{padding: '0 50px', marginTop: 20 }}>
          <Layout style={{ padding: '24px 0', background: '#fff' }}>
            <Content style={{ padding: '0 24px', minHeight: 280 }}>
              <User />
           </Content>
          </Layout>
        </Content>
        <Footer style={{ textAlign: 'center' }}>
        使用 redux-observable v1 实现组件自治 Demo
        </Footer>
      </Layout>
   )
  }
}

export default App
