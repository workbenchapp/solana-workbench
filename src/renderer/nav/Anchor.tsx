import { useEffect, useRef, useState } from 'react';
import { FormControl, InputGroup } from 'react-bootstrap';

const Anchor = () => {
  const programIDRef = useRef<HTMLInputElement>({} as HTMLInputElement);
  const [idl, setIDL] = useState<any>({});

  useEffect(() => {
    const listener = (resp: any) => {
      const { method, res } = resp;
      switch (method) {
        case 'fetch-anchor-idl':
          setIDL(res);
          break;
        default:
      }
    };
    window.electron.ipcRenderer.on('main', listener);
    return () => {
      window.electron.ipcRenderer.removeListener('main', listener);
    };
  }, []);

  return (
    <div className="row">
      <div className="row">
        <div className="col-sm-5">
          <InputGroup size="sm" className="mb-2 mt-1">
            <InputGroup.Text>Program ID</InputGroup.Text>
            <FormControl
              style={{ fontFamily: 'Consolas, monospace', fontWeight: 500 }}
              aria-label="Program ID"
              ref={programIDRef}
              onKeyUp={() => {
                window.electron.ipcRenderer.fetchAnchorIDL({
                  programID: programIDRef.current.value,
                });
              }}
            />
          </InputGroup>
        </div>
      </div>
      <div className="row">
        {idl.instructions ? (
          idl.instructions.map((instruction: any) => {
            return (
              <div className="card col-5 m-1">
                <h6 className="card-title p-1">
                  <code>{instruction.name}</code>
                </h6>
                <div className="row">
                  <div className="col">
                    <ul className="list-group list-group-flush">
                      <li className="bg-light list-group-item">Args</li>
                      {instruction.args.map((arg: any) => {
                        return (
                          <li className="list-group-item">
                            {arg.name}
                            <span className="ms-2 badge bg-secondary">
                              {arg.type.toString()}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="col">
                    <ul className="list-group list-group-flush">
                      <li className="bg-light list-group-item">Accounts</li>
                      {instruction.accounts.map((account: any) => {
                        return (
                          <li className="list-group-item">{account.name}</li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <small className="text-muted">
            e.g.: <code>GrAkKfEpTKQuVHG2Y97Y2FF4i7y7Q5AHLK94JBy7Y5yv</code>
          </small>
        )}
      </div>
    </div>
  );
};

export default Anchor;
