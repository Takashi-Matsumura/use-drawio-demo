"use client";

import { useEffect, useRef } from "react";

export default function TestPage() {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== "https://embed.diagrams.net") return;

      try {
        const data = JSON.parse(event.data);
        console.log("Message from draw.io:", data);

        // initイベントを受信したら、空のXMLをロード
        if (data.event === "init") {
          console.log("Draw.io initialized, sending load action");
          iframeRef.current?.contentWindow?.postMessage(
            JSON.stringify({
              action: "load",
              xml: "",
              autosave: false,
            }),
            "*"
          );
        }
      } catch (e) {
        // JSON以外のメッセージは無視
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);

  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <iframe
        ref={iframeRef}
        src="https://embed.diagrams.net/?embed=1&proto=json&ui=kennedy&spin=1&libraries=1"
        style={{
          width: "100%",
          height: "100%",
          border: "none",
        }}
        allow="clipboard-read; clipboard-write"
        title="Draw.io Test"
      />
    </div>
  );
}
