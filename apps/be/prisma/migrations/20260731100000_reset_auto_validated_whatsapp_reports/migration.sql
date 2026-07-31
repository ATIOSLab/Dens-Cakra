UPDATE "WhatsAppMessage"
SET "validationSummary" = 'NOT_CHECKED'
WHERE "status" = 'RECEIVED'
  AND "validationSummary" = 'VALID'
  AND "rawPayload"->>'source' IN (
    'WHATSAPP_BOT_REPORT_FSM',
    'WHATSAPP_BOT_REPORT_FLOW'
  );
