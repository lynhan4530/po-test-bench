interface TypingIndicatorProps {
  persona: 'developer' | 'qa';
}

export default function TypingIndicator({ persona }: TypingIndicatorProps) {
  const name = persona === 'developer' ? 'Alex' : 'Jordan';
  return (
    <div className="flex items-center gap-1.5 text-gray-400 text-sm px-1 py-1">
      <span>{name} is typing</span>
      <span className="flex gap-0.5">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-gray-500 animate-bounce" />
      </span>
    </div>
  );
}
