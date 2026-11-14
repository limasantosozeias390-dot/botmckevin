const { createCanvas, loadImage, GlobalFonts } = require("@napi-rs/canvas");

// Card estilo vidro (glass) do n!spotify: capa do álbum de fundo, faixas translúcidas com
// desfoque, título, artistas, barra de progresso e quem está ouvindo.

const W = 1100;
const H = 546;
const BLUR_SCALE = 0.25; // o desfoque é feito em 1/4 do tamanho e esticado de volta (visual igual, bem mais rápido)
const MARGIN = 100; // sobra em volta da cópia desfocada (evita borda transparente do desfoque; cabe blur até 40)
const GREEN = "#1ed760";

// Intensidade do vidro: dim = escurecimento das faixas, tint = brilho branco por cima, base = escurecimento geral da capa
const GLASS_PRESETS = {
  dark: { dim: 0.58, tint: 0.04, base: 0.32 },
  normal: { dim: 0.38, tint: 0.1, base: 0.22 },
  light: { dim: 0.2, tint: 0.2, base: 0.12 },
};

// Ícone da pílula. Padrão: emoji do próprio bot (baixado do CDN do Discord e guardado em memória).
// Para trocar o padrão, mude o ID abaixo; o painel também aceita outro emoji ou link de imagem.
// Se não carregar, desenha o logo à mão.
const SPOTIFY_EMOJI_ID = "1571194086109487216";
const emojiUrl = (id) => `https://cdn.discordapp.com/emojis/${id}.png?size=128&quality=lossless`;
const iconCache = new Map(); // url -> Promise<Image|null>
const loadIcon = (url) => {
  if (!iconCache.has(url)) {
    iconCache.set(
      url,
      loadImageFromUrl(url).then((img) => {
        if (!img) iconCache.delete(url); // tenta de novo na próxima vez
        return img;
      })
    );
    if (iconCache.size > 40) iconCache.delete(iconCache.keys().next().value);
  }
  return iconCache.get(url);
};

// A fonte vem do pacote dejavu-fonts-ttf (não depende das fontes do servidor da Render).
// Se algo falhar, cai para a fonte padrão do sistema.
let BOLD = "sans-serif";
let REGULAR = "sans-serif";
try {
  GlobalFonts.registerFromPath(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf"), "SptBold");
  GlobalFonts.registerFromPath(require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf"), "SptRegular");
  BOLD = "SptBold, sans-serif";
  REGULAR = "SptRegular, sans-serif";
} catch (err) {
  console.error("[SPOTIFY] Fonte DejaVu indisponível, usando a padrão:", err.message);
}

async function fetchImage(url) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    return await loadImage(Buffer.from(await res.arrayBuffer()));
  } catch {
    return null;
  }
}

// Capa e avatar têm hash na URL (o conteúdo de uma URL nunca muda), então a imagem fica guardada em memória.
// Guarda a promise: quem pedir enquanto ainda baixa (ex.: a busca antecipada do comando) aproveita o mesmo download.
const imageCache = new Map(); // url -> Promise<Image|null>
function loadImageFromUrl(url) {
  if (!url) return Promise.resolve(null);
  let promise = imageCache.get(url);
  if (!promise) {
    promise = fetchImage(url).then((img) => {
      if (!img) imageCache.delete(url); // falhou: tenta de novo na próxima vez
      return img;
    });
    imageCache.set(url, promise);
    if (imageCache.size > 40) imageCache.delete(imageCache.keys().next().value);
  }
  return promise;
}

// "#rrggbb" -> [r, g, b] (ou null)
function hexToRgb(hex) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const rgba = ([r, g, b], a) => `rgba(${r}, ${g}, ${b}, ${a})`;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Corta o texto com "…" se passar da largura máxima.
function fitText(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  // Busca binária: maior pedaço do começo que cabe com o "…" (mesmo resultado do corte letra por letra)
  let lo = 1;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (ctx.measureText(`${text.slice(0, mid)}…`).width <= maxWidth) lo = mid;
    else hi = mid - 1;
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

function formatTime(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

// Faixa de vidro: a capa já desfocada (blurred) recortada na área + escurecimento, brilho leve e borda fina.
function glass(ctx, blurred, x, y, w, h, radius, tint, dim, dimRgb = [0, 0, 0]) {
  ctx.save();
  roundRect(ctx, x, y, w, h, radius);
  ctx.clip();
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(blurred, -MARGIN, -MARGIN, W + MARGIN * 2, H + MARGIN * 2);
  ctx.fillStyle = rgba(dimRgb, dim);
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = `rgba(255, 255, 255, ${tint})`;
  ctx.fillRect(x, y, w, h);
  ctx.restore();

  ctx.save();
  roundRect(ctx, x + 0.5, y + 0.5, w - 1, h - 1, radius);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();
}

// Cor mais marcante da capa para a barra de progresso (a mais viva, nem escura nem lavada demais).
// Reduz a capa para 24x24 e dá mais peso aos pixels coloridos. Retorna "#rrggbb" ou null (usa o verde).
function coverAccent(cover) {
  if (!cover) return null;
  const size = 24;
  const small = createCanvas(size, size);
  const sctx = small.getContext("2d");
  sctx.drawImage(cover, 0, 0, size, size);
  const { data } = sctx.getImageData(0, 0, size, size);

  let r = 0;
  let g = 0;
  let b = 0;
  let weight = 0;
  for (let i = 0; i < data.length; i += 4) {
    const max = Math.max(data[i], data[i + 1], data[i + 2]);
    const min = Math.min(data[i], data[i + 1], data[i + 2]);
    const sat = max === 0 ? 0 : (max - min) / max;
    const w = sat * sat * (0.35 + max / 255) + 0.001; // cores vivas pesam mais que cinzas
    r += data[i] * w;
    g += data[i + 1] * w;
    b += data[i + 2] * w;
    weight += w;
  }
  if (!weight) return null;
  r /= weight;
  g /= weight;
  b /= weight;

  // Capa quase toda cinza (sem cor de verdade): fica no verde do Spotify
  if (Math.max(r, g, b) - Math.min(r, g, b) < 18) return null;

  // Garante uma cor viva e clara o bastante para aparecer sobre o fundo escuro
  let [h, sat, l] = rgbToHsl(r, g, b);
  sat = Math.max(sat, 0.55);
  l = Math.min(0.68, Math.max(0.5, l));
  const [nr, ng, nb] = hslToRgb(h, sat, l);
  return `#${[nr, ng, nb].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h;
  if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return [h / 6, s, l];
}

function hslToRgb(h, s, l) {
  if (s === 0) return [l * 255, l * 255, l * 255];
  const hue = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return [hue(p, q, h + 1 / 3) * 255, hue(p, q, h) * 255, hue(p, q, h - 1 / 3) * 255];
}

function spotifyLogo(ctx, cx, cy, r) {
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#0b0b0b";
  ctx.lineCap = "round";
  const arcs = [
    { w: 0.62, y: -0.3, lw: 0.17 },
    { w: 0.5, y: 0.0, lw: 0.14 },
    { w: 0.38, y: 0.27, lw: 0.12 },
  ];
  for (const a of arcs) {
    const rad = r * a.w * 1.45;
    ctx.lineWidth = r * a.lw;
    ctx.beginPath();
    ctx.arc(cx, cy + r * a.y + rad * 0.55, rad, Math.PI * 1.22, Math.PI * 1.78);
    ctx.stroke();
  }
}

// Ícone da pílula: padrão (emoji do bot) | nenhum (null) | emoji/link escolhido
function resolveIconUrl(o = {}) {
  if (o.pillIcon === "-") return null;
  if (o.pillIcon) return /^\d+$/.test(o.pillIcon) ? emojiUrl(o.pillIcon) : o.pillIcon;
  return emojiUrl(SPOTIFY_EMOJI_ID);
}

// Medidas da pílula (ícone + texto; a largura acompanha o texto)
function pillMetrics(ctx, o, hasIcon) {
  const pillText = o.pillText === "-" ? "" : o.pillText || "Spotify";
  ctx.font = `bold 19px ${BOLD}`;
  const textW = pillText ? ctx.measureText(pillText).width : 0;
  const left = hasIcon ? 10 : 20;
  const pillW = Math.ceil(left + (hasIcon ? 30 : 0) + (hasIcon && pillText ? 8 : 0) + textW + (pillText ? 20 : 10));
  return { pillText, textW, left, pillW };
}

// Até onde a pílula pode andar para a direita (de 40px da borda esquerda até 40px da borda direita)
function pillMaxOffset(o = {}) {
  const { pillW } = pillMetrics(createCanvas(1, 1).getContext("2d"), o, o.pillIcon !== "-");
  return Math.max(0, W - 80 - pillW);
}

// Começa a baixar capa, avatar e ícone antes do desenho (só o que a configuração realmente usa).
// Não espera nada: o desenho depois reaproveita os downloads em andamento ou já prontos.
function prefetchCardImages({ coverUrl, avatarUrl } = {}, o = {}) {
  if (!o.bgHex) loadImageFromUrl(coverUrl);
  if ((o.showNowPlaying ?? true) && (o.showAvatar ?? true)) loadImageFromUrl(avatarUrl);
  const iconUrl = resolveIconUrl(o);
  if ((o.showPill ?? true) && iconUrl) loadIcon(iconUrl);
}

// dados: { title, artists, coverUrl, positionMs, durationMs, userName, displayName, avatarUrl }
// o (configuração do painel do n!menu, tudo opcional):
//   cores (#rrggbb): barColor "green" | "cover" | "custom" + barHex, trackHex, knobHex, titleHex, artistHex, timeHex,
//                    pillTextHex, footerTextHex, bgHex/bgHex2 (fundo no lugar da capa), shadeHex, glassHex
//   formato: glass "dark" | "normal" | "light", radius, blur, barHeight, overlay (%), showTimes, showKnob,
//            infoOffset (px que título, artistas, barra e tempos sobem; a faixa "Ouvindo agora" fica no lugar),
//            pillOffset (px que a pílula do Spotify anda para a direita)
//   textos e ícones: showPill, pillText, pillIcon, showNowPlaying, footerText, footerName, showAvatar
async function renderSpotifyCard(dados, o = {}) {
  const { title, artists, coverUrl, positionMs, durationMs, userName, displayName, avatarUrl } = dados;
  const showPill = o.showPill ?? true;
  const showNowPlaying = o.showNowPlaying ?? true;
  const showTimes = o.showTimes ?? true;
  const showKnob = o.showKnob ?? true;
  const preset = GLASS_PRESETS[o.glass] ?? GLASS_PRESETS.normal;
  const radius = o.radius ?? 34;
  const blurPx = o.blur ?? 22;
  const barH = o.barHeight ?? 7;
  const overlay = o.overlay == null ? preset.base : Math.min(0.9, Math.max(0, o.overlay / 100));
  const shadeRgb = hexToRgb(o.shadeHex) ?? [0, 0, 0];
  const glassRgb = hexToRgb(o.glassHex) ?? [0, 0, 0];
  // Aba "Posição": título, artistas, barra e tempos sobem esse tanto (0 = posição de sempre)
  const up = Math.min(200, Math.max(0, Math.round(Number(o.infoOffset) || 0)));
  // Sem a faixa "Ouvindo agora", o texto e a barra descem para ocupar o espaço dela
  const dy = (showNowPlaying ? 0 : 34) - up;

  // Textos: vazio = padrão, "-" = esconder
  const pillText = o.pillText === "-" ? "" : o.pillText || "Spotify";
  const footerLabel = o.footerText === "-" ? "" : o.footerText || "Ouvindo agora:";
  const footerName = o.footerName === "none" ? "" : o.footerName === "display" ? displayName || userName : userName;

  // Ícone da pílula: padrão (emoji do bot) | nenhum | emoji/link escolhido
  const iconMode = o.pillIcon === "-" ? "none" : o.pillIcon ? "custom" : "default";
  const iconUrl = resolveIconUrl(o);

  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  const [cover, avatar, icon] = await Promise.all([
    o.bgHex ? null : loadImageFromUrl(coverUrl), // com fundo de cor a capa não é desenhada
    showNowPlaying && (o.showAvatar ?? true) ? loadImageFromUrl(avatarUrl) : null,
    showPill && iconUrl ? loadIcon(iconUrl) : null,
  ]);

  // Pinta a capa (recorte central), o fundo de cor/degradê escolhido ou o degradê escuro padrão
  const paintBackdrop = (c, w, h, k = 1) => {
    if (o.bgHex) {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, o.bgHex);
      g.addColorStop(1, o.bgHex2 || o.bgHex);
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    } else if (cover) {
      c.drawImage(cover, 0, -(w - h) / 2 - 30 * k, w, w);
    } else {
      const g = c.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#1f3a2a");
      g.addColorStop(1, "#0b0b0b");
      c.fillStyle = g;
      c.fillRect(0, 0, w, h);
    }
  };

  // Cópia desfocada do fundo, feita uma vez só e em escala reduzida (o desfoque é a parte mais pesada do desenho;
  // em 1/4 do tamanho custa uma fração e, de tão suave, o resultado esticado fica igual)
  const rawW = W + MARGIN * 2;
  const rawH = H + MARGIN * 2;
  const smallW = Math.round(rawW * BLUR_SCALE);
  const smallH = Math.round(rawH * BLUR_SCALE);
  const raw = createCanvas(smallW, smallH);
  paintBackdrop(raw.getContext("2d"), smallW, smallH, smallW / rawW);
  const blurred = createCanvas(smallW, smallH);
  const bctx = blurred.getContext("2d");
  bctx.filter = `blur(${blurPx * BLUR_SCALE}px)`;
  bctx.drawImage(raw, 0, 0);

  // Cantos arredondados do card inteiro
  roundRect(ctx, 0, 0, W, H, radius);
  ctx.clip();
  paintBackdrop(ctx, W, H);

  // Escurecimento geral + degradê forte embaixo (legibilidade do texto)
  ctx.fillStyle = rgba(shadeRgb, overlay);
  ctx.fillRect(0, 0, W, H);
  // (com as informações mais acima, o degradê começa mais cedo para o texto continuar legível)
  const shadeTop = 200 - up;
  const shadeEnd = H - up / 2;
  const shade = ctx.createLinearGradient(0, shadeTop, 0, shadeEnd);
  shade.addColorStop(0, rgba(shadeRgb, 0));
  shade.addColorStop(0.55, rgba(shadeRgb, 0.62));
  shade.addColorStop(1, rgba(shadeRgb, 0.9));
  ctx.fillStyle = shade;
  ctx.fillRect(0, shadeTop, W, H - shadeTop);

  // Pílula de vidro (ícone + texto; a largura acompanha o texto)
  if (showPill && (pillText || icon || iconMode === "default")) {
    const hasIcon = Boolean(icon) || iconMode === "default";
    const { left, pillW } = pillMetrics(ctx, o, hasIcon);
    // Aba "Posição": a pílula anda para a direita (0 = canto esquerdo de sempre), sem passar da margem direita
    const pillX = 40 + Math.min(Math.max(0, Math.round(Number(o.pillOffset) || 0)), Math.max(0, W - 80 - pillW));

    glass(ctx, blurred, pillX, 34, pillW, 44, 22, preset.tint, preset.dim, glassRgb);
    if (hasIcon) {
      if (icon) ctx.drawImage(icon, pillX + left, 41, 30, 30);
      else spotifyLogo(ctx, pillX + left + 15, 56, 14);
    }
    if (pillText) {
      ctx.fillStyle = o.pillTextHex || "#ffffff";
      ctx.font = `bold 19px ${BOLD}`;
      ctx.textBaseline = "middle";
      ctx.fillText(pillText, pillX + left + (hasIcon ? 38 : 0), 57);
    }
  }

  // Título (diminui a fonte se for grande) e artistas
  ctx.textBaseline = "alphabetic";
  let titleSize = 56;
  ctx.font = `bold ${titleSize}px ${BOLD}`;
  while (titleSize > 36 && ctx.measureText(title).width > 1000) {
    titleSize -= 2;
    ctx.font = `bold ${titleSize}px ${BOLD}`;
  }
  ctx.fillStyle = o.titleHex || "#ffffff";
  ctx.fillText(fitText(ctx, title, 1000), 48, 372 + dy);

  ctx.font = `bold 27px ${BOLD}`;
  ctx.fillStyle = o.artistHex || "rgba(255, 255, 255, 0.78)";
  ctx.fillText(fitText(ctx, artists, 1000), 48, 408 + dy);

  // Barra de progresso
  const barX = 46;
  const barW = W - 92;
  const barY = 436 + dy;
  const ratio = durationMs > 0 ? Math.min(1, Math.max(0, positionMs / durationMs)) : 0;
  const filled = barW * ratio;
  const barColor =
    o.barColor === "custom" && o.barHex ? o.barHex : o.barColor === "cover" ? (coverAccent(cover) ?? GREEN) : GREEN;
  const knobR = Math.max(8, Math.round(barH / 2 + 5));

  ctx.fillStyle = hexToRgb(o.trackHex) ? rgba(hexToRgb(o.trackHex), 0.55) : "rgba(255, 255, 255, 0.28)";
  roundRect(ctx, barX, barY, barW, barH, barH / 2);
  ctx.fill();
  ctx.fillStyle = barColor;
  roundRect(ctx, barX, barY, Math.max(filled, barH), barH, barH / 2);
  ctx.fill();
  if (showKnob) {
    ctx.fillStyle = o.knobHex || "#ffffff";
    ctx.beginPath();
    ctx.arc(barX + filled, barY + barH / 2, knobR, 0, Math.PI * 2);
    ctx.fill();
  }

  if (showTimes) {
    const timeY = 472 + dy + Math.max(0, barH - 7);
    ctx.font = `bold 15px ${BOLD}`;
    ctx.fillStyle = o.timeHex || "rgba(255, 255, 255, 0.92)";
    ctx.textAlign = "left";
    ctx.fillText(formatTime(positionMs), barX, timeY);
    ctx.textAlign = "right";
    ctx.fillText(formatTime(durationMs), barX + barW, timeY);
    ctx.textAlign = "left";
  }

  // Rodapé de vidro: texto + foto e nome de quem está ouvindo
  if (showNowPlaying) {
    glass(ctx, blurred, 30, 486, W - 60, 46, 23, preset.tint * 0.8, preset.dim, glassRgb);
    const footerColor = o.footerTextHex || "#ffffff";
    ctx.fillStyle = footerColor;
    ctx.textBaseline = "middle";
    let x = 52;

    if (footerLabel) {
      ctx.font = `bold 21px ${BOLD}`;
      ctx.fillText(fitText(ctx, footerLabel, 520), x, 510);
      x += Math.min(ctx.measureText(footerLabel).width, 520) + 20;
    }

    if (o.showAvatar ?? true) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(x + 15, 509, 15, 0, Math.PI * 2);
      ctx.clip();
      if (avatar) ctx.drawImage(avatar, x, 494, 30, 30);
      else {
        ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
        ctx.fillRect(x, 494, 30, 30);
      }
      ctx.restore();
      x += 42;
    }

    if (footerName) {
      ctx.fillStyle = o.footerTextHex || "rgba(255, 255, 255, 0.95)";
      ctx.font = `21px ${REGULAR}`;
      ctx.fillText(fitText(ctx, footerName, W - 60 - x), x, 510);
    }
  }

  return canvas.encode("png"); // assíncrono: não trava o bot enquanto gera o PNG
}

module.exports = { renderSpotifyCard, prefetchCardImages, pillMaxOffset, formatTime };
