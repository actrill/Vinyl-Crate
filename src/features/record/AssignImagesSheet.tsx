import { X } from 'lucide-react';
import { motion } from 'framer-motion';
import { useState } from 'react';
import { updateLocal, type ImageRole } from '../../db/db';
import { roleOfImage, type RecordView } from '../../db/records';
import { Cover } from '../../ui/Cover';

const ROLES: Array<{ role: ImageRole; label: string }> = [
  { role: 'front', label: 'Front' }, { role: 'back', label: 'Back' }, { role: 'labelA', label: 'Label A' }, { role: 'labelB', label: 'Label B' }, { role: 'other', label: 'Other' },
];

/** Tag each Discogs image as front, back or label. Saved on this phone only. */
export function AssignImagesSheet({ r, onClose }: { r: RecordView; onClose: () => void }) {
  const images = r.release?.images ?? [];
  const [roles, setRoles] = useState<Record<number, ImageRole>>(() =>
    Object.fromEntries(images.map((_, i) => [i, roleOfImage(r.release, r.local, i)])));

  function set(i: number, role: ImageRole) {
    const next = { ...roles };
    // Front, back and labels are unique: assigning one moves it.
    if (role !== 'other') for (const k of Object.keys(next)) if (next[Number(k)] === role) next[Number(k)] = 'other';
    next[i] = role;
    setRoles(next);
    void updateLocal(r.releaseId, { imageRoles: next });
  }

  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose}>
      <motion.div className="assign-sheet" role="dialog" aria-modal="true" aria-labelledby="assign-title"
        initial={{ y: 40 }} animate={{ y: 0 }} onClick={(e) => e.stopPropagation()}>
        <header className="row">
          <h2 id="assign-title" className="grow">Assign images</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={22} aria-hidden /></button>
        </header>
        <p className="small muted">Discogs doesn’t say which photo is the back cover or a label. Tag them here and the 3D record will use them.</p>
        {images.length === 0 && <p className="empty">This release has no images on Discogs.</p>}
        <ul className="assign-list">
          {images.map((img, i) => (
            <li key={img.uri} className="assign-item">
              <Cover url={img.uri} alt={`Image ${i + 1}`} fallback={`Image ${i + 1}`} size="full" className="assign-thumb" />
              <div className="role-chips" role="radiogroup" aria-label={`Role for image ${i + 1}`}>
                {ROLES.map(({ role, label }) => (
                  <button key={role} role="radio" aria-checked={roles[i] === role} className="chip" onClick={() => set(i, role)}>{label}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        {r.local?.imageRoles && (
          <button className="btn ghost" onClick={() => { void updateLocal(r.releaseId, { imageRoles: undefined }); onClose(); }}>Go back to automatic</button>
        )}
      </motion.div>
    </motion.div>
  );
}
