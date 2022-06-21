import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import 'virtual:fonts.css';
import 'virtual:windi.css';
import App from './App';
import './index.css';
import store from './store';

const rootElement = document.getElementById('root');
const root = createRoot(rootElement!);

root.render(
  <Provider store={store}>
    <HashRouter>
      <App />
    </HashRouter>
  </Provider>
);
