import { callAdminRpc } from "@/lib/admin-auth";

export async function GET(request:Request) {
  const organizationId=new URL(request.url).searchParams.get("organizationId");
  if(!organizationId) return Response.json({error:"organization_required"},{status:400});
  try{return Response.json(await callAdminRpc("admin_list_cycles",{p_organization_id:organizationId}));}
  catch(error){const reason=error instanceof Error?error.message:"unknown";return Response.json({error:reason},{status:reason==="authentication_required"?401:reason==="access_denied"?403:503});}
}

export async function POST(request:Request){
  const body=await request.json().catch(()=>null);
  const fields={organizationId:body?.organizationId,slug:body?.slug,title:body?.title,privacyNoticeVersion:body?.privacyNoticeVersion,legalBasisCode:body?.legalBasisCode};
  if(Object.values(fields).some(value=>typeof value!=="string"||!value.trim())) return Response.json({error:"invalid_cycle"},{status:400});
  try{const id=await callAdminRpc<string>("admin_create_cycle",{p_organization_id:fields.organizationId,p_slug:fields.slug,p_title:fields.title,p_privacy_notice_version:fields.privacyNoticeVersion,p_legal_basis_code:fields.legalBasisCode});return Response.json({id},{status:201});}
  catch(error){const reason=error instanceof Error?error.message:"unknown";return Response.json({error:reason},{status:reason==="authentication_required"?401:reason==="access_denied"?403:409});}
}
