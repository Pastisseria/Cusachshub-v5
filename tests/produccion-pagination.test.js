import { test } from "node:test";
import assert from "node:assert/strict";
import { cargarProduccionesCompletas } from "../src/lib/cargar-producciones.js";

function cliente(rows, { cap = 500, falloDesde = Infinity } = {}) {
  return { from(table) {
    assert.equal(table, "producciones");
    return { select() { return this; }, order() { return this; },
      async range(from, to) {
        if (from >= falloDesde) return { error: new Error("sin conexión") };
        return { data: rows.slice(from, Math.min(to + 1, from + cap)), count: rows.length, error: null };
      } };
  } };
}

test("includes November orders after more than 1000 older production lines", async () => {
  const rows = Array.from({ length: 1200 }, (_, id) => ({ id, fecha: "2026-10-01" }));
  rows.push(...Array.from({ length: 10 }, (_, id) => ({ id: 1200 + id, fecha: "2026-11-07", pedido_nombre: "PULSINELLA" })));
  const result = await cargarProduccionesCompletas(cliente(rows));
  assert.equal(result.error, null);
  assert.deepEqual(result.data, rows);
  assert.equal(result.data.filter(row => row.fecha === "2026-11-07").length, 10);
});

test("handles a lower server limit without treating a short page as complete", async () => {
  const rows = Array.from({ length: 45 }, (_, id) => ({ id }));
  assert.deepEqual((await cargarProduccionesCompletas(cliente(rows, { cap: 20 }))).data, rows);
});

test("returns an error instead of displaying an incomplete production list", async () => {
  const rows = Array.from({ length: 600 }, (_, id) => ({ id }));
  const result = await cargarProduccionesCompletas(cliente(rows, { falloDesde: 500 }));
  assert.equal(result.data, null);
  assert.match(result.error.message, /sin conexión/);
});

test("an empty production table returns an empty list", async () => {
  assert.deepEqual(await cargarProduccionesCompletas(cliente([])), { data: [], error: null });
});
