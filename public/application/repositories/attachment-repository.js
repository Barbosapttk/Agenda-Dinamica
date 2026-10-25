// Reutiliza as funções e políticas existentes de Storage e fallback.
export function createAttachmentRepository({ prepare, getUrl }) {
  return Object.freeze({
    async prepare(attachments, context) {
      try { return { ok: true, attachments: await prepare(attachments, context) }; }
      catch (error) { return { ok: false, error }; }
    },
    async getUrl(attachment) {
      try { return { ok: true, url: await getUrl(attachment) }; }
      catch (error) { return { ok: false, error }; }
    }
  });
}
