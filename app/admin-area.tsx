"use client";

import { FormEvent, useEffect, useState } from "react";

type DashboardData = {
  organization: { id: string; name: string };
  cycle: { id: string; slug: string; title: string; status: string; minGroupSize: number; sensitiveMinGroupSize: number };
  participation: { totalCodes: number; usedCodes: number; availableCodes: number; submittedResponses: number; rate: number };
  dimensions: Array<{ dimension: string; n: number; favorability: number | null; suppressed: boolean }>;
  enps: { n: number; value: number | null; suppressed: boolean };
  privacy: { resultsSuppressed: boolean; minimumGroup: number; sensitiveMinimumGroup: number };
};
type Organization = { id:string; name:string; status:string; defaultMinGroupSize:number; cycleCount:number; managerCount:number };
type Cycle = { id:string; slug:string; title:string; status:string; startsAt:string|null; endsAt:string|null; privacyNoticeVersion:string; legalBasisCode:string; questionCount:number; submittedResponses:number; totalCodes:number; availableCodes:number };
type AdminView = "overview"|"organizations"|"cycles";

export default function AdminArea() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [authRequired, setAuthRequired] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [activationToken, setActivationToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view,setView]=useState<AdminView>("overview");
  const [organizations,setOrganizations]=useState<Organization[]>([]);
  const [selectedOrganizationId,setSelectedOrganizationId]=useState("");
  const [cycles,setCycles]=useState<Cycle[]>([]);

  async function loadOrganizations(preferredId?:string){const response=await fetch("/api/admin/organizations",{cache:"no-store"});if(!response.ok)return;const items=await response.json() as Organization[];setOrganizations(items);const next=preferredId&&items.some(item=>item.id===preferredId)?preferredId:items[0]?.id??"";setSelectedOrganizationId(next);if(next)await loadCycles(next)}
  async function loadCycles(organizationId:string){const response=await fetch(`/api/admin/cycles?organizationId=${encodeURIComponent(organizationId)}`,{cache:"no-store"});if(response.ok)setCycles(await response.json())}

  async function loadDashboard() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" }).catch(() => null);
    if (!response) { setError("Não foi possível conectar ao serviço."); setLoading(false); return; }
    if (response.status === 401) { setAuthRequired(true); setDashboard(null); setLoading(false); return; }
    if (response.status === 403) { setAccessDenied(true); setAuthRequired(false); setDashboard(null); setLoading(false); return; }
    if (!response.ok) { setError("Não foi possível carregar o painel agora."); setLoading(false); return; }
    const data=await response.json() as DashboardData;
    setDashboard(data);
    await loadOrganizations(data.organization.id);
    setAuthRequired(false);
    setAccessDenied(false);
    setLoading(false);
  }

  useEffect(() => {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const token = hash.get("access_token");
    if (token && hash.get("type") === "invite") { setActivationToken(token); setLoading(false); return; }
    void loadDashboard();
  }, []);

  if (activationToken) return <ActivateAdmin accessToken={activationToken} onActivated={()=>{window.history.replaceState(null,"",window.location.pathname);setActivationToken(null);setAuthRequired(true)}}/>;
  if (loading) return <section className="admin-login-wrap"><div className="surface admin-login-card"><span className="admin-loader"/><h1>Carregando área de gestão</h1><p>Validando acesso e limites de privacidade.</p></div></section>;
  if (authRequired) return <AdminLogin onAuthenticated={loadDashboard}/>;
  if (accessDenied) return <AdminAccessDenied onLogout={async()=>{await fetch("/api/admin/logout",{method:"POST"});setAuthRequired(true);setAccessDenied(false)}}/>;
  if (!dashboard) return <section className="admin-login-wrap"><div className="surface admin-login-card"><h1>Área indisponível</h1><p>{error}</p><button className="primary" onClick={loadDashboard}>Tentar novamente</button></div></section>;

  return <section className="admin-layout">
    <aside className="admin-nav">
      <strong>Painel administrativo</strong>
      <button className={view==="overview"?"active":""} onClick={()=>setView("overview")}>Visão geral</button>
      <button className={view==="organizations"?"active":""} onClick={()=>setView("organizations")}>Organizações</button>
      <button className={view==="cycles"?"active":""} onClick={()=>setView("cycles")}>Ciclos</button>
      <button>Relatórios</button><button>Privacidade e auditoria</button>
      <button className="admin-logout" onClick={async()=>{await fetch("/api/admin/logout",{method:"POST"});setDashboard(null);setAuthRequired(true)}}>Sair da gestão</button>
    </aside>
    <div className="dashboard">
      {view==="overview"&&<DashboardOverview dashboard={dashboard}/>} 
      {view==="organizations"&&<OrganizationsPanel organizations={organizations} onCreated={()=>loadOrganizations(selectedOrganizationId)}/>} 
      {view==="cycles"&&<CyclesPanel organizations={organizations} selectedOrganizationId={selectedOrganizationId} cycles={cycles} onSelect={async(id)=>{setSelectedOrganizationId(id);await loadCycles(id)}} onCreated={()=>loadCycles(selectedOrganizationId)}/>} 
    </div>
  </section>;
}

function DashboardOverview({dashboard}:{dashboard:DashboardData}){const visibleDimensions=dashboard.dimensions.filter(item=>!item.suppressed&&item.favorability!==null);return <><header className="dashboard-head"><div><span className="eyebrow">{dashboard.organization.name} · ciclo atual</span><h1>{dashboard.cycle.title}</h1><p>Resultados reais, protegidos pelos limites de anonimato.</p></div><span className="status">{dashboard.cycle.status==="open"?"Coleta ativa":dashboard.cycle.status}</span></header><div className="metric-grid four"><AdminMetric label="Participação" value={`${dashboard.participation.rate.toFixed(1)}%`} detail={`${dashboard.participation.usedCodes} de ${dashboard.participation.totalCodes} códigos usados`}/><AdminMetric label="Respostas enviadas" value={String(dashboard.participation.submittedResponses)} detail={`${dashboard.participation.availableCodes} códigos disponíveis`}/><AdminMetric label="Favorabilidade" value={dashboard.privacy.resultsSuppressed?"Protegido":"Disponível"} detail={`Exige ao menos ${dashboard.privacy.minimumGroup} respostas`}/><AdminMetric label="eNPS" value={dashboard.enps.suppressed?"Protegido":String(dashboard.enps.value)} detail={`${dashboard.enps.n} respostas válidas`}/></div><div className="dashboard-grid"><section className="surface chart-card"><div className="card-heading"><div><h2>Favorabilidade por dimensão</h2><p>Percentual de respostas 4 e 5</p></div></div>{visibleDimensions.length?<div className="bars">{visibleDimensions.map(item=><div key={item.dimension}><div className="bar-label"><span>{item.dimension}</span><strong>{item.favorability}%</strong></div><div className="bar-track"><span style={{width:`${item.favorability}%`}}/></div></div>)}</div>:<div className="suppressed-panel"><strong>Resultados temporariamente ocultos</strong><p>O ciclo possui {dashboard.participation.submittedResponses} resposta(s). Os gráficos serão liberados ao atingir {dashboard.privacy.minimumGroup} respostas; dimensões sensíveis exigem {dashboard.privacy.sensitiveMinimumGroup}.</p></div>}</section><section className="surface privacy-card"><span className="privacy-icon">◈</span><h2>Proteção de anonimato</h2><strong className="big-number">{dashboard.privacy.resultsSuppressed?"Ativa":"OK"}</strong><p>{dashboard.privacy.resultsSuppressed?"dados abaixo do grupo mínimo":"limites atendidos"}</p><div className="filter-alert"><strong>Regras automáticas</strong><span>Grupos gerais: mínimo {dashboard.privacy.minimumGroup}. Recortes sensíveis: mínimo {dashboard.privacy.sensitiveMinimumGroup}.</span></div></section></div></>}

function OrganizationsPanel({organizations,onCreated}:{organizations:Organization[];onCreated:()=>Promise<void>}){const[name,setName]=useState("");const[minimum,setMinimum]=useState(5);const[error,setError]=useState("");const[saving,setSaving]=useState(false);async function submit(event:FormEvent){event.preventDefault();setSaving(true);setError("");const response=await fetch("/api/admin/organizations",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,defaultMinGroupSize:minimum})});if(!response.ok){setError("Não foi possível criar. Confira se a organização já existe.");setSaving(false);return}setName("");await onCreated();setSaving(false)}return <><header className="management-head"><div><span className="eyebrow">Administração da plataforma</span><h1>Organizações</h1><p>Você visualiza todas as empresas; cada gestor verá apenas a própria organização.</p></div></header><div className="management-grid"><section className="surface management-card"><h2>Organizações cadastradas</h2><div className="entity-list">{organizations.map(item=><article key={item.id}><div><strong>{item.name}</strong><span>{item.cycleCount} ciclo(s) · {item.managerCount} gestor(es)</span></div><span className="status">{item.status}</span></article>)}</div></section><form className="surface management-card" onSubmit={submit}><h2>Nova organização</h2><label htmlFor="organization-name">Nome</label><input id="organization-name" value={name} onChange={e=>setName(e.target.value)} required minLength={2}/><label htmlFor="minimum-group">Grupo mínimo</label><input id="minimum-group" type="number" min={3} value={minimum} onChange={e=>setMinimum(Number(e.target.value))} required/><span className="field-help">Recomendado: 5 respostas.</span>{error&&<span className="error">{error}</span>}<button className="primary full" disabled={saving}>{saving?"Criando...":"Criar organização"}</button></form></div></>}

function CyclesPanel({organizations,selectedOrganizationId,cycles,onSelect,onCreated}:{organizations:Organization[];selectedOrganizationId:string;cycles:Cycle[];onSelect:(id:string)=>Promise<void>;onCreated:()=>Promise<void>}){
  const[title,setTitle]=useState("");const[slug,setSlug]=useState("");const[privacy,setPrivacy]=useState("1.0");const[legal,setLegal]=useState("");const[error,setError]=useState("");const[saving,setSaving]=useState(false);const[quantity,setQuantity]=useState(10);const[generatedCodes,setGeneratedCodes]=useState<string[]>([]);const[actionMessage,setActionMessage]=useState("");
  async function submit(event:FormEvent){event.preventDefault();setSaving(true);setError("");const response=await fetch("/api/admin/cycles",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({organizationId:selectedOrganizationId,title,slug,privacyNoticeVersion:privacy,legalBasisCode:legal})});if(!response.ok){setError("Não foi possível criar o ciclo. Confira o identificador e os campos jurídicos.");setSaving(false);return}setTitle("");setSlug("");setLegal("");await onCreated();setSaving(false)}
  async function action(cycleId:string,actionName:string,extra:Record<string,unknown>={}){setActionMessage("");setError("");const response=await fetch("/api/admin/cycle-actions",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({cycleId,action:actionName,...extra})});const result=await response.json();if(!response.ok){setError("A ação foi bloqueada porque o ciclo ainda não atende aos requisitos.");return null}await onCreated();return result}
  function downloadCodes(){const blob=new Blob(["codigo\n"+generatedCodes.join("\n")+"\n"],{type:"text/csv;charset=utf-8"});const link=document.createElement("a");link.href=URL.createObjectURL(blob);link.download="codigos-participacao.csv";link.click();URL.revokeObjectURL(link.href)}
  return <><header className="management-head"><div><span className="eyebrow">Configuração da pesquisa</span><h1>Ciclos</h1><p>Prepare questionário e códigos em rascunho. A coleta só abre após confirmação explícita.</p></div><label className="organization-selector">Organização<select value={selectedOrganizationId} onChange={e=>void onSelect(e.target.value)}>{organizations.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label></header>
  {generatedCodes.length>0&&<section className="surface generated-codes"><div><h2>Códigos gerados</h2><p>Salve agora: por segurança, o sistema armazena apenas os hashes.</p></div><button className="primary" onClick={downloadCodes}>Baixar CSV</button><textarea readOnly value={generatedCodes.join("\n")} aria-label="Códigos gerados"/></section>}
  {actionMessage&&<p className="success-message">{actionMessage}</p>}{error&&<p className="error">{error}</p>}
  <div className="management-grid"><section className="surface management-card"><h2>Ciclos cadastrados</h2><div className="cycle-list">{cycles.map(item=><article key={item.id} className="cycle-item"><div className="cycle-item-head"><div><strong>{item.title}</strong><span>{item.slug} · {item.questionCount} perguntas · {item.availableCodes} códigos disponíveis · {item.submittedResponses} respostas</span></div><span className="status">{item.status}</span></div>{item.status==="draft"&&<div className="cycle-actions"><button className="secondary" disabled={item.questionCount>0} onClick={async()=>{const result=await action(item.id,"apply_template");if(result)setActionMessage(`${result.questionCount} perguntas preparadas.`)}}>{item.questionCount>0?"Questionário preparado":"Copiar questionário-base"}</button><label>Quantidade<input type="number" min={1} max={5000} value={quantity} onChange={e=>setQuantity(Number(e.target.value))}/></label><button className="secondary" onClick={async()=>{if(!window.confirm(`Gerar ${quantity} códigos anônimos para este ciclo?`))return;const result=await action(item.id,"generate_codes",{quantity});if(result){setGeneratedCodes(result.codes);setActionMessage(`${result.quantity} códigos gerados.`)}}}>Gerar códigos</button><button className="primary" disabled={item.questionCount===0||item.availableCodes===0} onClick={async()=>{if(!window.confirm("Abrir a coleta agora? Após abrir, o questionário e os códigos entrarão em uso."))return;const result=await action(item.id,"change_status",{status:"open"});if(result)setActionMessage("Coleta aberta com sucesso.")}}>Abrir coleta</button></div>}</article>)}{!cycles.length&&<p className="empty-state">Nenhum ciclo cadastrado.</p>}</div></section><form className="surface management-card" onSubmit={submit}><h2>Novo ciclo</h2><label htmlFor="cycle-title">Título</label><input id="cycle-title" value={title} onChange={e=>{setTitle(e.target.value);if(!slug)setSlug(e.target.value.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,""))}} required/><label htmlFor="cycle-slug">Identificador</label><input id="cycle-slug" value={slug} onChange={e=>setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g,""))} required/><label htmlFor="privacy-version">Versão do aviso de privacidade</label><input id="privacy-version" value={privacy} onChange={e=>setPrivacy(e.target.value)} required/><label htmlFor="legal-basis">Base legal validada</label><input id="legal-basis" value={legal} onChange={e=>setLegal(e.target.value)} placeholder="Ex.: LGPD_ART_7_IX" required/><span className="field-help">O ciclo permanecerá em rascunho até a revisão jurídica.</span><button className="primary full" disabled={saving||!selectedOrganizationId}>{saving?"Criando...":"Criar ciclo em rascunho"}</button></form></div></>}

function AdminLogin({onAuthenticated}:{onAuthenticated:()=>Promise<void>}) {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  async function submit(event:FormEvent){event.preventDefault();setLoading(true);setError("");const response=await fetch("/api/admin/login",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})}).catch(()=>null);if(!response?.ok){setError("E-mail, senha ou permissão inválidos.");setLoading(false);return}await onAuthenticated();setLoading(false)}
  return <section className="admin-login-wrap"><div className="admin-login-copy"><span className="eyebrow">Acesso restrito</span><h1>Gestão da Pesquisa de Clima</h1><p>Entre com sua conta administrativa. Cada organização acessa somente os próprios ciclos e resultados agregados.</p><ul className="trust-list"><li><span>✓</span>Perfis e permissões por organização</li><li><span>✓</span>Resultados protegidos por grupo mínimo</li><li><span>✓</span>Acesso e alterações auditáveis</li></ul></div><form className="surface admin-login-card" onSubmit={submit}><span className="lock">●</span><h2>Entrar na gestão</h2><label htmlFor="admin-email">E-mail</label><input id="admin-email" type="email" value={email} onChange={(event)=>setEmail(event.target.value)} autoComplete="email" required/><label htmlFor="admin-password">Senha</label><input id="admin-password" type="password" value={password} onChange={(event)=>setPassword(event.target.value)} autoComplete="current-password" required minLength={8}/>{error&&<span className="error" role="alert">{error}</span>}<button className="primary full" disabled={loading}>{loading?"Entrando...":"Entrar"}</button></form></section>;
}

function AdminAccessDenied({onLogout}:{onLogout:()=>void}){return <section className="admin-login-wrap"><div className="surface admin-login-card"><h1>Acesso ainda não autorizado</h1><p>A conta existe, mas ainda não foi vinculada à SUSTENCE ou a uma organização cliente.</p><button className="secondary" onClick={onLogout}>Sair e usar outra conta</button></div></section>}
function ActivateAdmin({accessToken,onActivated}:{accessToken:string;onActivated:()=>void}){const [password,setPassword]=useState("");const [confirmation,setConfirmation]=useState("");const [error,setError]=useState("");const [loading,setLoading]=useState(false);async function activate(event:FormEvent){event.preventDefault();if(password!==confirmation){setError("As senhas não coincidem.");return}setLoading(true);setError("");const response=await fetch("/api/admin/activate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accessToken,password})}).catch(()=>null);if(!response?.ok){setError("O convite expirou ou a senha não atende aos requisitos.");setLoading(false);return}onActivated()}return <section className="admin-login-wrap"><div className="admin-login-copy"><span className="eyebrow">Ativação segura</span><h1>Defina sua senha administrativa</h1><p>A conta será usada para administrar todas as organizações da plataforma SUSTENCE.</p></div><form className="surface admin-login-card" onSubmit={activate}><h2>Ativar conta</h2><label htmlFor="new-password">Nova senha</label><input id="new-password" type="password" value={password} onChange={e=>setPassword(e.target.value)} minLength={10} required autoComplete="new-password"/><span className="field-help">Use pelo menos 10 caracteres, incluindo letras e números.</span><label htmlFor="confirm-password">Confirmar senha</label><input id="confirm-password" type="password" value={confirmation} onChange={e=>setConfirmation(e.target.value)} minLength={10} required autoComplete="new-password"/>{error&&<span className="error" role="alert">{error}</span>}<button className="primary full" disabled={loading}>{loading?"Ativando...":"Definir senha e ativar"}</button></form></section>}
function AdminMetric({label,value,detail}:{label:string;value:string;detail:string}){return <article className="surface metric"><span>{label}</span><strong>{value}</strong><small>{detail}</small></article>}
