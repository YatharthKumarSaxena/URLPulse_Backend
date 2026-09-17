UPDATE "Batch"
SET status = 'PARTIAL_COMPLETED'
WHERE status = 'FAILED'
  AND completed > 0
  AND failed > 0;
