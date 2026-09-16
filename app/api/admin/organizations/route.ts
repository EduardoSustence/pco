import { callAdminRpc } from "@/lib/admin-auth";

export async function GET() {
  try { return Response.json(await callAdminRpc("admin_list_organizations", {})); }
  catch (error) { const reason=error instanceof Error?error.message:"unknown"; return Response.json({error:reason},{status:reason==="authentication_required"?401:reason==="access_denied"?403:503}); }
}

export async function POST(request:Request) {
  const body=await request.json().catch(()=>null);
  const name=typeof body?.name==="string"?body.name.trim():"";
  const minimum=Number(body?.defaultMinGroupSize??5);
  if(name.length<2||name.length>120||!Number.isInteger(minimum)||minimum<3) return Response.json({error:"invalid_organization"},{status:400});
  try { const id=await callAdminRpc<string>("admin_create_organization",{p_name:name,p_default_min_group_size:minimum}); return Response.json({id},{status:201}); }
  catch(error){const reason=error instanceof Error?error.message:"unknown";return Response.json({error:reason},{status:reason==="authentication_required"?401:reason==="access_denied"?403:409});}
}
