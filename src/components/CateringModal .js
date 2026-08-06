import { useEffect, useMemo, useState } from "react";

const VALOR_INICIAL = {
  id: null,
  cliente_id: "",
  presupuesto_id: "",
  titulo: "",
  fecha: "",
  hora_inicio: "",
  hora_fin: "",
  direccion: "",
  poblacion: "",
  codigo_postal: "",
  numero_personas: "0",
  responsable: "",
  telefono_contacto: "",
  estado: "Pendiente",
  tipo_servicio: "",
  observaciones: "",
};

function CateringModal({
  abierto,
  catering,
  fechaInicial,
  clientes,
  presupuestos,
  guardando,
  onCerrar,
  onGuardar,
  onEliminar,
}) {
  const [formulario, setFormulario] = useState(VALOR_INICIAL);

  useEffect(() => {
    if (!abierto) return;

    if (catering) {
      setFormulario({
        id: catering.id,
        cliente_id: catering.cliente_id || "",
        presupuesto_id: catering.presupuesto_id || "",
        titulo: catering.titulo || "",
        fecha: catering.fecha || fechaInicial || "",
        hora_inicio: cortarHora(catering.hora_inicio),
        hora_fin: cortarHora(catering.hora_fin),
        direccion: catering.direccion || "",
        poblacion: catering.poblacion || "",
        codigo_postal: catering.codigo_postal || "",
        numero_personas: String(catering.numero_personas ?? 0),
        responsable: catering.responsable || "",
        telefono_contacto: catering.telefono_contacto || "",
        estado: catering.estado || "Pendiente",
        tipo_servicio: catering.tipo_servicio || "",
        observaciones: catering.observaciones || "",
      });
      return;
    }

    setFormulario({
      ...VALOR_INICIAL,
      fecha: fechaInicial || "",
    });
  }, [abierto, catering, fechaInicial]);

  const presupuestosFiltrados = useMemo(() => {
    if (!formulario.cliente_id) return presupuestos;

    return presupuestos.filter(
      (presupuesto) =>
        presupuesto.cliente_id === formulario.cliente_id,
    );
  }, [formulario.cliente_id, presupuestos]);

  if (!abierto) return null;

  function modificar(campo, valor) {
    setFormulario((anterior) => ({
      ...anterior,
      [campo]: valor,
      ...(campo === "cliente_id" ? { presupuesto_id: "" } : {}),
    }));
  }

  function enviar(event) {
    event.preventDefault();

    onGuardar({
      ...formulario,
      numero_personas: Number(formulario.numero_personas || 0),
      cliente_id: formulario.cliente_id || null,
      presupuesto_id: formulario.presupuesto_id || null,
      hora_inicio: formulario.hora_inicio || null,
      hora_fin: formulario.hora_fin || null,
      direccion: formulario.direccion.trim() || null,
      poblacion: formulario.poblacion.trim() || null,
      codigo_postal: formulario.codigo_postal.trim() || null,
      responsable: formulario.responsable.trim() || null,
      telefono_contacto:
        formulario.telefono_contacto.trim() || null,
      tipo_servicio: formulario.tipo_servicio.trim() || null,
      observaciones: formulario.observaciones.trim() || null,
    });
  }

  return (
    <div className="modal-fondo" onMouseDown={onCerrar}>
      <div
        className="modal-catering"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="modal-cabecera">
          <div>
            <p className="etiqueta">Catering</p>
            <h3>
              {formulario.id ? "Editar catering" : "Nuevo catering"}
            </h3>
          </div>

          <button
            type="button"
            className="boton-cerrar-modal"
            onClick={onCerrar}
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <form onSubmit={enviar}>
          <div className="rejilla-formulario">
            <label>
              Título del evento *
              <input
                value={formulario.titulo}
                onChange={(event) =>
                  modificar("titulo", event.target.value)
                }
                placeholder="Ej. Catering Hospital Clínic"
                required
                disabled={guardando}
              />
            </label>

            <label>
              Cliente
              <select
                value={formulario.cliente_id}
                onChange={(event) =>
                  modificar("cliente_id", event.target.value)
                }
                disabled={guardando}
              >
                <option value="">Sin cliente vinculado</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nombre}
                    {cliente.empresa ? ` — ${cliente.empresa}` : ""}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Presupuesto
              <select
                value={formulario.presupuesto_id}
                onChange={(event) =>
                  modificar("presupuesto_id", event.target.value)
                }
                disabled={guardando}
              >
                <option value="">Sin presupuesto vinculado</option>
                {presupuestosFiltrados.map((presupuesto) => (
                  <option key={presupuesto.id} value={presupuesto.id}>
                    {presupuesto.numero} · {presupuesto.estado}
                  </option>
                ))}
              </select>
            </label>

            <label>
              Fecha *
              <input
                type="date"
                value={formulario.fecha}
                onChange={(event) =>
                  modificar("fecha", event.target.value)
                }
                required
                disabled={guardando}
              />
            </label>

            <label>
              Hora de inicio
              <input
                type="time"
                value={formulario.hora_inicio}
                onChange={(event) =>
                  modificar("hora_inicio", event.target.value)
                }
                disabled={guardando}
              />
            </label>

            <label>
              Hora de finalización
              <input
                type="time"
                value={formulario.hora_fin}
                onChange={(event) =>
                  modificar("hora_fin", event.target.value)
                }
                disabled={guardando}
              />
            </label>

            <label>
              Número de personas
              <input
                type="number"
                min="0"
                step="1"
                value={formulario.numero_personas}
                onChange={(event) =>
                  modificar("numero_personas", event.target.value)
                }
                disabled={guardando}
              />
            </label>

            <label>
              Estado
              <select
                value={formulario.estado}
                onChange={(event) =>
                  modificar("estado", event.target.value)
                }
                disabled={guardando}
              >
                <option value="Pendiente">Pendiente</option>
                <option value="Aceptado">Aceptado</option>
                <option value="Realizado">Realizado</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </label>

            <label>
              Tipo de servicio
              <input
                value={formulario.tipo_servicio}
                onChange={(event) =>
                  modificar("tipo_servicio", event.target.value)
                }
                placeholder="Coffee break, almuerzo, cóctel..."
                disabled={guardando}
              />
            </label>

            <label>
              Responsable
              <input
                value={formulario.responsable}
                onChange={(event) =>
                  modificar("responsable", event.target.value)
                }
                placeholder="Persona responsable"
                disabled={guardando}
              />
            </label>

            <label>
              Teléfono de contacto
              <input
                value={formulario.telefono_contacto}
                onChange={(event) =>
                  modificar("telefono_contacto", event.target.value)
                }
                placeholder="600 000 000"
                disabled={guardando}
              />
            </label>

            <label>
              Código postal
              <input
                value={formulario.codigo_postal}
                onChange={(event) =>
                  modificar("codigo_postal", event.target.value)
                }
                disabled={guardando}
              />
            </label>

            <label className="campo-completo">
              Dirección
              <input
                value={formulario.direccion}
                onChange={(event) =>
                  modificar("direccion", event.target.value)
                }
                placeholder="Calle, número, planta..."
                disabled={guardando}
              />
            </label>

            <label className="campo-completo">
              Población
              <input
                value={formulario.poblacion}
                onChange={(event) =>
                  modificar("poblacion", event.target.value)
                }
                disabled={guardando}
              />
            </label>

            <label className="campo-completo">
              Observaciones
              <textarea
                value={formulario.observaciones}
                onChange={(event) =>
                  modificar("observaciones", event.target.value)
                }
                placeholder="Montaje, alergias, acceso, material necesario..."
                disabled={guardando}
              />
            </label>
          </div>

          <div className="modal-acciones">
            <button type="submit" disabled={guardando}>
              {guardando ? "Guardando..." : "💾 Guardar catering"}
            </button>

            <button
              type="button"
              className="boton-cancelar"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </button>

            {formulario.id && (
              <button
                type="button"
                className="boton-peligro"
                onClick={() => onEliminar(formulario.id)}
                disabled={guardando}
              >
                🗑️ Eliminar
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}

function cortarHora(hora) {
  return hora ? String(hora).slice(0, 5) : "";
}

export default CateringModal;
