import React from 'react';

export function TermsAndConditions() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-10">

        <div className="mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">Términos y Condiciones</h1>
          <p className="text-sm text-gray-500">Kinara by Sanzu Tech S.A.S — Última actualización: 29 de marzo de 2026</p>
        </div>

        <div className="space-y-8 text-sm text-gray-700 leading-relaxed">

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">1. Aceptación de Términos</h2>
            <p>Bienvenido a <strong>Kinara</strong>, plataforma de comercio electrónico SaaS desarrollada y operada por <strong>Sanzu Tech S.A.S</strong>. Al registrarte, acceder o utilizar nuestros servicios, aceptas estar sujeto a estos Términos y Condiciones. Si no estás de acuerdo, te recomendamos no utilizar la plataforma. Nos reservamos el derecho de modificar estos términos en cualquier momento, notificando los cambios con 30 días de anticipación.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">2. Descripción del Servicio</h2>
            <p>Kinara es una plataforma SaaS multi-tenant que permite a emprendedores y pequeñas empresas mexicanas gestionar su tienda en línea, catálogo de productos, pedidos, pagos vía SPEI, y publicación en marketplaces como Facebook e Instagram.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">3. Registro y Cuenta de Tenant</h2>
            <p>Para utilizar Kinara como tenant debes proporcionar información verídica, completa y actualizada. Eres responsable de mantener la confidencialidad de tus credenciales y de todas las actividades realizadas bajo tu cuenta. Sanzu Tech S.A.S se reserva el derecho de suspender cuentas que incumplan estos términos.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">4. Uso Aceptable</h2>
            <p>Te comprometes a utilizar la plataforma únicamente para fines lícitos y comerciales legítimos, sin intentar acceder a datos de otros tenants, sin realizar actividades fraudulentas, y cumpliendo con todas las leyes y regulaciones mexicanas aplicables a tu negocio.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">5. Integración con Plataformas de Terceros</h2>
            <p><strong>Meta (Facebook e Instagram):</strong> La sincronización de productos con catálogos de Facebook e Instagram está sujeta a las Políticas de la Plataforma de Meta. El tenant es responsable de cumplir con dichas políticas, incluyendo las normas de comercio de Meta. Sanzu Tech S.A.S actúa como Tech Provider registrado ante Meta.</p>
            <p className="mt-2"><strong>Fintoc:</strong> El procesamiento de pagos vía SPEI está sujeto a los términos de servicio de Fintoc. Los fondos van directamente a la cuenta bancaria del tenant, sin que Sanzu Tech S.A.S actúe como intermediario financiero.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">6. Pagos y Facturación</h2>
            <p>Los planes de Kinara se cobran mensualmente en pesos mexicanos (MXN) incluido IVA. En caso de impago, la cuenta puede suspenderse tras 7 días de gracia. No se realizan reembolsos por períodos parciales salvo que la suspensión sea atribuible a Sanzu Tech S.A.S.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">7. Propiedad de los Datos</h2>
            <p>Los datos de tu negocio (productos, clientes, pedidos) son de tu propiedad exclusiva. En caso de cancelación, tendrás 30 días para exportarlos antes de su eliminación. Sanzu Tech S.A.S no vende ni comparte datos de tenants con terceros salvo requerimiento legal.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">8. Privacidad</h2>
            <p>El tratamiento de datos personales cumple con la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP). Consulta nuestro Aviso de Privacidad en la plataforma para más información.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">9. Propiedad Intelectual</h2>
            <p>Todo el software, diseño, marca y tecnología de Kinara son propiedad de Sanzu Tech S.A.S. El tenant recibe una licencia de uso limitada, no exclusiva e intransferible durante la vigencia del contrato.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">10. Limitación de Responsabilidad</h2>
            <p>La responsabilidad máxima de Sanzu Tech S.A.S se limita al monto pagado por el tenant en los últimos 3 meses. No somos responsables por interrupciones fuera de nuestro control, decisiones de plataformas de terceros, ni daños indirectos o consecuentes.</p>
          </section>

          <section>
            <h2 className="text-base font-semibold text-gray-900 mb-2">11. Jurisdicción y Ley Aplicable</h2>
            <p>Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia será sometida a los tribunales competentes de la Ciudad de México, con renuncia expresa a cualquier otro fuero.</p>
          </section>

          <section className="border-t pt-6">
            <h2 className="text-base font-semibold text-gray-900 mb-2">12. Contacto</h2>
            <p>Email: <a href="mailto:soporte@kinara.mx" className="text-blue-600 hover:underline">soporte@kinara.mx</a></p>
            <p className="mt-1">Horario: Lunes a Viernes, 9:00 AM – 6:00 PM (Hora del Centro de México)</p>
            <p className="mt-1">Razón social: Sanzu Tech S.A.S</p>
          </section>

        </div>
      </div>
    </div>
  );
}
