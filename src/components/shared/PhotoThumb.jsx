import { Camera } from "lucide-react";
import { resizeImageToDataUrl } from "../../utils/helpers";

export function PhotoThumb({ plantId, photos, setPhotos, onError, size = 46 }) {
  const src = photos[plantId];
  async function handleFile(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setPhotos((prev) => ({ ...prev, [plantId]: dataUrl }));
    } catch (err) {
      onError && onError();
    }
  }
  return (
    <label className="photo-thumb" style={{ width: size, height: size }}
      onClick={(e) => e.stopPropagation()} aria-label="Dodaj zdjęcie">
      {src ? <img src={src} alt="" /> : <Camera size={16} />}
      <input type="file" accept="image/*" capture="environment" onChange={handleFile} className="visually-hidden-input" />
    </label>
  );
}
