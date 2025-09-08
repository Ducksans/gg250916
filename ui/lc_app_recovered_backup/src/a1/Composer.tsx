import { RefObject, useCallback } from 'react';
export const Composer = ({ inputRef, onSend }: { inputRef: RefObject<HTMLTextAreaElement>; onSend: (text:string)=>void }) => {
  const send = useCallback(()=> {
    const v = (inputRef.current?.value||'').trim(); if(!v) return; onSend(v); if(inputRef.current) inputRef.current.value = '';
  }, [inputRef, onSend]);
  return (<>
    <textarea id="chat-input" ref={inputRef} placeholder="메시지를 입력하고 Ctrl+Enter로 보내기" />
    <div className="row" data-gg="composer-actions">
      <button className="btn accent" onClick={send}>보내기</button>
      <button className="btn" onClick={()=>{ if(inputRef.current) inputRef.current.value = ''; }}>지우기</button>
    </div>
  </>);
};
