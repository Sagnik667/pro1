"use client";

import { useEffect, useRef } from "react";

export default function Page() {
  const containerRef = useRef(null);

  useEffect(() => {
    // Inject HTML
    fetch("/embed/index.html")
      .then(res => res.text())
      .then(html => {
        containerRef.current.innerHTML = html;

        // Inject script AFTER HTML exists
        const script = document.createElement("script");
        script.src = "/embed/script.js";
        script.defer = true;
        document.body.appendChild(script);
      });
  }, []);

  return <div ref={containerRef} />;
}
