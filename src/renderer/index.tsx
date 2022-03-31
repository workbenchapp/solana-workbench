import { Provider } from 'react-redux';
import { render } from 'react-dom';
import { HashRouter } from 'react-router-dom';
import App from './App';

import store from './store';

const rootElement = document.getElementById('root');
render(
  <Provider store={store}>
    <HashRouter>
      <App />
    </HashRouter>
  </Provider>,
  rootElement
);
