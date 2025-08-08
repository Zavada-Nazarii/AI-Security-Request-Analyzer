import { NextResponse } from "next/server"
import { deleteAnalysis } from "@/lib/db"

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const id = Number(params.id)
  if (!Number.isFinite(id) || id <= 0) return new NextResponse("Invalid id", { status: 400 })
  try {
    const ok = await deleteAnalysis(id)
    if (!ok) return new NextResponse("Not found", { status: 404 })
    return new NextResponse(null, { status: 204 })
  } catch (e: any) {
    console.error("DELETE /api/reports/:id error:", e)
    return new NextResponse("Failed to delete", { status: 500 })
  }
}
