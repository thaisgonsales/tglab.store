import { z } from "zod";

/** Textos de cuentas editables mediante Setting (grupo account). */
export const accountSettingsSchema = z.object({
  invalidData: z.string().default("Revisa los datos ingresados y los campos obligatorios."),
  invalidCode: z.string().default("Ingresa un código de verificación válido."),
  orderStatuses: z
    .object({
      PENDING_PAYMENT: z.string().default("Pendiente de pago"),
      PAID: z.string().default("Pagado"),
      PREPARING: z.string().default("En preparación"),
      READY_FOR_PICKUP: z.string().default("Listo para retiro"),
      SHIPPED: z.string().default("Enviado"),
      DELIVERED: z.string().default("Entregado"),
      CANCELLED: z.string().default("Cancelado"),
    })
    .default(() => ({
      PENDING_PAYMENT: "Pendiente de pago",
      PAID: "Pagado",
      PREPARING: "En preparación",
      READY_FOR_PICKUP: "Listo para retiro",
      SHIPPED: "Enviado",
      DELIVERED: "Entregado",
      CANCELLED: "Cancelado",
    })),
  paymentStatuses: z
    .object({
      PENDING: z.string().default("Pendiente"),
      PAID: z.string().default("Pagado"),
      REJECTED: z.string().default("Rechazado"),
      CANCELLED: z.string().default("Cancelado"),
      REFUNDED: z.string().default("Reembolsado"),
      EXPIRED: z.string().default("Vencido"),
    })
    .default(() => ({
      PENDING: "Pendiente",
      PAID: "Pagado",
      REJECTED: "Rechazado",
      CANCELLED: "Cancelado",
      REFUNDED: "Reembolsado",
      EXPIRED: "Vencido",
    })),
  account: z.string().default("Mi cuenta"),
  login: z.string().default("Iniciar sesión"),
  register: z.string().default("Crear cuenta"),
  logout: z.string().default("Cerrar sesión"),
  admin: z.string().default("Administración"),
  customerAccess: z.string().default("Acceso de clientes"),
  adminAccess: z.string().default("Acceso del personal"),
  loginIntro: z
    .string()
    .default("Revisa tus compras, guarda tus direcciones y compra más rápido."),
  registerIntro: z
    .string()
    .default("Crea tu cuenta para acompañarte en cada compra."),
  adminIntro: z
    .string()
    .default("Gestiona productos, pedidos y la operación de tu tienda."),
  name: z.string().default("Nombre completo"),
  firstName: z.string().default("Nombre"),
  lastName: z.string().default("Apellido"),
  email: z.string().default("Correo electrónico"),
  password: z.string().default("Contraseña"),
  confirmPassword: z.string().default("Repetir contraseña"),
  currentPassword: z.string().default("Contraseña actual"),
  newPassword: z.string().default("Nueva contraseña"),
  passwordHint: z
    .string()
    .default("Usa entre 10 y 128 caracteres. Puedes utilizar una frase larga."),
  showPassword: z.string().default("Mostrar contraseña"),
  hidePassword: z.string().default("Ocultar contraseña"),
  remember: z.string().default("Mantener mi sesión"),
  forgot: z.string().default("Olvidé mi contraseña"),
  reset: z.string().default("Restablecer contraseña"),
  sendReset: z.string().default("Enviar enlace de recuperación"),
  resetIntro: z
    .string()
    .default("Te enviaremos un enlace para elegir una nueva contraseña."),
  resetSent: z
    .string()
    .default(
      "Si existe una cuenta con ese correo, recibirás un enlace de recuperación. Revisa también la carpeta de spam.",
    ),
  resetDone: z
    .string()
    .default("Contraseña actualizada. Ya puedes iniciar sesión."),
  emailUnavailable: z
    .string()
    .default(
      "El envío de correos aún no está disponible. Contacta a la tienda si necesitas recuperar tu acceso.",
    ),
  verify: z.string().default("Verificar mi correo"),
  verifySent: z
    .string()
    .default(
      "Si tu correo está pendiente de verificación, recibirás un enlace. Revisa tu bandeja de entrada.",
    ),
  verified: z.string().default("Correo verificado"),
  unverified: z.string().default("Correo pendiente de verificación"),
  verifyHint: z
    .string()
    .default(
      "Verifica tu correo para asociar compras anteriores realizadas como invitado.",
    ),
  verificationError: z
    .string()
    .default(
      "El enlace de verificación es inválido o venció. Solicita uno nuevo desde tu cuenta.",
    ),
  submit: z.string().default("Guardar cambios"),
  saved: z.string().default("Cambios guardados."),
  loading: z.string().default("Procesando…"),
  genericError: z
    .string()
    .default(
      "No se pudo completar la operación. Revisa los datos e intenta nuevamente.",
    ),
  invalidCredentials: z.string().default("Correo o contraseña incorrectos."),
  invalidForm: z
    .string()
    .default(
      "Revisa los campos. La contraseña debe tener entre 10 y 128 caracteres y la confirmación debe coincidir.",
    ),
  invalidToken: z
    .string()
    .default("El enlace es inválido o venció. Solicita uno nuevo."),
  tooMany: z
    .string()
    .default(
      "Demasiados intentos. Espera unos minutos antes de volver a intentar.",
    ),
  terms: z
    .string()
    .default("Acepto los términos y condiciones y la política de privacidad."),
  termsLink: z.string().default("Términos y condiciones"),
  privacyLink: z.string().default("Política de privacidad"),
  backStore: z.string().default("Volver a la tienda"),
  profile: z.string().default("Mis datos"),
  addresses: z.string().default("Mis direcciones"),
  orders: z.string().default("Mis pedidos"),
  security: z.string().default("Seguridad"),
  phone: z.string().default("Teléfono"),
  rut: z.string().default("RUT"),
  region: z.string().default("Región"),
  comuna: z.string().default("Comuna"),
  street: z.string().default("Calle"),
  number: z.string().default("Número"),
  apartment: z.string().default("Departamento / casa"),
  notes: z.string().default("Indicaciones de entrega"),
  defaultAddress: z.string().default("Dirección principal"),
  addAddress: z.string().default("Agregar dirección"),
  edit: z.string().default("Editar"),
  cancel: z.string().default("Cancelar"),
  delete: z.string().default("Eliminar"),
  deleteConfirm: z.string().default("¿Eliminar esta dirección?"),
  emptyAddresses: z
    .string()
    .default("Todavía no tienes direcciones guardadas."),
  emptyOrders: z
    .string()
    .default("Todavía no tienes pedidos asociados a tu cuenta."),
  viewOrder: z.string().default("Ver pedido"),
  orderNumber: z.string().default("Pedido"),
  date: z.string().default("Fecha"),
  status: z.string().default("Estado"),
  total: z.string().default("Total"),
  previous: z.string().default("Anterior"),
  next: z.string().default("Siguiente"),
  claimOrders: z.string().default("Asociar compras anteriores"),
  claimed: z.string().default("Compras anteriores asociadas."),
  orderItems: z.string().default("Productos de tu pedido"),
  shipping: z.string().default("Entrega"),
  tracking: z.string().default("Seguir envío"),
  payment: z.string().default("Estado del pago"),
  subtotal: z.string().default("Subtotal"),
  discount: z.string().default("Descuento"),
  shippingCost: z.string().default("Despacho"),
  changePassword: z.string().default("Cambiar contraseña"),
  passwordChanged: z
    .string()
    .default("Contraseña actualizada. Se cerraron las otras sesiones."),
  sessions: z.string().default("Sesiones activas"),
  revoke: z.string().default("Cerrar esta sesión"),
  revokeOthers: z.string().default("Cerrar otras sesiones"),
  currentSession: z.string().default("Este dispositivo"),
  unknownDevice: z.string().default("Dispositivo sin información"),
  twoFactor: z.string().default("Verificación en dos pasos"),
  twoFactorHint: z
    .string()
    .default(
      "Agrega una segunda verificación con una aplicación autenticadora.",
    ),
  enable2fa: z.string().default("Activar verificación en dos pasos"),
  disable2fa: z.string().default("Desactivar verificación en dos pasos"),
  setup2fa: z
    .string()
    .default(
      "Agrega esta clave en tu aplicación autenticadora y confirma con el código de seis dígitos.",
    ),
  backupCodes: z
    .string()
    .default(
      "Códigos de recuperación: guárdalos en un lugar seguro. Cada código se usa una sola vez.",
    ),
  code: z.string().default("Código de verificación"),
  backupCode: z.string().default("Código de recuperación"),
  useBackup: z.string().default("Usar código de recuperación"),
  useTotp: z.string().default("Usar aplicación autenticadora"),
  verifyCode: z.string().default("Confirmar código"),
  twoFactorEnabled: z.string().default("Verificación en dos pasos activada."),
  twoFactorDisabled: z
    .string()
    .default("Verificación en dos pasos desactivada."),
  checkoutLogin: z
    .string()
    .default("Inicia sesión para guardar esta compra en tu cuenta"),
  checkoutGuest: z
    .string()
    .default("También puedes continuar comprando como invitado."),
  checkoutAccount: z
    .string()
    .default("Esta compra quedará asociada a tu cuenta."),
  chooseAddress: z.string().default("Usar una dirección guardada"),
  manualAddress: z.string().default("Ingresar otra dirección"),
  team: z.string().default("Equipo y accesos"),
  createStaff: z.string().default("Crear acceso de personal"),
  role: z.string().default("Rol"),
  owner: z.string().default("Propietario"),
  staff: z.string().default("Personal"),
  active: z.string().default("Activo"),
  inactive: z.string().default("Suspendido"),
  suspend: z.string().default("Suspender acceso"),
  activate: z.string().default("Activar acceso"),
  staffCreated: z
    .string()
    .default(
      "Acceso creado. Comparte la contraseña de forma privada y pide cambiarla al ingresar.",
    ),
  customerAccounts: z.string().default("Cuentas de clientes"),
  noAccounts: z.string().default("No hay cuentas registradas."),
  adminNoSignup: z
    .string()
    .default("Los accesos del personal los crea el propietario de la tienda."),
  recoverySubject: z.string().default("Recupera tu acceso"),
  verificationSubject: z.string().default("Confirma tu correo"),
  emailLinkText: z.string().default("Continuar"),
  emailNotice: z
    .string()
    .default(
      "Si no solicitaste este correo, puedes ignorarlo. El enlace tiene una duración limitada.",
    ),
  registrationDone: z
    .string()
    .default("Tu cuenta está creada. Inicia sesión para continuar."),
  accountDisabled: z
    .string()
    .default("Esta cuenta está suspendida. Contacta a la tienda."),
  orderStatus: z.string().default("Estado del pedido"),
});

export type AccountCopy = z.infer<typeof accountSettingsSchema>;
