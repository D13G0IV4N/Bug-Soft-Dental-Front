import formStyles from "../../styles/formSystem.module.css";
import type { Specialty } from "../../api/specialties";

interface Props {
  specialties: Specialty[];
  selectedIds: number[];
  loading: boolean;
  disabled?: boolean;
  onChange: (specialtyIds: number[]) => void;
}

export default function SpecialtiesField({
  specialties,
  selectedIds,
  loading,
  disabled = false,
  onChange,
}: Props) {
  const selectedSet = new Set(selectedIds);

  function toggleSpecialty(specialtyId: number) {
    if (disabled) return;

    const nextSelectedIds = selectedSet.has(specialtyId)
      ? selectedIds.filter((id) => id !== specialtyId)
      : [...selectedIds, specialtyId];

    onChange(nextSelectedIds);
  }

  return (
    <>
      <label className={`${formStyles.field} ${formStyles.fieldFull}`}>
        Especialidades
        <div
          className={`${formStyles.multiSelectList} ${disabled ? formStyles.multiSelectListDisabled : ""}`}
          role="group"
          aria-label="Especialidades"
          aria-disabled={disabled}
        >
          {specialties.map((specialty) => {
            const checked = selectedSet.has(specialty.id);

            return (
              <label
                key={specialty.id}
                className={`${formStyles.multiSelectOption} ${checked ? formStyles.multiSelectOptionActive : ""}`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={disabled}
                  onChange={() => toggleSpecialty(specialty.id)}
                />
                <span>{specialty.name}</span>
              </label>
            );
          })}

          {!loading && specialties.length === 0 && (
            <p className={formStyles.multiSelectEmpty}>No hay especialidades disponibles en el backend.</p>
          )}
        </div>
      </label>
      <p className={formStyles.helper}>
        {loading
          ? "Cargando especialidades..."
          : specialties.length > 0
            ? "Selecciona una o varias especialidades del catálogo."
            : "No hay especialidades disponibles en el backend."}
      </p>
    </>
  );
}
