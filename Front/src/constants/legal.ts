/**
 * Texto legal centralizado para TermScreen, modal de primera vez y registro.
 * Al cambiar contenido importante, incrementa LEGAL_DOC_VERSION para volver a pedir consentimiento.
 */

/** Debe coincidir con `REQUIRED_LEGAL_CONSENT_VERSION` en Back/src/constants/legalConsent.ts */
export const LEGAL_DOC_VERSION = '2026-04-25-v2';

/** Resumen corto para el sheet de primera vez (no sustituye el texto completo). */
export const LEGAL_FIRST_LAUNCH_SUMMARY = `• Kora Nova es exclusiva para la comunidad Pascual Bravo; se espera uso respetuoso de la plataforma.
• Tratamos tus datos conforme a la Ley 1581 de 2012; puedes ejercer derechos ARCO como se indica en la Política.
• Tu cuenta es personal; contenido prohibido (acoso, suplantación, material no consentido, etc.) puede implicar suspensión.
• El texto completo de Términos y Privacidad está disponible dentro de la app en cualquier momento.`;

export const TERMS_CONTENT = `TÉRMINOS Y CONDICIONES DE USO — KORA NOVA
Última actualización: 25 de abril de 2026

1. ACEPTACIÓN
Al acceder y usar Kora Nova ("la Aplicación"), usted acepta quedar vinculado por estos Términos y Condiciones. Si no está de acuerdo con alguna parte de estos términos, no podrá acceder a la Aplicación.

2. ELEGIBILIDAD
La Aplicación está disponible exclusivamente para estudiantes activos del Instituto Tecnológico Pascual Bravo. Solo se permiten cuentas institucionales con dominio @pascualbravo.edu.co. Al registrarse, usted declara que es estudiante activo de la institución.

3. CUENTA DE USUARIO
• Usted es responsable de mantener la confidencialidad de su cuenta.
• No está permitido compartir ni transferir su cuenta a terceros.
• Debe notificar inmediatamente cualquier uso no autorizado de su cuenta.
• La institución y los administradores de la Aplicación pueden suspender cuentas que infrinjan estas normas.

4. CONDUCTA DEL USUARIO
Está estrictamente prohibido:
• Publicar contenido falso, engañoso, ofensivo o que incite al odio.
• Acosar, intimidar o amenazar a otros usuarios.
• Compartir imágenes de terceros sin su consentimiento.
• Usar la Aplicación con fines comerciales no autorizados.
• Intentar acceder a cuentas ajenas o vulnerar la seguridad de la plataforma.

5. CONTENIDO GENERADO POR EL USUARIO
• Usted conserva los derechos sobre el contenido que publica.
• Al publicarlo, otorga a Kora Nova una licencia no exclusiva para mostrarlo dentro de la plataforma.
• Kora Nova puede eliminar contenido que viole estas normas sin previo aviso.

6. PRIVACIDAD
El tratamiento de sus datos se describe en la Política de Privacidad, que forma parte integral de estos Términos.

7. LIMITACIÓN DE RESPONSABILIDAD
Kora Nova no garantiza la veracidad de los perfiles ni el comportamiento de otros usuarios. La Aplicación se proporciona "tal cual" sin garantías de ningún tipo. Los encuentros fuera de la plataforma son responsabilidad exclusiva de los usuarios.

8. MODIFICACIONES
Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigor al publicarse en la Aplicación. El uso continuado implica la aceptación de los nuevos términos.

9. TERMINACIÓN
Podemos suspender o cancelar su acceso si incumple estos Términos, a nuestra entera discreción y sin previo aviso.

10. LEY APLICABLE
Estos Términos se rigen por las leyes de la República de Colombia. Cualquier disputa se someterá a los tribunales competentes de Medellín, Antioquia.

11. CONTACTO
Para consultas sobre estos Términos, contáctenos en: soporte@korakova.app`;

export const PRIVACY_CONTENT = `POLÍTICA DE PRIVACIDAD — KORA NOVA
Última actualización: 25 de abril de 2026

1. RESPONSABLE DEL TRATAMIENTO
Kora Nova, aplicación desarrollada en el marco académico del Instituto Tecnológico Pascual Bravo, trata sus datos conforme a la Ley 1581 de 2012 (Ley de Protección de Datos de Colombia) y su Decreto reglamentario 1377 de 2013.

2. DATOS QUE RECOPILAMOS
Datos de identidad: nombre, fecha de nacimiento, género.
Datos académicos: programa, semestre.
Datos de contacto: correo institucional (@pascualbravo.edu.co).
Datos de perfil: fotografías, biografía, intereses, hobbies.
Datos de uso: interacciones dentro de la app, ubicación aproximada (si la autoriza), mensajes enviados.
Datos técnicos: tipo de dispositivo, sistema operativo, dirección IP.

3. FINALIDAD DEL TRATAMIENTO
• Gestionar su cuenta y autenticación.
• Mostrar su perfil a otros estudiantes compatibles.
• Facilitar la comunicación entre usuarios (chat).
• Mejorar la experiencia y funcionalidades de la Aplicación.
• Garantizar la seguridad de la plataforma.
• Cumplir obligaciones legales.

4. BASE LEGAL
El tratamiento se basa en:
• Su consentimiento explícito (al aceptar esta política).
• La ejecución del servicio solicitado.
• El interés legítimo en garantizar la seguridad de la plataforma.

5. COMPARTICIÓN DE DATOS
No vendemos ni compartimos sus datos personales con terceros con fines comerciales. Podemos compartir datos con:
• Proveedores de servicios tecnológicos (hosting, correo) bajo acuerdos de confidencialidad.
• Autoridades competentes cuando la ley lo exija.

6. RETENCIÓN DE DATOS
Sus datos se conservan mientras su cuenta esté activa. Al eliminar la cuenta, sus datos serán eliminados en un plazo máximo de 30 días, salvo obligación legal de conservarlos.

7. SUS DERECHOS (Ley 1581/2012)
Usted tiene derecho a:
• Conocer, actualizar y rectificar sus datos.
• Solicitar prueba de la autorización otorgada.
• Ser informado sobre el uso de sus datos.
• Revocar la autorización y solicitar la supresión de sus datos.
• Acceder gratuitamente a sus datos.
Para ejercer estos derechos, escriba a: privacidad@korakova.app

8. SEGURIDAD
Implementamos medidas técnicas y organizativas para proteger sus datos: cifrado en tránsito (HTTPS/TLS), almacenamiento seguro de contraseñas (hashing), control de accesos y monitoreo de seguridad.

9. MENORES DE EDAD
La Aplicación no está dirigida a menores de 16 años. Si detectamos cuentas de menores, las eliminaremos de inmediato.

10. CAMBIOS A ESTA POLÍTICA
Notificaremos cambios significativos mediante aviso en la Aplicación. El uso continuado implica la aceptación de la política actualizada.

11. CONTACTO DPO
Delegado de Protección de Datos: privacidad@korakova.app`;

/** Secciones para el modal de lectura en registro (alineado al documento oficial). */
export const REGISTER_TERMS_SECTIONS = [
  {
    title: '1. Aceptación',
    body: 'Al registrarte en Kora Nova aceptas estos Términos y la Política de Privacidad. Si no estás de acuerdo, no podrás usar el servicio.',
  },
  {
    title: '2. Elegibilidad y cuenta',
    body: 'La app está orientada a la comunidad Pascual Bravo. Eres responsable de la confidencialidad de tu cuenta y de notificar usos no autorizados.',
  },
  {
    title: '3. Conducta y contenido',
    body: 'Queda prohibido acosar, publicar contenido ofensivo o no consentido, suplantar identidades o vulnerar la seguridad. Kora Nova puede retirar contenido o suspender cuentas que incumplan las normas.',
  },
  {
    title: '4. Privacidad',
    body: 'El tratamiento de datos personales se rige por la Ley 1581 de 2012. Los detalles completos están en la Política de Privacidad dentro de la app.',
  },
  {
    title: '5. Modificaciones y ley',
    body: 'Podemos actualizar estos términos; el uso continuado implica aceptación. Se aplican las leyes de Colombia y tribunales competentes en Medellín.',
  },
];
