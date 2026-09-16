import { callAdminRpc } from "@/lib/admin-auth";

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  const action=typeof body?.action==="string"?body.action:"";
  const cycleId=typeof body?.cycleId==="string"?body.cycleId:"";
  if(!cycleId) return Response.json({error:"cycle_required"},{status:400});
  try{
    if(action==="apply_template"){
      const questionCount=await callAdminRpc<number>("admin_apply_questionnaire_template",{p_cycle_id:cycleId});
      return Response.json({questionCount});
    }
    if(action==="generate_codes"){
      const quantity=Number(body?.quantity);
      if(!Number.isInteger(quantity)||quantity<1||quantity>5000) return Response.json({error:"invalid_quantity"},{status:400});
      return Response.json(await callAdminRpc("admin_generate_access_codes",{p_cycle_id:cycleId,p_quantity:quantity}));
    }
    if(action==="change_status"){
      const status=typeof body?.status==="string"?body.status:"";
      if(!["scheduled","open","closed","archived"].includes(status)) return Response.json({error:"invalid_status"},{status:400});
      return Response.json({status:await callAdminRpc<string>("admin_change_cycle_status",{p_cycle_id:cycleId,p_new_status:status})});
    }
    return Response.json({error:"invalid_action"},{status:400});
  }catch(error){const reason=error instanceof Error?error.message:"unknown";return Response.json({error:reason},{status:reason==="authentication_required"?401:reason==="access_denied"?403:409});}
}
