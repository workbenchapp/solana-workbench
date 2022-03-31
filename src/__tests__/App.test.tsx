import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { Provider } from 'react-redux';
import App from '../renderer/App';
import store from '../renderer/store';

describe('App', () => {
  it('should render', () => {
    expect(
      render(
        <Provider store={store}>
          <App />
        </Provider>
      )
    ).toBeTruthy();
  });
});
