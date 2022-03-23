import { RANDOMART_H_CH, RANDOMART_W_CH } from 'types/types';

function RandomArt(props: { art: string; className?: string }) {
  let { art } = props;
  const { className } = props;
  if (art === '') {
    art = `${' '.repeat(RANDOMART_W_CH)}\n`.repeat(RANDOMART_H_CH);
  }
  return (
    <pre className={`border text-secondary inline-key mb-0 ${className}`}>
      <code>{art}</code>
    </pre>
  );
}

RandomArt.defaultProps = {
  className: '',
};

export default RandomArt;
