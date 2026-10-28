import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import config from '../vite.config.js';
const plugin = config.plugins.find(p=>p.name==='mejoras-cusachs');
const source = await readFile('src/components/DocumentoEditor.jsx','utf8');
for (const auth of ['usuario', 'usuario, esAdministrador']) {
  test('inicializa borrador con useAuth: '+auth,()=>{
    const input=source.replace(/const \{ usuario, esAdministrador \} = useAuth\(\);/,`const { ${auth} } = useAuth();`);
    const {code}=plugin.transform(input,'/src/components/DocumentoEditor.jsx');
    const declaration=code.indexOf('const borradorInicial = leerBorradorPresupuesto();');
    assert.ok(declaration>code.indexOf('function DocumentoEditor({'));
    assert.ok(declaration<code.indexOf('useState(Boolean(borradorInicial?.activo))'));
    assert.ok(code.includes(`const { ${auth} } = useAuth();`));
  });
}
test('detiene publicación si no puede inicializar borrador',()=>{
  const input=source.replace('const { usuario, esAdministrador } = useAuth();','const auth = useAuth();');
  assert.throws(()=>plugin.transform(input,'/src/components/DocumentoEditor.jsx'),/No se pudo inicializar/);
});
