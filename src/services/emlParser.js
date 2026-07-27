function decodeQuotedPrintable(value = "") {
  const unfolded = value.replace(/=\r?\n/g, "");
  const bytes = [];

  for (let index = 0; index < unfolded.length; index += 1) {
    const char = unfolded[index];
    const hex = unfolded.slice(index + 1, index + 3);

    if (char === "=" && /^[0-9A-Fa-f]{2}$/.test(hex)) {
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
    } else {
      bytes.push(char.charCodeAt(0));
    }
  }

  try {
    return new TextDecoder("utf-8").decode(new Uint8Array(bytes));
  } catch {
    return unfolded;
  }
}

function decodeBase64(value = "") {
  try {
    const binary = atob(value.replace(/\s/g, ""));
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
}

function decodeMimeWord(value = "") {
  return value.replace(
    /=\?([^?]+)\?([BQ])\?([^?]+)\?=/gi,
    (_, charset, encoding, text) => {
      try {
        if (encoding.toUpperCase() === "B") {
          return decodeBase64(text);
        }
        return decodeQuotedPrintable(text.replace(/_/g, " "));
      } catch {
        return text;
      }
    },
  );
}

function unfoldHeaders(rawHeaders = "") {
  return rawHeaders.replace(/\r?\n[ \t]+/g, " ");
}

function parseHeaders(rawHeaders = "") {
  const headers = {};

  unfoldHeaders(rawHeaders)
    .split(/\r?\n/)
    .forEach((line) => {
      const separator = line.indexOf(":");
      if (separator < 1) return;

      const key = line.slice(0, separator).trim().toLowerCase();
      const value = decodeMimeWord(line.slice(separator + 1).trim());
      headers[key] = headers[key] ? `${headers[key]}, ${value}` : value;
    });

  return headers;
}

function getHeaderParameter(header = "", name) {
  const match = header.match(new RegExp(`${name}="?([^";]+)`, "i"));
  return match?.[1]?.trim() || "";
}

function htmlToText(html = "") {
  const container = document.createElement("div");
  container.innerHTML = html;

  container.querySelectorAll("br").forEach((node) => node.replaceWith("\n"));
  container.querySelectorAll("p, div, li, tr").forEach((node) => {
    node.append(document.createTextNode("\n"));
  });

  return (container.textContent || "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodePartBody(body, transferEncoding = "") {
  const encoding = transferEncoding.toLowerCase();
  if (encoding.includes("base64")) return decodeBase64(body);
  if (encoding.includes("quoted-printable")) return decodeQuotedPrintable(body);
  return body;
}

function parseMultipart(body, boundary) {
  if (!boundary) return [];

  return body
    .split(`--${boundary}`)
    .slice(1)
    .map((part) => part.replace(/--\s*$/, "").trim())
    .filter(Boolean)
    .map((part) => {
      const split = part.search(/\r?\n\r?\n/);
      const rawHeaders = split >= 0 ? part.slice(0, split) : "";
      const rawBody = split >= 0 ? part.slice(split).replace(/^\r?\n\r?\n/, "") : part;
      const headers = parseHeaders(rawHeaders);
      return { headers, body: rawBody };
    });
}

function extractBody(headers, rawBody) {
  const contentType = headers["content-type"] || "text/plain";
  const boundary = getHeaderParameter(contentType, "boundary");

  if (/multipart\//i.test(contentType) && boundary) {
    const parts = parseMultipart(rawBody, boundary);
    let plainText = "";
    let htmlText = "";

    parts.forEach((part) => {
      const nestedType = part.headers["content-type"] || "text/plain";
      const disposition = part.headers["content-disposition"] || "";
      if (/attachment/i.test(disposition)) return;

      const decoded = decodePartBody(
        part.body,
        part.headers["content-transfer-encoding"] || "",
      );

      if (/multipart\//i.test(nestedType)) {
        const nested = extractBody(part.headers, part.body);
        plainText += `\n${nested}`;
      } else if (/text\/plain/i.test(nestedType)) {
        plainText += `\n${decoded}`;
      } else if (/text\/html/i.test(nestedType)) {
        htmlText += `\n${htmlToText(decoded)}`;
      }
    });

    return (plainText.trim() || htmlText.trim()).trim();
  }

  const decoded = decodePartBody(
    rawBody,
    headers["content-transfer-encoding"] || "",
  );

  return /text\/html/i.test(contentType) ? htmlToText(decoded) : decoded.trim();
}

export async function parseEmlFile(file) {
  if (!file?.name?.toLowerCase().endsWith(".eml")) {
    throw new Error("Solo se admiten archivos .eml.");
  }

  const raw = await file.text();
  const split = raw.search(/\r?\n\r?\n/);
  const rawHeaders = split >= 0 ? raw.slice(0, split) : "";
  const rawBody = split >= 0 ? raw.slice(split).replace(/^\r?\n\r?\n/, "") : raw;
  const headers = parseHeaders(rawHeaders);
  const body = extractBody(headers, rawBody)
    .replace(/\r/g, "")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();

  return {
    archivo: file.name,
    asunto: headers.subject || file.name.replace(/\.eml$/i, ""),
    remitente: headers.from || "",
    destinatario: headers.to || "",
    fechaCorreo: headers.date || "",
    messageId: (headers["message-id"] || "").replace(/[<>]/g, "").trim(),
    cuerpo: body,
    raw,
  };
}

export async function crearHuellaEmail(email) {
  const source = `${email.messageId}|${email.asunto}|${email.fechaCorreo}|${email.cuerpo}`;

  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(source),
    );
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 0;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
}
