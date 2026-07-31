import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "DENS CAKRA",
  version: packageJson.version,
  copyright: `(c) ${currentYear}, DENS CAKRA.`,
  meta: {
    title: "DENS CAKRA - Dashboard Evaluasi Nasional dan Situational Awareness",
    description:
      "DENS CAKRA adalah Sistem Manajemen Kinerja dan Evaluasi Nasional untuk command, analytic, knowledge, response, awareness, dan situational awareness operasional.",
    keywords: [
      "DENS CAKRA",
      "Sistem Manajemen Kinerja",
      "Evaluasi Nasional",
      "Situational Awareness",
      "Command",
      "Analytic",
      "Knowledge",
      "Response",
      "Awareness",
      "Velox et Exactus",
    ],
  },
};
