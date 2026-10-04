import { forwardEditorial } from "@/lib/editorial-server";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ path: string[] }> };
async function handler(request: Request, { params }: Context) {
  return forwardEditorial(request, (await params).path);
}
export { handler as GET, handler as POST, handler as PATCH, handler as PUT };
