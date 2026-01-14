/**
 * XMLをdraw.io形式のmxfileにラップする
 * 既にmxfile形式の場合はそのまま返す
 */
export function wrapWithMxFile(xml: string): string {
  // 既にmxfile形式の場合はそのまま返す
  if (xml.trim().startsWith('<mxfile')) {
    return xml;
  }

  const diagramId = `diagram-${Date.now()}`;

  return `<mxfile>
  <diagram id="${diagramId}" name="Page-1">
    <mxGraphModel dx="0" dy="0" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="850" pageHeight="1100">
      <root>
        <mxCell id="0" />
        <mxCell id="1" parent="0" />
        ${xml}
      </root>
    </mxGraphModel>
  </diagram>
</mxfile>`;
}

/**
 * mxfile形式のXMLから内部のmxCellコンテンツを抽出する
 * APIに送信する際に使用
 */
export function extractMxCellContent(xml: string): string {
  if (!xml) return "";

  // mxfile形式でない場合はそのまま返す
  if (!xml.trim().startsWith('<mxfile')) {
    return xml;
  }

  // <root>...</root>の内容を抽出
  const rootMatch = xml.match(/<root>([\s\S]*)<\/root>/);
  if (!rootMatch) return xml;

  const rootContent = rootMatch[1];

  // 全てのmxCellを抽出（自己終了タグと子要素を持つものの両方に対応）
  const cellMatches: string[] = [];
  const regex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match;

  while ((match = regex.exec(rootContent)) !== null) {
    const cell = match[0];
    // id="0" または id="1"（値なし）のルートセルは除外
    if (cell.match(/id=["']0["']/)) continue;
    if (cell.match(/id=["']1["']/) && !cell.includes('value=')) continue;
    cellMatches.push(cell);
  }

  return cellMatches.join('\n') || xml;
}

/**
 * ユニークなセッションIDを生成する
 */
export function generateSessionId(): string {
  return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * edit_diagram操作を既存のXMLに適用する
 */
interface EditOperation {
  operation: "add" | "update" | "delete";
  cell_id: string;
  new_xml?: string;
}

/**
 * XML文字列のエッジ参照を検証・修正する
 * display_diagramとedit_diagramの両方の結果に適用可能
 */
export function validateAndFixEdgeReferences(xml: string): string {
  if (!xml) return xml;

  // セルを抽出
  const cells: string[] = [];
  const regex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match;

  while ((match = regex.exec(xml)) !== null) {
    cells.push(match[0]);
  }

  if (cells.length === 0) return xml;

  // 有効なIDを収集
  const validIds = extractCellIds(cells);

  // 無効な参照を修正
  const fixedCells = fixInvalidEdgeReferences(cells, validIds);

  return fixedCells.join('\n');
}

/**
 * XMLから全てのセルIDを抽出する
 */
function extractCellIds(cells: string[]): Set<string> {
  const ids = new Set<string>();
  // ルートセルのIDも追加（親参照用）
  ids.add("0");
  ids.add("1");

  for (const cell of cells) {
    const idMatch = cell.match(/id=["']([^"']+)["']/);
    if (idMatch) {
      ids.add(idMatch[1]);
    }
  }
  return ids;
}

/**
 * 無効なエッジ参照（source/target）を削除する
 */
function fixInvalidEdgeReferences(cells: string[], validIds: Set<string>): string[] {
  return cells.map(cell => {
    // エッジでない場合はそのまま返す
    if (!cell.includes('edge="1"') && !cell.includes("edge='1'")) {
      return cell;
    }

    let fixedCell = cell;

    // source属性をチェック
    const sourceMatch = cell.match(/source=["']([^"']+)["']/);
    if (sourceMatch && !validIds.has(sourceMatch[1])) {
      fixedCell = fixedCell.replace(/\s*source=["'][^"']+["']/, '');
    }

    // target属性をチェック
    const targetMatch = cell.match(/target=["']([^"']+)["']/);
    if (targetMatch && !validIds.has(targetMatch[1])) {
      fixedCell = fixedCell.replace(/\s*target=["'][^"']+["']/, '');
    }

    return fixedCell;
  });
}

export function applyEditOperations(existingXml: string, operations: EditOperation[]): string {
  // 既存のセルをリストとして管理
  const cells: string[] = [];
  const regex = /<mxCell[^>]*(?:\/>|>[\s\S]*?<\/mxCell>)/g;
  let match;

  while ((match = regex.exec(existingXml)) !== null) {
    cells.push(match[0]);
  }

  for (const op of operations) {
    switch (op.operation) {
      case "add":
        if (op.new_xml) {
          cells.push(op.new_xml);
        }
        break;

      case "update":
        if (op.new_xml) {
          const index = cells.findIndex(c => c.includes(`id="${op.cell_id}"`) || c.includes(`id='${op.cell_id}'`));
          if (index !== -1) {
            cells[index] = op.new_xml;
          }
        }
        break;

      case "delete":
        const deleteIndex = cells.findIndex(c => c.includes(`id="${op.cell_id}"`) || c.includes(`id='${op.cell_id}'`));
        if (deleteIndex !== -1) {
          cells.splice(deleteIndex, 1);
        }
        break;
    }
  }

  // 有効なセルIDを収集し、無効なエッジ参照を修正
  const validIds = extractCellIds(cells);
  const fixedCells = fixInvalidEdgeReferences(cells, validIds);

  return fixedCells.join('\n');
}

/**
 * ストリームレスポンスからdisplay_diagram/edit_diagramツール呼び出しを検出してXMLを抽出する
 */
export async function* parseStreamResponse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  currentXml?: string
): AsyncGenerator<{ type: string; xml?: string; operations?: EditOperation[]; error?: string }> {
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    buffer += chunk;
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.trim()) continue;

      // SSE形式の "data: " プレフィックスを除去
      let jsonStr = line;
      if (line.startsWith("data: ")) {
        jsonStr = line.slice(6);
      }

      // [DONE] は終了シグナル
      if (jsonStr === "[DONE]") {
        continue;
      }

      try {
        const parsed = JSON.parse(jsonStr);

        // display_diagramツールを検出
        if (
          (parsed.type === "tool-call" || parsed.type === "tool-input-available") &&
          parsed.toolName === "display_diagram"
        ) {
          const xml = parsed.input?.xml;
          if (xml) {
            const validatedXml = validateAndFixEdgeReferences(xml);
            yield { type: "diagram", xml: validatedXml };
          }
        }

        // edit_diagramツールを検出
        if (
          (parsed.type === "tool-call" || parsed.type === "tool-input-available") &&
          parsed.toolName === "edit_diagram"
        ) {
          const operations = parsed.input?.operations as EditOperation[] | undefined;

          if (operations && operations.length > 0 && currentXml) {
            const updatedXml = applyEditOperations(currentXml, operations);
            yield { type: "diagram", xml: updatedXml, operations };
          } else if (operations && operations.length > 0) {
            yield { type: "edit", operations };
          }
        }

        // エラーハンドリング
        if (parsed.type === "error") {
          yield { type: "error", error: parsed.errorText || parsed.message || "Unknown error" };
        }
      } catch {
        // JSONパースに失敗した行はスキップ
        continue;
      }
    }
  }

  // 残りのバッファを処理
  if (buffer.trim()) {
    let jsonStr = buffer;
    if (buffer.startsWith("data: ")) {
      jsonStr = buffer.slice(6);
    }
    try {
      const parsed = JSON.parse(jsonStr);
      if (
        (parsed.type === "tool-call" || parsed.type === "tool-input-available") &&
        parsed.toolName === "display_diagram"
      ) {
        const xml = parsed.input?.xml;
        if (xml) {
          const validatedXml = validateAndFixEdgeReferences(xml);
          yield { type: "diagram", xml: validatedXml };
        }
      }
    } catch {
      // 無視
    }
  }
}
