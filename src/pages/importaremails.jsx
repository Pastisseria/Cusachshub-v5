import { useEffect, useMemo, useRef, useState } from "react";
import ImportacionEmailCard from "../components/ImportacionEmailCard.jsx";
import { supabase } from "../supabase.js";
import { crearHuellaEmail, parseEmlFile } from "../services/emlParser.js";
import { calcularTotalesImportacion, extraerPresupuestoDesdeEmail } from "../services/presupuestoExtractor.js";

function temporalId() {
  return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
}

function numeroImportado(tipoDocumento) {
  const ahora = new Date();
  const prefijos = {
    Catering: "CAT",
    "Visitador médico": "VIS",
    Empresa: "EMP",
    Tienda: "TIE",
    Particular: "PAR",
    Otro: "OTR",
  };
  const fecha = ahora.toISOString().slice(0, 10).replaceAll("-", "");
  const hora = ahora.toTimeString().slice(0, 8).replaceAll(":", "");
  return `${prefijos[tipoDocumento] || "IMP"}-${fecha}-${hora}-${Math.floor(Math.random() * 90 + 10)}`;
}

function ImportarEmails() {
  const inputRef = useRef(null);
  const [clientes, setClientes] = useState([]);
  const [items, setItems] = useState([]);
  const [procesando, setProcesando] = useState(false);
  const [arrastrando, setArrastrando] = useState(false);
  const [error, setError] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function cargarClientes() {
    const { data, error: supabaseError } = await supabase
      .from("clientes")
      .select("id, nombre, empresa, email, nif_cif")
      .order("nombre");

    if (supabaseError) throw supabaseError;
    setClientes(data ?? []);
  }

  useEffect(() => {
    cargarClientes().catch((err) => setError(err.message || "No se han podido cargar los clientes."));
  }, []);

  const resumen = useMemo(() => ({
    total: items.length,
    pendientes: items.filter((item) => !["importado", "duplicado"].includes(item.estado_importacion)).length,
    importados: items.filter((item) => item.estado_importacion === "importado").length,
    duplicados: items.filter((item) => item.estado_importacion === "duplicado").length,
  }), [items]);

  async function procesarArchivos(fileList) {
    const archivos = Array.from(fileList || []).filter((file) => file.name.toLowerCase().endsWith(".eml"));
    if (!archivos.length) {
      setError("Selecciona uno o varios archivos con extensión .eml.");
      return;
    }

    setProcesando(true);
    setError("");
    setMensaje("");

    const nuevos = [];
    for (const file of archivos) {
      try {
        const email = await parseEmlFile(file);
        const huella = await crearHuellaEmail(email);
        const presupuesto = extraerPresupuestoDesdeEmail(email);

        const { data: duplicado, error: duplicateError } = await supabase
          .from("email_importados")
          .select("id, presupuesto_id")
          .or(`hash_email.eq.${huella}${email.messageId ? `,message_id.eq.${email.messageId}` : ""}`)
          .maybeSingle();

        if (duplicateError && duplicateError.code !== "PGRST116") throw duplicateError;

        nuevos.push({
          ...presupuesto,
          id_temporal: temporalId(),
          hash_email: huella,
          lineas: presupuesto.lineas.map((linea) => ({ ...linea, temporalId: temporalId() })),
          estado_importacion: duplicado ? "duplicado" : "pendiente",
          error: duplicado ? "Este email ya figura como importado en Supabase." : "",
        });
      } catch (err) {
        nuevos.push({
          id_temporal: temporalId(),
          archivo: file.name,
          asunto: file.name,
          remitente: "",
          cuerpo_original: "",
          nombre_cliente: "",
          cliente_id: "",
          empresa: "",
          nif_cif: "",
          email: "",
          telefono: "",
          direccion: "",
          fecha: new Date().toISOString().slice(0, 10),
          hora_entrega: "",
          tipo_documento: "Catering",
          estado: "Borrador",
          observaciones: "",
          lineas: [{ temporalId: temporalId(), descripcion: "", cantidad: 1, precio_unitario: 0, iva: 10 }],
          estado_importacion: "error",
          error: err.message || "No se ha podido leer el archivo.",
          avisos: [],
        });
      }
    }

    setItems((anteriores) => [...nuevos, ...anteriores]);
    setProcesando(false);
    setMensaje(`${nuevos.length} email${nuevos.length === 1 ? " preparado" : "s preparados"} para revisar.`);
  }

  function actualizarItem(id, campo, valor) {
    setItems((anteriores) => anteriores.map((item) => item.id_temporal === id ? { ...item, [campo]: valor, error: "" } : item));
  }

  function actualizarLinea(id, index, campo, valor) {
    setItems((anteriores) => anteriores.map((item) => {
      if (item.id_temporal !== id) return item;
      return {
        ...item,
        lineas: item.lineas.map((linea, lineIndex) => lineIndex === index ? { ...linea, [campo]: valor } : linea),
      };
    }));
  }

  function añadirLinea(id) {
    setItems((anteriores) => anteriores.map((item) => item.id_temporal === id ? {
      ...item,
      lineas: [...item.lineas, { temporalId: temporalId(), descripcion: "", cantidad: 1, precio_unitario: 0, iva: 10 }],
    } : item));
  }

  function eliminarLinea(id, index) {
    setItems((anteriores) => anteriores.map((item) => {
      if (item.id_temporal !== id) return item;
      const lineas = item.lineas.filter((_, lineIndex) => lineIndex !== index);
      return { ...item, lineas: lineas.length ? lineas : [{ temporalId: temporalId(), descripcion: "", cantidad: 1, precio_unitario: 0, iva: 10 }] };
    }));
  }

  function descartarItem(id) {
    setItems((anteriores) => anteriores.filter((item) => item.id_temporal !== id));
  }

  async function crearClienteDesdeItem(item) {
    if (!item.nombre_cliente?.trim()) {
      actualizarItem(item.id_temporal, "error", "Indica el nombre del cliente antes de crearlo.");
      return;
    }

    if (item.cliente_id) {
      setMensaje("Este email ya tiene un cliente vinculado.");
      return;
    }

    actualizarItem(item.id_temporal, "cliente_creando", true);
    actualizarItem(item.id_temporal, "error", "");

    try {
      let existente = null;

      if (item.email?.trim()) {
        const { data, error: buscarEmailError } = await supabase
          .from("clientes")
          .select("id, nombre, empresa")
          .ilike("email", item.email.trim())
          .limit(1)
          .maybeSingle();

        if (buscarEmailError && buscarEmailError.code !== "PGRST116") {
          throw buscarEmailError;
        }
        existente = data;
      }

      if (!existente && item.nif_cif?.trim()) {
        const { data, error: buscarCifError } = await supabase
          .from("clientes")
          .select("id, nombre, empresa")
          .ilike("nif_cif", item.nif_cif.trim())
          .limit(1)
          .maybeSingle();

        if (buscarCifError && buscarCifError.code !== "PGRST116") {
          throw buscarCifError;
        }
        existente = data;
      }

      if (existente?.id) {
        actualizarItem(item.id_temporal, "cliente_id", existente.id);
        setMensaje(`Cliente existente vinculado: ${existente.nombre}.`);
        return;
      }

      const { data: creado, error: createError } = await supabase
        .from("clientes")
        .insert({
          nombre: item.nombre_cliente.trim(),
          empresa: item.empresa?.trim() || null,
          nif_cif: item.nif_cif?.trim() || null,
          persona_contacto: item.nombre_cliente.trim() || null,
          telefono: item.telefono?.trim() || null,
          email: item.email?.trim() || null,
          direccion: item.direccion?.trim() || null,
          pais: "España",
          observaciones: `Cliente creado desde el importador con el email ${item.archivo}.`,
          activo: true,
          updated_at: new Date().toISOString(),
        })
        .select("id, nombre")
        .single();

      if (createError) throw createError;

      actualizarItem(item.id_temporal, "cliente_id", creado.id);
      await cargarClientes();
      setMensaje(`Cliente ${creado.nombre} creado y vinculado correctamente.`);
    } catch (err) {
      actualizarItem(
        item.id_temporal,
        "error",
        err.message || "No se ha podido crear el cliente.",
      );
    } finally {
      actualizarItem(item.id_temporal, "cliente_creando", false);
    }
  }

  async function obtenerOCrearCliente(item) {
    if (item.cliente_id) return item.cliente_id;

    let consulta = supabase.from("clientes").select("id");
    if (item.email) consulta = consulta.ilike("email", item.email);
    else consulta = consulta.ilike("nombre", item.nombre_cliente.trim());

    const { data: existente, error: findError } = await consulta.limit(1).maybeSingle();
    if (findError && findError.code !== "PGRST116") throw findError;
    if (existente?.id) return existente.id;

    const { data: creado, error: createError } = await supabase
      .from("clientes")
      .insert({
        nombre: item.nombre_cliente.trim(),
        empresa: item.empresa.trim() || null,
        nif_cif: item.nif_cif.trim() || null,
        persona_contacto: item.nombre_cliente.trim() || null,
        telefono: item.telefono.trim() || null,
        email: item.email.trim() || null,
        direccion: item.direccion.trim() || null,
        pais: "España",
        observaciones: `Cliente creado al importar el email ${item.archivo}.`,
        activo: true,
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (createError) throw createError;
    return creado.id;
  }

  async function importarItem(item) {
    if (!item.nombre_cliente?.trim()) {
      actualizarItem(item.id_temporal, "error", "Indica el nombre del cliente.");
      return;
    }

    const lineasValidas = item.lineas.filter((linea) => linea.descripcion?.trim() && Number(linea.cantidad || 0) > 0);
    if (!lineasValidas.length) {
      actualizarItem(item.id_temporal, "error", "Añade al menos una línea con descripción y cantidad.");
      return;
    }

    actualizarItem(item.id_temporal, "estado_importacion", "importando");

    let presupuestoId = null;
    try {
      const { data: repetido } = await supabase
        .from("email_importados")
        .select("id")
        .or(`hash_email.eq.${item.hash_email}${item.message_id ? `,message_id.eq.${item.message_id}` : ""}`)
        .maybeSingle();

      if (repetido) {
        setItems((anteriores) => anteriores.map((anterior) => anterior.id_temporal === item.id_temporal ? {
          ...anterior,
          estado_importacion: "duplicado",
          error: "Este correo ya había sido importado.",
        } : anterior));
        return;
      }

      const clienteId = await obtenerOCrearCliente(item);
      const totales = calcularTotalesImportacion(lineasValidas);
      const numero = numeroImportado(item.tipo_documento);

      const { data: presupuesto, error: presupuestoError } = await supabase
        .from("presupuestos")
        .insert({
          numero,
          cliente_id: clienteId,
          tipo_documento: item.tipo_documento,
          fecha: item.fecha,
          validez_hasta: null,
          estado: item.estado,
          hora_entrega: item.hora_entrega || null,
          direccion_entrega: item.direccion.trim() || null,
          persona_contacto: item.nombre_cliente.trim() || null,
          telefono_contacto: item.telefono.trim() || null,
          visitador_nombre: item.tipo_documento === "Visitador médico" ? item.visitador_nombre || item.nombre_cliente : null,
          laboratorio: item.tipo_documento === "Visitador médico" ? item.laboratorio || item.empresa || null : null,
          centro_medico: item.tipo_documento === "Visitador médico" ? item.centro_medico || null : null,
          observaciones: item.observaciones.trim() || null,
          subtotal: Number(totales.subtotal.toFixed(2)),
          iva_total: Number(totales.ivaTotal.toFixed(2)),
          total: Number(totales.total.toFixed(2)),
          facturado_externamente: false,
          updated_at: new Date().toISOString(),
        })
        .select("id")
        .single();

      if (presupuestoError) throw presupuestoError;
      presupuestoId = presupuesto.id;

      const { error: lineasError } = await supabase.from("presupuesto_lineas").insert(
        lineasValidas.map((linea) => {
          const cantidad = Number(linea.cantidad || 0);
          const precio = Number(linea.precio_unitario || 0);
          const iva = Number(linea.iva || 0);
          const subtotal = cantidad * precio;
          const importeIva = subtotal * (iva / 100);
          return {
            presupuesto_id: presupuesto.id,
            producto_id: null,
            descripcion: linea.descripcion.trim(),
            cantidad,
            precio_unitario: precio,
            iva,
            subtotal: Number(subtotal.toFixed(2)),
            importe_iva: Number(importeIva.toFixed(2)),
            total: Number((subtotal + importeIva).toFixed(2)),
          };
        }),
      );

      if (lineasError) throw lineasError;

      const { error: logError } = await supabase.from("email_importados").insert({
        message_id: item.message_id || null,
        archivo: item.archivo,
        asunto: item.asunto || null,
        remitente: item.remitente || null,
        cliente_id: clienteId,
        presupuesto_id: presupuesto.id,
        estado: "importado",
        hash_email: item.hash_email,
        avisos: item.avisos || [],
      });

      if (logError) throw logError;

      setItems((anteriores) => anteriores.map((anterior) => anterior.id_temporal === item.id_temporal ? {
        ...anterior,
        cliente_id: clienteId,
        estado_importacion: "importado",
        numero_presupuesto: numero,
        error: "",
      } : anterior));
      await cargarClientes();
      setMensaje(`Presupuesto ${numero} importado correctamente.`);
    } catch (err) {
      if (presupuestoId) {
        await supabase.from("presupuesto_lineas").delete().eq("presupuesto_id", presupuestoId);
        await supabase.from("presupuestos").delete().eq("id", presupuestoId);
      }
      setItems((anteriores) => anteriores.map((anterior) => anterior.id_temporal === item.id_temporal ? {
        ...anterior,
        estado_importacion: "error",
        error: err.message || "No se ha podido importar el presupuesto.",
      } : anterior));
    }
  }

  return (
    <section className="panel importador-emails">
      <div className="titulo-seccion">
        <div>
          <p className="etiqueta">Administración</p>
          <h2>Importar presupuestos desde emails</h2>
          <p className="texto-secundario">Carga correos .eml, revisa los datos detectados y crea los presupuestos en Supabase.</p>
        </div>
        <span className="contador">{resumen.total} email{resumen.total === 1 ? "" : "s"}</span>
      </div>

      <div
        className={`email-dropzone ${arrastrando ? "email-dropzone--active" : ""}`}
        onDragOver={(event) => { event.preventDefault(); setArrastrando(true); }}
        onDragLeave={() => setArrastrando(false)}
        onDrop={(event) => { event.preventDefault(); setArrastrando(false); procesarArchivos(event.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        role="button"
        tabIndex="0"
        onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") inputRef.current?.click(); }}
      >
        <input ref={inputRef} className="email-file-input" type="file" accept=".eml,message/rfc822" multiple onChange={(event) => procesarArchivos(event.target.files)} />
        <div className="email-dropzone__icon">📨</div>
        <h3>{procesando ? "Analizando emails..." : "Arrastra aquí los correos .eml"}</h3>
        <p>También puedes pulsar para elegir varios archivos.</p>
      </div>

      <div className="import-summary">
        <span>Total: <strong>{resumen.total}</strong></span>
        <span>Pendientes: <strong>{resumen.pendientes}</strong></span>
        <span>Importados: <strong>{resumen.importados}</strong></span>
        <span>Duplicados: <strong>{resumen.duplicados}</strong></span>
      </div>

      {error && <p className="mensaje-error">Error: {error}</p>}
      {mensaje && <p className="mensaje">{mensaje}</p>}

      {items.length === 0 ? (
        <div className="estado-vacio">
          <h3>Todavía no hay emails preparados</h3>
          <p>Guarda los correos desde Gmail u Outlook como archivos .eml y súbelos aquí.</p>
        </div>
      ) : (
        <div className="email-import-list">
          {items.map((item) => (
            <ImportacionEmailCard
              key={item.id_temporal}
              item={item}
              clientes={clientes}
              onChange={(campo, valor) => actualizarItem(item.id_temporal, campo, valor)}
              onLineChange={(index, campo, valor) => actualizarLinea(item.id_temporal, index, campo, valor)}
              onAddLine={() => añadirLinea(item.id_temporal)}
              onRemoveLine={(index) => eliminarLinea(item.id_temporal, index)}
              onCreateClient={() => crearClienteDesdeItem(item)}
              onImport={() => importarItem(item)}
              onDiscard={() => descartarItem(item.id_temporal)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default ImportarEmails;
