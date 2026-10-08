import { useEffect, useState } from "react";

function displayValue(value) {
  return value === "" || value == null || Number(value) === 0 ? "" : String(value);
}

export function NumberInput({ value, onChange, onBlur, onFocus, ...props }) {
  const [draft, setDraft] = useState(() => displayValue(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(displayValue(value));
  }, [focused, value]);

  function handleBlur(event) {
    setFocused(false);
    setDraft(displayValue(value));
    if (onBlur) onBlur(event);
  }

  return (
    <input
      type="number"
      {...props}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        if (onFocus) onFocus(event);
      }}
      onChange={(event) => {
        setDraft(event.target.value);
        if (onChange) onChange(event);
      }}
      onBlur={handleBlur}
    />
  );
}
