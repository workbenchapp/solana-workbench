import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { HashRouter } from 'react-router-dom';
import 'virtual:fonts.css';
import 'virtual:windi.css';
import { QueryClient, QueryClientProvider } from 'react-query';

import App from './App';
import './index.css';
import store from './store';

const rootElement = document.getElementById('root');
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const root = createRoot(rootElement!);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
      retry: false,
      staleTime: 10000, // milliSeconds
      cacheTime: 60000, // milliSeconds
    },
  },
});

root.render(
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <HashRouter>
        <App />
      </HashRouter>
    </QueryClientProvider>
  </Provider>
);
