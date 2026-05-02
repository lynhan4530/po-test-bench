import { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({ startOnLoad: false, theme: 'dark', darkMode: true });

let idCounter = 0;

export default function MermaidDiagram({ code }: { code: string }) {
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState(false);
  const id = useRef(`mermaid-${++idCounter}`);

  useEffect(() => {
    setError(false);
    mermaid.render(id.current, code.trim())
      .then(({ svg: rendered }) => setSvg(rendered))
      .catch(() => setError(true));
  }, [code]);

  if (error) return null;

  return (
    <div
      className="my-4 bg-gray-800/60 rounded-lg p-4 flex justify-center overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
