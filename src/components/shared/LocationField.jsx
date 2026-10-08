import { LOCATION_PRESETS } from "../../constants";

export function LocationField({ value, onChange, placeholder = "lub wpisz inne miejsce" }) {
  const selectedPreset = LOCATION_PRESETS.includes(value) ? value : "";
  const customValue = value && !selectedPreset ? value : "";

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <select value={selectedPreset} onChange={(event) => onChange(event.target.value)}>
        <option value="">— wybierz z listy —</option>
        {LOCATION_PRESETS.map((location) => (
          <option key={location} value={location}>{location}</option>
        ))}
      </select>
      <input
        type="text"
        value={customValue}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
