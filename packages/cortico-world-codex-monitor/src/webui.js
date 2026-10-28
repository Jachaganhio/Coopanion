// Cortico WebUiClientBundle; no direct browser access to the authenticated Bridge.
export default {panels:{tasks:{mount(ctx){
  const status=document.createElement('p');
  const table=document.createElement('table');
  const head=document.createElement('tr');
  const body=document.createElement('tbody');table.append(head,body);ctx.root.append(status,table);
  let lastUi;
  let busy=false;
  async function refresh(){if(busy)return;busy=true;try{
    const s=await ctx.invoke('list');const ui=s.ui;lastUi=ui;head.replaceChildren();for(const title of ui.columns){const th=document.createElement('th');th.textContent=title;head.append(th);}status.textContent=s.connected?ui.connected:ui.offline;
    body.replaceChildren();
    for(const task of [...s.tasks].sort((a,b)=>Date.parse(b.timestamp)-Date.parse(a.timestamp)).slice(0,100)){
      const row=document.createElement('tr');for(const value of [task.source==='claude'?'Claude Code':'Codex',task.taskId.slice(0,12),task.project??'—',ui.statuses[task.event]??ui.statuses.unknown,new Date(task.timestamp).toLocaleString()]){const td=document.createElement('td');td.textContent=value;td.style.padding='6px 12px';row.append(td);}body.append(row);
      const conclusion=document.createElement('td');
      const excerpt=document.createElement('p');excerpt.textContent=task.summary??task.detail;conclusion.append(excerpt);
      if(task.finalAnswer){const details=document.createElement('details');const label=document.createElement('summary');label.textContent=ui.answer;const answer=document.createElement('pre');answer.textContent=task.finalAnswer;answer.style.whiteSpace='pre-wrap';details.append(label,answer);conclusion.append(details);}
      row.append(conclusion);
    }
  }catch{status.textContent=lastUi?.error??'';}finally{busy=false;}}
  void refresh();ctx.interval(()=>void refresh(),2000);
}}}};
