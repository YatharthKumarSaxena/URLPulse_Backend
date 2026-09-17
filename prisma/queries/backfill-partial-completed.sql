UPDATE "Batch"
SET status = 'PARTIAL_COMPLETED'
WHERE completed > 0
  AND failed > 0
  AND status IN ('FAILED', 'COMPLETED');
