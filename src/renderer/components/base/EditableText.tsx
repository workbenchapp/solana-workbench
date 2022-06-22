import { KeyboardEvent, useEffect, useRef, useState } from 'react';
import IconButton from './IconButton';

const EditableText: React.FC<
  {
    value: string;
    onSave: (value: string) => void;
  } & React.InputHTMLAttributes<HTMLInputElement>
> = ({ value, onSave, ...rest }) => {
  const [editingValue, setEditingValue] = useState<string | undefined>(
    undefined
  );
  const [editing, setEditing] = useState(false);
  const input = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    input.current?.focus();
  }, [editing]);

  const save = () => {
    onSave(editingValue || value);
    setEditing(false);
  };

  const onKeyDown = (ev: KeyboardEvent<HTMLInputElement>) => {
    switch (ev.key) {
      case 'Enter':
        save();
        break;
      case 'Escape':
        setEditing(false);
        break;
      default:
        break;
    }
  };

  if (editing) {
    return (
      <div className="flex items-center min-w-0 gap-2">
        <input
          className="bg-surface-300 dense w-full flex-1"
          {...rest}
          onInput={(ev) => setEditingValue(ev.currentTarget.value)}
          value={editingValue || value}
          ref={input}
          onKeyDown={onKeyDown}
        />
        <div className="flex">
          <IconButton dense onClick={save}>
            <IconMdiCheck />
          </IconButton>
          <IconButton onClick={() => setEditing(false)} dense>
            <IconMdiClose />
          </IconButton>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center">
      <span className="p-1">{value || 'Unset'}</span>
      <IconButton dense onClick={() => setEditing(true)}>
        <IconMdiPencil className="block" />
      </IconButton>
    </div>
  );
};

export default EditableText;
