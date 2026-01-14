import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET: 個別取得
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const diagram = await prisma.diagram.findUnique({
      where: { id },
    });

    if (!diagram) {
      return NextResponse.json(
        { error: "Diagram not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Failed to fetch diagram:", error);
    return NextResponse.json(
      { error: "Failed to fetch diagram" },
      { status: 500 }
    );
  }
}

// PUT: 更新
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { title, description, xml, tags } = body;

    const existing = await prisma.diagram.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Diagram not found" },
        { status: 404 }
      );
    }

    const diagram = await prisma.diagram.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description !== undefined ? description : existing.description,
        xml: xml ?? existing.xml,
        tags: tags !== undefined ? tags : existing.tags,
        version: existing.version + 1,
      },
    });

    return NextResponse.json(diagram);
  } catch (error) {
    console.error("Failed to update diagram:", error);
    return NextResponse.json(
      { error: "Failed to update diagram" },
      { status: 500 }
    );
  }
}

// DELETE: 削除
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const existing = await prisma.diagram.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Diagram not found" },
        { status: 404 }
      );
    }

    await prisma.diagram.delete({
      where: { id },
    });

    return NextResponse.json({ message: "Diagram deleted successfully" });
  } catch (error) {
    console.error("Failed to delete diagram:", error);
    return NextResponse.json(
      { error: "Failed to delete diagram" },
      { status: 500 }
    );
  }
}
