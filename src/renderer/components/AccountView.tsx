import { faTerminal } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import analytics from 'common/analytics';
import { explorerURL, truncateSolAmount } from 'common/strings';
import { useSelector } from 'react-redux';
import { RootState } from 'renderer/slices/mainSlice';
import { WBAccount } from 'types/types';
import InlinePK from './InlinePK';
import RandomArt from './RandomArt';

const AccountView = (props: { account: WBAccount }) => {
  const { account } = props;
  const { net } = useSelector((state: RootState) => state.validator);
  return (
    <>
      <div className="row">
        <div className="col-auto">
          <div>
            <h6 className="ms-1">
              {account.humanName !== '' ? account.humanName : <div>&nbsp;</div>}
            </h6>
          </div>
        </div>
      </div>
      <div className="row">
        <div className="col">
          <div className="row">
            <div className="col-auto">
              <table className="table table-borderless table-sm mb-0">
                <tbody>
                  <tr>
                    <td>
                      <small className="text-muted">Pubkey</small>
                    </td>
                    <td>
                      <small>
                        <InlinePK pk={account.pubKey} />
                      </small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">SOL</small>
                    </td>
                    <td>
                      <small>{truncateSolAmount(account.solAmount)}</small>
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Executable</small>
                    </td>
                    <td>
                      {account.executable ? (
                        <div>
                          <FontAwesomeIcon
                            className="border-success rounded p-1 exe-icon"
                            icon={faTerminal}
                          />
                          <small className="ms-1 mb-1">Yes</small>
                        </div>
                      ) : (
                        <small className="fst-italic fw-light text-muted">
                          No
                        </small>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <td>
                      <small className="text-muted">Explorer</small>
                    </td>
                    <td>
                      <small>
                        <a
                          onClick={() =>
                            analytics('clickExplorerLink', { net })
                          }
                          href={explorerURL(net, account.pubKey)}
                          target="_blank"
                          className="sol-link"
                          rel="noreferrer"
                        >
                          Link
                        </a>
                      </small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="col-auto">
              <RandomArt
                className="randomart-lg text-secondary"
                art={account.art || ''}
              />
            </div>
          </div>
          <div className="ms-1">
            <div>
              <small className="text-muted">Data</small>
            </div>
            <div>
              <pre className="exe-hexdump p-2 rounded">
                <code>{account.hexDump}</code>
              </pre>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AccountView;
