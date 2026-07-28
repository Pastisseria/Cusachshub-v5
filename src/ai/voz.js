export function navegadorAdmiteVoz() {
  return Boolean(
    typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition),
  );
}

export function escucharUnaOrden({
  idioma = "ca-ES",
  tiempoMaximoMs = 20000,
  onInicio,
  onFin,
  onTextoParcial,
} = {}) {
  return new Promise((resolve, reject) => {
    if (!navegadorAdmiteVoz()) {
      reject(
        new Error(
          "Aquest navegador no admet el reconeixement de veu. Prova Google Chrome o Microsoft Edge.",
        ),
      );
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    const reconocimiento = new SpeechRecognition();
    reconocimiento.lang = idioma;
    reconocimiento.continuous = false;
    reconocimiento.interimResults = true;
    reconocimiento.maxAlternatives = 1;

    let textoFinal = "";
    let terminado = false;

    const temporizador = window.setTimeout(() => {
      if (!terminado) {
        reconocimiento.stop();
      }
    }, tiempoMaximoMs);

    function finalizar() {
      if (terminado) return;
      terminado = true;
      window.clearTimeout(temporizador);
      onFin?.();
    }

    reconocimiento.onstart = () => onInicio?.();

    reconocimiento.onresult = (event) => {
      let parcial = "";

      for (let indice = event.resultIndex; indice < event.results.length; indice += 1) {
        const texto = event.results[indice][0]?.transcript || "";

        if (event.results[indice].isFinal) {
          textoFinal += `${texto} `;
        } else {
          parcial += texto;
        }
      }

      onTextoParcial?.(`${textoFinal}${parcial}`.trim());
    };

    reconocimiento.onerror = (event) => {
      finalizar();

      const mensajes = {
        "not-allowed": "No s'ha concedit permís per utilitzar el micròfon.",
        "audio-capture": "No s'ha trobat cap micròfon disponible.",
        "no-speech": "No s'ha detectat cap veu.",
        network: "Hi ha hagut un problema de xarxa amb el reconeixement de veu.",
      };

      reject(
        new Error(
          mensajes[event.error] ||
            `No s'ha pogut reconèixer la veu (${event.error || "error desconegut"}).`,
        ),
      );
    };

    reconocimiento.onend = () => {
      finalizar();

      const resultado = textoFinal.trim();
      if (!resultado) {
        reject(new Error("No s'ha pogut entendre cap frase."));
        return;
      }

      resolve(resultado);
    };

    try {
      reconocimiento.start();
    } catch (error) {
      finalizar();
      reject(error);
    }
  });
}
