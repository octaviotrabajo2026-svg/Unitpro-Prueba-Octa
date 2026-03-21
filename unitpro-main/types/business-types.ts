import { WebConfig } from "./web-config"; // Importamos tu config actual

// 1. Las Categorías que soporta el sistema (tienen que coincidir con el SQL que corriste) se agregan con |
export type BusinessCategory = 'service_booking' | 'confirm_booking' | 'project_portfolio';



export interface ProjectConfig extends WebConfig {
  categoryType: 'project_portfolio';
}

// 2. Configuración para SERVICIOS / CITAS
// Esta es la que usa tu sistema actual (Peluquerías, Dentistas).
// Hereda todo de 'WebConfig' (hero, beneficios, etc.) porque es lo que ya tenés funcionando.

export interface ServiceBookingConfig extends WebConfig {
  categoryType: 'service_booking'; // Identificador interno
}

export interface ConfirmBookingConfig extends WebConfig {
  categoryType: 'confirm_booking'; // Identificador interno
}

// 4. El "Tipo Maestro" (Union Type)
// Esto le dice a TypeScript: "La configuración de un negocio puede ser DE CITAS -O- DE PORTAFOLIO"
export type BusinessConfig = ServiceBookingConfig | ConfirmBookingConfig | ProjectConfig;