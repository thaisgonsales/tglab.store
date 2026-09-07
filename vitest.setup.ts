import "@testing-library/jest-dom/vitest";

// Zona horaria estable para los tests (evita que fechas dependan de la máquina).
process.env.TZ = "America/Santiago";
