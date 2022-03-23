import { prettifyPubkey } from '../../common/strings';
import CopyIcon from './CopyIcon';

function InlinePK(props: { pk: string; className?: string }) {
  const { pk, className } = props;
  return (
    <span className={className}>
      <code>{prettifyPubkey(pk)}</code>
      <CopyIcon writeValue={pk} />
    </span>
  );
}

InlinePK.defaultProps = {
  className: '',
};

export default InlinePK;
