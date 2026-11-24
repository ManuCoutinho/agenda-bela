import { useEffect, useState } from 'react';
import { encurtarLink } from '../servicos/encurtador';

/** Link curto do is.gd; enquanto não chega (ou se falhar), o link completo. */
export function useLinkCurto(url: string) {
  const [curto, setCurto] = useState<{ url: string; curto: string } | null>(null);
  useEffect(() => {
    if (!url) return;
    let ativo = true;
    encurtarLink(url)
      .then((link) => {
        if (ativo && link) setCurto({ url, curto: link });
      })
      .catch((erro: unknown) => console.error(erro));
    return () => {
      ativo = false;
    };
  }, [url]);
  return curto?.url === url ? curto.curto : url;
}
