export const Threads = () => {
  const items = ['(샘플) 최근 대화', '(샘플) 업무 정리', '(샘플) 회의 준비'];
  return (<>
    <h3 style={{margin:'6px 4px 8px', color:'var(--lc-muted)', fontSize:13}}>Threads</h3>
    {items.map(t=> <div key={t} className="item">{t}</div>)}
  </>);
};
