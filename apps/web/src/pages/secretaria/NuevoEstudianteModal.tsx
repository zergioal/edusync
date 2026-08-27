import { useState, useRef } from "react";
import { api, ApiError } from "../../lib/api";
import { Modal } from "../../components/ui/Modal";
import { Button } from "@edusync/ui";
import { SelectNivel } from "../../components/select/SelectNivel";
import { SelectGrado } from "../../components/select/SelectGrado";
import { SelectParalelo } from "../../components/select/SelectParalelo";
import { SelectGestion } from "../../components/select/SelectGestion";
import { TutorField, type TutorMatch } from "../../components/TutorField";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Credentials {
  email: string;
  password: string;
}

const STEP_LABELS = ["Datos del estudiante", "Tutor / Padre", "Matrícula"];

// ─── Component ────────────────────────────────────────────────────────────────

export function NuevoEstudianteModal({ isOpen, onClose, onSuccess }: Props) {
  const [step, setStep] = useState(0);

  // Persist last enrollment selection so successive registrations start pre-filled
  const lastEnrollRef = useRef({
    gestionId: "",
    nivelId: "",
    gradoId: "",
    paraleloId: "",
  });

  // Step 1 — student data
  const [apellidoPaterno, setApellidoPaterno] = useState("");
  const [apellidoMaterno, setApellidoMaterno] = useState("");
  const [nombre, setNombre] = useState("");
  const [fechaNacimiento, setFechaNacimiento] = useState("");
  const [email, setEmail] = useState("");
  const [becado, setBecado] = useState(false);
  const [motivoBeca, setMotivoBeca] = useState("");

  // Step 2 — tutor data
  const [tutor1Nombre, setTutor1Nombre] = useState("");
  const [tutor1Tel, setTutor1Tel] = useState("");
  const [tutor1Email, setTutor1Email] = useState("");
  const [tutor1Existing, setTutor1Existing] = useState<TutorMatch | null>(null);

  const [tutor2Nombre, setTutor2Nombre] = useState("");
  const [tutor2Tel, setTutor2Tel] = useState("");
  const [tutor2Email, setTutor2Email] = useState("");
  const [tutor2Existing, setTutor2Existing] = useState<TutorMatch | null>(null);

  const [crearCuentaTutor, setCrearCuentaTutor] = useState(false);

  // Step 3 — enrollment
  const [gestionId, setGestionId] = useState("");
  const [nivelId, setNivelId] = useState("");
  const [gradoId, setGradoId] = useState("");
  const [paraleloId, setParaleloId] = useState("");

  // Result
  const [saving, setSaving] = useState(false);
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [error, setError] = useState("");

  const reset = () => {
    setStep(0);
    setApellidoPaterno("");
    setApellidoMaterno("");
    setNombre("");
    setFechaNacimiento("");
    setEmail("");
    setBecado(false);
    setMotivoBeca("");
    setTutor1Nombre("");
    setTutor1Tel("");
    setTutor1Email("");
    setTutor1Existing(null);
    setTutor2Nombre("");
    setTutor2Tel("");
    setTutor2Email("");
    setTutor2Existing(null);
    setCrearCuentaTutor(false);
    // Restore last enrollment selection for quick successive registrations
    const e = lastEnrollRef.current;
    setGestionId(e.gestionId);
    setNivelId(e.nivelId);
    setGradoId(e.gradoId);
    setParaleloId(e.paraleloId);
    setSaving(false);
    setCredentials(null);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const apellido = `${apellidoPaterno.trim()} ${apellidoMaterno.trim()}`.trim();
  const canStep1 = nombre.trim() && apellidoPaterno.trim() && email.trim();
  const canStep2 =
    tutor1Existing !== null ||
    (tutor1Nombre.trim() !== "" && tutor1Tel.trim() !== "");
  const canStep3 = gestionId && paraleloId;

  const handleSubmit = async () => {
    setSaving(true);
    setError("");
    try {
      const result = await api.post<{
        estudiante: unknown;
        credentials: Credentials;
      }>("/estudiantes", {
        nombre,
        apellido,
        email,
        becado,
        fecha_nacimiento: fechaNacimiento || undefined,
        motivo_beca: becado ? motivoBeca || undefined : undefined,
        paralelo_id: paraleloId,
        gestion_id: gestionId,
        tutor1_existing_id: tutor1Existing?.id,
        nombre_tutor1: tutor1Existing
          ? `${tutor1Existing.apellido}, ${tutor1Existing.nombre}`
          : tutor1Nombre,
        telefono_tutor1: tutor1Tel,
        email_tutor1: tutor1Existing?.email ?? tutor1Email,
        nombre_tutor2: tutor2Existing
          ? `${tutor2Existing.apellido}, ${tutor2Existing.nombre}`
          : tutor2Nombre || undefined,
        telefono_tutor2: tutor2Tel || undefined,
        email_tutor2: (tutor2Existing?.email ?? tutor2Email) || undefined,
        crear_cuenta_tutor: tutor1Existing ? false : crearCuentaTutor,
      });
      lastEnrollRef.current = { gestionId, nivelId, gradoId, paraleloId };
      setCredentials(result.credentials);
      setStep(3);
      onSuccess();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Error al registrar el estudiante",
      );
    } finally {
      setSaving(false);
    }
  };

  const copyCredentials = () => {
    if (!credentials) return;
    navigator.clipboard
      .writeText(
        `Email: ${credentials.email}\nContraseña: ${credentials.password}`,
      )
      .then(() => alert("Credenciales copiadas al portapapeles"));
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Registrar nuevo estudiante"
      footer={
        credentials ? (
          <div className="flex justify-end">
            <Button onClick={handleClose}>Cerrar</Button>
          </div>
        ) : (
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={step === 0 ? handleClose : () => setStep((s) => s - 1)}
              disabled={saving}
            >
              {step === 0 ? "Cancelar" : "← Atrás"}
            </Button>
            <div className="flex gap-3">
              {step < 2 && (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={
                    step === 0 ? !canStep1 : step === 1 ? !canStep2 : false
                  }
                >
                  Siguiente →
                </Button>
              )}
              {step === 2 && (
                <Button
                  onClick={handleSubmit}
                  loading={saving}
                  disabled={!canStep3}
                >
                  Registrar estudiante
                </Button>
              )}
            </div>
          </div>
        )
      }
    >
      {/* Stepper */}
      {step < 3 && (
        <div className="flex items-center gap-2 mb-6">
          {STEP_LABELS.map((label, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                  i < step
                    ? "bg-green-500 text-white"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "bg-surface-2 text-fg-muted"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs ${i === step ? "font-semibold text-fg" : "text-fg-muted"}`}
              >
                {label}
              </span>
              {i < STEP_LABELS.length - 1 && (
                <div className="flex-1 h-px bg-surface-2" />
              )}
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Step 1 — Student data */}
      {step === 0 && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">
                Apellido Paterno *
              </label>
              <input
                type="text"
                value={apellidoPaterno}
                onChange={(e) => setApellidoPaterno(e.target.value)}
                required
                placeholder="Ej: García"
                className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-fg">
                Apellido Materno
              </label>
              <input
                type="text"
                value={apellidoMaterno}
                onChange={(e) => setApellidoMaterno(e.target.value)}
                placeholder="Ej: Mamani"
                className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">
              Nombres *
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
              placeholder="Ej: Pedro Juan"
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">
              Fecha de nacimiento
            </label>
            <input
              type="date"
              value={fechaNacimiento}
              onChange={(e) => setFechaNacimiento(e.target.value)}
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-fg">
              Correo institucional *
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="estudiante@uepioxii.edu.bo"
              className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand"
            />
          </div>

          <div className="border-t border-border pt-3 space-y-3">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={becado}
                onChange={(e) => setBecado(e.target.checked)}
                className="rounded border-border text-amber-500 focus:ring-amber-500 h-4 w-4"
              />
              <span className="text-sm font-medium text-fg">
                Estudiante becado{" "}
                <span className="text-xs font-normal text-fg-muted">
                  (exento del pago de pensiones)
                </span>
              </span>
            </label>
            {becado && (
              <div className="flex flex-col gap-1 pl-6">
                <label className="text-sm font-medium text-fg">
                  Motivo de la beca
                </label>
                <input
                  type="text"
                  value={motivoBeca}
                  onChange={(e) => setMotivoBeca(e.target.value)}
                  placeholder="Ej: Beca por rendimiento académico"
                  className="rounded-lg border border-border px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Step 2 — Tutor data */}
      {step === 1 && (
        <div className="space-y-5">
          <TutorField
            label="Tutor / Padre 1 (obligatorio)"
            nombre={tutor1Nombre}
            setNombre={setTutor1Nombre}
            tel={tutor1Tel}
            setTel={setTutor1Tel}
            email={tutor1Email}
            setEmail={setTutor1Email}
            existing={tutor1Existing}
            setExisting={setTutor1Existing}
            required
          />

          {/* Crear cuenta — solo si no hay tutor existente */}
          {!tutor1Existing && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={crearCuentaTutor}
                onChange={(e) => setCrearCuentaTutor(e.target.checked)}
                className="rounded border-border text-blue-600 focus:ring-brand"
              />
              <span className="text-sm text-fg">
                Crear cuenta de acceso para el tutor 1
              </span>
            </label>
          )}

          <div className="border-t border-border pt-4">
            <TutorField
              label="Tutor / Padre 2 (opcional)"
              nombre={tutor2Nombre}
              setNombre={setTutor2Nombre}
              tel={tutor2Tel}
              setTel={setTutor2Tel}
              email={tutor2Email}
              setEmail={setTutor2Email}
              existing={tutor2Existing}
              setExisting={setTutor2Existing}
            />
          </div>
        </div>
      )}

      {/* Step 3 — Enrollment */}
      {step === 2 && (
        <div className="space-y-4">
          <SelectGestion value={gestionId} onChange={setGestionId} required />
          <SelectNivel
            value={nivelId}
            onChange={(id) => {
              setNivelId(id);
              setGradoId("");
              setParaleloId("");
            }}
            required
          />
          <SelectGrado
            value={gradoId}
            onChange={(id) => {
              setGradoId(id);
              setParaleloId("");
            }}
            nivelId={nivelId}
            required
            disabled={!nivelId}
          />
          <SelectParalelo
            value={paraleloId}
            onChange={setParaleloId}
            gradoId={gradoId}
            required
            disabled={!gradoId}
            label="Paralelo"
          />
          {nombre && apellido && gestionId && paraleloId && (
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 text-sm text-blue-800 space-y-1">
              <p className="font-semibold">Resumen:</p>
              <p>
                Estudiante:{" "}
                <strong>
                  {apellidoPaterno} {apellidoMaterno}, {nombre}
                </strong>
              </p>
              <p>
                Email: <strong>{email}</strong>
              </p>
              <p>
                Tutor:{" "}
                <strong>
                  {tutor1Existing
                    ? `${tutor1Existing.apellido}, ${tutor1Existing.nombre} (existente)`
                    : tutor1Nombre}
                </strong>
                {tutor1Email && !tutor1Existing && ` (${tutor1Email})`}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Step 4 — Success / Credentials */}
      {step === 3 && credentials && (
        <div className="space-y-4 text-center py-4">
          <div className="text-5xl">🎉</div>
          <h3 className="text-lg font-bold text-fg">
            Estudiante registrado exitosamente
          </h3>
          <div className="rounded-xl bg-green-50 border border-green-200 p-5 text-left space-y-2">
            <p className="text-sm font-semibold text-green-800">
              Credenciales generadas:
            </p>
            <div className="bg-surface rounded-lg px-4 py-3 font-mono text-sm space-y-1 border border-green-100">
              <p>
                <span className="text-fg-muted">Email:</span>{" "}
                {credentials.email}
              </p>
              <p>
                <span className="text-fg-muted">Contraseña:</span>{" "}
                {credentials.password}
              </p>
            </div>
            <p className="text-xs text-green-700">
              El estudiante deberá cambiar su contraseña en el primer inicio de
              sesión.
            </p>
          </div>
          <Button variant="secondary" onClick={copyCredentials}>
            Copiar credenciales
          </Button>
        </div>
      )}
    </Modal>
  );
}
