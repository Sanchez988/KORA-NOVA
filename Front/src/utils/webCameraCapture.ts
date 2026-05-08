/**
 * En web desktop, expo-image-picker usa `<input capture>` pero muchos navegadores
 * abren el mismo selector de archivos que la galería. Aquí se usa getUserMedia
 * para diferenciar Cámara (vista previa + captura) de Galería (solo archivos).
 *
 * - No tapar el aviso de permiso con overlay oscuro hasta tener stream.
 * - Tras abrir el overlay, ignorar clics en el fondo unos ms: el mismo click/tap
 *   del botón «Cámara» puede rebotar y cerrar todo al instante (“desaparece”).
 */
const MAX_Z = 2147483647;
const BACKDROP_CLOSE_MS = 550;

const OVERLAY_HOST_ID = 'kora-web-camera-root';

function styleObjectToString(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([k, v]) => `${k.replace(/([A-Z])/g, '-$1').toLowerCase()}:${v}`)
    .join(';');
}

function ensureOverlayHost(): HTMLElement {
  let el = document.getElementById(OVERLAY_HOST_ID);
  if (!el) {
    el = document.createElement('div');
    el.id = OVERLAY_HOST_ID;
    document.body.appendChild(el);
  }
  /** Siempre al final del body por encima del árbol de React */
  document.body.appendChild(el);
  el.setAttribute(
    'style',
    styleObjectToString({
      position: 'fixed',
      inset: '0',
      width: '0',
      height: '0',
      overflow: 'visible',
      pointerEvents: 'none',
      zIndex: String(MAX_Z),
    }),
  );
  return el;
}

async function resolveMediaStream(): Promise<MediaStream> {
  const md = navigator.mediaDevices!;
  const attempts: MediaStreamConstraints[] = [
    { audio: false, video: true },
    { audio: false, video: { facingMode: 'user' } },
    {
      audio: false,
      video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
    },
  ];

  let lastErr: unknown;
  for (const c of attempts) {
    try {
      return await md.getUserMedia(c);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr;
}

function formatGetUserMediaError(err: unknown): string {
  if (!(err instanceof DOMException || err instanceof Error)) {
    return '';
  }
  const name = ('name' in err && err.name) || '';
  if (name === 'NotAllowedError' || name === 'PermissionDismissedError') {
    return 'Permiso denegado o cerrado antes de tiempo.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No se detectó ninguna cámara.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'La cámara está en uso por otra aplicación.';
  }
  if (name === 'OverconstrainedError') {
    return 'La cámara no admite el modo solicitado; prueba con otro navegador.';
  }
  if (name === 'SecurityError') {
    return 'Contexto no seguro: usa https o localhost.';
  }
  return err.message || '';
}

/** Banner de ayuda antes del permiso; en error pasa a ser mensaje cerrable */
function attachPermissionBanner(streamPending: boolean): HTMLElement {
  const banner = document.createElement('div');
  banner.setAttribute(
    'style',
    styleObjectToString({
      position: 'fixed',
      left: '12px',
      right: '12px',
      bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
      zIndex: String(MAX_Z),
      background: 'rgba(26,26,46,0.96)',
      border: '1px solid rgba(162,155,254,0.45)',
      borderRadius: '14px',
      padding: '14px 16px',
      boxSizing: 'border-box',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      fontFamily: 'system-ui, sans-serif',
      color: '#f0ecff',
      fontSize: '14px',
      lineHeight: '1.45',
      pointerEvents: streamPending ? 'none' : 'auto',
    }),
  );
  banner.innerHTML =
    '<strong style="display:block;margin-bottom:6px">Permiso de cámara</strong>' +
    'Busca el aviso del navegador o el icono de <strong>cámara / candado</strong> en la barra de direcciones y pulsa <strong>Permitir</strong>.';
  document.body.appendChild(banner);
  return banner;
}

function attachErrorBanner(details: string, onClose: () => void): HTMLElement {
  const wrap = document.createElement('div');
  wrap.setAttribute(
    'style',
    styleObjectToString({
      position: 'fixed',
      left: '12px',
      right: '12px',
      bottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
      zIndex: String(MAX_Z),
      background: 'rgba(26,26,46,0.98)',
      border: '1px solid rgba(255,107,107,0.5)',
      borderRadius: '14px',
      padding: '14px 16px',
      boxSizing: 'border-box',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      fontFamily: 'system-ui, sans-serif',
      color: '#f0ecff',
      fontSize: '14px',
      lineHeight: '1.45',
      pointerEvents: 'auto',
    }),
  );
  const msg = details ? `<div style="margin:10px 0 0;font-size:13px;opacity:0.9">${escapeHtml(details)}</div>` : '';
  wrap.innerHTML =
    '<strong style="display:block">No se pudo abrir la cámara</strong>' +
    msg +
    '<button type="button" id="kora-cam-err-ok" style="margin-top:14px;width:100%;padding:12px;border-radius:10px;border:none;background:#6C5CE7;color:#fff;font-weight:700;font-size:15px;cursor:pointer">Entendido</button>';
  document.body.appendChild(wrap);
  wrap.querySelector('#kora-cam-err-ok')?.addEventListener('click', () => {
    wrap.parentNode?.removeChild(wrap);
    onClose();
  });
  return wrap;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function capturePhotoViaInlineWebcam(): Promise<string | null> {
  if (typeof document === 'undefined' || typeof window === 'undefined' || typeof navigator === 'undefined') {
    return null;
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return new Promise<string | null>((resolve) => {
      attachErrorBanner('Tu navegador no expone la cámara en esta página (http inseguro o política del sitio).', () =>
        resolve(null),
      );
    });
  }

  return new Promise<string | null>((resolve) => {
    const resolveOnce = (() => {
      let done = false;
      return (v: string | null) => {
        if (done) return;
        done = true;
        resolve(v);
      };
    })();

    const banner = attachPermissionBanner(true);

    const removeBanner = () => {
      banner.parentNode?.removeChild(banner);
    };

    void resolveMediaStream()
      .then((stream) => {
        removeBanner();
        openFullscreenCaptureUi(stream, resolveOnce);
      })
      .catch((err: unknown) => {
        removeBanner();
        const detail = formatGetUserMediaError(err);
        attachErrorBanner(detail, () => resolveOnce(null));
      });
  });
}

function openFullscreenCaptureUi(
  stream: MediaStream,
  resolveOnce: (v: string | null) => void,
) {
  const host = ensureOverlayHost();

  const overlay = document.createElement('div');
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-label', 'Tomar foto con la cámara');
  overlay.setAttribute(
    'style',
    [
      'position:fixed',
      'inset:0',
      `z-index:${MAX_Z}`,
      'background:rgba(0,0,0,0.88)',
      'display:flex',
      'flex-direction:column',
      'justify-content:center',
      'align-items:center',
      'padding:16px',
      'padding-top:max(16px, env(safe-area-inset-top, 0px))',
      'box-sizing:border-box',
      'pointer-events:auto',
    ].join(';'),
  );

  /** Evita que el clic que abrió la cámara cierre el modal al propagarse al backdrop */
  let allowBackdropClose = false;
  const enableBackdropTimer = window.setTimeout(() => {
    allowBackdropClose = true;
  }, BACKDROP_CLOSE_MS);

  const card = document.createElement('div');
  card.setAttribute(
    'style',
    [
      'width:100%',
      'max-width:420px',
      'background:#1a1a2e',
      'border-radius:16px',
      'padding:16px',
      'box-sizing:border-box',
      'border:1px solid rgba(162,155,254,0.35)',
    ].join(';'),
  );
  card.addEventListener('click', (e) => {
    e.stopPropagation();
  });
  card.addEventListener('mousedown', (e) => {
    e.stopPropagation();
  });
  card.addEventListener('touchstart', (e) => {
    e.stopPropagation();
  });

  const title = document.createElement('div');
  title.textContent = 'Tomar foto';
  title.setAttribute(
    'style',
    [
      'color:#fff',
      'font-family:system-ui,sans-serif',
      'font-weight:700',
      'font-size:17px',
      'margin-bottom:12px',
    ].join(';'),
  );

  const video = document.createElement('video');
  video.autoplay = true;
  video.setAttribute('playsinline', '');
  video.playsInline = true;
  video.muted = true;
  video.setAttribute(
    'style',
    'width:100%;max-height:60vh;border-radius:12px;background:#000;object-fit:cover;',
  );

  const hint = document.createElement('div');
  hint.textContent =
    'Encuadra y pulsa Capturar. Para un archivo ya guardado, usa «Galería».';
  hint.setAttribute(
    'style',
    'color:rgba(224,219,251,0.85);font-size:12px;font-family:system-ui,sans-serif;margin-top:12px;line-height:1.4;text-align:center;',
  );

  const row = document.createElement('div');
  row.setAttribute(
    'style',
    'display:flex;flex-direction:row;gap:12px;margin-top:16px;justify-content:stretch;',
  );

  const btnStyle = (bg: string, color: string): string =>
    `flex:1;padding:14px;border-radius:12px;border:none;font-weight:700;font-size:15px;cursor:pointer;font-family:system-ui,sans-serif;background:${bg};color:${color};`;

  const captureBtn = document.createElement('button');
  captureBtn.type = 'button';
  captureBtn.textContent = 'Capturar';
  captureBtn.setAttribute('style', btnStyle('#6C5CE7', '#fff'));

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.textContent = 'Cancelar';
  cancelBtn.setAttribute('style', btnStyle('rgba(255,255,255,0.12)', '#e8e8f5'));

  let settled = false;
  const safeResolve = (v: string | null) => {
    if (settled) return;
    settled = true;
    resolveOnce(v);
  };

  const cleanup = () => {
    window.clearTimeout(enableBackdropTimer);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
    overlay.parentNode?.removeChild(overlay);
    window.removeEventListener('keydown', onKeyDown);
  };

  const fail = () => {
    cleanup();
    safeResolve(null);
  };

  const onKeyDown = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') {
      cleanup();
      safeResolve(null);
    }
  };
  window.addEventListener('keydown', onKeyDown);

  cancelBtn.onclick = () => {
    cleanup();
    safeResolve(null);
  };

  captureBtn.onclick = () => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) {
      return;
    }
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      fail();
      return;
    }
    ctx.drawImage(video, 0, 0, w, h);
    cleanup();
    canvas.toBlob(
      (blob) => {
        safeResolve(blob ? URL.createObjectURL(blob) : null);
      },
      'image/jpeg',
      0.88,
    );
  };

  row.appendChild(captureBtn);
  row.appendChild(cancelBtn);
  card.appendChild(title);
  card.appendChild(video);
  card.appendChild(hint);
  card.appendChild(row);
  overlay.appendChild(card);
  host.appendChild(overlay);

  video.srcObject = stream;
  void video.play().catch(() => {});

  const onOverlayPointer = (e: MouseEvent | PointerEvent) => {
    if (!allowBackdropClose) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target === overlay) {
      cleanup();
      safeResolve(null);
    }
  };

  /** click + pointerup: captura la cola del gesto que abrió la cámara */
  overlay.addEventListener('click', onOverlayPointer);
  overlay.addEventListener(
    'pointerup',
    (e) => {
      if (!allowBackdropClose && e.target === overlay) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
}
