import { Component, useEffect } from 'react';

function InicioListo() {
  useEffect(() => { window.cusachsInicioListo?.(); }, []);
  return null;
}

export default class LimiteErrores extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { window.cusachsErrorInicio?.(error.message); }
  render() {
    if (this.state.error) return <div className="pantalla-carga" role="alert">No se ha podido abrir esta pantalla. Usa «Volver a abrir» para reintentarlo.</div>;
    return <><InicioListo />{this.props.children}</>;
  }
}
