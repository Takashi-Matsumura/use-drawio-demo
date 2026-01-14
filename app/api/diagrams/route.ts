import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// GET: 一覧取得
export async function GET() {
  try {
    const diagrams = await prisma.diagram.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        description: true,
        tags: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return NextResponse.json(diagrams);
  } catch (error) {
    console.error("Failed to fetch diagrams:", error);
    return NextResponse.json(
      { error: "Failed to fetch diagrams" },
      { status: 500 }
    );
  }
}

// POST: 新規作成
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, xml, tags } = body;

    if (!title || !xml) {
      return NextResponse.json(
        { error: "Title and xml are required" },
        { status: 400 }
      );
    }

    const diagram = await prisma.diagram.create({
      data: {
        title,
        description: description || null,
        xml,
        tags: tags || null,
      },
    });

    return NextResponse.json(diagram, { status: 201 });
  } catch (error) {
    console.error("Failed to create diagram:", error);
    return NextResponse.json(
      { error: "Failed to create diagram" },
      { status: 500 }
    );
  }
}
