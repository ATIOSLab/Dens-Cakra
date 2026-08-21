-- Rekam nomor HP pengirim pesan WhatsApp (bila dapat di-resolve) pada log webhook.
-- Sebelumnya hanya disimpan senderJid (LID); kolom ini memudahkan identifikasi
-- pengirim untuk rekap/audit, termasuk pesan dari nomor yang tidak terdaftar.
ALTER TABLE "IntegrationWebhookEvent" ADD COLUMN "senderPhone" VARCHAR(30);
