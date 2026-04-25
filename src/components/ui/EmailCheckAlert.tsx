type Props = {
  email?: string;
};

/**
 * Alerta padrão pós-envio de email (cadastro, reset, reenvio de
 * verificação). Direciona o usuário a checar spam, esperar alguns
 * minutos e adicionar admin@l2impure.com aos contatos.
 */
export function EmailCheckAlert({ email }: Props) {
  return (
    <div className="rounded-xl border border-[color:var(--l2-border-gold)] bg-[color:var(--l2-gold)]/5 p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-xl">📬</span>
        <h3 className="font-display text-sm font-semibold uppercase tracking-wider text-[color:var(--l2-text-gold)]">
          Não recebeu o email?
        </h3>
      </div>
      <ul className="ml-1 flex flex-col gap-2 text-sm text-white/75">
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-[color:var(--l2-text-gold)]">▸</span>
          <span>
            <strong className="text-white">Confira a caixa de spam / lixo
            eletrônico.</strong>{" "}
            Provedores como Gmail, Outlook e Yahoo às vezes filtram emails
            de domínios novos.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-[color:var(--l2-text-gold)]">▸</span>
          <span>
            Aguarde até <strong className="text-white">2 minutos</strong> —
            o envio pode levar alguns segundos pra propagar.
          </span>
        </li>
        <li className="flex items-start gap-2">
          <span className="mt-0.5 text-[color:var(--l2-text-gold)]">▸</span>
          <span>
            Adicione{" "}
            <strong className="text-[color:var(--l2-text-gold)]">
              admin@l2impure.com
            </strong>{" "}
            aos seus contatos pra emails futuros caírem direto no inbox.
          </span>
        </li>
        {email && (
          <li className="flex items-start gap-2">
            <span className="mt-0.5 text-[color:var(--l2-text-gold)]">▸</span>
            <span>
              Confirme que digitou o email certo:{" "}
              <strong className="text-white">{email}</strong>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
