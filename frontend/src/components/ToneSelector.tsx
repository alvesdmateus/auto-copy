const TONES = [
  { value: 'professional', label: 'Professional', description: 'Formal, business-appropriate' },
  { value: 'casual', label: 'Casual/Friendly', description: 'Approachable and relatable' },
  { value: 'persuasive', label: 'Persuasive/Sales', description: 'Encourages action' },
  { value: 'informative', label: 'Informative', description: 'Educational and clear' },
  { value: 'urgent', label: 'Urgent/FOMO', description: 'Creates immediate action' },
  { value: 'inspirational', label: 'Inspirational', description: 'Uplifting and motivational' },
];

interface ToneSelectorProps {
  selectedTone: string | null;
  onSelect: (tone: string | null) => void;
}

export function ToneSelector({ selectedTone, onSelect }: ToneSelectorProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
        Tone/Style
      </label>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {TONES.map((tone) => (
          <button
            key={tone.value}
            type="button"
            onClick={() =>
              onSelect(selectedTone === tone.value ? null : tone.value)
            }
            className={`p-3 text-left rounded-lg border transition-colors ${
              selectedTone === tone.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <div className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {tone.label}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {tone.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
