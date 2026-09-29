"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import questionsData from "@/data/questions.json";
import AdminArea from "@/app/admin-area";

type SurveyStep = "access" | "privacy" | "instructions" | "question" | "review" | "done";
type Area = "respondent" | "admin";
type AnswerMap = Record<string, string>;
type Question = { code:string; block:string; origin:string; text:string; dimension:string; subdimension:string; indicator:string; type:"Likert 5 pontos"|"Escala 0–10"|"Lista única"|"Texto longo"; options:string; required:boolean; acceptsNA:boolean; sensitive:boolean; version:string };

const questions = questionsData as Question[];
const likertOptions = ["Nunca é verdade","Na maioria das vezes não é verdade","Às vezes é verdade, às vezes não","Na maioria das vezes é verdade","Sempre é verdade"];
const sectionLabels:Record<string,string> = {"Clima Organizacional":"Clima organizacional","Módulo Complementar":"Módulos complementares","Perfil/Demografia":"Perfil e demografia","Perfil Socioeconômico":"Perfil socioeconômico","Questões Abertas":"Questões abertas"};
function formatAccessCode(value:string){
  const characters=value.toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,18);
  return characters.match(/.{1,4}/g)?.join("-")??"";
}

export default function Home(){
  const [area,setArea]=useState<Area>("respondent");
  const [step,setStep]=useState<SurveyStep>("access");
  const [code,setCode]=useState("");
  const [error,setError]=useState("");
  const [loading,setLoading]=useState(false);
  const [privacyNoticeVersion,setPrivacyNoticeVersion]=useState("1.0");
  const [currentIndex,setCurrentIndex]=useState(0);
  const [answers,setAnswers]=useState<AnswerMap>({});
  useEffect(()=>{
    if(window.location.hash.includes("type=invite")){setArea("admin");return}
    if(new URLSearchParams(window.location.search).get("preview")==="question"){
      setArea("respondent");
      setCurrentIndex(0);
      setStep("question");
    }
  },[]);
  const currentQuestion=questions[currentIndex];
  const progress=step==="question"?Math.round(5+((currentIndex+1)/questions.length)*90):({access:0,privacy:2,instructions:5,review:97,done:100} as Record<SurveyStep,number>)[step];
  const currentAnswer=currentQuestion?answers[currentQuestion.code]??"":"";
  const sectionSummary=useMemo(()=>Object.entries(sectionLabels).map(([block,label])=>{const items=questions.filter(q=>q.block===block);return{block,label,answered:items.filter(q=>Boolean(answers[q.code])).length,total:items.length,requiredMissing:items.filter(q=>q.required&&!answers[q.code]).length}}),[answers]);

  async function validateCode(event:FormEvent){event.preventDefault();const normalized=formatAccessCode(code);if(!/^PESQ-\d{4}-[A-Z0-9]{5}$/.test(normalized)){setError("Confira o código. Use 12 letras ou números.");return}setLoading(true);setError("");try{const response=await fetch("/api/survey/validate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accessCode:normalized})});const result=await response.json();if(!response.ok){setError(result.error==="invalid_or_used_code"?"Código inválido, expirado ou já utilizado.":"Não foi possível validar o código agora. Tente novamente.");return}setCode(normalized);setPrivacyNoticeVersion(result.privacyNoticeVersion??"1.0");setStep("privacy")}catch{setError("Não foi possível conectar ao serviço da pesquisa.")}finally{setLoading(false)}}
  function updateAnswer(value:string){setAnswers(previous=>({...previous,[currentQuestion.code]:value}))}
  function nextQuestion(){if(currentQuestion.required&&!currentAnswer)return;if(currentIndex<questions.length-1)setCurrentIndex(index=>index+1);else setStep("review")}
  function previousQuestion(){if(currentIndex>0)setCurrentIndex(index=>index-1);else setStep("instructions")}
  function resetSurvey(){setStep("access");setCode("");setCurrentIndex(0);setAnswers({})}
  async function submitSurvey(){setLoading(true);setError("");try{const response=await fetch("/api/survey/submit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({accessCode:code,privacyNoticeVersion,answers})});const result=await response.json();if(!response.ok){setError(result.error==="required_answer_missing"?`A pergunta ${result.code} ainda precisa ser respondida.`:"Não foi possível enviar as respostas. O código pode já ter sido utilizado.");return}setStep("done")}catch{setError("Não foi possível conectar ao serviço da pesquisa.")}finally{setLoading(false)}}

  return <main className="app-shell">
    <header className="topbar"><button className="brand" onClick={()=>setArea("respondent")} aria-label="Ir para a pesquisa"><span className="brand-mark" aria-hidden="true">S</span><span><strong>SUSTENCE</strong><small>Pesquisa de Clima</small></span></button><div className="area-switch" aria-label="Área da plataforma"><button className={area==="respondent"?"active":""} onClick={()=>setArea("respondent")}>Respondente</button><button className={area==="admin"?"active":""} onClick={()=>setArea("admin")}>Área de gestão</button></div></header>
    {area==="respondent"?<section className="respondent-area">
      {step!=="access"&&<Progress value={progress} label={step==="question"?`${sectionLabels[currentQuestion.block]} · ${currentIndex+1} de ${questions.length}`:"Progresso da pesquisa"}/>} 
      {step==="access"&&<AccessScreen code={code} error={error} loading={loading} onCode={setCode} onSubmit={validateCode}/>} 
      {step==="privacy"&&<section className="surface content-card"><span className="eyebrow">Antes de começar</span><h1>Privacidade e participação</h1><p>A pesquisa leva aproximadamente 20 minutos. Sua participação é voluntária. Os dados são tratados conforme o aviso de privacidade deste ciclo.</p><div className="info-grid"><article><strong>Anonimato forte</strong><span>Não coletamos nome, e-mail, matrícula ou outro identificador pessoal.</span></article><article><strong>Resultados protegidos</strong><span>Grupos com menos de 5 respostas são ocultados; recortes sensíveis exigem ao menos 10.</span></article><article><strong>Envio definitivo</strong><span>Após o envio, a resposta não poderá ser localizada ou alterada individualmente.</span></article></div><div className="privacy-contact"><strong>Informações do ciclo</strong><span>Controlador, finalidade, base legal e contato de privacidade serão configurados pela organização antes da publicação.</span></div><div className="actions"><button className="secondary" onClick={()=>setStep("access")}>Voltar</button><button className="primary" onClick={()=>setStep("instructions")}>Li e quero continuar</button></div></section>}
      {step==="instructions"&&<section className="surface content-card"><span className="eyebrow">Como responder</span><h1>Instruções da pesquisa</h1><p>Nas afirmativas, indique com que frequência cada frase representa sua experiência na organização.</p><div className="instruction-scale">{likertOptions.map((option,index)=><div key={option}><strong>{index+1}</strong><span>{option}</span></div>)}</div><div className="final-warning"><strong>Perguntas sensíveis e abertas</strong><span>Dados demográficos e socioeconômicos são opcionais quando indicado. Nas respostas abertas, não inclua nomes nem detalhes que identifiquem pessoas.</span></div><div className="actions"><button className="secondary" onClick={()=>setStep("privacy")}>Voltar</button><button className="primary" onClick={()=>setStep("question")}>Iniciar questionário</button></div></section>}
      {step==="question"&&<QuestionScreen question={currentQuestion} answer={currentAnswer} currentIndex={currentIndex} total={questions.length} onAnswer={updateAnswer} onBack={previousQuestion} onNext={nextQuestion}/>} 
      {step==="review"&&<section className="surface content-card"><span className="eyebrow">Revisão final</span><h1>{sectionSummary.some(s=>s.requiredMissing)?"Ainda há itens obrigatórios":"Tudo pronto para enviar"}</h1><p>Confira a conclusão de cada seção. Perguntas opcionais não impedem o envio.</p><div className="review-list">{sectionSummary.map(section=><button type="button" key={section.block} onClick={()=>{const missing=questions.findIndex(q=>q.block===section.block&&q.required&&!answers[q.code]);setCurrentIndex(missing>=0?missing:questions.findIndex(q=>q.block===section.block));setStep("question")}}><span>{section.label}<small>{section.answered} de {section.total} respondidas</small></span><strong className={section.requiredMissing?"pending":""}>{section.requiredMissing?`${section.requiredMissing} obrigatórias`:"Concluído"}</strong></button>)}</div><div className="final-warning"><strong>Envio anônimo e definitivo</strong><span>Depois do envio, não será possível localizar sua resposta individualmente nem associá-la ao código.</span></div>{error&&<p className="error" role="alert">{error}</p>}<div className="actions"><button className="secondary" onClick={()=>{setCurrentIndex(questions.length-1);setStep("question")}}>Revisar</button><button className="primary" disabled={loading||sectionSummary.some(s=>s.requiredMissing)} onClick={submitSurvey}>{loading?"Enviando...":"Enviar respostas"}</button></div></section>}
      {step==="done"&&<section className="surface content-card done-card"><span className="success-mark" aria-hidden="true">✓</span><h1>Obrigado por participar</h1><p>Suas respostas foram enviadas anonimamente. Este código não pode mais ser utilizado.</p><button className="secondary" onClick={resetSurvey}>Voltar ao início</button></section>}
    </section>:<AdminDashboard/>}
  </main>
}

function AccessScreen({code,error,loading,onCode,onSubmit}:{code:string;error:string;loading:boolean;onCode:(value:string)=>void;onSubmit:(event:FormEvent)=>void}){return <section className="access-layout"><div className="welcome-copy"><span className="eyebrow">Sua voz contribui para a mudança</span><h1>Pesquisa de Clima Organizacional e Socioeconômica</h1><p>Um espaço seguro para compartilhar sua experiência. As respostas são anônimas e analisadas somente de forma agregada.</p><ul className="trust-list"><li><span aria-hidden="true">✓</span> 135 perguntas organizadas em cinco blocos</li><li><span aria-hidden="true">✓</span> O código não fica ligado às respostas</li><li><span aria-hidden="true">✓</span> Grupos pequenos não são exibidos</li></ul></div><form className="surface access-card" onSubmit={onSubmit} noValidate><span className="lock" aria-hidden="true">●</span><h2>Acesse a pesquisa</h2><p>Digite o código anônimo de uso único que você recebeu.</p><label htmlFor="access-code">Código de participação</label><input id="access-code" value={code} onChange={event=>onCode(formatAccessCode(event.target.value))} placeholder="PESQ-2026-XXXXX" autoComplete="off" inputMode="text" maxLength={18} aria-describedby={error?"code-error":"code-help"}/>{error?<span id="code-error" className="error" role="alert">{error}</span>:<span id="code-help" className="field-help">Os hífens são inseridos automaticamente.</span>}<button className="primary full" type="submit" disabled={loading}>{loading?"Validando...":"Começar pesquisa"}</button><div className="privacy-note"><span aria-hidden="true">◈</span><span>O código confirma uma participação, mas nunca é salvo junto ao conteúdo respondido.</span></div></form></section>}

function QuestionScreen({question,answer,currentIndex,total,onAnswer,onBack,onNext}:{question:Question;answer:string;currentIndex:number;total:number;onAnswer:(value:string)=>void;onBack:()=>void;onNext:()=>void}){
  const options=question.type==="Likert 5 pontos"?[...likertOptions]:question.type==="Escala 0–10"?Array.from({length:11},(_,index)=>String(index)):question.options.split(";").map(option=>option.trim()).filter(Boolean);
  if(question.sensitive&&!options.some(option=>/prefiro|não quero declarar/i.test(option)))options.push("Prefiro não responder");
  const canContinue=Boolean(answer)||!question.required;
  return <section className="surface content-card question-card"><div className="question-meta"><span className="eyebrow">{sectionLabels[question.block]} · {question.code}</span><span>{currentIndex+1}/{total}</span></div><h1>{question.text}</h1><p>{question.type==="Texto longo"?"Escreva até 2.000 caracteres. Evite nomes ou informações que identifiquem pessoas.":question.required?"Escolha uma alternativa para continuar.":"Esta pergunta é opcional."}</p>{question.type==="Texto longo"?<><label className="sr-only" htmlFor={`answer-${question.code}`}>Sua resposta</label><textarea id={`answer-${question.code}`} className="long-answer" value={answer} maxLength={2000} onChange={event=>onAnswer(event.target.value)} placeholder="Digite sua resposta aqui..."/><div className="character-count">{answer.length}/2.000</div></>:<div className={question.type==="Escala 0–10"?"number-scale":"answer-list"} role="radiogroup" aria-label="Opções de resposta">{options.map((option,index)=><button key={`${question.code}-${option}`} type="button" role="radio" aria-checked={answer===option} className={answer===option?"selected":""} onClick={()=>onAnswer(option)}><span>{question.type==="Likert 5 pontos"?index+1:question.type==="Escala 0–10"?option:""}</span>{question.type==="Escala 0–10"?null:option}</button>)}</div>}{question.acceptsNA&&question.type==="Likert 5 pontos"&&<button type="button" className={`na-option ${answer==="Não se aplica"?"selected":""}`} onClick={()=>onAnswer("Não se aplica")}>Não se aplica</button>}<div className="actions"><button className="secondary" onClick={onBack}>Voltar</button><button className="primary" disabled={!canContinue} onClick={onNext}>{currentIndex===total-1?"Revisar respostas":question.required||answer?"Continuar":"Pular pergunta"}</button></div>{question.sensitive&&<div className="privacy-note"><span aria-hidden="true">◈</span><span>Esta informação é sensível, opcional e será exibida somente em resultados agregados com proteção reforçada.</span></div>}</section>
}

function Progress({value,label}:{value:number;label:string}){return <div className="progress-wrap"><div className="progress-label"><span>{label}</span><span>{value}%</span></div><div className="progress-track" role="progressbar" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{width:`${value}%`}}/></div></div>}
function AdminDashboard(){return <AdminArea/>}
