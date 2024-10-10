import React from 'react';

export type MsgCounterProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  word: string;
  limit: number;
  count: number;
  charactersremaining: number;
};

export const MeteredMessageBox = (props: MsgCounterProps) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, overflowY: 'auto' }}>
      <textarea
        {...props}
        className={`form-control ${props.className || ''}`}
        rows={3}
        maxLength={props.limit}
      />
      <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.875em' }}>
        <span>
          {props.charactersremaining} {props.word} remaining
        </span>
        <span>
          {props.count}/{props.limit}
        </span>
      </div>
    </div>
  );
};