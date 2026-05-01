interface DocumentModalProps {
  docType: string;
  content: string;
  onClose: () => void;
}

export default function DocumentModal({ docType, content, onClose }: DocumentModalProps) {
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg w-full max-w-2xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-700">
          <h2 className="text-base font-semibold capitalize text-white">{docType}</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 text-sm text-gray-200 whitespace-pre-wrap font-mono leading-relaxed">
          {content}
        </div>
      </div>
    </div>
  );
}
