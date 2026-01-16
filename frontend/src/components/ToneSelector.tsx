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
      <label className="block text-sm font-medium text-gray-700 mb-2">
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
                ? 'border-blue-500 bg-blue-50 text-blue-700'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            <div className="font-medium text-sm">{tone.label}</div>
            <div className="text-xs text-gray-500">{tone.description}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
